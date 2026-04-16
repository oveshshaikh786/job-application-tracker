import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { z } from "zod";

const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

const CreateNoteSchema = z.object({
  message: z.string().min(1).max(5000),
});

const NOTE_EVENT_TYPE = "NOTE_ADDED" as const;

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = CreateNoteSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const app = await prisma.application.findFirst({
    where: {
      id,
      workspaceId: WORKSPACE_ID,
    },
    select: { id: true },
  });

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const note = await prisma.applicationEvent.create({
      data: {
        applicationId: id,
        type: NOTE_EVENT_TYPE,
        message: parsed.data.message,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to add note",
        hint: `Check prisma/schema.prisma enum EventType. "${NOTE_EVENT_TYPE}" must exist there.`,
      },
      { status: 500 },
    );
  }
}
