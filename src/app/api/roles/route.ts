import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
//import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { CreateRoleSchema } from "@/lib/validators";
import { WORKSPACE_ID } from "@/lib/workspace";
//const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

export async function GET() {
  const roles = await prisma.role.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
    },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const company = await prisma.company.findFirst({
    where: {
      id: parsed.data.companyId,
      workspaceId: WORKSPACE_ID,
    },
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
      workspaceId: WORKSPACE_ID,
      companyId: parsed.data.companyId,
      title: parsed.data.title,
      url: parsed.data.url || null,
      location: parsed.data.location || null,
      workType: parsed.data.workType || null,
      description: parsed.data.description || null,
    },
    include: {
      company: true,
    },
  });

  return NextResponse.json(role, { status: 201 });
}
