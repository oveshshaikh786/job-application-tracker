import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { toErrorResponse } from "@/lib/server/api";

/** GET /api/workspace/invite/[token]
 *  Validates the token and returns workspace info (preview before joining).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    if (invite.usedAt) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

    return NextResponse.json({
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      email: invite.email,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/workspace/invite/[token]
 *  Accepts the invite — adds the current user as a MEMBER of the workspace.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "You must be signed in to accept an invite" }, { status: 401 });
    }

    const { token } = await params;

    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    if (invite.usedAt) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });

    // If invite is email-restricted, enforce it
    if (invite.email && invite.email !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "This invite is for a different email address" }, { status: 403 });
    }

    const userId = session.user.id;
    const workspaceId = invite.workspaceId;

    await prisma.$transaction(async (tx) => {
      // Add member (upsert so rejoining works cleanly)
      await tx.workspaceMember.upsert({
        where: { userId_workspaceId: { userId, workspaceId } },
        update: {},
        create: { userId, workspaceId, role: "MEMBER" },
      });

      // Mark invite as used
      await tx.workspaceInvite.update({
        where: { token },
        data: { usedAt: new Date(), usedByEmail: session.user!.email },
      });

      // Set as active workspace if user has none
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { currentWorkspaceId: true },
      });
      if (!user?.currentWorkspaceId) {
        await tx.user.update({
          where: { id: userId },
          data: { currentWorkspaceId: workspaceId } as any,
        });
      }
    });

    return NextResponse.json({ ok: true, workspaceId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
