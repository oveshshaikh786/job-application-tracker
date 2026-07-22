import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { EventType } from "@prisma/client";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

const UpdateMetaSchema = z.object({
  companyName: z.string().min(1).max(120).optional(),
  roleTitle: z.string().min(1).max(160).optional(),
  source: z.string().max(120).optional().nullable(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  salaryCurrency: z.string().max(10).optional().nullable(),
  contactName: z.string().max(120).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  contactRole: z.string().max(80).optional().nullable(),
  excitement: z.number().int().min(1).max(5).optional().nullable(),
  jobDescription: z.string().max(50000).optional().nullable(),
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
  try {
    const workspaceId = await getCurrentWorkspaceId();
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

    const {
      companyName, roleTitle, source,
      salaryMin, salaryMax, salaryCurrency,
      contactName, contactEmail, contactRole,
      excitement, jobDescription,
    } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.findFirst({
        where: { id, workspaceId },
        include: { role: { include: { company: true } } },
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

      // Build application-level updates
      const appData: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof source !== "undefined") appData.source = source ?? null;
      if (typeof salaryMin !== "undefined") appData.salaryMin = salaryMin;
      if (typeof salaryMax !== "undefined") appData.salaryMax = salaryMax;
      if (typeof salaryCurrency !== "undefined") appData.salaryCurrency = salaryCurrency;
      if (typeof contactName !== "undefined") appData.contactName = contactName;
      if (typeof contactEmail !== "undefined") appData.contactEmail = contactEmail;
      if (typeof contactRole !== "undefined") appData.contactRole = contactRole;
      if (typeof excitement !== "undefined") appData.excitement = excitement;
      if (typeof jobDescription !== "undefined") appData.jobDescription = jobDescription;

      if (Object.keys(appData).length > 1) {
        await tx.application.update({ where: { id }, data: appData });
      }

      if (companyName) {
        await tx.company.updateMany({
          where: { id: app.role.companyId, workspaceId },
          data: { name: companyName },
        });
      }

      if (roleTitle) {
        await tx.role.updateMany({
          where: { id: app.roleId, workspaceId },
          data: { title: roleTitle },
        });
      }

      if (changes.length > 0) {
        await tx.applicationEvent.create({
          data: {
            applicationId: id,
            type: EventType.META_UPDATED,
            message: changes.join(" | "),
          },
        });
      }

      return tx.application.findFirst({
        where: { id, workspaceId },
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
  } catch (error) {
    return toErrorResponse(error);
  }
}
