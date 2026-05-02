"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { Application } from "@/domain/application/types";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";
import {
  buildTodayQueue,
  type TodayQueueItem,
} from "@/domain/application/todayQueue";

type MqlLegacy = {
  addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
  removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    const legacy = mql as MediaQueryList & MqlLegacy;
    legacy.addListener?.(onChange);
    return () => legacy.removeListener?.(onChange);
  }, [query]);

  return matches;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function parseDaysFromLabel(label: string): number | null {
  const m = label.match(/(\d+)\s*d\b/i);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

function daysBetween(nowMs: number, thenIso?: string | null) {
  if (!thenIso) return null;
  const t = new Date(thenIso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 86400000));
}

function isoIn(msFromNow: number) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function pillClass(kind: TodayQueueItem["rightPill"]["kind"]) {
  if (kind === "overdue") return "pill pill-danger";
  if (kind === "ghosted") return "pill pill-danger";
  if (kind === "stuck") return "pill pill-warn";
  if (kind === "sla") return "pill pill-critical";
  return "pill pill-default";
}

function CardShell({
  children,
  onClick,
  isMobile,
}: {
  children: ReactNode;
  onClick: () => void;
  isMobile: boolean;
}) {
  return (
    <div
      className="card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        padding: isMobile ? 12 : 14,
        cursor: "pointer",
        userSelect: "none",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const className = danger
    ? "followup-btn"
    : primary
      ? "followup-btn is-primary"
      : "followup-btn";

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "8px 12px" }}
    >
      {label}
    </button>
  );
}

type Stage =
  | "DRAFT"
  | "APPLIED"
  | "RECRUITER_SCREEN"
  | "TECH_SCREEN"
  | "ONSITE"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

const IMPACT_BY_STAGE: Record<Stage, number> = {
  DRAFT: 10,
  APPLIED: 25,
  RECRUITER_SCREEN: 40,
  TECH_SCREEN: 60,
  ONSITE: 80,
  OFFER: 95,
  REJECTED: 0,
  WITHDRAWN: 0,
};

const STAGE_RESPONSE_BASE: Record<Stage, number> = {
  DRAFT: 0.6,
  APPLIED: 0.8,
  RECRUITER_SCREEN: 1.1,
  TECH_SCREEN: 0.95,
  ONSITE: 0.9,
  OFFER: 1.0,
  REJECTED: 0.0,
  WITHDRAWN: 0.0,
};

const COST_BY_STAGE: Record<Stage, number> = {
  DRAFT: 3,
  APPLIED: 5,
  RECRUITER_SCREEN: 6,
  TECH_SCREEN: 12,
  ONSITE: 18,
  OFFER: 10,
  REJECTED: 0,
  WITHDRAWN: 0,
};

function sourceMultiplier(source?: string | null) {
  const s = (source ?? "").toLowerCase();
  if (s.includes("referral")) return 1.25;
  if (s.includes("recruiter")) return 1.15;
  if (s.includes("career page") || s.includes("indeed") || s.includes("cold")) {
    return 1.0;
  }
  return 1.05;
}

function sweetSpotProbability(daysSinceTouch: number) {
  if (daysSinceTouch <= 1) return 0.7;
  if (daysSinceTouch <= 3) return 1.1;
  if (daysSinceTouch <= 6) return 1.3;
  if (daysSinceTouch <= 10) return 1.1;
  if (daysSinceTouch <= 20) return 0.8;
  return 0.6;
}

function followUpUrgency(nextActionAt?: string | null, nowMs = Date.now()) {
  if (!nextActionAt) return 1.0;
  const ms = new Date(nextActionAt).getTime() - nowMs;
  const hours = ms / 36e5;
  if (hours <= 0) return 2.2;
  if (hours <= 24) return 1.8;
  if (hours <= 72) return 1.3;
  return 1.1;
}

function slaUrgency(daysPastSla: number) {
  if (daysPastSla <= 0) return 1.0;
  return Math.min(2.5, 1.4 + daysPastSla * 0.08);
}

function ageUrgency(daysInStage: number) {
  return 1.0 + Math.min(0.6, daysInStage * 0.02);
}

type AtsResult = { score: number; reasons: string[] };

function computeAtsScore(args: {
  stage: Stage;
  source?: string | null;
  nextActionAt?: string | null;
  daysInStage: number;
  daysPastSla: number;
  daysSinceTouch: number;
  starred?: boolean;
  nowMs: number;
  isGhosted?: boolean;
}): AtsResult {
  const {
    stage,
    source,
    nextActionAt,
    daysInStage,
    daysPastSla,
    daysSinceTouch,
    starred,
    nowMs,
    isGhosted,
  } = args;

  const impact = IMPACT_BY_STAGE[stage] * sourceMultiplier(source);
  const urgency = Math.max(
    followUpUrgency(nextActionAt, nowMs),
    slaUrgency(daysPastSla),
    ageUrgency(daysInStage),
  );

  let probability =
    STAGE_RESPONSE_BASE[stage] * sweetSpotProbability(daysSinceTouch);
  probability = clamp(probability, 0.3, 1.4);

  const cost = COST_BY_STAGE[stage] ?? 8;

  const followUpOverdue =
    !!nextActionAt && new Date(nextActionAt).getTime() <= nowMs;

  const boosts =
    (starred ? 30 : 0) +
    (followUpOverdue ? 20 : 0) +
    (daysPastSla > 0 ? 25 : 0) +
    (isGhosted ? 22 : 0);

  const raw = impact * urgency * probability - cost + boosts;

  const reasons: string[] = [];
  if (followUpOverdue) reasons.push("Follow-up overdue");
  if (isGhosted) reasons.push("Likely ghosted / no response");
  if (daysPastSla > 0) reasons.push(`SLA breached (+${daysPastSla}d)`);
  reasons.push(`Stage: ${stage}`);
  reasons.push(`In stage: ${daysInStage}d`);
  if (source) reasons.push(`Source: ${source}`);

  return { score: Math.round(raw), reasons };
}

export default function TodayQueue() {
  const router = useRouter();
  const apps = useApplicationsStore((s) => s.apps);
  const updateApp = useApplicationsStore((s) => s.updateApp);
  const removeApp = useApplicationsStore((s) => s.removeApp);

  const isMobile = useMediaQuery("(max-width: 520px)");

  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [openMoreId, setOpenMoreId] = useState<string | null>(null);

  const markSaving = useCallback((id: string, on: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const patchNextActionAt = useCallback(
    async (id: string, nextActionAt: string | null) => {
      markSaving(id, true);
      try {
        const res = await fetch(`/api/applications/${id}/followup`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nextActionAt }),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `PATCH failed (${res.status})`);
        }

        const updated = (await res.json()) as Application;
        updateApp(updated);
      } finally {
        markSaving(id, false);
      }
    },
    [markSaving, updateApp],
  );

  const deleteApplication = useCallback(
    async (id: string) => {
      markSaving(id, true);
      try {
        const res = await fetch(`/api/applications/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `DELETE failed (${res.status})`);
        }

        removeApp(id);
      } finally {
        markSaving(id, false);
      }
    },
    [markSaving, removeApp],
  );

  const actions = useMemo(
    () => ({
      followUpToday: (id: string) =>
        patchNextActionAt(id, isoIn(2 * 60 * 60 * 1000)),
      tomorrow: (id: string) =>
        patchNextActionAt(id, isoIn(24 * 60 * 60 * 1000)),
      snooze7d: (id: string) =>
        patchNextActionAt(id, isoIn(7 * 24 * 60 * 60 * 1000)),
      clear: (id: string) => patchNextActionAt(id, null),
      delete: (id: string) => deleteApplication(id),
    }),
    [patchNextActionAt, deleteApplication],
  );

  const openApp = useCallback(
    (id: string) => router.push(`/dashboard/applications/${id}`),
    [router],
  );

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const buckets = useMemo(() => buildTodayQueue(apps, nowMs), [apps, nowMs]);

  const appById = useMemo(() => {
    const m = new Map<string, Application>();
    for (const a of apps) m.set(String(a.id), a);
    return m;
  }, [apps]);

  function getStage(it: TodayQueueItem): Stage {
    const stage = it.stage as Stage | undefined;
    if (stage) return stage;

    const app = appById.get(it.id);
    const appStage = app?.stage as Stage | undefined;
    if (appStage) return appStage;

    return "APPLIED";
  }

  function getDates(it: TodayQueueItem) {
    const app = appById.get(it.id) as
      | (Application & {
          lastContactAt?: string | null;
          starred?: boolean;
          isStarred?: boolean;
        })
      | undefined;

    const createdAt = app?.createdAt ?? null;
    const updatedAt = app?.updatedAt ?? null;
    const stageEnteredAt = app?.stageEnteredAt ?? null;
    const lastContactAt = app?.lastContactAt ?? null;
    const nextActionAt = app?.nextActionAt ?? null;
    const starred = Boolean(app?.starred ?? app?.isStarred ?? false);

    return {
      createdAt,
      updatedAt,
      stageEnteredAt,
      lastContactAt,
      nextActionAt,
      starred,
    };
  }

  function normalizePillLabel(it: TodayQueueItem) {
    const raw = it.rightPill.label ?? "";
    const hasEllipsis = raw.includes("...") || raw.includes("…");
    if (!hasEllipsis) return raw;

    const days =
      parseDaysFromLabel(raw) ??
      (() => {
        const { stageEnteredAt, updatedAt, createdAt } = getDates(it);
        const base = stageEnteredAt ?? updatedAt ?? createdAt ?? null;
        const d = daysBetween(nowMs, base);
        return d ?? null;
      })();

    if (days == null) return raw.replace("…", "").replace("...", "");
    return raw.replace("…", `${days}d`).replace("...", `${days}d`);
  }

  function atsForItem(it: TodayQueueItem): AtsResult {
    const stage = getStage(it);
    const {
      createdAt,
      updatedAt,
      stageEnteredAt,
      lastContactAt,
      nextActionAt,
      starred,
    } = getDates(it);

    const daysInStage =
      it.stageAgeDays ??
      parseDaysFromLabel(it.rightPill.label ?? "") ??
      (() => {
        const base = stageEnteredAt ?? updatedAt ?? createdAt ?? null;
        const d = daysBetween(nowMs, base);
        return d ?? 0;
      })();

    const daysPastSla =
      it.rightPill.kind === "sla"
        ? (parseDaysFromLabel(it.rightPill.label ?? "") ??
          Math.max(0, daysInStage))
        : 0;

    const touchAt =
      lastContactAt ?? stageEnteredAt ?? updatedAt ?? createdAt ?? null;
    const daysSinceTouch = daysBetween(nowMs, touchAt) ?? daysInStage;

    return computeAtsScore({
      stage,
      source: it.source ?? null,
      nextActionAt: nextActionAt ?? null,
      daysInStage,
      daysPastSla,
      daysSinceTouch,
      starred,
      nowMs,
      isGhosted: it.rightPill.kind === "ghosted",
    });
  }

  const sections = useMemo(() => {
    const raw = [
      {
        key: "overdue" as const,
        title: "Overdue",
        hint: "Past due follow-ups",
        items: buckets.overdue,
      },
      {
        key: "ghosted" as const,
        title: "Ghosted / No Response",
        hint: "Applied 7+ days with no follow-up set",
        items: buckets.ghostedNoResponse,
      },
      {
        key: "sla" as const,
        title: "SLA breached",
        hint: "Past your stage SLA",
        items: buckets.slaBreachedNoFollowUp,
      },
      {
        key: "due24h" as const,
        title: "Due in 24h",
        hint: "Upcoming follow-ups",
        items: buckets.due24h,
      },
      {
        key: "stuck" as const,
        title: "Stuck",
        hint: "No follow-up, aging in stage",
        items: buckets.stuckNoFollowUp,
      },
    ];

    return raw.map((s) => {
      const sorted = [...s.items].sort(
        (a, b) => atsForItem(b).score - atsForItem(a).score,
      );
      return { ...s, items: sorted };
    });
  }, [buckets, nowMs]);

  const total = sections.reduce((sum, s) => sum + s.items.length, 0);

  function SectionHeader({
    title,
    count,
    hint,
  }: {
    title: string;
    count: number;
    hint?: string;
  }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            className="queue-title"
            style={{ fontSize: 16, fontWeight: 950 }}
          >
            {title}
          </div>
          {hint ? (
            <div
              className="text-muted-2"
              style={{ fontSize: 12, marginTop: 2 }}
            >
              {hint}
            </div>
          ) : null}
        </div>
        <div className="board-lane-count">{count}</div>
      </div>
    );
  }

  function primaryFor(kind: TodayQueueItem["rightPill"]["kind"]) {
    if (kind === "overdue" || kind === "sla" || kind === "ghosted") {
      return { label: "Follow up today", fn: actions.followUpToday };
    }
    if (kind === "stuck") {
      return { label: "Set tomorrow", fn: actions.tomorrow };
    }
    return { label: "Snooze 7d", fn: actions.snooze7d };
  }

  if (total === 0) {
    return (
      <section className="queue-section fade-in">
        <div className="queue-header">
          <div className="queue-title">
            <span className="queue-dot is-ok" />
            Today Queue
          </div>
        </div>
        <div className="queue-empty">Nothing urgent right now.</div>
      </section>
    );
  }

  return (
    <section className="queue-section fade-in">
      <div className="queue-header">
        <div className="queue-title">
          <span className={`queue-dot${total > 0 ? "" : " is-ok"}`} />
          Today Queue
        </div>
        <div className="board-lane-count">{total}</div>
      </div>

      <div style={{ display: "grid", gap: 12, padding: "12px 14px" }}>
        {sections
          .filter((s) => s.items.length > 0)
          .map((section) => (
            <div key={section.key} style={{ display: "grid", gap: 10 }}>
              <SectionHeader
                title={section.title}
                count={section.items.length}
                hint={section.hint}
              />

              <div className="queue-body" style={{ padding: 0 }}>
                {section.items.map((it) => {
                  const score = atsForItem(it);
                  const normalizedLabel = normalizePillLabel(it);
                  const primary = primaryFor(it.rightPill.kind);
                  const saving = savingIds.has(it.id);
                  const app = appById.get(it.id);
                  const moreOpen = openMoreId === it.id;

                  return (
                    <div
                      key={it.id}
                      style={{
                        minWidth: isMobile ? "86vw" : 320,
                        maxWidth: isMobile ? "86vw" : 360,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <CardShell
                        onClick={() => openApp(it.id)}
                        isMobile={isMobile}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="app-card-title">{it.title}</div>
                            <div className="app-card-company">{it.company}</div>
                            <div className="app-card-source">
                              {it.source ?? "—"}
                            </div>
                          </div>

                          <span className={pillClass(it.rightPill.kind)}>
                            {normalizedLabel}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 10,
                          }}
                        >
                          <span className="pill pill-accent">
                            ATS {score.score}
                          </span>

                          {app?.stage ? (
                            <span className="pill pill-default">
                              {String(app.stage).replaceAll("_", " ")}
                            </span>
                          ) : null}
                        </div>

                        {moreOpen ? (
                          <div
                            className="panel-glass"
                            style={{
                              marginTop: 10,
                              padding: 10,
                              borderRadius: 12,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className="section-label"
                              style={{ marginBottom: 8 }}
                            >
                              Priority signals
                            </div>
                            <div style={{ display: "grid", gap: 6 }}>
                              {score.reasons.map((reason) => (
                                <div
                                  key={reason}
                                  className="text-muted"
                                  style={{ fontSize: 12 }}
                                >
                                  • {reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </CardShell>

                      <div className="followup-bar">
                        <ActionBtn
                          label={saving ? "Working..." : primary.label}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void primary.fn(it.id);
                          }}
                          disabled={saving}
                          primary
                        />

                        <ActionBtn
                          label="Clear"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void actions.clear(it.id);
                          }}
                          disabled={saving}
                        />

                        <ActionBtn
                          label={moreOpen ? "Hide details" : "Why now?"}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMoreId((prev) =>
                              prev === it.id ? null : it.id,
                            );
                          }}
                          disabled={saving}
                        />

                        <ActionBtn
                          label="Delete"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const ok = window.confirm(
                              `Delete "${it.title}" at ${it.company}?`,
                            );
                            if (!ok) return;
                            void actions.delete(it.id);
                          }}
                          disabled={saving}
                          danger
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
