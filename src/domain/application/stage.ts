// src/domain/application/stage.ts
import type { Application, Stage } from "./types";
import { toMs } from "./time";

export function isClosed(stage: Stage): boolean {
  return (
    stage === "REJECTED" ||
    stage === "WITHDRAWN" ||
    stage === "OFFER" ||
    stage === "ARCHIVED"
  );
}

// When we ENTERED current stage
export function getEnteredStageAt(app: Application): number | null {
  const stage = app.stage;

  // ✅ prefer DB truth first
  if (app.stageEnteredAt) return toMs(app.stageEnteredAt);

  const events = app.events ?? [];
  const sorted = [...events].sort(
    (a, b) => toMs(b.createdAt) - toMs(a.createdAt),
  );

  // Format: "APPLIED → RECRUITER_SCREEN"
  const intoStage = sorted.find((e) => {
    if (e.type !== "STAGE_CHANGED") return false;
    const msg = (e.message ?? "").trim();
    return msg.includes("→") && msg.split("→").pop()?.trim() === stage;
  });
  if (intoStage) return toMs(intoStage.createdAt);

  // Alternative format: "Stage changed to APPLIED"
  const intoStageAlt = sorted.find((e) => {
    if (e.type !== "STAGE_CHANGED") return false;
    const msg = (e.message ?? "").trim().toUpperCase();
    return msg.includes(`STAGE CHANGED TO ${stage}`);
  });
  if (intoStageAlt) return toMs(intoStageAlt.createdAt);

  // fallback only for old records
  if (app.createdAt) return toMs(app.createdAt);

  return null;
}