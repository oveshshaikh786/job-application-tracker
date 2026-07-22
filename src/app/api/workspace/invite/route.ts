import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { auth } from "@/auth";
import { toErrorResponse } from "@/lib/server/api";

/** POST /api/workspace/invite
 *  Body: { email?: string }   — email is optional (open link if omitted)
 *  Creates or refreshes a 7-day invite token.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();

    // Only OWNER can create invites
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
    });
    if (!member || member.role !== "OWNER") {
      return NextResponse.json({ error: "Only workspace owners can invite members" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = typeof body?.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : undefined;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.workspaceInvite.create({
      data: { workspaceId, email: email ?? null, expiresAt },
    });

    return NextResponse.json({ token: invite.token, expiresAt: invite.expiresAt });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET /api/workspace/invite — list active invites for this workspace */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const workspaceId = await getCurrentWorkspaceId();

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
    });
    if (!member || member.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invites);
  } catch (error) {
    return toErrorResponse(error);
  }
}
