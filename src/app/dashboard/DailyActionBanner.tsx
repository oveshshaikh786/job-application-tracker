"use client";

import { useMemo } from "react";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";
import { buildTodayQueue } from "@/domain/application/todayQueue";

export default function DailyActionBanner() {
  const apps = useApplicationsStore((s) => s.apps);
  const nowMs = Date.now();

  const items = useMemo(() => {
    const b = buildTodayQueue(apps, nowMs);
    const rows: string[] = [];
    b.overdue.forEach((a) => rows.push(`🔥 Overdue · ${a.company}`));
    b.due24h.forEach((a) => rows.push(`⏳ Follow up · ${a.company}`));
    b.ghostedNoResponse.forEach((a) =>
      rows.push(`👻 No response · ${a.company}`),
    );
    b.slaBreachedNoFollowUp.forEach((a) => rows.push(`⚠️ SLA · ${a.company}`));
    return rows.slice(0, 6);
  }, [apps, nowMs]);

  if (items.length === 0) return null;

  return (
    <section className="jt-queue-banner">
      <div className="jt-queue-title">Today's queue</div>
      <div className="jt-queue-items">
        {items.map((item) => (
          <span key={item} className="jt-queue-pill">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
