import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

export async function GET() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const goal = await (prisma as any).weeklyGoal.findUnique({ where: { workspaceId } });
    return NextResponse.json({ target: goal?.target ?? 5 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const { target } = (await req.json()) as { target?: number };
    if (!target || typeof target !== "number" || target < 1 || target > 100) {
      return NextResponse.json({ error: "target must be 1–100" }, { status: 400 });
    }

    const goal = await (prisma as any).weeklyGoal.upsert({
      where: { workspaceId },
      update: { target },
      create: { workspaceId, target },
    });

    return NextResponse.json({ target: goal.target });
  } catch (e) {
    return toErrorResponse(e);
  }
}
