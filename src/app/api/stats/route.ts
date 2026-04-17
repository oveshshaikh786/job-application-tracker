import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";

import { getEnteredStageAt, isClosed } from "@/domain/application/stage";
import { getFollowUpInfo } from "@/domain/application/followup";
import { getSlaInfo } from "@/domain/application/sla";
import { toMs } from "@/domain/application/time";

type Stage =
  | "DRAFT"
  | "APPLIED"
  | "RECRUITER_SCREEN"
  | "TECH_SCREEN"
  | "ONSITE"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN"
  | "ARCHIVED";

type EventType =
  | "CREATED"
  | "STAGE_CHANGED"
  | "NOTE_ADDED"
  | "FOLLOW_UP_SET"
  | "INTERVIEW_SCHEDULED"
  | "REJECTED"
  | "OFFERED"
  | "META_UPDATED";

type StatsEvent = {
  type: EventType;
  message: string;
  createdAt: string;
};

type StatsApp = {
  id: string;
  stage: Stage;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  nextActionAt: string | null;
  role: {
    title: string | null;
    company: { name: string | null } | null;
  } | null;
  events: StatsEvent[];
};

type VelocityStage = "APPLIED" | "RECRUITER_SCREEN" | "TECH_SCREEN" | "ONSITE";

type StageVelocityRow = {
  avgDays: number;
  count: number;
  stuckRate: number;
  stuckCount: number;
};

type SourceConversionRow = {
  source: string;
  total: number;
  applied: number;
  recruiter: number;
  tech: number;
  onsite: number;
  offer: number;
  appliedToRecruiter: number;
  recruiterToTech: number;
  techToOnsite: number;
  onsiteToOffer: number;
  overall: number;
};

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function rate(a: number, b: number) {
  if (b === 0) return 0;
  return (a / b) * 100;
}

function normalizeSource(source: string | null | undefined) {
  const raw = (source ?? "").trim();
  return raw === "" ? "Unknown" : raw;
}

export async function GET() {
  const workspaceId = DEFAULT_WORKSPACE_ID;
  const nowMs = Date.now();

  const d7Ms = daysAgo(7).getTime();
  const d30Ms = daysAgo(30).getTime();

  const appsRaw = await prisma.application.findMany({
    where: { workspaceId },
    select: {
      id: true,
      stage: true,
      source: true,
      createdAt: true,
      updatedAt: true,
      nextActionAt: true,
      role: {
        select: {
          title: true,
          company: {
            select: { name: true },
          },
        },
      },
      events: {
        where: {
          type: "STAGE_CHANGED",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          type: true,
          message: true,
          createdAt: true,
        },
      },
    },
  });

  const apps: StatsApp[] = appsRaw.map((app) => ({
    id: app.id,
    stage: app.stage as Stage,
    source: app.source,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    nextActionAt: app.nextActionAt ? app.nextActionAt.toISOString() : null,
    role: app.role
      ? {
          title: app.role.title,
          company: app.role.company ? { name: app.role.company.name } : null,
        }
      : null,
    events: app.events.map((e) => ({
      type: e.type as EventType,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
  }));

  const nonArchivedApps = apps.filter((a) => a.stage !== "ARCHIVED");
  const activeApps = nonArchivedApps.filter((a) => !isClosed(a.stage));

  const total = nonArchivedApps.length;
  const active = activeApps.length;

  const created7 = nonArchivedApps.filter(
    (a) => new Date(a.createdAt).getTime() >= d7Ms,
  ).length;

  const created30 = nonArchivedApps.filter(
    (a) => new Date(a.createdAt).getTime() >= d30Ms,
  ).length;

  const overdue = activeApps.filter(
    (a) => getFollowUpInfo(a, nowMs)?.kind === "overdue",
  ).length;

  const dueIn24h = activeApps.filter((a) => {
    const follow = getFollowUpInfo(a, nowMs);
    if (follow?.kind !== "due") return false;
    if (!a.nextActionAt) return false;

    const diff = toMs(a.nextActionAt) - nowMs;
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  }).length;

  const dueIn7d = activeApps.filter((a) => {
    const follow = getFollowUpInfo(a, nowMs);
    if (follow?.kind !== "due") return false;
    if (!a.nextActionAt) return false;

    const diff = toMs(a.nextActionAt) - nowMs;
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const slaBreachedApps = activeApps.filter((a) => {
    const sla = getSlaInfo(a, nowMs);
    return !!sla?.breached;
  });

  const stuck = slaBreachedApps.length;

  let sumStageDays = 0;
  let avgStageDenom = 0;

  for (const app of activeApps) {
    const enteredAt = getEnteredStageAt(app);
    if (!enteredAt) continue;

    const days = (nowMs - enteredAt) / (24 * 60 * 60 * 1000);
    sumStageDays += Math.max(0, days);
    avgStageDenom += 1;
  }

  const avgStageDays =
    avgStageDenom === 0 ? null : sumStageDays / avgStageDenom;

  const stageCounts = {
    APPLIED: 0,
    RECRUITER_SCREEN: 0,
    TECH_SCREEN: 0,
    ONSITE: 0,
    OFFER: 0,
  };

  for (const app of nonArchivedApps) {
    if (app.stage in stageCounts) {
      stageCounts[app.stage as keyof typeof stageCounts] += 1;
    }
  }

  const conversion = {
    appliedToRecruiter: rate(stageCounts.RECRUITER_SCREEN, stageCounts.APPLIED),
    recruiterToTech: rate(
      stageCounts.TECH_SCREEN,
      stageCounts.RECRUITER_SCREEN,
    ),
    techToOnsite: rate(stageCounts.ONSITE, stageCounts.TECH_SCREEN),
    onsiteToOffer: rate(stageCounts.OFFER, stageCounts.ONSITE),
    overall: rate(stageCounts.OFFER, stageCounts.APPLIED),
  };

  const events = await prisma.applicationEvent.findMany({
    where: {
      application: { workspaceId },
      createdAt: { gte: new Date(d30Ms) },
    },
    select: {
      type: true,
      createdAt: true,
    },
  });

  const events7 = events.filter((e) => e.createdAt.getTime() >= d7Ms);

  const moves7 = events7.filter((e) => e.type === "STAGE_CHANGED").length;
  const moves30 = events.filter((e) => e.type === "STAGE_CHANGED").length;

  const notes7 = events7.filter((e) => e.type === "NOTE_ADDED").length;
  const notes30 = events.filter((e) => e.type === "NOTE_ADDED").length;

  const velocityStages: VelocityStage[] = [
    "APPLIED",
    "RECRUITER_SCREEN",
    "TECH_SCREEN",
    "ONSITE",
  ];

  const velocityAcc: Record<
    VelocityStage,
    { totalDays: number; count: number; stuckCount: number }
  > = {
    APPLIED: { totalDays: 0, count: 0, stuckCount: 0 },
    RECRUITER_SCREEN: { totalDays: 0, count: 0, stuckCount: 0 },
    TECH_SCREEN: { totalDays: 0, count: 0, stuckCount: 0 },
    ONSITE: { totalDays: 0, count: 0, stuckCount: 0 },
  };

  for (const app of activeApps) {
    if (!velocityStages.includes(app.stage as VelocityStage)) continue;

    const stage = app.stage as VelocityStage;
    const enteredAt = getEnteredStageAt(app);
    if (!enteredAt) continue;

    const days = (nowMs - enteredAt) / (24 * 60 * 60 * 1000);
    velocityAcc[stage].totalDays += Math.max(0, days);
    velocityAcc[stage].count += 1;

    const sla = getSlaInfo(app, nowMs);
    if (sla?.breached) {
      velocityAcc[stage].stuckCount += 1;
    }
  }

  const stageVelocity: Record<VelocityStage, StageVelocityRow> = {
    APPLIED: {
      avgDays:
        velocityAcc.APPLIED.count === 0
          ? 0
          : velocityAcc.APPLIED.totalDays / velocityAcc.APPLIED.count,
      count: velocityAcc.APPLIED.count,
      stuckRate: rate(
        velocityAcc.APPLIED.stuckCount,
        velocityAcc.APPLIED.count,
      ),
      stuckCount: velocityAcc.APPLIED.stuckCount,
    },
    RECRUITER_SCREEN: {
      avgDays:
        velocityAcc.RECRUITER_SCREEN.count === 0
          ? 0
          : velocityAcc.RECRUITER_SCREEN.totalDays /
            velocityAcc.RECRUITER_SCREEN.count,
      count: velocityAcc.RECRUITER_SCREEN.count,
      stuckRate: rate(
        velocityAcc.RECRUITER_SCREEN.stuckCount,
        velocityAcc.RECRUITER_SCREEN.count,
      ),
      stuckCount: velocityAcc.RECRUITER_SCREEN.stuckCount,
    },
    TECH_SCREEN: {
      avgDays:
        velocityAcc.TECH_SCREEN.count === 0
          ? 0
          : velocityAcc.TECH_SCREEN.totalDays / velocityAcc.TECH_SCREEN.count,
      count: velocityAcc.TECH_SCREEN.count,
      stuckRate: rate(
        velocityAcc.TECH_SCREEN.stuckCount,
        velocityAcc.TECH_SCREEN.count,
      ),
      stuckCount: velocityAcc.TECH_SCREEN.stuckCount,
    },
    ONSITE: {
      avgDays:
        velocityAcc.ONSITE.count === 0
          ? 0
          : velocityAcc.ONSITE.totalDays / velocityAcc.ONSITE.count,
      count: velocityAcc.ONSITE.count,
      stuckRate: rate(velocityAcc.ONSITE.stuckCount, velocityAcc.ONSITE.count),
      stuckCount: velocityAcc.ONSITE.stuckCount,
    },
  };

  const nonEmptyVelocity = Object.entries(stageVelocity).filter(
    ([, row]) => row.count > 0,
  ) as [VelocityStage, StageVelocityRow][];

  const fastestStage =
    nonEmptyVelocity.length === 0
      ? null
      : nonEmptyVelocity.reduce((best, curr) =>
          curr[1].avgDays < best[1].avgDays ? curr : best,
        );

  const slowestStage =
    nonEmptyVelocity.length === 0
      ? null
      : nonEmptyVelocity.reduce((worst, curr) =>
          curr[1].avgDays > worst[1].avgDays ? curr : worst,
        );

  const sourceCounts: Record<string, number> = {};

  for (const app of nonArchivedApps) {
    const key = normalizeSource(app.source);
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1;
  }

  const sourceBreakdown = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));

  const sourceAcc: Record<
    string,
    {
      total: number;
      applied: number;
      recruiter: number;
      tech: number;
      onsite: number;
      offer: number;
    }
  > = {};

  for (const app of nonArchivedApps) {
    const source = normalizeSource(app.source);
    if (!sourceAcc[source]) {
      sourceAcc[source] = {
        total: 0,
        applied: 0,
        recruiter: 0,
        tech: 0,
        onsite: 0,
        offer: 0,
      };
    }

    sourceAcc[source].total += 1;

    if (app.stage === "APPLIED") sourceAcc[source].applied += 1;
    if (app.stage === "RECRUITER_SCREEN") sourceAcc[source].recruiter += 1;
    if (app.stage === "TECH_SCREEN") sourceAcc[source].tech += 1;
    if (app.stage === "ONSITE") sourceAcc[source].onsite += 1;
    if (app.stage === "OFFER") sourceAcc[source].offer += 1;
  }

  const sourceConversion: SourceConversionRow[] = Object.entries(sourceAcc)
    .map(([source, row]) => ({
      source,
      total: row.total,
      applied: row.applied,
      recruiter: row.recruiter,
      tech: row.tech,
      onsite: row.onsite,
      offer: row.offer,
      appliedToRecruiter: rate(row.recruiter, row.applied),
      recruiterToTech: rate(row.tech, row.recruiter),
      techToOnsite: rate(row.onsite, row.tech),
      onsiteToOffer: rate(row.offer, row.onsite),
      overall: rate(row.offer, row.applied),
    }))
    .sort((a, b) => {
      if (b.overall !== a.overall) return b.overall - a.overall;
      if (b.appliedToRecruiter !== a.appliedToRecruiter) {
        return b.appliedToRecruiter - a.appliedToRecruiter;
      }
      return b.total - a.total;
    });

  return NextResponse.json({
    total,
    active,
    overdue,
    stuck,
    avgStageDays,
    dueIn24h,
    dueIn7d,
    created7,
    created30,
    moves7,
    moves30,
    notes7,
    notes30,
    conversion,
    stageVelocity,
    fastestStage: fastestStage
      ? {
          key: fastestStage[0],
          avgDays: fastestStage[1].avgDays,
        }
      : null,
    slowestStage: slowestStage
      ? {
          key: slowestStage[0],
          avgDays: slowestStage[1].avgDays,
        }
      : null,
    sourceBreakdown,
    sourceConversion,
  });
}
