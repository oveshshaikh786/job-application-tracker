import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CreateApplicationSchema } from "@/lib/validators";
import { getApplications } from "@/lib/server/applications";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

export async function GET() {
  try {
    const apps = await getApplications();
    return NextResponse.json(apps);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const workspaceId = await getCurrentWorkspaceId();

    const raw = await req.json().catch(() => null);
    const parsed = CreateApplicationSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { companyName, roleTitle, source, stage, appliedAt, nextActionAt } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const existingCompany = await tx.company.findFirst({
        where: {
          workspaceId,
          name: { equals: companyName, mode: "insensitive" },
        },
        select: { id: true },
      });

      const company =
        existingCompany ??
        (await tx.company.create({
          data: {
            workspaceId,
            name: companyName,
            website: null,
            location: null,
            industry: null,
          },
          select: { id: true },
        }));

      const role = await tx.role.create({
        data: {
          workspaceId,
          title: roleTitle,
          companyId: company.id,
        },
        select: { id: true },
      });

      const app = await tx.application.create({
        data: {
          workspaceId,
          roleId: role.id,
          source: source ?? null,
          stage,
          appliedAt: appliedAt
            ? new Date(appliedAt)
            : stage !== "DRAFT"
              ? new Date()
              : null,
          nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
        },
        select: { id: true, stage: true },
      });

      const eventsToCreate: Array<{
        applicationId: string;
        type: "CREATED" | "STAGE_CHANGED";
        message: string;
      }> = [
        {
          applicationId: app.id,
          type: "CREATED",
          message: "Application created",
        },
      ];

      if (app.stage !== "DRAFT") {
        eventsToCreate.push({
          applicationId: app.id,
          type: "STAGE_CHANGED",
          message: `DRAFT → ${app.stage}`,
        });
      } else {
        eventsToCreate.push({
          applicationId: app.id,
          type: "STAGE_CHANGED",
          message: `Stage changed to ${app.stage}`,
        });
      }

      await tx.applicationEvent.createMany({ data: eventsToCreate });

      return tx.application.findFirst({
        where: { id: app.id, workspaceId },
        include: {
          role: { include: { company: true } },
          events: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
