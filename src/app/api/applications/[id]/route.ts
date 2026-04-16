import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
//import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { ApplicationStage, EventType } from "@prisma/client";
import { WORKSPACE_ID } from "@/lib/workspace";

//const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

const ALLOWED_STAGES: ApplicationStage[] = [
  ApplicationStage.DRAFT,
  ApplicationStage.APPLIED,
  ApplicationStage.RECRUITER_SCREEN,
  ApplicationStage.TECH_SCREEN,
  ApplicationStage.ONSITE,
  ApplicationStage.OFFER,
  ApplicationStage.REJECTED,
  ApplicationStage.WITHDRAWN,
  ApplicationStage.ARCHIVED,
];

function isUuid(v: string) {
  return /^[0-9a-f-]{36}$/i.test(v);
}

function parseNextActionAt(input: unknown): Date | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== "string") return undefined;

  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function sameInstant(a: Date | null | undefined, b: Date | null | undefined) {
  const at = a ? a.getTime() : null;
  const bt = b ? b.getTime() : null;
  return at === bt;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const app = await prisma.application.findFirst({
    where: {
      id,
      workspaceId: WORKSPACE_ID,
    },
    include: {
      role: { include: { company: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(app);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const nextStageRaw = body?.stage as unknown;
    const nextStage =
      typeof nextStageRaw === "string"
        ? (nextStageRaw as ApplicationStage)
        : undefined;

    const wantsNextActionUpdate = body && "nextActionAt" in body;
    const nextActionAtParsed = parseNextActionAt(body?.nextActionAt);

    if (nextStage !== undefined && !ALLOWED_STAGES.includes(nextStage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    if (wantsNextActionUpdate && nextActionAtParsed === undefined) {
      return NextResponse.json(
        { error: "Invalid nextActionAt (must be ISO string or null)" },
        { status: 400 },
      );
    }

    const wantsStageUpdate = nextStage !== undefined;

    if (!wantsStageUpdate && !wantsNextActionUpdate) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.application.findFirst({
        where: {
          id,
          workspaceId: WORKSPACE_ID,
        },
        select: {
          id: true,
          stage: true,
          nextActionAt: true,
          archivedAt: true,
          archivedFromStage: true,
        },
      });

      if (!current) return null;

      const now = new Date();

      const data: {
        stage?: ApplicationStage;
        nextActionAt?: Date | null;
        updatedAt: Date;
        stageEnteredAt?: Date;
        archivedAt?: Date | null;
        archivedFromStage?: ApplicationStage | null;
      } = { updatedAt: now };

      if (wantsNextActionUpdate) {
        const prev = current.nextActionAt;
        const next = nextActionAtParsed;

        if (!sameInstant(prev, next)) {
          data.nextActionAt = next;

          await tx.applicationEvent.create({
            data: {
              applicationId: current.id,
              type: next
                ? EventType.FOLLOW_UP_SET
                : EventType.FOLLOW_UP_CLEARED,
              message: next
                ? `Follow-up set: ${next.toISOString()}`
                : "Follow-up cleared",
            },
          });

          await tx.applicationEvent.create({
            data: {
              applicationId: current.id,
              type: EventType.META_UPDATED,
              message: "nextActionAt updated",
            },
          });
        }
      }

      if (wantsStageUpdate && current.stage !== nextStage) {
        const fromStage = current.stage;
        const toStage = nextStage!;

        data.stage = toStage;
        data.stageEnteredAt = now;

        if (toStage === ApplicationStage.ARCHIVED) {
          data.archivedAt = now;
          data.archivedFromStage =
            fromStage === ApplicationStage.ARCHIVED ? null : fromStage;
        } else if (fromStage === ApplicationStage.ARCHIVED) {
          data.archivedAt = null;
          data.archivedFromStage = null;
        }

        await tx.applicationEvent.create({
          data: {
            applicationId: current.id,
            type: EventType.STAGE_CHANGED,
            message: `${fromStage} → ${toStage}`,
          },
        });
      }

      return tx.application.update({
        where: { id },
        data,
        include: {
          role: { include: { company: true } },
          events: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/applications/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Server error",
        detail: error?.message ?? "Unknown error",
        code: error?.code ?? null,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.application.findFirst({
    where: {
      id,
      workspaceId: WORKSPACE_ID,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.application.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
