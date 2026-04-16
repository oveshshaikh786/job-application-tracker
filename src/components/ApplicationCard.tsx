"use client";

import React from "react";
import type { Application } from "@/domain/application/types";
import { getSlaInfo } from "@/domain/application/sla";
import { getFollowUpInfo } from "@/domain/application/followup";
import { isClosed, getEnteredStageAt } from "@/domain/application/stage";
import { fmtAgoShort } from "@/domain/application/time";

export default function ApplicationCard(props: {
  app: Application;
  nowMs: number;
  compact?: boolean;

  onOpen?: (id: string) => void;
  onSetFollowUp?: (id: string, iso: string | null) => void;

  selected?: boolean;
  onToggleSelected?: (id: string) => void;

  freshHours?: number;
  freshTone?: "green" | "blue";

  isSaving?: boolean;
  disableHoverLift?: boolean;
}) {
  const {
    app,
    nowMs,
    compact,
    onOpen,
    onSetFollowUp,
    selected,
    onToggleSelected,
    freshHours = 48,
    freshTone = "green",
    isSaving = false,
    disableHoverLift = false,
  } = props;

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const canAct = !isClosed(app.stage);
  const ready = nowMs > 0;

  const sla = ready ? getSlaInfo(app, nowMs) : null;
  const follow = ready ? getFollowUpInfo(app, nowMs) : null;
  const enteredAt = ready ? getEnteredStageAt(app) : null;
  const stageAgeMs = ready && enteredAt ? nowMs - enteredAt : null;
  const stageAge =
    mounted && stageAgeMs !== null ? fmtAgoShort(stageAgeMs) : null;

  const createdMs = app.createdAt ? new Date(app.createdAt).getTime() : null;

  const isFresh =
    ready &&
    canAct &&
    createdMs !== null &&
    nowMs - createdMs < freshHours * 60 * 60 * 1000;

  const accent =
    sla?.severity === "critical"
      ? "var(--critical)"
      : sla?.severity === "breach"
        ? "var(--danger)"
        : sla?.severity === "warning"
          ? "var(--warn)"
          : selected
            ? "var(--accent)"
            : isFresh
              ? freshTone === "blue"
                ? "var(--accent)"
                : "var(--ok)"
              : "rgba(255,255,255,0.2)";

  const background =
    sla?.severity === "critical"
      ? "var(--critical-dim)"
      : sla?.severity === "breach"
        ? "var(--danger-dim)"
        : sla?.severity === "warning"
          ? "var(--warn-dim)"
          : selected
            ? "var(--accent-dim)"
            : isFresh
              ? freshTone === "blue"
                ? "rgba(61, 142, 240, 0.08)"
                : "rgba(34, 197, 94, 0.06)"
              : "var(--bg-card)";

  const pad = compact ? 12 : 14;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelected?.(app.id);
      return;
    }
    onOpen?.(app.id);
  }

  function quickFollow(e: React.MouseEvent, ms: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!onSetFollowUp) return;
    onSetFollowUp(app.id, new Date(Date.now() + ms).toISOString());
  }

  const baseShadow = `
    inset 3px 0 0 ${accent},
    ${selected ? "0 0 0 2px rgba(61, 142, 240, 0.30)," : ""}
    var(--shadow-card)
  `;

  const hoverShadow = `
    inset 3px 0 0 ${accent},
    ${selected ? "0 0 0 2px rgba(61, 142, 240, 0.34)," : ""}
    var(--shadow-md)
  `;

  const showFollowUpAction = follow?.kind === "overdue" && !!onSetFollowUp;
  const showSetFollowUp =
    !app.nextActionAt && !!sla?.breached && !!onSetFollowUp;

  function pillClasses() {
    return "pill";
  }

  function followClass() {
    if (!follow) return "pill pill-default";
    if (follow.kind === "overdue") return "pill pill-danger";
    return "pill pill-warn";
  }

  function slaClass() {
    if (!sla?.breached) return "pill pill-default";
    if (sla.severity === "critical") return "pill pill-critical";
    return "pill pill-danger";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`app-card${selected ? " is-selected" : ""}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(app.id);
        }
      }}
      style={{
        padding: pad,
        background,
        boxShadow: baseShadow,
        opacity: isSaving ? 0.88 : 1,
      }}
      onMouseEnter={(e) => {
        if (disableHoverLift) return;
        e.currentTarget.style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        if (disableHoverLift) return;
        e.currentTarget.style.boxShadow = baseShadow;
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <div className="app-card-title">{app.role?.title ?? "Untitled"}</div>

        {isSaving ? (
          <span
            className="data-val"
            style={{
              fontSize: 11,
              color: "var(--text-2)",
              flexShrink: 0,
            }}
          >
            saving…
          </span>
        ) : null}
      </div>

      <div className="app-card-company">
        {app.role?.company?.name ?? "Unknown company"}
      </div>

      <div className="app-card-source">{app.source ?? "—"}</div>

      <div className="app-card-pills">
        {sla?.breached ? (
          <span className={slaClass()}>
            {mounted ? `SLA ${sla.daysInt}d` : "SLA"}
          </span>
        ) : stageAge ? (
          <span className="pill pill-muted">{stageAge}</span>
        ) : null}

        {follow ? (
          <span className={followClass()}>
            {mounted
              ? follow.label
              : follow.kind === "overdue"
                ? "Overdue"
                : "Follow-up"}
          </span>
        ) : null}

        {showFollowUpAction ? (
          <button
            type="button"
            className="followup-btn is-primary"
            onClick={(e) => quickFollow(e, 2 * 60 * 60 * 1000)}
          >
            Follow up
          </button>
        ) : null}

        {showSetFollowUp ? (
          <button
            type="button"
            className="followup-btn"
            onClick={(e) => quickFollow(e, 24 * 60 * 60 * 1000)}
          >
            Set follow-up
          </button>
        ) : null}

        {isFresh && !sla?.breached && !follow ? (
          <span
            className={`${pillClasses()} ${
              freshTone === "blue" ? "pill-accent" : "pill-ok"
            }`}
          >
            New
          </span>
        ) : null}
      </div>
    </div>
  );
}
