export type Stage =
  | "DRAFT"
  | "APPLIED"
  | "RECRUITER_SCREEN"
  | "TECH_SCREEN"
  | "ONSITE"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN"
  | "ARCHIVED";

export type EventRow = {
  type: string;
  createdAt: string; // ISO
  message?: string | null;
};

export type Application = {
  id: string;
  stage: Stage;
  source?: string | null;
  updatedAt?: string;
  createdAt?: string;
  nextActionAt?: string | null;

  // ✅ source-of-truth for time in stage
  stageEnteredAt?: string | null;

  // ✅ archive metadata
  archivedAt?: string | null;
  archivedFromStage?: Stage | null;

  role?: {
    title?: string | null;
    company?: { name?: string | null } | null;
  } | null;

  events?: EventRow[];
};