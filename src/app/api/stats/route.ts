import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/default-workspace";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function GET() {
  const workspaceId = DEFAULT_WORKSPACE_ID;

  const now = new Date();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  // 🔹 Applications
  const apps = await prisma.application.findMany({
    where: { workspaceId },
    select: {
      id: true,
      stage: true,
      createdAt: true,
    },
  });

  const total = apps.length;
  const active = apps.filter(
    (a) => !["REJECTED", "WITHDRAWN", "ARCHIVED"].includes(a.stage),
  ).length;

  // 🔹 Created counts
  const created7 = apps.filter((a) => a.createdAt >= d7).length;
  const created30 = apps.filter((a) => a.createdAt >= d30).length;

  // 🔹 Events
  const events = await prisma.applicationEvent.findMany({
    where: {
      application: { workspaceId },
      createdAt: { gte: d30 },
    },
    select: {
      type: true,
      createdAt: true,
    },
  });

  const events7 = events.filter((e) => e.createdAt >= d7);

  // 🔹 Stage moves
  const moves7 = events7.filter((e) => e.type === "STAGE_CHANGED").length;
  const moves30 = events.filter((e) => e.type === "STAGE_CHANGED").length;

  // 🔹 Notes
  const notes7 = events7.filter((e) => e.type === "NOTE_ADDED").length;
  const notes30 = events.filter((e) => e.type === "NOTE_ADDED").length;

  return NextResponse.json({
    total,
    active,
    created7,
    created30,
    moves7,
    moves30,
    notes7,
    notes30,
  });
}
