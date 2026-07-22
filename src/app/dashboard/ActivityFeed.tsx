"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";

const EVENT_ICONS: Record<string, string> = {
  CREATED: "✦",
  STAGE_CHANGED: "⇄",
  NOTE_ADDED: "◎",
  FOLLOW_UP_SET: "◷",
  FOLLOW_UP_CLEARED: "◌",
  INTERVIEW_SCHEDULED: "📋",
  REJECTED: "✗",
  OFFERED: "★",
  META_UPDATED: "◈",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ActivityFeed() {
  const apps = useApplicationsStore((s) => s.apps);
  const router = useRouter();

  const feed = useMemo(() => {
    const items: {
      appId: string;
      company: string;
      title: string;
      eventType: string;
      message: string;
      createdAt: string;
    }[] = [];

    for (const app of apps) {
      const company = app.role?.company?.name ?? "Unknown";
      const title = app.role?.title ?? "Role";
      for (const e of app.events ?? []) {
        items.push({
          appId: app.id,
          company,
          title,
          eventType: e.type,
          message: e.message,
          createdAt: e.createdAt,
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.slice(0, 12);
  }, [apps]);

  if (feed.length === 0) return null;

  return (
    <section className="activity-feed-section">
      <div className="activity-feed-header">
        <span className="jt-stat-label" style={{ fontSize: 13, fontWeight: 700 }}>Recent activity</span>
      </div>
      <div className="activity-feed-list">
        {feed.map((item, i) => (
          <div
            key={`${item.appId}-${item.createdAt}-${i}`}
            className="activity-feed-row"
            onClick={() => router.push(`/dashboard/applications/${item.appId}`)}
            role="button"
            tabIndex={0}
          >
            <span className="activity-feed-icon">{EVENT_ICONS[item.eventType] ?? "·"}</span>
            <div className="activity-feed-body">
              <span className="activity-feed-company">{item.company}</span>
              <span className="activity-feed-dot">·</span>
              <span className="activity-feed-title">{item.title}</span>
              <span className="activity-feed-msg">{item.message}</span>
            </div>
            <span className="activity-feed-time">{timeAgo(item.createdAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
