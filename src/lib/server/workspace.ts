import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const WORKSPACE_COOKIE = "cw_workspace";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Unauthenticated");
    this.name = "UnauthenticatedError";
  }
}

export class NoWorkspaceError extends Error {
  constructor() {
    super("User has no workspace");
    this.name = "NoWorkspaceError";
  }
}

/**
 * Returns the authenticated user's id, throwing UnauthenticatedError if
 * there is no session. Use this from server components and route handlers.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthenticatedError();
  return userId;
}

/**
 * Resolve the workspace the current request should operate on.
 *
 * Resolution order:
 *   1. `cw_workspace` cookie, validated against the user's memberships.
 *   2. The user's `currentWorkspaceId` from the User row.
 *   3. The user's first membership.
 *
 * Throws if the user is unauthenticated or has no workspaces. The
 * onboarding flow should ensure a workspace exists at sign-up.
 */
export async function getCurrentWorkspaceId(): Promise<string> {
  const userId = await requireUserId();

  const jar = await cookies();
  const cookieValue = jar.get(WORKSPACE_COOKIE)?.value ?? null;

  if (cookieValue) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: cookieValue },
      select: { workspaceId: true },
    });
    if (member) return member.workspaceId;
  }

  // currentWorkspaceId exists in schema.prisma but the generated Prisma client
  // is stale. Cast to `any` for these queries; run `npx prisma generate` to fix.
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { currentWorkspaceId: true },
  }) as { currentWorkspaceId: string | null } | null;

  if (user?.currentWorkspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: user.currentWorkspaceId },
      select: { workspaceId: true },
    });
    if (member) return member.workspaceId;
  }

  const first = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });

  if (!first) throw new NoWorkspaceError();
  return first.workspaceId;
}

/**
 * Return all workspaces the user belongs to, with the membership role.
 */
export async function listUserWorkspaces(userId?: string) {
  const uid = userId ?? (await requireUserId());
  return prisma.workspaceMember.findMany({
    where: { userId: uid },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Switch the active workspace. Validates membership, sets the cookie,
 * and persists `currentWorkspaceId` on the user.
 */
export async function setCurrentWorkspace(workspaceId: string): Promise<void> {
  const userId = await requireUserId();

  const member = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { workspaceId: true },
  });
  if (!member) throw new Error("Not a member of this workspace");

  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  await prisma.user.update({
    where: { id: userId },
    // @ts-ignore -- currentWorkspaceId exists in schema.prisma but the
    // generated client is stale; run `npx prisma generate` to fix.
    data: { currentWorkspaceId: workspaceId },
  });
}
