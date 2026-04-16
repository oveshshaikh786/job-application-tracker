import type { Application } from "./types";
import { fmtAgoShort, toMs } from "./time";
import { isClosed } from "./stage";

export function getFollowUpInfo(app: Application, nowMs: number) {
  if (!app.nextActionAt) return null;
  if (isClosed(app.stage)) return null;

  const t = toMs(app.nextActionAt);
  const diff = t - nowMs;

  if (diff < 0) {
    return {
      kind: "overdue" as const,
      label: `Overdue (${fmtAgoShort(-diff)})`,
    };
  }

  return { kind: "due" as const, label: `Follow-up in ${fmtAgoShort(diff)}` };
}
