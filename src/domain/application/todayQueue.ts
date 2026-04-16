import type { Application } from "./types";
import { isClosed, getEnteredStageAt } from "./stage";
import { getFollowUpInfo } from "./followup";
import { getSlaInfo } from "./sla";
import { toMs } from "./time";

export type TodayQueuePillKind = "overdue" | "due" | "stuck" | "sla";

export type TodayQueueItem = {
  id: string;
  title: string;
  company: string;
  source: string;
  rightPill: { label: string; kind: TodayQueuePillKind };
};

export type TodayQueueBuckets = {
  overdue: TodayQueueItem[];
  due24h: TodayQueueItem[];
  stuckNoFollowUp: TodayQueueItem[];
  // NOTE: name kept for compatibility, but bucket may include items WITH follow-ups
  slaBreachedNoFollowUp: TodayQueueItem[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toItem(app: Application, pill: TodayQueueItem["rightPill"]): TodayQueueItem {
  return {
    id: app.id,
    title: app.role?.title ?? "Untitled",
    company: app.role?.company?.name ?? "Unknown company",
    source: app.source ?? "—",
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
  const enteredMs = entered ? entered : (safeToMs(app.updatedAt) ?? safeToMs(app.createdAt));
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

export function buildTodayQueue(apps: Application[], nowMs: number): TodayQueueBuckets {
  const overdue: Ranked[] = [];
  const due24h: Ranked[] = [];
  const stuckNoFollowUp: Ranked[] = [];
  const slaBreachedNoFollowUp: Ranked[] = [];

  for (const a of apps) {
    if (isClosed(a.stage)) continue;

    const follow = getFollowUpInfo(a, nowMs);
    const sla = getSlaInfo(a, nowMs);

    const sw = stageWeight(a.stage);
    const stageAgeDays = safeStageAgeDays(a, nowMs);

    // 1) Overdue follow-up
    if (follow?.kind === "overdue") {
      const dueMs = safeToMs(a.nextActionAt) ?? nowMs;
      const overdueMs = nowMs - dueMs;

      overdue.push({
        item: toItem(a, { kind: "overdue", label: follow.label }),
        score: overdueMs / 60_000 + sw * 1000,
      });
      continue;
    }

    // 2) Due within 24h (must be future)
    if (follow?.kind === "due") {
      const dueMs = safeToMs(a.nextActionAt);
      if (dueMs) {
        const diff = dueMs - nowMs;
        if (diff > 0 && diff <= DAY_MS) {
          due24h.push({
            item: toItem(a, { kind: "due", label: follow.label }),
            score: (DAY_MS - diff) / 60_000 + sw * 1000,
          });
          continue;
        }
      }
    }

    // 3) SLA breached (show even if follow-up exists, unless it was due soon/overdue above)
    if (sla?.breached) {
      const days =
        typeof sla.daysInt === "number" && Number.isFinite(sla.daysInt)
          ? Math.max(0, Math.floor(sla.daysInt))
          : stageAgeDays;

      const labelBase = days > 0 ? `SLA breached • ${days}d` : "SLA breached";
      const label = follow?.kind === "due" ? `${labelBase} • ${follow.label}` : labelBase;

      slaBreachedNoFollowUp.push({
        item: toItem(a, { kind: "sla", label }),
        score: days * 10_000 + sw * 1000,
      });
      continue;
    }

    // 4) Stuck (ONLY if no follow-up)
    if (!a.nextActionAt && stageAgeDays >= 7) {
      stuckNoFollowUp.push({
        item: toItem(a, { kind: "stuck", label: `Stuck • ${stageAgeDays}d` }),
        score: stageAgeDays * 5_000 + sw * 1000,
      });
      continue;
    }
  }

  overdue.sort(topSortDesc);
  due24h.sort(topSortDesc);
  slaBreachedNoFollowUp.sort(topSortDesc);
  stuckNoFollowUp.sort(topSortDesc);

  return {
    overdue: overdue.map((x) => x.item),
    due24h: due24h.map((x) => x.item),
    stuckNoFollowUp: stuckNoFollowUp.map((x) => x.item),
    slaBreachedNoFollowUp: slaBreachedNoFollowUp.map((x) => x.item),
  };
}