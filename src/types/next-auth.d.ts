import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      currentWorkspaceId?: string | null;
    };
  }

  interface User {
    currentWorkspaceId?: string | null;
  }
}
