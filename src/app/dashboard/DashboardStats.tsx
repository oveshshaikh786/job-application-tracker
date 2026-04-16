"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";

import type { Stage, Application as AppRow } from "@/domain/application/types";
import { isClosed, getEnteredStageAt } from "@/domain/application/stage";
import { getFollowUpInfo } from "@/domain/application/followup";
import { getSlaInfo } from "@/domain/application/sla";
import { toMs } from "@/domain/application/time";

type StageUI = Exclude<Stage, "ARCHIVED">;

type DashboardStatsProps = {
  title?: string;
  subtitle?: string;
  newHref?: string;
};

const STAGES: { key: StageUI; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "APPLIED", label: "Applied" },
  { key: "RECRUITER_SCREEN", label: "Recruiter" },
  { key: "TECH_SCREEN", label: "Tech" },
  { key: "ONSITE", label: "Onsite" },
  { key: "OFFER", label: "Offer" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];

type QuickAddState = {
  title: string;
  company: string;
  source: string;
  stage: StageUI;
  followUpPreset: "none" | "tomorrow" | "3d" | "7d";
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

function isoFromQuickPreset(p: QuickAddState["followUpPreset"]) {
  const now = Date.now();

  if (p === "tomorrow") {
    return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  }
  if (p === "3d") {
    return new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (p === "7d") {
    return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  return null;
}

function buildCreatePayload(state: QuickAddState) {
  return {
    roleTitle: state.title.trim(),
    companyName: state.company.trim(),
    stage: state.stage,
    source: state.source.trim() || null,
    nextActionAt: isoFromQuickPreset(state.followUpPreset),
  };
}

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

function StatCard(props: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "ok" | "accent";
}) {
  const toneClass =
    props.tone === "warn"
      ? " is-warn"
      : props.tone === "danger"
        ? " is-danger"
        : props.tone === "ok"
          ? " is-ok"
          : props.tone === "accent"
            ? " is-accent"
            : "";

  return (
    <div className={`stat-card${toneClass}`}>
      <div className="stat-label">{props.label}</div>
      <div className="stat-value">{props.value}</div>
      {props.hint ? <div className="stat-hint">{props.hint}</div> : null}
    </div>
  );
}

function MetricCard(props: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="panel-glass" style={{ padding: 12, minWidth: 0 }}>
      <div className="stat-label" style={{ marginBottom: 6 }}>
        {props.label}
      </div>
      <div className="stat-value" style={{ fontSize: 22 }}>
        {props.primary}
      </div>
      {props.secondary ? (
        <div className="stat-hint" style={{ marginTop: 6 }}>
          {props.secondary}
        </div>
      ) : null}
    </div>
  );
}

function Pill(props: { label: string; value: number }) {
  return (
    <div className="pill pill-default" style={{ padding: "8px 10px", gap: 8 }}>
      <span style={{ opacity: 0.8, fontSize: 12 }}>{props.label}</span>
      <span className="data-val" style={{ fontWeight: 900, fontSize: 12 }}>
        {props.value}
      </span>
    </div>
  );
}

function FunnelCard(props: {
  label: string;
  count: number;
  fromPrevPct: string;
  dropPct?: string;
  isFirst?: boolean;
}) {
  return (
    <div className="panel-glass" style={{ padding: 12, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 900 }}>{props.label}</div>
        <div className="text-muted-2" style={{ fontSize: 12 }}>
          {props.isFirst ? "" : `from prev: ${props.fromPrevPct}`}
        </div>
      </div>

      <div className="stat-value" style={{ fontSize: 22, marginTop: 6 }}>
        {props.count}
      </div>

      {!props.isFirst && props.dropPct ? (
        <div className="stat-hint" style={{ marginTop: 6 }}>
          drop: {props.dropPct}
        </div>
      ) : null}
    </div>
  );
}

function SectionHeader(props: { title: string; hint?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 12,
        marginBottom: 8,
      }}
    >
      <div style={{ fontWeight: 900 }}>{props.title}</div>
      {props.hint ? (
        <div className="text-muted-2" style={{ fontSize: 12 }}>
          {props.hint}
        </div>
      ) : null}
    </div>
  );
}

function BreakdownTable({
  title,
  stageOrder,
  stageLabel,
  data,
  emptyText,
}: {
  title: string;
  stageOrder: StageUI[];
  stageLabel: Record<StageUI, string>;
  data?: Partial<Record<StageUI, number>>;
  emptyText: string;
}) {
  const rows = stageOrder
    .map((stage) => ({
      stage,
      label: stageLabel[stage],
      value: data?.[stage] ?? 0,
    }))
    .filter((row) => row.value > 0);

  return (
    <div className="panel-glass" style={{ padding: 12, minWidth: 0 }}>
      <div style={{ fontWeight: 900 }}>{title}</div>

      {rows.length === 0 ? (
        <div className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {rows.map((row) => (
            <div
              key={row.stage}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div className="text-muted">{row.label}</div>
              <div className="data-val" style={{ fontWeight: 900 }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrimaryButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  asLinkHref?: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  const baseStyle: React.CSSProperties = {
    ...props.style,
  };

  if (props.asLinkHref) {
    return (
      <Link
        href={props.asLinkHref}
        className="btn"
        style={baseStyle}
        title={props.title}
      >
        {props.children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="btn"
      onClick={props.onClick}
      disabled={props.disabled}
      style={baseStyle}
      title={props.title}
    >
      {props.children}
    </button>
  );
}

function GhostButton(props: {
  children: React.ReactNode;
  onClick: () => void;
  ariaExpanded?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={props.onClick}
      aria-expanded={props.ariaExpanded}
      title={props.title}
      style={props.style}
    >
      {props.children}
    </button>
  );
}

function buildLocalFunnelRows(stageCounts: Record<StageUI, number>) {
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

export default function DashboardStats(props: DashboardStatsProps) {
  const apps = useApplicationsStore((s) => s.apps);
  const addApp = useApplicationsStore((s) => s.addApp);

  const title = props.title ?? "Job Tracker";
  const subtitle = props.subtitle ?? "Kanban pipeline (v0)";
  const newHref = props.newHref ?? "/dashboard/new";

  const [showDetails, setShowDetails] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 520px)");
    const onChange = () => setIsMobile(mql.matches);

    onChange();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    const legacy = mql as unknown as {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };

    legacy.addListener?.(onChange);
    return () => legacy.removeListener?.(onChange);
  }, []);

  const headerBtn: React.CSSProperties = isMobile
    ? { fontSize: 13, padding: "8px 10px", minHeight: 38 }
    : { fontSize: 14, padding: "10px 14px", minHeight: 40 };

  const ghostBtn: React.CSSProperties = isMobile
    ? { fontSize: 13, padding: "8px 10px", minHeight: 38 }
    : { fontSize: 14, padding: "10px 12px", minHeight: 40 };

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickState, setQuickState] = useState<QuickAddState>({
    title: "",
    company: "",
    source: "",
    stage: "APPLIED",
    followUpPreset: "tomorrow",
  });
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickErr, setQuickErr] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement | null>(null);

  function resetQuick() {
    setQuickState({
      title: "",
      company: "",
      source: "",
      stage: "APPLIED",
      followUpPreset: "tomorrow",
    });
    setQuickErr(null);
    setQuickSaving(false);
  }

  function openQuick() {
    resetQuick();
    setQuickOpen(true);
  }

  function closeQuick() {
    setQuickOpen(false);
    resetQuick();
  }

  useEffect(() => {
    if (!quickOpen) return;
    const t = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [quickOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === "k";
      const meta = e.metaKey || e.ctrlKey;

      if (!meta || !isK) return;

      e.preventDefault();
      openQuick();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const nonArchivedApps = useMemo(
    () => apps.filter((a) => a.stage !== "ARCHIVED"),
    [apps],
  );

  const total = nonArchivedApps.length;
  const activeApps = nonArchivedApps.filter((a) => !isClosed(a.stage));
  const active = activeApps.length;

  const overdueApps = activeApps.filter(
    (a) => getFollowUpInfo(a, nowMs)?.kind === "overdue",
  );

  const dueIn24hApps = activeApps.filter((a) => {
    const follow = getFollowUpInfo(a, nowMs);
    if (follow?.kind !== "due") return false;
    if (!a.nextActionAt) return false;
    const diff = toMs(a.nextActionAt) - nowMs;
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  });

  const dueIn7dApps = activeApps.filter((a) => {
    const follow = getFollowUpInfo(a, nowMs);
    if (follow?.kind !== "due") return false;
    if (!a.nextActionAt) return false;
    const diff = toMs(a.nextActionAt) - nowMs;
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  });

  const slaBreachedApps = activeApps.filter((a) => {
    const sla = getSlaInfo(a, nowMs);
    return !!sla?.breached;
  });

  let sumStageDays = 0;
  let denom = 0;
  for (const a of activeApps) {
    const enteredAt = getEnteredStageAt(a);
    if (!enteredAt) continue;
    const days = Math.floor((nowMs - enteredAt) / (24 * 60 * 60 * 1000));
    sumStageDays += days;
    denom += 1;
  }
  const avgStageDays = denom === 0 ? null : sumStageDays / denom;

  const stageOrder = STAGE_ORDER_UI;
  const stageLabel = STAGE_LABEL_UI;

  const stageCounts: Record<StageUI, number> = stageOrder.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<StageUI, number>,
  );

  for (const a of nonArchivedApps) {
    const s = a.stage as StageUI;
    if (stageCounts[s] != null) stageCounts[s] += 1;
  }

  const overdueByStage: Partial<Record<StageUI, number>> = {};
  for (const a of overdueApps) {
    const s = a.stage as StageUI;
    overdueByStage[s] = (overdueByStage[s] ?? 0) + 1;
  }

  const stuckByStage: Partial<Record<StageUI, number>> = {};
  for (const a of slaBreachedApps) {
    const s = a.stage as StageUI;
    stuckByStage[s] = (stuckByStage[s] ?? 0) + 1;
  }

  const funnelRows = buildLocalFunnelRows(stageCounts);

  const archived = apps.filter((a) => a.stage === "ARCHIVED").length;

  const avgStageValue = useMemo(() => {
    if (avgStageDays == null) {
      return { value: "—", hint: "—" };
    }

    return {
      value: Math.round(avgStageDays),
      hint: `${avgStageDays.toFixed(1)} days`,
    };
  }, [avgStageDays]);

  const statsGridCols = isMobile
    ? "repeat(2, minmax(0, 1fr))"
    : "repeat(auto-fit, minmax(160px, 1fr))";

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

  async function createQuick() {
    if (quickSaving) return;

    const roleTitle = quickState.title.trim();
    const companyName = quickState.company.trim();

    if (!roleTitle || !companyName) {
      setQuickErr("Title and Company are required.");
      return;
    }

    setQuickSaving(true);
    setQuickErr(null);

    try {
      const payload = buildCreatePayload({
        ...quickState,
        title: roleTitle,
        company: companyName,
        source: quickState.source.trim(),
      });

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text().catch(() => "");

      if (!res.ok) {
        try {
          const parsed = JSON.parse(raw);
          const fieldErrors = parsed?.details?.fieldErrors;

          if (fieldErrors) {
            const messages = Object.entries(fieldErrors)
              .flatMap(([field, msgs]) =>
                Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [],
              )
              .join(" | ");

            throw new Error(
              messages || parsed?.error || "Failed to create application",
            );
          }

          throw new Error(
            parsed?.error || raw || "Failed to create application",
          );
        } catch {
          throw new Error(raw || "Failed to create application");
        }
      }

      const created = JSON.parse(raw) as AppRow;
      addApp(created);
      closeQuick();
    } catch (e: unknown) {
      setQuickErr(
        e instanceof Error ? e.message : "Failed to create application.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  const quickInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid var(--input-border)",
    background: "var(--input-bg)",
    color: "var(--text)",
    outline: "none",
  };

  return (
    <>
      <div
        className="page-header"
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
          <div className="text-muted-2" style={{ fontSize: 12, marginTop: 2 }}>
            Tip: <span style={{ fontWeight: 800 }}>Ctrl/Cmd + K</span> to Quick
            Add
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: isMobile ? "flex-start" : "flex-end",
            gap: 12,
            minWidth: 0,
            width: isMobile ? "100%" : "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: isMobile ? "stretch" : "flex-end",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <ThemeToggle />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, auto)",
              gap: 10,
              width: isMobile ? "100%" : "auto",
              alignItems: "center",
            }}
          >
            <GhostButton
              onClick={() => setShowDetails((v) => !v)}
              ariaExpanded={showDetails}
              title="Toggle analytics panel"
              style={{
                ...ghostBtn,
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              {showDetails ? "Hide details" : "Show details"}
            </GhostButton>

            <PrimaryButton
              onClick={openQuick}
              title="Quick add (Ctrl/Cmd+K)"
              style={{
                ...headerBtn,
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              + Quick Add
            </PrimaryButton>

            <PrimaryButton
              asLinkHref={newHref}
              title="Full create page"
              style={{
                ...headerBtn,
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              + New
            </PrimaryButton>

            <PrimaryButton
              asLinkHref="/dashboard/archived"
              title="View archived applications"
              style={{
                ...headerBtn,
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              Archived
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div
        className="stats-row"
        style={{
          marginTop: 14,
          gridTemplateColumns: statsGridCols,
          maxWidth: 1440,
          marginInline: "auto",
          width: "100%",
        }}
      >
        <StatCard label="Total" value={total} />
        <StatCard label="Active" value={active} tone="accent" />
        <StatCard label="Overdue" value={overdueApps.length} tone="warn" />
        <StatCard
          label="SLA breached"
          value={slaBreachedApps.length}
          tone="danger"
        />
        <StatCard
          label="Avg stage (days)"
          value={avgStageValue.value}
          hint={avgStageValue.hint}
        />
        <StatCard label="Due in 24h" value={dueIn24hApps.length} tone="warn" />
        <StatCard label="Due in 7d" value={dueIn7dApps.length} />
        <StatCard label="Archived" value={archived} />
      </div>

      {showDetails ? (
        <div
          className="panel-glass fade-in"
          style={{
            marginTop: 12,
            padding: 12,
            maxWidth: 1440,
            marginInline: "auto",
            width: "100%",
          }}
        >
          <SectionHeader title="Velocity" hint="Last 7d vs last 30d" />

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <MetricCard
              label="Created (last 7d)"
              primary={`${created7}`}
              secondary={`${createdPerDay7.toFixed(
                1,
              )}/day • vs 30d: ${creationTrend}`}
            />
            <MetricCard
              label="Stage moves (last 7d)"
              primary={`${moves7}`}
              secondary={`${movesPerDay7.toFixed(
                1,
              )}/day • vs 30d: ${moveTrend}`}
            />
            <MetricCard
              label="Notes (last 7d)"
              primary={`${notes7}`}
              secondary={`${notesPerDay7.toFixed(
                1,
              )}/day • vs 30d: ${noteTrend}`}
            />
          </div>

          <SectionHeader title="Stage breakdown" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {stageOrder.map((stage) => (
              <Pill
                key={stage}
                label={stageLabel[stage]}
                value={stageCounts[stage] ?? 0}
              />
            ))}
          </div>

          <SectionHeader title="Risk breakdowns" hint="Counts by stage" />
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <BreakdownTable
              title="Overdue by stage"
              stageOrder={stageOrder}
              stageLabel={stageLabel}
              data={overdueByStage}
              emptyText="No overdue items."
            />
            <BreakdownTable
              title="SLA-breached by stage"
              stageOrder={stageOrder}
              stageLabel={stageLabel}
              data={stuckByStage}
              emptyText="No SLA breaches."
            />
          </div>

          <SectionHeader
            title="Funnel"
            hint="Based on current stage counts (not lifetime). Conversion + drop-off from previous step."
          />
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {funnelRows.map((row, idx) => (
              <FunnelCard
                key={row.key}
                label={row.label}
                count={row.count}
                fromPrevPct={row.fromPrevPct}
                dropPct={row.dropPct}
                isFirst={idx === 0}
              />
            ))}
          </div>
        </div>
      ) : null}

      {quickOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeQuick();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              closeQuick();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void createQuick();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            className="panel-glass fade-in"
            style={{
              width: "min(720px, 96vw)",
              padding: 14,
              borderRadius: 16,
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Quick Add</div>
                <div
                  className="text-muted-2"
                  style={{ fontSize: 12, marginTop: 2 }}
                >
                  Ctrl/Cmd+Enter to create • Esc to close
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeQuick}
                style={{ padding: "8px 10px" }}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {quickErr ? <div className="form-error">{quickErr}</div> : null}

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                }}
              >
                <div className="form-field">
                  <label className="form-label">Title</label>
                  <input
                    ref={titleRef}
                    className="form-input"
                    value={quickState.title}
                    onChange={(e) =>
                      setQuickState((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Frontend Engineer"
                    style={quickInputStyle}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Company</label>
                  <input
                    className="form-input"
                    value={quickState.company}
                    onChange={(e) => {
                      const nextCompany = e.target.value;
                      setQuickState((prev) => ({
                        ...prev,
                        company: nextCompany,
                        source:
                          prev.source.trim() === "" ? "LinkedIn" : prev.source,
                      }));
                    }}
                    placeholder="Netflix"
                    style={quickInputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                }}
              >
                <div className="form-field">
                  <label className="form-label">Stage</label>
                  <select
                    className="form-select"
                    value={quickState.stage}
                    onChange={(e) =>
                      setQuickState((prev) => ({
                        ...prev,
                        stage: e.target.value as StageUI,
                      }))
                    }
                    style={quickInputStyle}
                  >
                    {STAGES.map((stage) => (
                      <option key={stage.key} value={stage.key}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Follow-up</label>
                  <select
                    className="form-select"
                    value={quickState.followUpPreset}
                    onChange={(e) =>
                      setQuickState((prev) => ({
                        ...prev,
                        followUpPreset: e.target
                          .value as QuickAddState["followUpPreset"],
                      }))
                    }
                    style={quickInputStyle}
                  >
                    <option value="none">None</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="3d">In 3 days</option>
                    <option value="7d">In 7 days</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Source</label>
                  <input
                    className="form-input"
                    value={quickState.source}
                    onChange={(e) =>
                      setQuickState((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                    placeholder="LinkedIn / Referral / Career Page"
                    style={quickInputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 6,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    resetQuick();
                    titleRef.current?.focus();
                  }}
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void createQuick();
                  }}
                  disabled={quickSaving}
                >
                  {quickSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
