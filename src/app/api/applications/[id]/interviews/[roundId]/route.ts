import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

const UpdateSchema = z.object({
  type: z.string().min(1).max(80).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  outcome: z.enum(["PENDING","PASSED","FAILED","CANCELLED"]).optional(),
  notes: z.string().max(5000).optional().nullable(),
  interviewers: z.string().max(500).optional().nullable(),
});

function isUuid(v: string) {
  return /^[0-9a-f-]{36}$/i.test(v);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const { id, roundId } = await params;
    if (!isUuid(id) || !isUuid(roundId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const app = await prisma.application.findFirst({ where: { id, workspaceId } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { type, scheduledAt, completedAt, outcome, notes, interviewers } = parsed.data;

    const updated = await (prisma as any).interviewRound.update({
      where: { id: roundId },
      data: {
        ...(type !== undefined && { type }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
        ...(outcome !== undefined && { outcome }),
        ...(notes !== undefined && { notes }),
        ...(interviewers !== undefined && { interviewers }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const { id, roundId } = await params;
    if (!isUuid(id) || !isUuid(roundId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const app = await prisma.application.findFirst({ where: { id, workspaceId } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await (prisma as any).interviewRound.delete({ where: { id: roundId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
