// src/domain/application/selectors.ts
import type { Application, Stage } from "./types";
import { isClosed, getEnteredStageAt } from "./stage";
import { getSlaInfo } from "./sla";
import { getFollowUpInfo } from "./followup";

type FilterFlags = {
  filterSlaBreached?: boolean;
  filterOverdue?: boolean;
  filterNeedsFollowUp?: boolean;
};

export function filterApplications(
  apps: Application[],
  nowMs: number,
  flags: FilterFlags,
): Application[] {
  const {
    filterSlaBreached = false,
    filterOverdue = false,
    filterNeedsFollowUp = false,
  } = flags ?? {};

  // Always hide archived from the main dashboard.
  let out = apps.filter((a) => a.stage !== "ARCHIVED");

  // If no filters are on, we still keep all non-archived items.
  if (!filterSlaBreached && !filterOverdue && !filterNeedsFollowUp) {
    return out;
  }

  out = out.filter((a) => {
    // closed stages can still show IF you want; current app hides closed in many places anyway.
    // We'll keep them in filtering only if they match — but typically they won't.
    if (a.stage === "ARCHIVED") return false;

    const sla = getSlaInfo(a, nowMs);
    const follow = getFollowUpInfo(a, nowMs);

    if (filterSlaBreached && !sla?.breached) return false;
    if (filterOverdue && !(follow?.kind === "overdue")) return false;

    // "Needs follow-up" = no follow-up set AND not closed
    if (filterNeedsFollowUp) {
      if (isClosed(a.stage)) return false;
      if (a.nextActionAt) return false;
    }

    return true;
  });

  return out;
}

export function groupByStage(
  apps: Application[],
  stageOrder: Stage[],
  sortByOldestInStage: boolean,
): Record<Stage, Application[]> {
  const map: Record<Stage, Application[]> = stageOrder.reduce(
    (acc, s) => {
      acc[s] = [];
      return acc;
    },
    {} as Record<Stage, Application[]>,
  );

  for (const a of apps) {
    const key = stageOrder.includes(a.stage) ? a.stage : stageOrder[0];
    (map[key] ?? (map[key] = [])).push(a);
  }

  if (sortByOldestInStage) {
    for (const s of stageOrder) {
      map[s].sort((a, b) => {
        const ea = getEnteredStageAt(a) ?? Number.POSITIVE_INFINITY;
        const eb = getEnteredStageAt(b) ?? Number.POSITIVE_INFINITY;
        return ea - eb; // oldest first
      });
    }
  }

  return map;
}
