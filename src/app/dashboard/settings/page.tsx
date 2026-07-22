import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const workspaceId = await getCurrentWorkspaceId();

  // Load workspace + members
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  if (!workspace) redirect("/dashboard");

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const selfMember = members.find((m) => m.userId === session.user!.id);
  const isOwner = selfMember?.role === "OWNER";

  return (
      <SettingsClient
        workspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          createdAt: workspace.createdAt.toISOString(),
        }}
        members={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.createdAt.toISOString(),
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          isSelf: m.userId === session.user!.id,
        }))}
        isOwner={isOwner}
        currentUserId={session.user.id}
      />
  );
}
