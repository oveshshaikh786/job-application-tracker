import { headers } from "next/headers";
import KanbanBoard from "./KanbanBoard";
import TodayQueue from "./TodayQueue";
import DashboardStats from "./DashboardStats";

import type { Application as AppRow } from "@/domain/application/types";

async function getApplications(): Promise<AppRow[]> {
  const h = await headers();
  const host = h.get("host");
  if (!host) throw new Error("Missing Host header");

  const proto = process.env.NODE_ENV === "development" ? "http" : "https";
  const res = await fetch(`${proto}://${host}/api/applications`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to load applications");
  return res.json();
}

export default async function DashboardPage() {
  const appsRaw = await getApplications();

  // Dashboard hides archived apps on the board
  const apps = appsRaw.filter((a) => a.stage !== "ARCHIVED");

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(12px, 3vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <DashboardStats
        title="Job Tracker"
        subtitle="Kanban pipeline (v0)"
        newHref="/dashboard/new"
      />
      <TodayQueue />
      <KanbanBoard initialApps={apps} />
    </main>
  );
}
