import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { listUserWorkspaces, getCurrentWorkspaceId } from "@/lib/server/workspace";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    // Pass the current path so the user lands back here after signing in.
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/dashboard";
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  const [memberships, currentWorkspaceId] = await Promise.all([
    listUserWorkspaces(session.user.id),
    getCurrentWorkspaceId().catch(() => null),
  ]);

  const workspaces = memberships.map((m) => ({
    id: m.workspaceId,
    name: m.workspace.name,
    role: m.role as string,
  }));

  const activeWorkspaceId =
    currentWorkspaceId ?? workspaces[0]?.id ?? "";

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
      workspaces={workspaces}
      currentWorkspaceId={activeWorkspaceId}
    >
      {children}
    </DashboardShell>
  );
}
