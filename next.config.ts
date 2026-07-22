import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Keep Prisma external: it has native binaries that must be resolved
  // at runtime by Node, not inlined by the bundler.
  // next-auth is intentionally NOT listed here. It is a pure-ESM package that
  // imports "next/server" without a .js extension, which fails when Node.js
  // resolves it at runtime (Next 16 has no exports map for that path).
  // Letting Turbopack bundle next-auth is fine -- it resolves next/* as
  // first-party aliases and handles this correctly.
  serverExternalPackages: [
    "@auth/prisma-adapter",
    "@prisma/client",
  ],
};

export default nextConfig;
