import type { Application } from "./types";
import { isClosed, getEnteredStageAt } from "./stage";
import { getFollowUpInfo } from "./followup";
import { getSlaInfo } from "./sla";
import { toMs } from "./time";

export type TodayQueuePillKind =
  | "overdue"
  | "due"
  | "stuck"
  | "sla"
  | "ghosted";

export type TodayQueueItem = {
  id: string;
  title: string;
  company: string;
  source: string;
  stage: Application["stage"];
  stageAgeDays: number;
  rightPill: { label: string; kind: TodayQueuePillKind };
};

export type TodayQueueBuckets = {
  overdue: TodayQueueItem[];
  due24h: TodayQueueItem[];
  ghostedNoResponse: TodayQueueItem[];
  stuckNoFollowUp: TodayQueueItem[];
  slaBreachedNoFollowUp: TodayQueueItem[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const GHOST_DAYS = 7;

function toItem(
  app: Application,
  pill: TodayQueueItem["rightPill"],
  stageAgeDays: number,
): TodayQueueItem {
  return {
    id: app.id,
    title: app.role?.title ?? "Untitled",
    company: app.role?.company?.name ?? "Unknown company",
    source: app.source ?? "—",
    stage: app.stage,
    stageAgeDays,
    rightPill: pill,
  };
}

function safeToMs(iso?: string | null) {
  if (!iso) return null;
  const n = toMs(iso);
  return Number.isFinite(n) ? n : null;
}

function safeStageAgeDays(app: Application, nowMs: number) {
  const entered = getEnteredStageAt(app);
  const enteredMs =
    entered ?? safeToMs(app.updatedAt) ?? safeToMs(app.createdAt);

  if (!enteredMs) return 0;

  const d = Math.floor((nowMs - enteredMs) / DAY_MS);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function stageWeight(stage: Application["stage"]): number {
  switch (stage) {
    case "ONSITE":
      return 60;
    case "TECH_SCREEN":
      return 55;
    case "RECRUITER_SCREEN":
      return 50;
    case "OFFER":
      return 45;
    case "APPLIED":
      return 40;
    case "DRAFT":
      return 10;
    default:
      return 0;
  }
}

type Ranked = { item: TodayQueueItem; score: number };

function topSortDesc(a: Ranked, b: Ranked) {
  return b.score - a.score;
}

export function buildTodayQueue(
  apps: Application[],
  nowMs: number,
): TodayQueueBuckets {
  const overdue: Ranked[] = [];
  const due24h: Ranked[] = [];
  const ghostedNoResponse: Ranked[] = [];
  const stuckNoFollowUp: Ranked[] = [];
  const slaBreachedNoFollowUp: Ranked[] = [];

  for (const app of apps) {
    if (isClosed(app.stage)) continue;

    const follow = getFollowUpInfo(app, nowMs);
    const sla = getSlaInfo(app, nowMs);

    const sw = stageWeight(app.stage);
    const stageAgeDays = safeStageAgeDays(app, nowMs);

    if (follow?.kind === "overdue") {
      const dueMs = safeToMs(app.nextActionAt) ?? nowMs;
      const overdueMs = nowMs - dueMs;

      overdue.push({
        item: toItem(
          app,
          { kind: "overdue", label: follow.label },
          stageAgeDays,
        ),
        score: overdueMs / 60_000 + sw * 1000,
      });
      continue;
    }

    if (follow?.kind === "due") {
      const dueMs = safeToMs(app.nextActionAt);
      if (dueMs) {
        const diff = dueMs - nowMs;
        if (diff > 0 && diff <= DAY_MS) {
          due24h.push({
            item: toItem(
              app,
              { kind: "due", label: follow.label },
              stageAgeDays,
            ),
            score: (DAY_MS - diff) / 60_000 + sw * 1000,
          });
          continue;
        }
      }
    }

    if (
      app.stage === "APPLIED" &&
      !app.nextActionAt &&
      stageAgeDays >= GHOST_DAYS
    ) {
      ghostedNoResponse.push({
        item: toItem(
          app,
          {
            kind: "ghosted",
            label: `No response • ${stageAgeDays}d`,
          },
          stageAgeDays,
        ),
        score: stageAgeDays * 12_000 + sw * 1000,
      });
      continue;
    }

    if (sla?.breached) {
      const days =
        typeof sla.daysInt === "number" && Number.isFinite(sla.daysInt)
          ? Math.max(0, Math.floor(sla.daysInt))
          : stageAgeDays;

      const labelBase = days > 0 ? `SLA breached • ${days}d` : "SLA breached";
      const label =
        follow?.kind === "due" ? `${labelBase} • ${follow.label}` : labelBase;

      slaBreachedNoFollowUp.push({
        item: toItem(app, { kind: "sla", label }, stageAgeDays),
        score: days * 10_000 + sw * 1000,
      });
      continue;
    }

    if (!app.nextActionAt && stageAgeDays >= 7) {
      stuckNoFollowUp.push({
        item: toItem(
          app,
          { kind: "stuck", label: `Stuck • ${stageAgeDays}d` },
          stageAgeDays,
        ),
        score: stageAgeDays * 5_000 + sw * 1000,
      });
      continue;
    }
  }

  overdue.sort(topSortDesc);
  due24h.sort(topSortDesc);
  ghostedNoResponse.sort(topSortDesc);
  slaBreachedNoFollowUp.sort(topSortDesc);
  stuckNoFollowUp.sort(topSortDesc);

  return {
    overdue: overdue.map((x) => x.item),
    due24h: due24h.map((x) => x.item),
    ghostedNoResponse: ghostedNoResponse.map((x) => x.item),
    stuckNoFollowUp: stuckNoFollowUp.map((x) => x.item),
    slaBreachedNoFollowUp: slaBreachedNoFollowUp.map((x) => x.item),
  };
}
