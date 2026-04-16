import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { z } from "zod";
import { EventType } from "@prisma/client";

const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

const FollowupSchema = z.object({
  nextActionAt: z.string().datetime().nullable(),
});

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = FollowupSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const nextActionAt = parsed.data.nextActionAt
    ? new Date(parsed.data.nextActionAt)
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.application.findFirst({
      where: {
        id,
        workspaceId: WORKSPACE_ID,
      },
      select: { id: true, nextActionAt: true },
    });

    if (!current) return null;

    const before = current.nextActionAt
      ? current.nextActionAt.toISOString()
      : "—";
    const after = nextActionAt ? nextActionAt.toISOString() : "—";

    const app = await tx.application.update({
      where: { id },
      data: {
        nextActionAt,
        updatedAt: new Date(),
      },
      include: {
        role: { include: { company: true } },
        events: { orderBy: { createdAt: "desc" } },
      },
    });

    await tx.applicationEvent.create({
      data: {
        applicationId: id,
        type: nextActionAt
          ? EventType.FOLLOW_UP_SET
          : EventType.FOLLOW_UP_CLEARED,
        message: `nextActionAt: ${before} → ${after}`,
      },
    });

    await tx.applicationEvent.create({
      data: {
        applicationId: id,
        type: EventType.META_UPDATED,
        message: "nextActionAt updated",
      },
    });

    return app;
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
