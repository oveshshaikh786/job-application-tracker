import Analytics from "../Analytics";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";

export default async function AnalyticsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const applications = await prisma.application.findMany({
    where: { workspaceId },
    include: { role: { include: { company: true } } },
  });

  const totalApplications = applications.length;
  const activeApplications = applications.filter((a) =>
    ["APPLIED", "RECRUITER_SCREEN", "TECH_SCREEN", "ONSITE"].includes(a.stage),
  ).length;
  const rejectedApplications = applications.filter((a) => a.stage === "REJECTED").length;
  const offers = applications.filter((a) => a.stage === "OFFER").length;
  const withdrawn = applications.filter((a) => a.stage === "WITHDRAWN").length;

  const sourceBreakdown: Record<string, number> = {};
  for (const app of applications) {
    const source = app.source || "Unknown";
    sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
  }

  const stageBreakdown: Record<string, number> = {};
  for (const app of applications) {
    stageBreakdown[app.stage] = (stageBreakdown[app.stage] || 0) + 1;
  }

  // Weekly trend (last 8 weeks)
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const weeklyTrend: { week: string; applied: number; rejected: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = nowMs - (w + 1) * WEEK_MS;
    const weekEnd = nowMs - w * WEEK_MS;
    const label = new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeklyTrend.push({
      week: label,
      applied: applications.filter((a) => { const t = a.createdAt.getTime(); return t >= weekStart && t < weekEnd; }).length,
      rejected: applications.filter((a) => { if (a.stage !== "REJECTED") return false; const t = a.updatedAt.getTime(); return t >= weekStart && t < weekEnd; }).length,
    });
  }

  // Time-in-stage: avg days apps spent/spending in each stage
  const STAGE_ORDER = ["DRAFT","APPLIED","RECRUITER_SCREEN","TECH_SCREEN","ONSITE","OFFER","REJECTED","WITHDRAWN"];
  const timeInStage: Record<string, number[]> = {};
  for (const app of applications) {
    const enteredMs = app.stageEnteredAt.getTime();
    const exitMs = ["REJECTED","WITHDRAWN","OFFER"].includes(app.stage) ? app.updatedAt.getTime() : nowMs;
    const days = Math.round((exitMs - enteredMs) / 86_400_000);
    if (!timeInStage[app.stage]) timeInStage[app.stage] = [];
    timeInStage[app.stage].push(days);
  }
  const avgTimeInStage: { stage: string; avgDays: number }[] = STAGE_ORDER.map((s) => ({
    stage: s,
    avgDays: timeInStage[s]?.length
      ? Math.round(timeInStage[s].reduce((a,b) => a+b, 0) / timeInStage[s].length)
      : 0,
  })).filter((x) => x.avgDays > 0);

  // Salary stats (only apps with salary data)
  const appsWithSalary = applications.filter((a: any) => a.salaryMin || a.salaryMax);
  const salaryRanges = appsWithSalary.map((a: any) => ({    company: a.role?.company?.name ?? "Unknown",
    min: a.salaryMin ?? 0,
    max: a.salaryMax ?? 0,
    currency: a.salaryCurrency ?? "USD",
  }));

  // Response rate by source
  const sourceResponse: Record<string, { total: number; responded: number }> = {};
  for (const app of applications) {
    const s = app.source || "Unknown";
    if (!sourceResponse[s]) sourceResponse[s] = { total: 0, responded: 0 };
    sourceResponse[s].total++;
    if (!["APPLIED","DRAFT"].includes(app.stage)) sourceResponse[s].responded++;
  }
  const sourceResponseRate = Object.entries(sourceResponse)
    .filter(([, v]) => v.total >= 1)
    .map(([source, v]) => ({ source, rate: Math.round((v.responded / v.total) * 100), total: v.total }))
    .sort((a, b) => b.rate - a.rate);

  // Export data
  const exportRows = applications.map((a: any) => ({
    id: a.id,
    company: a.role?.company?.name ?? "",
    title: a.role?.title ?? "",
    stage: a.stage,
    source: a.source ?? "",
    salaryMin: a.salaryMin ?? "",
    salaryMax: a.salaryMax ?? "",
    salaryCurrency: a.salaryCurrency ?? "",
    contactName: a.contactName ?? "",
    contactEmail: a.contactEmail ?? "",
    excitement: a.excitement ?? "",
    appliedAt: a.appliedAt?.toISOString() ?? "",
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <Analytics
      stats={{
        totalApplications, activeApplications, rejectedApplications,
        offers, withdrawn, sourceBreakdown, stageBreakdown, weeklyTrend,
        avgTimeInStage, salaryRanges, sourceResponseRate, exportRows,
      }}
    />
  );
}
