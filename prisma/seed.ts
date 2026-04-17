import { prisma } from "../src/lib/db";

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "default-workspace" },
    update: {
      name: "Default Workspace",
    },
    create: {
      name: "Default Workspace",
      slug: "default-workspace",
    },
  });

  const company = await prisma.company.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: "Example Corp",
      },
    },
    update: {
      industry: "SaaS",
      location: "Remote",
    },
    create: {
      workspaceId: workspace.id,
      name: "Example Corp",
      industry: "SaaS",
      location: "Remote",
    },
  });

  const existingRole = await prisma.role.findFirst({
    where: {
      workspaceId: workspace.id,
      companyId: company.id,
      title: "Frontend Engineer",
    },
    select: { id: true },
  });

  const role =
    existingRole ??
    (await prisma.role.create({
      data: {
        workspaceId: workspace.id,
        companyId: company.id,
        title: "Frontend Engineer",
        workType: "Remote",
        location: "US",
        url: "https://example.com/jobs/frontend",
        description: "React, TypeScript, performance, testing.",
      },
      select: { id: true },
    }));

  const existingApplication = await prisma.application.findFirst({
    where: {
      workspaceId: workspace.id,
      roleId: role.id,
      stage: "APPLIED",
      source: "LinkedIn",
    },
    select: { id: true },
  });

  if (!existingApplication) {
    await prisma.application.create({
      data: {
        workspaceId: workspace.id,
        roleId: role.id,
        stage: "APPLIED",
        source: "LinkedIn",
        appliedAt: new Date(),
        events: {
          createMany: {
            data: [
              { type: "CREATED", message: "Application created" },
              { type: "STAGE_CHANGED", message: "Stage changed to APPLIED" },
            ],
          },
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Workspace ID:", workspace.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
