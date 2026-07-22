import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { auth } from "@/auth";
import { toErrorResponse } from "@/lib/server/api";

/** GET /api/workspace/members — list members of the current workspace */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();

    // Must be a member yourself
    const self = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
    });
    if (!self) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.createdAt,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        isSelf: m.userId === session.user!.id,
      })),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/workspace/members?userId=xxx — remove a member (owner only) */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();

    const self = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
    });
    if (!self || self.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");
    if (!targetUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    await prisma.workspaceMember.deleteMany({
      where: { userId: targetUserId, workspaceId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
