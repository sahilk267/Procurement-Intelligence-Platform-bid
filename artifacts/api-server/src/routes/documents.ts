import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, activityLogsTable, usersTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, lte, sql } from "drizzle-orm";
import { sendDocumentExpiryAlert } from "../lib/notifications";
import multer from "multer";
import { extractTextFromDocument, parseDocumentContent, detectLanguage } from "../lib/ocr";
import { logger } from "../lib/logger";

const router = Router();

// Configure multer for file uploads (limit 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

router.use(authenticate);

function enrichDocument(doc: any) {
  const now = new Date();
  const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null;
  const isExpired = expiry ? expiry < now : false;
  const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  return { ...doc, isExpired, isExpiringSoon };
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { category } = req.query as Record<string, string>;
  const conditions = [eq(documentsTable.tenantId, tenantId)];
  if (category) conditions.push(eq(documentsTable.category, category));
  const docs = await db.select().from(documentsTable).where(and(...conditions));
  res.json(docs.map(enrichDocument));
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { name, category, fileName, fileUrl, expiryDate } = req.body;
  if (!name || !category || !fileName) { res.status(400).json({ error: "name, category, fileName required" }); return; }
  const [doc] = await db.insert(documentsTable).values({ tenantId, name, category, fileName, fileUrl, expiryDate }).returning();
  await db.insert(activityLogsTable).values({
    tenantId, type: "document_uploaded", entityType: "document", entityId: doc.id, entityName: name,
    description: `Document uploaded: ${name}`,
  });
  res.status(201).json(enrichDocument(doc));
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.tenantId, tenantId))).limit(1);
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(enrichDocument(doc));
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  await db.delete(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.tenantId, tenantId)));
  res.status(204).send();
});

// Check for expiring documents and send notifications (can be called by cron job)
router.post("/check-expiries", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const daysAhead = parseInt(req.body.daysAhead as string) || 30;

    // Calculate expiry threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysAhead);

    // Find documents expiring within the threshold
    const expiringDocs = await db.select().from(documentsTable)
      .where(and(
        eq(documentsTable.tenantId, tenantId),
        sql`${documentsTable.expiryDate} <= ${thresholdDate.toISOString().split('T')[0]}`,
        sql`${documentsTable.expiryDate} >= ${new Date().toISOString().split('T')[0]}`
      ));

    let notificationsSent = 0;

    for (const doc of expiringDocs) {
      const expiryDate = new Date(doc.expiryDate!);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Get all users in the tenant to notify about expiring documents
      const users = await db.select({
        email: usersTable.email,
        name: usersTable.name
      }).from(usersTable)
        .where(eq(usersTable.tenantId, tenantId));

      // Send notification to all users
      for (const user of users) {
        await sendDocumentExpiryAlert({
          userEmail: user.email,
          userName: user.name,
          documentName: doc.name,
          documentId: doc.id,
          expiryDate: doc.expiryDate!,
          daysUntilExpiry
        });
        notificationsSent++;
      }
    }

    res.json({
      message: `Checked ${expiringDocs.length} expiring documents`,
      notificationsSent
    });
  } catch (error) {
    console.error("Error checking document expiries:", error);
    res.status(500).json({ error: "Failed to check document expiries" });
  }
});

// OCR DOCUMENT PROCESSING

// Upload and process document with OCR
router.post("/upload-with-ocr", upload.single("file"), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { name, category, expiryDate } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "name and category required" });
    }

    logger.info(
      {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      },
      "Starting OCR processing"
    );

    // Extract text from document
    const ocrResult = await extractTextFromDocument(req.file.buffer, req.file.mimetype);
    
    // Parse structured content
    const parsedContent = parseDocumentContent(ocrResult.text);
    
    // Detect language
    const detectedLanguage = detectLanguage(ocrResult.text);

    // Store document in database
    const [document] = await db.insert(documentsTable).values({
      tenantId,
      name,
      category,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.originalname}`,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      extractedText: ocrResult.text,
      textConfidence: ocrResult.confidence,
      language: detectedLanguage,
      parsedContent: JSON.stringify(parsedContent)
    }).returning();

    // Log activity
    await db.insert(activityLogsTable).values({
      tenantId,
      userId,
      type: "document_ocr_processed",
      entityType: "document",
      entityId: document.id,
      entityName: name,
      description: `Document processed with OCR: ${name} (${ocrResult.text.length} characters extracted, ${ocrResult.confidence}% confidence)`
    });

    res.status(201).json({
      document: {
        id: document.id,
        name: document.name,
        category: document.category,
        fileName: document.fileName
      },
      ocr: {
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence,
        language: detectedLanguage,
        keywords: parsedContent.keywords,
        sections: parsedContent.sections.length
      }
    });
  } catch (error) {
    logger.error({ error }, "OCR processing failed");
    res.status(500).json({ error: `OCR processing failed: ${error.message}` });
  }
});

// Get extracted text and parsed content for a document
router.get("/:id/ocr-content", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const documentId = Number(req.params.id);

    const [document] = await db.select().from(documentsTable)
      .where(and(
        eq(documentsTable.id, documentId),
        eq(documentsTable.tenantId, tenantId)
      ))
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!document.extractedText) {
      return res.status(404).json({ error: "No OCR data available for this document" });
    }

    const parsedContent = document.parsedContent ? JSON.parse(document.parsedContent as string) : {};

    res.json({
      documentId: document.id,
      documentName: document.name,
      extractedText: document.extractedText,
      textLength: document.extractedText.length,
      confidence: document.textConfidence,
      language: document.language,
      parsedContent,
      processedAt: document.createdAt
    });
  } catch (error) {
    logger.error({ error }, "Failed to retrieve OCR content");
    res.status(500).json({ error: "Failed to retrieve OCR content" });
  }
});

// Search in extracted text across all documents
router.get("/search-text/:query", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const searchQuery = req.params.query.toLowerCase();
    const limit = parseInt(req.query.limit as string) || 20;

    // Note: In production, use full-text search capabilities of PostgreSQL
    const documents = await db.select()
      .from(documentsTable)
      .where(and(
        eq(documentsTable.tenantId, tenantId),
        sql`LOWER(${documentsTable.extractedText}) LIKE ${`%${searchQuery}%`}`
      ))
      .limit(limit);

    const results = documents.map(doc => {
      if (!doc.extractedText) return null;

      // Find search term context
      const textLower = doc.extractedText.toLowerCase();
      const matchIndex = textLower.indexOf(searchQuery);
      const contextStart = Math.max(0, matchIndex - 100);
      const contextEnd = Math.min(doc.extractedText.length, matchIndex + searchQuery.length + 100);
      const context = doc.extractedText.substring(contextStart, contextEnd);

      return {
        documentId: doc.id,
        documentName: doc.name,
        matchCount: (doc.extractedText.match(new RegExp(searchQuery, 'gi')) || []).length,
        context: `...${context}...`,
        confidence: doc.textConfidence
      };
    }).filter(Boolean);

    res.json({
      query: searchQuery,
      results,
      totalMatches: results.length
    });
  } catch (error) {
    logger.error({ error }, "Text search failed");
    res.status(500).json({ error: "Text search failed" });
  }
});

export default router;
