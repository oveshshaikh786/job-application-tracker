import "server-only";
import { NextResponse } from "next/server";
import {
  NoWorkspaceError,
  UnauthenticatedError,
} from "@/lib/server/workspace";

/**
 * Map known auth/workspace errors to clean JSON responses, otherwise
 * surface a generic 500. Use to wrap every route handler body.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof NoWorkspaceError) {
    return NextResponse.json(
      { error: "No workspace. Create one to continue." },
      { status: 409 },
    );
  }

  const err = error as { message?: string; code?: string };
  console.error("API route failed:", error);
  return NextResponse.json(
    {
      error: "Server error",
      detail: err?.message ?? "Unknown error",
      code: err?.code ?? null,
    },
    { status: 500 },
  );
}
