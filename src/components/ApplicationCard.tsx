"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { Application } from "@/domain/application/types";
import { getFollowUpInfo } from "@/domain/application/followup";
import { getSlaInfo } from "@/domain/application/sla";
import {
  formatRelativeAgeShort,
  getFreshnessKind,
  getFreshnessLabel,
} from "@/domain/application/time";

type ApplicationCardProps = {
  app: Application;
  nowMs?: number;
  compact?: boolean;
  selected?: boolean;
  isSaving?: boolean;
  disableHoverLift?: boolean;

  onOpen?: (appId: string) => void;
  onSetFollowUp?: (id: string, iso: string | null) => void;
  onToggleSelected?: (appId: string) => void;
  onSelect?: (id: string, multi: boolean) => void;
};

function stageLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pillStyle(
  kind: "default" | "new" | "recent" | "overdue" | "due" | "sla",
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 26,
    padding: "0 12px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: "nowrap",
    border: "0",
    background: "rgba(255,255,255,0.14)",
    color: "rgba(245,241,232,0.84)",
  };

  if (kind === "new") {
    return {
      ...base,
      background: "#eef9df",
      color: "#3f7b16",
    };
  }

  if (kind === "recent") {
    return {
      ...base,
      background: "#dcecff",
      color: "#2c67a4",
    };
  }

  if (kind === "overdue" || kind === "sla") {
    return {
      ...base,
      background: "#ffe4e4",
      color: "#a33c3c",
    };
  }

  if (kind === "due") {
    return {
      ...base,
      background: "#fff2d9",
      color: "#9a6115",
    };
  }

  return base;
}

export default function ApplicationCard({
  app,
  nowMs = Date.now(),
  compact = false,
  selected = false,
  isSaving = false,
  disableHoverLift = false,
  onOpen,
  onSetFollowUp,
  onToggleSelected,
  onSelect,
}: ApplicationCardProps) {
  const sla = useMemo(() => getSlaInfo(app, nowMs), [app, nowMs]);
  const follow = useMemo(() => getFollowUpInfo(app, nowMs), [app, nowMs]);

  const ageText = useMemo(
    () => formatRelativeAgeShort(app.createdAt, nowMs),
    [app.createdAt, nowMs],
  );

  const freshnessKind = useMemo(
    () => getFreshnessKind(app.createdAt, nowMs),
    [app.createdAt, nowMs],
  );

  const freshnessLabel = useMemo(
    () => getFreshnessLabel(app.createdAt, nowMs),
    [app.createdAt, nowMs],
  );

  const title = app.role?.title ?? "Untitled role";
  const company = app.role?.company?.name ?? "Unknown company";
  const source = app.source ?? "—";

  return (
    <Link
      href={`/dashboard/applications/${app.id}`}
      className="jt-app-card-link"
      onClick={(e) => {
        if (onSelect && (e.shiftKey || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSelect(app.id, true);
          return;
        }

        if (onOpen) {
          e.preventDefault();
          onOpen(app.id);
        }
      }}
      title={`${title} @ ${company}`}
    >
      <article
        className={[
          "jt-app-card",
          compact ? "is-compact" : "",
          selected ? "is-selected" : "",
          isSaving ? "is-saving" : "",
          disableHoverLift ? "no-lift" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="jt-app-card-top">
          <div className="jt-app-company">{company}</div>

          {selected ? (
            <button
              type="button"
              className="jt-card-select"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSelected?.(app.id);
              }}
              aria-label="Unselect application"
            >
              ✓
            </button>
          ) : null}
        </div>

        <div className="jt-app-title">{title}</div>

        <div className="jt-app-meta-row">
          <span className="jt-app-date">
            {freshnessKind === "new" ? `${ageText}` : `Started ${ageText}`}
          </span>

          <div className="jt-app-badges">
            {freshnessLabel ? (
              <span
                style={pillStyle(freshnessKind === "new" ? "new" : "recent")}
              >
                {freshnessLabel}
              </span>
            ) : null}

            {follow?.kind === "overdue" ? (
              <span style={pillStyle("overdue")}>Overdue</span>
            ) : null}

            {follow?.kind === "due" ? (
              <span style={pillStyle("due")}>Prep ↗</span>
            ) : null}

            {sla?.breached ? <span style={pillStyle("sla")}>SLA</span> : null}
          </div>
        </div>

        {!compact ? (
          <div className="jt-app-footer">
            <span>{source}</span>
            <span>{stageLabel(app.stage)}</span>
          </div>
        ) : null}

        {isSaving ? <div className="jt-card-saving">Saving…</div> : null}

        {onSetFollowUp ? (
          <div className="jt-card-actions">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const iso = new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString();
                onSetFollowUp(app.id, iso);
              }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSetFollowUp(app.id, null);
              }}
            >
              Clear
            </button>
          </div>
        ) : null}
      </article>
    </Link>
  );
}
