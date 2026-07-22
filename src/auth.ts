import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Required env vars (in .env.local):
 *   AUTH_SECRET            - random secret (npx auth secret)
 *   AUTH_GOOGLE_ID         - Google OAuth client id
 *   AUTH_GOOGLE_SECRET     - Google OAuth client secret
 *   NEXTAUTH_URL           - http://localhost:3000 (dev only)
 *
 * After editing schema.prisma run:
 *   npx prisma generate && npx prisma db push
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,

  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        (session.user as { currentWorkspaceId?: string | null }).currentWorkspaceId =
          (user as { currentWorkspaceId?: string | null }).currentWorkspaceId ?? null;
      }
      return session;
    },
  },

  events: {
    // First sign-in: create a personal workspace for the new user.
    async createUser({ user }) {
      if (!user.id) return;

      try {
        const slugBase =
          (user.email?.split("@")[0] ?? "workspace")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "workspace";

        let slug = slugBase;
        for (let i = 0; i < 5; i++) {
          const exists = await prisma.workspace.findUnique({ where: { slug } });
          if (!exists) break;
          slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
        }

        const workspace = await prisma.workspace.create({
          data: {
            name: user.name ? `${user.name}'s workspace` : "My workspace",
            slug,
            memberships: {
              create: { userId: user.id, role: "OWNER" },
            },
          },
        });

        // currentWorkspaceId may not yet be in the generated Prisma client.
        // Run `npx prisma generate && npx prisma db push` to fix the types.
        // Non-fatal: getCurrentWorkspaceId() falls back to first membership.
        await (prisma.user as any)
          .update({
            where: { id: user.id },
            data: { currentWorkspaceId: workspace.id },
          })
          .catch((err: unknown) => {
            console.warn("[auth] Could not set currentWorkspaceId:", err);
          });
      } catch (err) {
        // Don't re-throw — workspace setup failure must not block sign-in.
        console.error("[auth] createUser event failed:", err);
      }
    },
  },
});
