import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
//import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";
import { CreateCompanySchema } from "@/lib/validators";
import { WORKSPACE_ID } from "@/lib/workspace";
//const WORKSPACE_ID = DEFAULT_WORKSPACE_ID;

export async function GET() {
  const companies = await prisma.company.findMany({
    where: { workspaceId: WORKSPACE_ID },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateCompanySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, website, location, industry } = parsed.data;

  const existing = await prisma.company.findFirst({
    where: {
      workspaceId: WORKSPACE_ID,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Company already exists in this workspace" },
      { status: 409 },
    );
  }

  const company = await prisma.company.create({
    data: {
      workspaceId: WORKSPACE_ID,
      name,
      website: website || null,
      location: location || null,
      industry: industry || null,
    },
  });

  return NextResponse.json(company, { status: 201 });
}
