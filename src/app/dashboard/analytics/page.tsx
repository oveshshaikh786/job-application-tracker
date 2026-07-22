import Analytics from "../Analytics";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";

export default async function AnalyticsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const applications = await prisma.application.findMany({
    where: { workspaceId },
    include: { role: true },
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

  return (
    <Analytics stats={{ totalApplications, activeApplications, rejectedApplications, offers, withdrawn, sourceBreakdown, stageBreakdown, weeklyTrend }} />
  );
}
