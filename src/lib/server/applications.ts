import "server-only";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import type { Application } from "@/domain/application/types";

// ---------------------------------------------------------------------------
// Shared serializer — converts a Prisma row (Date objects) to the domain type
// ---------------------------------------------------------------------------
// PrismaRow intentionally omits `interviews` until `prisma generate` is re-run after schema update.
// New fields (salary, contact, excitement, etc.) and interviews are accessed via (row as any).
type PrismaRow = Awaited<
  ReturnType<
    typeof prisma.application.findFirst<{
      include: {
        role: { include: { company: true } };
        events: true;
      };
    }>
  >
>;

function serializeApplication(row: NonNullable<PrismaRow> | any): Application {
  return {
    id: row.id,
    stage: row.stage as Application["stage"],
    source: row.source,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    nextActionAt: row.nextActionAt?.toISOString() ?? null,
    stageEnteredAt: row.stageEnteredAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    archivedFromStage:
      (row.archivedFromStage as Application["archivedFromStage"]) ?? null,
    notes: row.notes,
    salaryMin: (row as any).salaryMin ?? null,
    salaryMax: (row as any).salaryMax ?? null,
    salaryCurrency: (row as any).salaryCurrency ?? null,
    contactName: (row as any).contactName ?? null,
    contactEmail: (row as any).contactEmail ?? null,
    contactRole: (row as any).contactRole ?? null,
    excitement: (row as any).excitement ?? null,
    jobDescription: (row as any).jobDescription ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
    workspaceId: row.workspaceId,
    roleId: row.roleId,
    role: row.role
      ? {
          id: row.role.id,
          title: row.role.title,
          url: row.role.url,
          location: row.role.location,
          workType: row.role.workType,
          description: row.role.description,
          createdAt: row.role.createdAt.toISOString(),
          updatedAt: row.role.updatedAt?.toISOString(),
          companyId: row.role.companyId,
          company: row.role.company
            ? {
                id: row.role.company.id,
                name: row.role.company.name,
                website: row.role.company.website,
                location: row.role.company.location,
                industry: row.role.company.industry,
                createdAt: row.role.company.createdAt.toISOString(),
                updatedAt: row.role.company.updatedAt?.toISOString(),
              }
            : null,
        }
      : null,
    events: row.events.map((e: any) => ({
      id: e.id,
      type: e.type as import("@/domain/application/types").EventType,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
    interviews: ((row as any).interviews ?? []).map((ir: any) => ({
      id: ir.id,
      round: ir.round,
      type: ir.type,
      scheduledAt: ir.scheduledAt?.toISOString() ?? null,
      completedAt: ir.completedAt?.toISOString() ?? null,
      outcome: ir.outcome as import("@/domain/application/types").InterviewOutcome,
      notes: ir.notes ?? null,
      interviewers: ir.interviewers ?? null,
      createdAt: ir.createdAt.toISOString(),
      updatedAt: ir.updatedAt.toISOString(),
      applicationId: ir.applicationId,
    })),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** All active (non-archived) applications for the current workspace. */
export async function getApplications(
  workspaceId?: string,
): Promise<Application[]> {
  const wsId = workspaceId ?? (await getCurrentWorkspaceId());
  const rows = await (prisma as any).application.findMany({
    where: { workspaceId: wsId },
    include: {
      role: { include: { company: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (rows as any[]).map(serializeApplication);
}

/** Archived applications for the current workspace. */
export async function getArchivedApplications(
  workspaceId?: string,
): Promise<Application[]> {
  const wsId = workspaceId ?? (await getCurrentWorkspaceId());
  const rows = await (prisma as any).application.findMany({
    where: { workspaceId: wsId, stage: "ARCHIVED" },
    include: {
      role: { include: { company: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ archivedAt: "desc" }, { updatedAt: "desc" }],
  });
  return (rows as any[]).map(serializeApplication);
}

/** Single application by id — returns null if not found or not in workspace. */
export async function getApplicationById(
  id: string,
  workspaceId?: string,
): Promise<Application | null> {
  const wsId = workspaceId ?? (await getCurrentWorkspaceId());
  const row = await (prisma as any).application.findFirst({
    where: { id, workspaceId: wsId },
    include: {
      role: { include: { company: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!row) return null;
  return serializeApplication(row as any);
}

/** Raw Prisma shape (with Date objects) — used in server-only contexts. */
export type ApplicationWithRelations = Awaited<
  ReturnType<typeof prisma.application.findMany>
>[number] & {
  role: { company: NonNullable<unknown> } | null;
  events: NonNullable<unknown>[];
};
