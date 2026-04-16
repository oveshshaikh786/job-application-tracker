import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { ApplicationStage } from "@prisma/client";

const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

export async function GET() {
  const apps = await prisma.application.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      stage: ApplicationStage.ARCHIVED,
    },
    include: {
      role: { include: { company: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ archivedAt: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(apps);
}
