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

export type EventType =
  | "CREATED"
  | "STAGE_CHANGED"
  | "NOTE_ADDED"
  | "FOLLOW_UP_SET"
  | "FOLLOW_UP_CLEARED"
  | "INTERVIEW_SCHEDULED"
  | "REJECTED"
  | "OFFERED"
  | "META_UPDATED";

export type ApplicationEvent = {
  id?: string;
  type: EventType;
  message: string;
  createdAt: string;
};

export type EventRow = ApplicationEvent;

export type Company = {
  id?: string;
  name: string | null;
  website?: string | null;
  location?: string | null;
  industry?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Role = {
  id?: string;
  title: string | null;
  url?: string | null;
  location?: string | null;
  workType?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  companyId?: string;
  company?: Company | null;
};

export type Application = {
  id: string;
  stage: Stage;
  source?: string | null;
  appliedAt?: string | null;
  nextActionAt?: string | null;
  stageEnteredAt?: string | null;

  archivedAt?: string | null;
  archivedFromStage?: Stage | null;

  notes?: string | null;
  createdAt: string;
  updatedAt?: string;

  workspaceId?: string;
  roleId?: string;
  role?: Role | null;

  events?: ApplicationEvent[];
};
