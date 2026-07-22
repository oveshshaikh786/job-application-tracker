import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name || name.length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Name too long (max 80 chars)" }, { status: 400 });
  }

  const workspaceId = await getCurrentWorkspaceId();

  // Must be OWNER to rename
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id },
  });
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
