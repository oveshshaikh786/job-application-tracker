// src/app/dashboard/page.tsx

import { headers } from "next/headers";
import KanbanBoard from "./KanbanBoard";
import TodayQueue from "./TodayQueue";
import DashboardStats from "./DashboardStats";

import type { Application as AppRow, Stage } from "@/domain/application/types";

type StageUI = Exclude<Stage, "ARCHIVED">;

const STAGE_LABEL_UI: Record<StageUI, string> = {
  DRAFT: "Draft",
  APPLIED: "Applied",
  RECRUITER_SCREEN: "Recruiter",
  TECH_SCREEN: "Tech",
  ONSITE: "Onsite",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const STAGE_ORDER_UI: StageUI[] = [
  "DRAFT",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECH_SCREEN",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

type FunnelRowUI = {
  key: StageUI;
  label: string;
  count: number;
  fromPrevPct: string;
  dropPct?: string;
};

type StatsResponse = {
  title?: string;
  subtitle?: string;

  total: number;
  active: number;
  overdue: number;

  // NOTE: this is SLA-breached count, even if property is still named stuck
  stuck: number;

  avgStageDays?: number | null;
  dueIn24h: number;
  dueIn7d: number;

  // UI-only stages (no ARCHIVED)
  stageOrder?: StageUI[];
  stageLabel?: Record<StageUI, string>;
  stageCounts?: Record<StageUI, number>;

  overdueByStage?: Partial<Record<StageUI, number>>;
  stuckByStage?: Partial<Record<StageUI, number>>;
  funnelRows?: FunnelRowUI[];

  // optional
  archived?: number;
};

function pct(n: number, d: number) {
  if (!d) return "—";
  const v = (n / d) * 100;
  return v >= 10 ? `${Math.round(v)}%` : `${v.toFixed(1)}%`;
}

function safeRate(n: number, d: number) {
  if (!d) return "—";
  const v = n / d;
  return v >= 10 ? `${Math.round(v)}x` : `${v.toFixed(2)}x`;
}

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

async function getStats(): Promise<StatsResponse> {
  const h = await headers();
  const host = h.get("host");
  if (!host) throw new Error("Missing Host header");

  const proto = process.env.NODE_ENV === "development" ? "http" : "https";
  const res = await fetch(`${proto}://${host}/api/stats`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

function buildLocalFunnelRows(
  stageCounts: Record<StageUI, number>,
): FunnelRowUI[] {
  const steps: { key: StageUI; label: string }[] = [
    { key: "APPLIED", label: "Applied" },
    { key: "RECRUITER_SCREEN", label: "Recruiter" },
    { key: "TECH_SCREEN", label: "Tech" },
    { key: "ONSITE", label: "Onsite" },
    { key: "OFFER", label: "Offer" },
  ];

  return steps.map((s, idx) => {
    const count = stageCounts[s.key] ?? 0;
    const prevCount = idx === 0 ? 0 : (stageCounts[steps[idx - 1].key] ?? 0);

    return {
      key: s.key,
      label: s.label,
      count,
      fromPrevPct: idx === 0 ? "—" : pct(count, prevCount),
      dropPct:
        idx === 0 || prevCount === 0
          ? "—"
          : `${Math.round(((prevCount - count) / prevCount) * 100)}%`,
    };
  });
}

export default async function DashboardPage() {
  const [appsRaw, stats] = await Promise.all([getApplications(), getStats()]);

  // Dashboard hides archived apps
  const apps = appsRaw.filter((a) => a.stage !== "ARCHIVED");

  // Totals from server (already excludes archived)
  const total = stats.total;
  const active = stats.active;
  const overdue = stats.overdue;
  const slaBreached = stats.stuck; // name mismatch but meaning is SLA-breached
  const avgStageDays = stats.avgStageDays ?? null;
  const dueIn24h = stats.dueIn24h;
  const dueIn7d = stats.dueIn7d;

  const stageOrder = stats.stageOrder ?? STAGE_ORDER_UI;
  const stageLabel = stats.stageLabel ?? STAGE_LABEL_UI;

  // Prefer server counts; if missing, compute locally from apps
  const stageCounts: Record<StageUI, number> =
    stats.stageCounts ??
    stageOrder.reduce(
      (acc, s) => {
        acc[s] = 0;
        return acc;
      },
      {} as Record<StageUI, number>,
    );

  if (!stats.stageCounts) {
    for (const a of apps) {
      const s = a.stage as StageUI;
      if (stageCounts[s] != null) stageCounts[s] += 1;
    }
  }

  const funnelRows =
    stats.funnelRows && stats.funnelRows.length > 0
      ? stats.funnelRows
      : buildLocalFunnelRows(stageCounts);

  // velocity placeholders (until you implement)
  const created7 = 0;
  const created30 = 0;
  const moves7 = 0;
  const moves30 = 0;
  const notes7 = 0;
  const notes30 = 0;

  const createdPerDay7 = created7 / 7;
  const createdPerDay30 = created30 / 30;
  const movesPerDay7 = moves7 / 7;
  const movesPerDay30 = moves30 / 30;
  const notesPerDay7 = notes7 / 7;
  const notesPerDay30 = notes30 / 30;

  const creationTrend = safeRate(createdPerDay7, createdPerDay30);
  const moveTrend = safeRate(movesPerDay7, movesPerDay30);
  const noteTrend = safeRate(notesPerDay7, notesPerDay30);

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
        title={stats.title ?? "Job Tracker"}
        subtitle={stats.subtitle ?? "Kanban pipeline (v0)"}
        newHref="/dashboard/new"
      />
      <TodayQueue />
      <KanbanBoard initialApps={apps} />
    </main>
  );
}
