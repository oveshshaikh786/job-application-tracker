"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Application } from "@/domain/application/types";

const STAGES = [
  "ALL",
  "DRAFT",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECH_SCREEN",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
  "ARCHIVED",
] as const;

type StageFilter = (typeof STAGES)[number];

function labelStage(stage: string) {
  return stage.replaceAll("_", " ");
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ApplicationsList({
  initialApps,
}: {
  initialApps: Application[];
}) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<StageFilter>("ALL");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...initialApps]
      .filter((app) => {
        if (stage !== "ALL" && app.stage !== stage) return false;

        if (!q) return true;

        const haystack = [
          app.role?.title,
          app.role?.company?.name,
          app.source,
          app.stage,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();

        return sort === "newest" ? bTime - aTime : aTime - bTime;
      });
  }, [initialApps, query, stage, sort]);

  return (
    <section className="applications-page">
      <div className="applications-hero">
        <div>
          <p className="analytics-eyebrow">Application Database</p>
          <h1 className="analytics-title">All Applications</h1>
          <p className="analytics-subtitle">
            Search, filter, and open every job application record.
          </p>
        </div>

        <Link href="/dashboard/new" className="jt-topbar-btn">
          + New job
        </Link>
      </div>

      <div className="applications-toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, title, source..."
          className="applications-search"
        />

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as StageFilter)}
          className="applications-select"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All stages" : labelStage(s)}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          className="applications-select"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="applications-summary">
        Showing <strong>{apps.length}</strong> of{" "}
        <strong>{initialApps.length}</strong> applications
      </div>

      <div className="applications-list">
        {apps.length === 0 ? (
          <div className="applications-empty">No applications found.</div>
        ) : (
          apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/applications/${app.id}`}
              className="applications-row"
            >
              <div className="applications-main">
                <div className="applications-company">
                  {app.role?.company?.name ?? "Unknown company"}
                </div>

                <div className="applications-title">
                  {app.role?.title ?? "Untitled role"}
                </div>

                <div className="applications-meta">
                  <span>{app.source ?? "No source"}</span>
                  <span>Created {formatDate(app.createdAt)}</span>
                  <span>Updated {formatDate(app.updatedAt)}</span>
                </div>
              </div>

              <div className="applications-side">
                <span className={`pill pill-${app.stage.toLowerCase()}`}>
                  {labelStage(app.stage)}
                </span>

                <span className="applications-open">Open →</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
