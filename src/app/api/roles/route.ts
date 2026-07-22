import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CreateRoleSchema } from "@/lib/validators";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

export async function GET() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const roles = await prisma.role.findMany({
      where: { workspaceId },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(roles);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const body = await req.json().catch(() => null);
    const parsed = CreateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const company = await prisma.company.findFirst({
      where: { id: parsed.data.companyId, workspaceId },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found in this workspace" },
        { status: 404 },
      );
    }

    const role = await prisma.role.create({
      data: {
        workspaceId,
        companyId: parsed.data.companyId,
        title: parsed.data.title,
        url: parsed.data.url || null,
        location: parsed.data.location || null,
        workType: parsed.data.workType || null,
        description: parsed.data.description || null,
      },
      include: { company: true },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
