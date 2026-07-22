"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";
import { isClosed } from "@/domain/application/stage";
import { getFollowUpInfo } from "@/domain/application/followup";

function GoalRing({ applied, target }: { applied: number; target: number }) {
  const pct = Math.min(1, applied / Math.max(target, 1));
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-1)" strokeWidth="7" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={pct >= 1 ? "var(--ok)" : "var(--accent)"}
        strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 48 48)"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x="48" y="44" textAnchor="middle" fill="var(--text)" fontSize="18" fontWeight="700">{applied}</text>
      <text x="48" y="58" textAnchor="middle" fill="var(--text-2)" fontSize="10">of {target}</text>
    </svg>
  );
}

export default function DashboardStats() {
  const apps = useApplicationsStore((s) => s.apps);
  const router = useRouter();
  const nowMs = Date.now();

  const [goal, setGoal] = useState(5);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("5");
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/goal")
      .then((r) => r.json())
      .then((d: { target?: number }) => { if (d.target) { setGoal(d.target); setGoalInput(String(d.target)); } })
      .catch(() => {});
  }, []);

  const saveGoal = useCallback(async () => {
    const t = parseInt(goalInput);
    if (!t || t < 1 || t > 100) return;
    setSavingGoal(true);
    try {
      await fetch("/api/workspace/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: t }),
      });
      setGoal(t);
      setEditingGoal(false);
    } finally {
      setSavingGoal(false);
    }
  }, [goalInput]);

  const stats = useMemo(() => {
    const nonArchived = apps.filter((a) => a.stage !== "ARCHIVED");
    const active = nonArchived.filter((a) => !isClosed(a.stage));
    const overdue = active.filter((a) => getFollowUpInfo(a, nowMs)?.kind === "overdue");
    const due7d = active.filter((a) => {
      const f = getFollowUpInfo(a, nowMs);
      if (f?.kind !== "due" || !a.nextActionAt) return false;
      return new Date(a.nextActionAt).getTime() - nowMs <= 7 * 86_400_000;
    });

    // Applied this week (Mon–now)
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const appliedThisWeek = nonArchived.filter((a) => {
      const d = new Date(a.appliedAt ?? a.createdAt).getTime();
      return d >= monday.getTime();
    }).length;

    // Avg days in pipeline for active apps
    const avgDays = active.length
      ? Math.round(
          active.reduce((sum, a) => {
            const entered = a.stageEnteredAt ?? a.createdAt;
            return sum + (nowMs - new Date(entered).getTime()) / 86_400_000;
          }, 0) / active.length,
        )
      : 0;

    // Response rate: apps that moved past APPLIED
    const applied = nonArchived.filter((a) => a.stage !== "DRAFT");
    const responded = applied.filter((a) =>
      !["APPLIED", "DRAFT"].includes(a.stage)
    );
    const responseRate = applied.length
      ? Math.round((responded.length / applied.length) * 100)
      : 0;

    // Offer rate
    const offers = nonArchived.filter((a) => a.stage === "OFFER").length;

    return { total: nonArchived.length, active: active.length, overdue: overdue.length, due7d: due7d.length, appliedThisWeek, avgDays, responseRate, offers };
  }, [apps, nowMs]);

  return (
    <section className="jt-stats">
      <div className="dashboard-stats-grid">
        {/* Goal ring */}
        <div className="dashboard-goal-card">
          <div>
            <div className="jt-stat-label">This week</div>
            {editingGoal ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                <input
                  type="number" min="1" max="100"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void saveGoal(); if (e.key === "Escape") setEditingGoal(false); }}
                  className="form-input"
                  style={{ width: 60, padding: "4px 8px", fontSize: 13 }}
                  autoFocus
                />
                <button className="btn btn-primary" onClick={saveGoal} disabled={savingGoal} style={{ padding: "4px 10px", fontSize: 12 }}>
                  {savingGoal ? "…" : "Set"}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 4 }}>
                <span className="jt-stat-value" style={{ fontSize: 28 }}>{stats.appliedThisWeek}</span>
                <span className="jt-stat-sub" style={{ marginLeft: 6 }}>applied</span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 10, padding: "2px 6px", marginLeft: 8 }}
                  onClick={() => setEditingGoal(true)}
                  title="Set weekly goal"
                >
                  Goal: {goal}
                </button>
              </div>
            )}
          </div>
          <GoalRing applied={stats.appliedThisWeek} target={goal} />
        </div>

        {/* Response rate */}
        <div className="jt-stat-card">
          <div className="jt-stat-label">Response rate</div>
          <div className="jt-stat-value" style={{ color: stats.responseRate >= 30 ? "var(--ok)" : stats.responseRate > 10 ? "var(--warn)" : "var(--danger)" }}>
            {stats.responseRate}%
          </div>
          <div className="jt-stat-sub">{stats.total} applications</div>
        </div>

        {/* Active */}
        <div className="jt-stat-card green">
          <div className="jt-stat-label">Active</div>
          <div className="jt-stat-value">{stats.active}</div>
          <div className="jt-stat-sub">Avg {stats.avgDays}d in stage</div>
        </div>

        {/* Overdue */}
        <div className={`jt-stat-card${stats.overdue > 0 ? " red" : ""}`}>
          <div className="jt-stat-label">Overdue</div>
          <div className="jt-stat-value">{stats.overdue}</div>
          <div className="jt-stat-sub">{stats.due7d} due this week</div>
        </div>

        {/* Offers */}
        <div className={`jt-stat-card${stats.offers > 0 ? " green" : ""}`}>
          <div className="jt-stat-label">Offers</div>
          <div className="jt-stat-value">{stats.offers}</div>
          <div className="jt-stat-sub">
            {stats.total ? Math.round((stats.offers / stats.total) * 100) : 0}% offer rate
          </div>
        </div>
      </div>
    </section>
  );
}
