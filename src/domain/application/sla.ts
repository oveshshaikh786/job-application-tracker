import type { Application, Stage } from "./types";
import { isClosed, getEnteredStageAt } from "./stage";

const DAY_MS = 24 * 60 * 60 * 1000;

export const SLA_DAYS: Partial<Record<Stage, number>> = {
  APPLIED: 7,
  RECRUITER_SCREEN: 7,
  TECH_SCREEN: 10,
  ONSITE: 14,
};

export function getSlaInfo(app: Application, nowMs: number) {
  if (isClosed(app.stage)) return null;

  const thresholdDays = SLA_DAYS[app.stage];
  if (!thresholdDays) return null;

  const enteredAt =
  getEnteredStageAt(app) ??
  (app.updatedAt ? new Date(app.updatedAt).getTime() : null) ??
  (app.createdAt ? new Date(app.createdAt).getTime() : null);

if (!enteredAt) return null;

const ageDays = (nowMs - enteredAt) / DAY_MS;

  const severity =
    ageDays > thresholdDays * 1.5
      ? ("critical" as const)
      : ageDays > thresholdDays
        ? ("breach" as const)
        : ageDays > thresholdDays * 0.8
          ? ("warning" as const)
          : null;

  const breached = ageDays > thresholdDays;

  return {
    thresholdDays,
    ageDays,
    daysInt: Math.floor(ageDays),
    severity,
    breached,
  };
}
