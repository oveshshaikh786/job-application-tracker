import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { CreateApplicationSchema } from "@/lib/validators";

const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

export async function GET() {
  const apps = await prisma.application.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
    },
    include: {
      role: { include: { company: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(apps);
}

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = CreateApplicationSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { companyName, roleTitle, source, stage } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const existingCompany = await tx.company.findFirst({
        where: {
          workspaceId: WORKSPACE_ID,
          name: {
            equals: companyName,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      const company =
        existingCompany ??
        (await tx.company.create({
          data: {
            workspaceId: WORKSPACE_ID,
            name: companyName,
            website: null,
            location: null,
            industry: null,
          },
          select: { id: true },
        }));

      const role = await tx.role.create({
        data: {
          workspaceId: WORKSPACE_ID,
          title: roleTitle,
          companyId: company.id,
        },
        select: { id: true },
      });

      const app = await tx.application.create({
        data: {
          workspaceId: WORKSPACE_ID,
          roleId: role.id,
          source: source ?? null,
          stage,
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

      await tx.applicationEvent.createMany({
        data: eventsToCreate,
      });

      return tx.application.findFirst({
        where: {
          id: app.id,
          workspaceId: WORKSPACE_ID,
        },
        include: {
          role: { include: { company: true } },
          events: { orderBy: { createdAt: "desc" } },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/applications failed:", error);
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
