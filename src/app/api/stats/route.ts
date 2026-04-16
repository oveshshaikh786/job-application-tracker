import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
//import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { ApplicationStage } from "@prisma/client";

import type { Application, Stage } from "@/domain/application/types";
import { isClosed, getEnteredStageAt } from "@/domain/application/stage";
import { getFollowUpInfo } from "@/domain/application/followup";
import { getSlaInfo } from "@/domain/application/sla";
import { toMs } from "@/domain/application/time";
import { WORKSPACE_ID } from "@/lib/workspace";

//const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;
const DAY_MS = 24 * 60 * 60 * 1000;

const UI_STAGE_ORDER: ApplicationStage[] = [
  ApplicationStage.DRAFT,
  ApplicationStage.APPLIED,
  ApplicationStage.RECRUITER_SCREEN,
  ApplicationStage.TECH_SCREEN,
  ApplicationStage.ONSITE,
  ApplicationStage.OFFER,
  ApplicationStage.REJECTED,
  ApplicationStage.WITHDRAWN,
];

const UI_STAGE_LABEL: Record<ApplicationStage, string> = {
  DRAFT: "Draft",
  APPLIED: "Applied",
  RECRUITER_SCREEN: "Recruiter",
  TECH_SCREEN: "Tech",
  ONSITE: "Onsite",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  ARCHIVED: "Archived",
};

function prismaStageToDomain(stage: ApplicationStage): Stage {
  return stage as unknown as Stage;
}

function domainStageToPrisma(stage: Stage): ApplicationStage {
  return stage as unknown as ApplicationStage;
}

function toDomainApplication(a: {
  id: string;
  stage: ApplicationStage;
  source: string | null;
  updatedAt: Date;
  createdAt: Date;
  nextActionAt: Date | null;
  role: {
    title: string | null;
    company: { name: string | null } | null;
  } | null;
  events: { type: string; message: string; createdAt: Date }[];
}): Application {
  return {
    id: a.id,
    stage: prismaStageToDomain(a.stage),
    source: a.source,
    updatedAt: a.updatedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    nextActionAt: a.nextActionAt ? a.nextActionAt.toISOString() : null,
    role: a.role
      ? {
          title: a.role.title,
          company: a.role.company ? { name: a.role.company.name } : null,
        }
      : null,
    events: (a.events ?? []).map((e) => ({
      type: e.type,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function GET() {
  const nowMs = Date.now();

  const prismaApps = await prisma.application.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
    },
    include: {
      role: { include: { company: true } },
      events: {
        where: { type: "STAGE_CHANGED" },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const allApps: Application[] = prismaApps.map(toDomainApplication);

  const archivedApps = allApps.filter((a) => a.stage === "ARCHIVED");
  const apps = allApps.filter((a) => a.stage !== "ARCHIVED");

  const total = apps.length;
  const activeApps = apps.filter((a) => !isClosed(a.stage));
  const active = activeApps.length;

  const overdueApps = activeApps.filter(
    (a) => getFollowUpInfo(a, nowMs)?.kind === "overdue",
  );

  const dueIn24hApps = activeApps.filter((a) => {
    const follow = getFollowUpInfo(a, nowMs);
    if (follow?.kind !== "due") return false;
    if (!a.nextActionAt) return false;
    const diff = toMs(a.nextActionAt) - nowMs;
    return diff >= 0 && diff <= DAY_MS;
  });

  const dueIn7dApps = activeApps.filter((a) => {
    const follow = getFollowUpInfo(a, nowMs);
    if (follow?.kind !== "due") return false;
    if (!a.nextActionAt) return false;
    const diff = toMs(a.nextActionAt) - nowMs;
    return diff >= 0 && diff <= 7 * DAY_MS;
  });

  const slaBreachedApps = activeApps.filter((a) => {
    const sla = getSlaInfo(a, nowMs);
    return !!sla?.breached;
  });

  let sumStageDays = 0;
  let denom = 0;

  for (const a of activeApps) {
    const enteredAt = getEnteredStageAt(a);
    if (!enteredAt) continue;
    const days = Math.floor((nowMs - enteredAt) / DAY_MS);
    sumStageDays += days;
    denom += 1;
  }

  const avgStageDays = denom === 0 ? null : sumStageDays / denom;

  const stageCounts: Record<ApplicationStage, number> = Object.fromEntries(
    UI_STAGE_ORDER.map((s) => [s, 0]),
  ) as Record<ApplicationStage, number>;

  for (const a of apps) {
    const ps = domainStageToPrisma(a.stage);
    if (ps in stageCounts) stageCounts[ps] = (stageCounts[ps] ?? 0) + 1;
  }

  const overdueByStage: Record<ApplicationStage, number> = Object.fromEntries(
    UI_STAGE_ORDER.map((s) => [s, 0]),
  ) as Record<ApplicationStage, number>;

  for (const a of overdueApps) {
    const ps = domainStageToPrisma(a.stage);
    if (ps in overdueByStage)
      overdueByStage[ps] = (overdueByStage[ps] ?? 0) + 1;
  }

  const stuckByStage: Record<ApplicationStage, number> = Object.fromEntries(
    UI_STAGE_ORDER.map((s) => [s, 0]),
  ) as Record<ApplicationStage, number>;

  for (const a of slaBreachedApps) {
    const ps = domainStageToPrisma(a.stage);
    if (ps in stuckByStage) stuckByStage[ps] = (stuckByStage[ps] ?? 0) + 1;
  }

  const funnelStages: ApplicationStage[] = [
    ApplicationStage.APPLIED,
    ApplicationStage.RECRUITER_SCREEN,
    ApplicationStage.TECH_SCREEN,
    ApplicationStage.ONSITE,
    ApplicationStage.OFFER,
  ];

  const funnelRows = funnelStages.map((s, idx) => {
    const count = stageCounts[s] ?? 0;
    const prev = idx === 0 ? null : (stageCounts[funnelStages[idx - 1]] ?? 0);

    const fromPrevPct =
      prev === null || prev === 0
        ? "—"
        : `${Math.round((count / prev) * 100)}%`;

    const dropPct =
      prev === null || prev === 0
        ? "—"
        : `${Math.round(((prev - count) / prev) * 100)}%`;

    return {
      key: s,
      label: UI_STAGE_LABEL[s],
      count,
      fromPrevPct,
      dropPct,
    };
  });

  return NextResponse.json({
    title: "Job Tracker",
    subtitle: "Kanban pipeline (v0)",
    total,
    active,
    overdue: overdueApps.length,
    stuck: slaBreachedApps.length,
    avgStageDays,
    dueIn24h: dueIn24hApps.length,
    dueIn7d: dueIn7dApps.length,
    stageOrder: UI_STAGE_ORDER,
    stageLabel: UI_STAGE_LABEL,
    stageCounts,
    overdueByStage,
    stuckByStage,
    funnelRows,
    archived: archivedApps.length,
  });
}
