import { Router } from "express";
import { db } from "@workspace/db";
import { companyProfileTable, tendersTable, tenderAnalysisTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/company-profile", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const [profile] = await db.select().from(companyProfileTable).where(eq(companyProfileTable.tenantId, tenantId)).limit(1);
  if (!profile) {
    res.json({
      id: null, tenantId, companyName: "", gstNumber: "", panNumber: "", annualTurnover: null,
      yearsOfExperience: null, certifications: [], oemAuthorizations: [], pastProjects: [], categories: [], states: [],
    });
    return;
  }
  res.json({
    ...profile,
    certifications: profile.certifications ? JSON.parse(profile.certifications as string) : [],
    oemAuthorizations: profile.oemAuthorizations ? JSON.parse(profile.oemAuthorizations as string) : [],
    pastProjects: profile.pastProjects ? JSON.parse(profile.pastProjects as string) : [],
    categories: profile.categories ? JSON.parse(profile.categories as string) : [],
    states: profile.states ? JSON.parse(profile.states as string) : [],
  });
});

router.put("/company-profile", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { companyName, gstNumber, panNumber, annualTurnover, yearsOfExperience, certifications, oemAuthorizations, pastProjects, categories, states } = req.body;

  const data = {
    tenantId,
    companyName: companyName || "My Company",
    gstNumber, panNumber,
    annualTurnover: annualTurnover?.toString(),
    yearsOfExperience,
    certifications: JSON.stringify(certifications || []),
    oemAuthorizations: JSON.stringify(oemAuthorizations || []),
    pastProjects: JSON.stringify(pastProjects || []),
    categories: JSON.stringify(categories || []),
    states: JSON.stringify(states || []),
    updatedAt: new Date(),
  };

  const existing = await db.select({ id: companyProfileTable.id }).from(companyProfileTable).where(eq(companyProfileTable.tenantId, tenantId)).limit(1);
  let profile;
  if (existing.length > 0) {
    [profile] = await db.update(companyProfileTable).set(data).where(eq(companyProfileTable.tenantId, tenantId)).returning();
  } else {
    [profile] = await db.insert(companyProfileTable).values(data).returning();
  }
  res.json({
    ...profile,
    certifications: JSON.parse(profile.certifications as string || "[]"),
    oemAuthorizations: JSON.parse(profile.oemAuthorizations as string || "[]"),
    pastProjects: JSON.parse(profile.pastProjects as string || "[]"),
    categories: JSON.parse(profile.categories as string || "[]"),
    states: JSON.parse(profile.states as string || "[]"),
  });
});

router.get("/check/:tenderId", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const tenderId = parseInt(req.params.tenderId);

  const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, tenderId), eq(tendersTable.tenantId, tenantId))).limit(1);
  if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }

  const [profile] = await db.select().from(companyProfileTable).where(eq(companyProfileTable.tenantId, tenantId)).limit(1);
  const [analysis] = await db.select().from(tenderAnalysisTable).where(and(eq(tenderAnalysisTable.tenderId, tenderId), eq(tenderAnalysisTable.tenantId, tenantId))).limit(1);

  const turnoverRequired = analysis?.turnoverRequired ? parseFloat(analysis.turnoverRequired) : 5000000;
  const companyTurnover = profile?.annualTurnover ? parseFloat(profile.annualTurnover) : 0;
  const turnoverMet = companyTurnover >= turnoverRequired;

  const criteria = [
    { name: "Annual Turnover", required: `₹${(turnoverRequired / 100000).toFixed(0)}L`, present: profile ? `₹${(companyTurnover / 100000).toFixed(0)}L` : "Not provided", met: turnoverMet },
    { name: "GST Registration", required: "Active", present: profile?.gstNumber ? "Provided" : "Missing", met: !!profile?.gstNumber },
    { name: "PAN Number", required: "Required", present: profile?.panNumber ? "Provided" : "Missing", met: !!profile?.panNumber },
    { name: "Years of Experience", required: "3+ years", present: profile?.yearsOfExperience ? `${profile.yearsOfExperience} years` : "Not specified", met: (profile?.yearsOfExperience || 0) >= 3 },
  ];

  const metCount = criteria.filter(c => c.met).length;
  const score = Math.round((metCount / criteria.length) * 100);
  const eligible = score >= 75;
  const gaps = criteria.filter(c => !c.met).map(c => `${c.name}: ${c.required} required`);
  const suggestions = gaps.map(g => `Update company profile to add: ${g}`);

  res.json({ tenderId, score, eligible, criteria, gaps, suggestions });
});

export default router;
