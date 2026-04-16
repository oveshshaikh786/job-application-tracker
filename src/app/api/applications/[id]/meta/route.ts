import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
//import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { z } from "zod";
import { EventType } from "@prisma/client";
import { WORKSPACE_ID } from "@/lib/workspace";
//const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

const UpdateMetaSchema = z.object({
  companyName: z.string().min(1).max(120).optional(),
  roleTitle: z.string().min(1).max(160).optional(),
  source: z.string().max(120).optional().nullable(),
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
  const parsed = UpdateMetaSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { companyName, roleTitle, source } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const app = await tx.application.findFirst({
      where: {
        id,
        workspaceId: WORKSPACE_ID,
      },
      include: {
        role: { include: { company: true } },
      },
    });

    if (!app) return null;

    const changes: string[] = [];

    if (typeof source !== "undefined" && source !== app.source) {
      changes.push(`source: ${app.source ?? "—"} → ${source ?? "—"}`);
    }

    if (companyName && companyName !== app.role.company.name) {
      changes.push(`company: ${app.role.company.name} → ${companyName}`);
    }

    if (roleTitle && roleTitle !== app.role.title) {
      changes.push(`role: ${app.role.title} → ${roleTitle}`);
    }

    if (typeof source !== "undefined") {
      await tx.application.update({
        where: { id },
        data: {
          source: source ?? null,
          updatedAt: new Date(),
        },
      });
    }

    if (companyName) {
      await tx.company.updateMany({
        where: {
          id: app.role.companyId,
          workspaceId: WORKSPACE_ID,
        },
        data: { name: companyName },
      });
    }

    if (roleTitle) {
      await tx.role.updateMany({
        where: {
          id: app.roleId,
          workspaceId: WORKSPACE_ID,
        },
        data: { title: roleTitle },
      });
    }

    if (changes.length > 0) {
      await tx.applicationEvent.create({
        data: {
          applicationId: id,
          workspaceId: WORKSPACE_ID,
          type: EventType.META_UPDATED,
          message: changes.join(" | "),
        },
      });
    }

    return tx.application.findFirst({
      where: {
        id,
        workspaceId: WORKSPACE_ID,
      },
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
}
