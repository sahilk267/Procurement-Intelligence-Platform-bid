import { Router } from "express";
import { db } from "@workspace/db";
import { proposalsTable, bidsTable, tendersTable, activityLogsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, desc } from "drizzle-orm";

const router = Router();
router.use(authenticate);

const proposalTemplates: Record<string, (tenderTitle: string) => string> = {
  cover_letter: (title) => `Dear Sir/Madam,

We are pleased to submit our bid for "${title}".

Our company has extensive experience in this domain and we are confident in delivering quality results within the stipulated timeline and budget.

We have carefully reviewed all tender documents, terms and conditions, and technical specifications. We confirm compliance with all requirements.

We look forward to partnering with your esteemed organization.

Yours faithfully,
[Authorized Signatory]`,

  technical: (title) => `TECHNICAL PROPOSAL - ${title}

1. UNDERSTANDING OF SCOPE
We have thoroughly reviewed the tender document and fully understand the scope of work, technical requirements, and deliverables.

2. METHODOLOGY
Our proven methodology ensures quality delivery within timelines.

3. TECHNICAL SPECIFICATIONS COMPLIANCE
All specifications as per tender document will be adhered to.

4. TEAM AND RESOURCES
Our experienced team with relevant certifications will be deployed.

5. QUALITY ASSURANCE
ISO 9001:2015 certified processes will be followed.`,

  compliance_matrix: (title) => `COMPLIANCE MATRIX - ${title}

| Clause | Requirement | Our Compliance | Reference Document |
|--------|-------------|----------------|-------------------|
| 1.1 | Company Registration | Compliant | Certificate attached |
| 1.2 | GST Registration | Compliant | GST Certificate |
| 1.3 | Annual Turnover | Compliant | CA Certificate |
| 2.1 | Technical Specs | Fully Compliant | Technical Proposal |`,

  deviation: (title) => `DEVIATION STATEMENT - ${title}

We confirm full compliance with all terms and conditions of this tender.

The following deviations are noted:
- NONE

We accept all terms and conditions without any deviations.`,

  declaration: (title) => `DECLARATION

We, the undersigned, hereby declare that:
1. The information provided in this bid is true and accurate.
2. We have not been blacklisted or debarred by any Government authority.
3. We agree to abide by all terms and conditions of this tender.
4. We have the financial and technical capacity to execute this contract.

For: [Company Name]
Authorized Signatory: ________________
Date: [Date]`,
};

router.get("/", async (req: AuthenticatedRequest, res) => {
  const { bidId } = req.query as Record<string, string>;
  const conditions = [];
  if (bidId) conditions.push(eq(proposalsTable.bidId, parseInt(bidId)));
  const proposals = await db.select().from(proposalsTable).where(conditions.length ? conditions[0] : undefined).orderBy(desc(proposalsTable.createdAt));
  res.json(proposals);
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { bidId, type, title, aiGenerate = false } = req.body;
  if (!bidId || !type || !title) { res.status(400).json({ error: "bidId, type, title required" }); return; }

  const [bid] = await db.select().from(bidsTable).where(and(eq(bidsTable.id, bidId), eq(bidsTable.tenantId, tenantId))).limit(1);
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const existing = await db.select({ version: proposalsTable.version }).from(proposalsTable).where(and(eq(proposalsTable.bidId, bidId), eq(proposalsTable.type, type))).orderBy(desc(proposalsTable.version)).limit(1);
  const version = existing.length > 0 ? existing[0].version + 1 : 1;

  let content = "";
  if (aiGenerate) {
    const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);
    const tenderTitle = tender?.title || "Tender";
    const template = proposalTemplates[type];
    content = template ? template(tenderTitle) : `Generated ${type} proposal for ${tenderTitle}`;
  }

  const [proposal] = await db.insert(proposalsTable).values({ bidId, version, type, title, content, status: "draft" }).returning();

  await db.insert(activityLogsTable).values({
    tenantId, type: "proposal_created", entityType: "proposal", entityId: proposal.id, entityName: title,
    description: `Proposal created: ${title} (v${version})`,
  });

  res.status(201).json(proposal);
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const [proposal] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id)).limit(1);
  if (!proposal) { res.status(404).json({ error: "Not found" }); return; }
  res.json(proposal);
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const { content, status, title } = req.body;
  const [proposal] = await db.update(proposalsTable).set({ content, status, title, updatedAt: new Date() }).where(eq(proposalsTable.id, id)).returning();
  if (!proposal) { res.status(404).json({ error: "Not found" }); return; }
  res.json(proposal);
});

export default router;
