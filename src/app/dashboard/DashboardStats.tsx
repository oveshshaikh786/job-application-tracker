"use client";

import { useMemo } from "react";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";
import { isClosed } from "@/domain/application/stage";
import { getFollowUpInfo } from "@/domain/application/followup";

export default function DashboardStats() {
  const apps = useApplicationsStore((s) => s.apps);
  const nowMs = Date.now();

  const stats = useMemo(() => {
    const nonArchived = apps.filter((a) => a.stage !== "ARCHIVED");
    const active = nonArchived.filter((a) => !isClosed(a.stage));
    const overdue = active.filter(
      (a) => getFollowUpInfo(a, nowMs)?.kind === "overdue",
    );
    const due7d = active.filter((a) => {
      const f = getFollowUpInfo(a, nowMs);
      if (f?.kind !== "due" || !a.nextActionAt) return false;
      return new Date(a.nextActionAt).getTime() - nowMs <= 7 * 86_400_000;
    });
    return {
      total: nonArchived.length,
      active: active.length,
      overdue: overdue.length,
      due7d: due7d.length,
    };
  }, [apps, nowMs]);

  return (
    <section className="jt-stats">
      <div className="jt-stats-grid">
        <Stat
          label="Total"
          value={stats.total}
          sub={`${stats.active} active`}
        />
        <Stat
          label="Active"
          value={stats.active}
          sub="In pipeline"
          tone="green"
        />
        <Stat
          label="Follow-ups"
          value={stats.due7d}
          sub="Due in 7 days"
          tone={stats.due7d > 0 ? "orange" : undefined}
        />
        <Stat
          label="Overdue"
          value={stats.overdue}
          sub="Needs action"
          tone={stats.overdue > 0 ? "red" : undefined}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "green" | "orange" | "red";
}) {
  return (
    <div className={`jt-stat-card${tone ? ` ${tone}` : ""}`}>
      <div className="jt-stat-label">{label}</div>
      <div className="jt-stat-value">{value}</div>
      {sub && <div className="jt-stat-sub">{sub}</div>}
    </div>
  );
}
