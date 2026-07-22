import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CreateCompanySchema } from "@/lib/validators";
import { getCurrentWorkspaceId } from "@/lib/server/workspace";
import { toErrorResponse } from "@/lib/server/api";

export async function GET() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const companies = await prisma.company.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(companies);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
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
        workspaceId,
        name: { equals: name, mode: "insensitive" },
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
        workspaceId,
        name,
        website: website || null,
        location: location || null,
        industry: industry || null,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
