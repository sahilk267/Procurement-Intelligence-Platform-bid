import { Router } from "express";
import { ingestTendersFromSources } from "../lib/data-ingestion";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { db, ingestionRunsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();
router.use(authenticate);

/**
 * Trigger manual tender ingestion from sources
 * Admin only endpoint
 */
router.post("/tenders/ingest", async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tenantId = req.tenantId!;
    const { sources, filters } = req.body;

    logger.info(
      { tenantId, sources },
      'Manual tender ingestion initiated'
    );

    const startedAt = new Date();
    const result = await ingestTendersFromSources(
      tenantId,
      sources || ['GeM', 'CPPP'],
      filters
    );

    await db.insert(ingestionRunsTable).values({
      tenantId,
      sources: sources || ['GeM', 'CPPP'],
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      status: 'completed',
      startedAt,
      completedAt: new Date()
    });

    res.json({
      message: "Tender ingestion completed",
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error }, 'Tender ingestion failed');
    res.status(500).json({ error: `Ingestion failed: ${error.message}` });
  }
});

/**
 * Get ingestion status
 */
router.get("/tenders/ingestion-status", async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const tenantId = req.tenantId!;
    const lastRun = await db.select()
      .from(ingestionRunsTable)
      .where(eq(ingestionRunsTable.tenantId, tenantId))
      .orderBy(desc(ingestionRunsTable.startedAt))
      .limit(1);

    const lastIngestion = lastRun[0]
      ? {
          timestamp: lastRun[0].startedAt.toISOString(),
          source: lastRun[0].sources,
          imported: lastRun[0].imported,
          skipped: lastRun[0].skipped,
          status: lastRun[0].status,
          errors: lastRun[0].errors,
          description: lastRun[0].description
        }
      : null;

    res.json({
      lastIngestion,
      nextScheduledIngestion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ingestingNow: false
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get ingestion status');
    res.status(500).json({ error: 'Failed to get ingestion status' });
  }
});

export default router;
