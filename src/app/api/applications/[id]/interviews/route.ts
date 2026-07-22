import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { EventType } from "@prisma/client";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

const CreateSchema = z.object({
  round: z.number().int().min(1).max(20),
  type: z.string().min(1).max(80),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  interviewers: z.string().max(500).optional().nullable(),
});

function isUuid(v: string) {
  return /^[0-9a-f-]{36}$/i.test(v);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const app = await prisma.application.findFirst({ where: { id, workspaceId } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const rounds = await (prisma as any).interviewRound.findMany({
      where: { applicationId: id },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(rounds);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const { id } = await params;
    if (!isUuid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const app = await prisma.application.findFirst({ where: { id, workspaceId } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const raw = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { round, type, scheduledAt, notes, interviewers } = parsed.data;

    const interview = await prisma.$transaction(async (tx) => {
      const created = await (tx as any).interviewRound.create({
        data: {
          applicationId: id,
          round,
          type,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          notes: notes ?? null,
          interviewers: interviewers ?? null,
          outcome: "PENDING",
        },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId: id,
          type: EventType.INTERVIEW_SCHEDULED,
          message: `Round ${round}: ${type}${scheduledAt ? ` — ${new Date(scheduledAt).toLocaleDateString()}` : ""}`,
        },
      });

      return created;
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
