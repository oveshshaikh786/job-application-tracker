"use client";

import { useMemo, useState } from "react";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";
import { isClosed } from "@/domain/application/stage";
import { getFollowUpInfo } from "@/domain/application/followup";
import { getSlaInfo } from "@/domain/application/sla";
import { buildTodayQueue } from "@/domain/application/todayQueue";
import DashboardStats from "./DashboardStats";

export default function DashboardHeader() {
  const apps = useApplicationsStore((s) => s.apps);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const nowMs = Date.now();

  const stats = useMemo(() => {
    const nonArchived = apps.filter((a) => a.stage !== "ARCHIVED");
    const active = nonArchived.filter((a) => !isClosed(a.stage));

    const overdue = active.filter(
      (a) => getFollowUpInfo(a, nowMs)?.kind === "overdue",
    );
    const dueIn7d = active.filter((a) => {
      const f = getFollowUpInfo(a, nowMs);
      if (f?.kind !== "due" || !a.nextActionAt) return false;
      const diff = new Date(a.nextActionAt).getTime() - nowMs;
      return diff >= 0 && diff <= 7 * 86400000;
    });
    const slaBreached = active.filter((a) => getSlaInfo(a, nowMs)?.breached);

    const buckets = buildTodayQueue(apps, nowMs);
    const urgentCount =
      buckets.overdue.length +
      buckets.slaBreachedNoFollowUp.length +
      buckets.ghostedNoResponse.length;

    return {
      total: nonArchived.length,
      active: active.length,
      overdue: overdue.length,
      dueIn7d: dueIn7d.length,
      slaBreached: slaBreached.length,
      urgentCount,
      buckets,
    };
  }, [apps, nowMs]);

  return (
    <>
      {/* ── Compact stats header strip ────────────────── */}
      <div className="dash-header">
        {/* 4 stat pills */}
        <div className="dash-stats">
          <StatPill
            label="Total"
            value={stats.total}
            hint={`${stats.active} active`}
          />
          <StatPill
            label="Active"
            value={stats.active}
            tone="ok"
            hint="In pipeline"
          />
          <StatPill
            label="Follow-ups"
            value={stats.dueIn7d}
            tone={stats.dueIn7d > 0 ? "warn" : "default"}
            hint="Due in 7d"
          />
          <StatPill
            label="Overdue"
            value={stats.overdue}
            tone={stats.overdue > 0 ? "danger" : "default"}
            hint={
              stats.slaBreached > 0 ? `${stats.slaBreached} SLA breach` : "None"
            }
          />
        </div>

        {/* Urgent alert strip — only visible when there's something urgent */}
        {stats.urgentCount > 0 && (
          <div className="dash-alert-strip">
            <span className="dash-alert-pip" />
            <span className="dash-alert-text">
              {stats.urgentCount} urgent item
              {stats.urgentCount !== 1 ? "s" : ""} need attention
            </span>
            {stats.buckets.overdue.length > 0 && (
              <span className="dash-alert-pill is-danger">
                🔥 {stats.buckets.overdue.length} overdue
              </span>
            )}
            {stats.buckets.ghostedNoResponse.length > 0 && (
              <span className="dash-alert-pill is-warn">
                👻 {stats.buckets.ghostedNoResponse.length} ghosted
              </span>
            )}
            {stats.buckets.slaBreachedNoFollowUp.length > 0 && (
              <span className="dash-alert-pill is-warn">
                ⚠️ {stats.buckets.slaBreachedNoFollowUp.length} SLA
              </span>
            )}
          </div>
        )}

        {/* Analytics toggle */}
        <div className="dash-header-actions">
          <button
            type="button"
            className={`analytics-toggle${analyticsOpen ? " is-open" : ""}`}
            onClick={() => setAnalyticsOpen((v) => !v)}
          >
            <span>⚡ Analytics</span>
            <span className="analytics-toggle-chevron">▾</span>
          </button>
        </div>
      </div>

      {/* ── Analytics drawer — slides down, doesn't push kanban ── */}
      {analyticsOpen && (
        <div className="analytics-drawer fade-in">
          <DashboardStats />
        </div>
      )}
    </>
  );
}

/* ── StatPill ──────────────────────────────────────────────────── */
function StatPill({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "ok"
      ? " is-ok"
      : tone === "warn"
        ? " is-warn"
        : tone === "danger"
          ? " is-danger"
          : "";

  return (
    <div className={`stat-pill${toneClass}`}>
      <div className="stat-pill-label">{label}</div>
      <div className="stat-pill-value">{value}</div>
      {hint && <div className="stat-pill-hint">{hint}</div>}
    </div>
  );
}
