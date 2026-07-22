import { NextResponse } from "next/server";
import { setCurrentWorkspace } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

/** POST /api/workspace/switch  body: { workspaceId: string } */
export async function POST(req: Request) {
  try {
    const { workspaceId } = await req.json();
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    await setCurrentWorkspace(workspaceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
