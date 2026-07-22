import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApplicationStage } from "@prisma/client";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

export async function GET() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const apps = await prisma.application.findMany({
      where: {
        workspaceId,
        stage: ApplicationStage.ARCHIVED,
      },
      include: {
        role: { include: { company: true } },
        events: { orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ archivedAt: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(apps);
  } catch (error) {
    return toErrorResponse(error);
  }
}
