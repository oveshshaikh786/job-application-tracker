import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { ApplicationStage, EventType } from "@prisma/client";

const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

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

type BulkAction =
  | "SET_FOLLOW_UP"
  | "CLEAR_FOLLOW_UP"
  | "MOVE_STAGE"
  | "ARCHIVE"
  | "DELETE";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

function parseNextActionAt(input: unknown): Date | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== "string") return undefined;

  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const idsRaw = body?.ids;
  const action = body?.action as BulkAction | undefined;
  const stageRaw = body?.stage as string | undefined;
  const nextActionAtParsed = parseNextActionAt(body?.nextActionAt);

  const ids =
    Array.isArray(idsRaw) &&
    idsRaw.every((x) => typeof x === "string" && isUuid(x))
      ? Array.from(new Set(idsRaw))
      : null;

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  if (
    action !== "SET_FOLLOW_UP" &&
    action !== "CLEAR_FOLLOW_UP" &&
    action !== "MOVE_STAGE" &&
    action !== "ARCHIVE" &&
    action !== "DELETE"
  ) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "SET_FOLLOW_UP" && nextActionAtParsed === undefined) {
    return NextResponse.json(
      { error: "Invalid nextActionAt (must be ISO string)" },
      { status: 400 },
    );
  }

  if (action === "MOVE_STAGE") {
    if (!stageRaw || !ALLOWED_STAGES.includes(stageRaw as ApplicationStage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
  }

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentApps = await tx.application.findMany({
        where: {
          id: { in: ids },
          workspaceId: WORKSPACE_ID,
        },
        select: {
          id: true,
          stage: true,
          nextActionAt: true,
        },
      });

      const foundIds = new Set(currentApps.map((a) => a.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));

      if (action === "DELETE") {
        await tx.application.deleteMany({
          where: {
            id: { in: currentApps.map((a) => a.id) },
            workspaceId: WORKSPACE_ID,
          },
        });

        return {
          ok: true,
          updatedCount: currentApps.length,
          missingIds,
        };
      }

      if (action === "CLEAR_FOLLOW_UP") {
        const toClear = currentApps.filter((a) => a.nextActionAt !== null);

        if (toClear.length > 0) {
          await tx.application.updateMany({
            where: {
              id: { in: toClear.map((a) => a.id) },
              workspaceId: WORKSPACE_ID,
            },
            data: {
              nextActionAt: null,
              updatedAt: now,
            },
          });

          await tx.applicationEvent.createMany({
            data: toClear.flatMap((a) => [
              {
                applicationId: a.id,
                type: EventType.FOLLOW_UP_CLEARED,
                message: "Follow-up cleared",
              },
              {
                applicationId: a.id,
                type: EventType.META_UPDATED,
                message: "nextActionAt updated",
              },
            ]),
          });
        }

        return {
          ok: true,
          updatedCount: toClear.length,
          missingIds,
        };
      }

      if (action === "SET_FOLLOW_UP") {
        const next = nextActionAtParsed!;
        const toSet = currentApps.filter(
          (a) => a.nextActionAt?.getTime() !== next.getTime(),
        );

        if (toSet.length > 0) {
          await tx.application.updateMany({
            where: {
              id: { in: toSet.map((a) => a.id) },
              workspaceId: WORKSPACE_ID,
            },
            data: {
              nextActionAt: next,
              updatedAt: now,
            },
          });

          await tx.applicationEvent.createMany({
            data: toSet.flatMap((a) => [
              {
                applicationId: a.id,
                type: EventType.FOLLOW_UP_SET,
                message: `Follow-up set: ${next.toISOString()}`,
              },
              {
                applicationId: a.id,
                type: EventType.META_UPDATED,
                message: "nextActionAt updated",
              },
            ]),
          });
        }

        return {
          ok: true,
          updatedCount: toSet.length,
          missingIds,
        };
      }

      if (action === "ARCHIVE") {
        const toArchive = currentApps.filter(
          (a) => a.stage !== ApplicationStage.ARCHIVED,
        );

        if (toArchive.length > 0) {
          await Promise.all(
            toArchive.map((a) =>
              tx.application.update({
                where: { id: a.id },
                data: {
                  stage: ApplicationStage.ARCHIVED,
                  stageEnteredAt: now,
                  archivedAt: now,
                  archivedFromStage:
                    a.stage === ApplicationStage.ARCHIVED ? null : a.stage,
                  updatedAt: now,
                },
              }),
            ),
          );

          await tx.applicationEvent.createMany({
            data: toArchive.map((a) => ({
              applicationId: a.id,
              type: EventType.STAGE_CHANGED,
              message: `${a.stage} → ARCHIVED`,
            })),
          });
        }

        return {
          ok: true,
          updatedCount: toArchive.length,
          missingIds,
        };
      }

      const nextStage = stageRaw as ApplicationStage;
      const toMove = currentApps.filter((a) => a.stage !== nextStage);

      if (toMove.length > 0) {
        await Promise.all(
          toMove.map((a) =>
            tx.application.update({
              where: { id: a.id },
              data: {
                stage: nextStage,
                stageEnteredAt: now,
                archivedAt:
                  a.stage === ApplicationStage.ARCHIVED ? null : undefined,
                archivedFromStage:
                  a.stage === ApplicationStage.ARCHIVED ? null : undefined,
                updatedAt: now,
              },
            }),
          ),
        );

        await tx.applicationEvent.createMany({
          data: toMove.map((a) => ({
            applicationId: a.id,
            type: EventType.STAGE_CHANGED,
            message: `${a.stage} → ${nextStage}`,
          })),
        });
      }

      return {
        ok: true,
        updatedCount: toMove.length,
        missingIds,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Bulk action failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
