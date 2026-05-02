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

  // keep compatibility with newer selection style too
  onSelect?: (id: string, multi: boolean) => void;
};

function stageLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ApplicationCard({
  app,
  //nowMs = Date.now(),
  compact = false,
  selected = false,
  isSaving = false,
  disableHoverLift = false,
  onOpen,
  onSetFollowUp,
  onToggleSelected,
  onSelect,
}: ApplicationCardProps) {
  const nowMs = Date.now();

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

  const accentColor = sla?.breached
    ? "var(--danger)"
    : sla?.severity === "warning"
      ? "var(--warn)"
      : "var(--ok)";

  const cardStyle: React.CSSProperties = {
    position: "relative",
    borderRadius: 18,
    border: selected
      ? "1px solid var(--ring)"
      : "1px solid rgba(255,255,255,0.07)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    boxShadow: selected
      ? "0 0 0 1px var(--ring), 0 16px 40px rgba(0,0,0,0.28)"
      : "0 14px 34px rgba(0,0,0,0.22)",
    overflow: "hidden",
    minHeight: compact ? 124 : 138,
    transition:
      "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
  };

  const leftAccentStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: accentColor,
    boxShadow: `0 0 18px ${accentColor}`,
  };

  const freshnessPillStyle: React.CSSProperties | undefined =
    freshnessKind === "new"
      ? {
          background: "rgba(34,197,94,0.14)",
          color: "#58d68d",
          border: "1px solid rgba(34,197,94,0.28)",
        }
      : freshnessKind === "recent"
        ? {
            background: "rgba(59,130,246,0.14)",
            color: "#7fb0ff",
            border: "1px solid rgba(59,130,246,0.28)",
          }
        : undefined;

  return (
    <Link
      href={`/dashboard/applications/${app.id}`}
      className="fade-in"
      onClick={(e) => {
        if (!onSelect) return;

        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          e.preventDefault();
          onSelect(app.id, true);
        }
      }}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
      title={`${title} @ ${company}`}
    >
      <article style={cardStyle}>
        <div style={leftAccentStyle} />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gap: 8,
            padding: compact ? "14px 14px 14px 16px" : "16px 16px 16px 18px",
          }}
        >
          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <div
              style={{
                fontSize: compact ? 15 : 16,
                fontWeight: 900,
                lineHeight: 1.2,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {company}
            </div>

            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {source}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginTop: compact ? 2 : 4,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 28,
                padding: "0 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {ageText}
            </span>

            {freshnessLabel ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  ...freshnessPillStyle,
                }}
              >
                {freshnessLabel}
              </span>
            ) : null}

            {follow?.kind === "overdue" ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  background: "rgba(239,68,68,0.14)",
                  color: "#ff8b8b",
                  border: "1px solid rgba(239,68,68,0.24)",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                Overdue
              </span>
            ) : null}

            {follow?.kind === "due" ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  background: "rgba(245,158,11,0.14)",
                  color: "#ffbe5c",
                  border: "1px solid rgba(245,158,11,0.24)",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                Follow-up
              </span>
            ) : null}

            {sla?.breached ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 28,
                  padding: "0 10px",
                  borderRadius: 999,
                  background: "rgba(239,68,68,0.14)",
                  color: "#ff8b8b",
                  border: "1px solid rgba(239,68,68,0.24)",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                SLA breach
              </span>
            ) : null}
          </div>

          {!compact ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  color: "var(--text-muted-2)",
                  textTransform: "uppercase",
                }}
              >
                {stageLabel(app.stage)}
              </div>

              {selected ? (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--ring)",
                  }}
                >
                  Selected
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
