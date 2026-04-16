"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ApplicationCard from "@/components/ApplicationCard";

import type {
  Application as AppRow,
  Stage,
  EventRow,
} from "@/domain/application/types";
import {
  filterApplications,
  groupByStage,
} from "@/domain/application/selectors";

const BOARD_STAGES: { key: Exclude<Stage, "ARCHIVED">; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "APPLIED", label: "Applied" },
  { key: "RECRUITER_SCREEN", label: "Recruiter" },
  { key: "TECH_SCREEN", label: "Tech" },
  { key: "ONSITE", label: "Onsite" },
  { key: "OFFER", label: "Offer" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];

const BULK_STAGE_OPTIONS: { key: Stage; label: string }[] = [
  ...BOARD_STAGES.map((s) => ({ key: s.key as Stage, label: s.label })),
  { key: "ARCHIVED", label: "Archived" },
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const onChange = (e?: MediaQueryListEvent) => {
      setMatches(typeof e?.matches === "boolean" ? e.matches : mql.matches);
    };

    onChange();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    const legacy = mql as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };

    legacy.addListener?.(onChange);
    return () => legacy.removeListener?.(onChange);
  }, [query]);

  return matches;
}

function useViewportWidth() {
  const [vw, setVw] = useState<number>(
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return vw;
}

function FilterPill({
  label,
  active,
  onClick,
  tone = "default",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "default" | "danger" | "warn";
}) {
  const toneClass =
    tone === "danger" ? " is-danger" : tone === "warn" ? " is-warn" : "";

  return (
    <button
      type="button"
      className={`filter-pill${active ? " is-active" : ""}${toneClass}`}
      onClick={onClick}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  tone?: "default" | "danger" | "warn";
}) {
  const className =
    tone === "danger" ? "btn btn-danger" : tone === "warn" ? "btn" : "btn";

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        minHeight: "auto",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="segmented">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            className={`segmented-btn${active ? " is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const LS_KEY = "jobtracker:kanban:prefs:v1";

type KanbanPrefs = {
  density: "comfortable" | "compact";
  filterSlaBreached: boolean;
  filterOverdue: boolean;
  filterNeedsFollowUp: boolean;
};

function readPrefs(): Partial<KanbanPrefs> | null {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<KanbanPrefs>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writePrefs(prefs: KanbanPrefs) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

async function fetchJsonOrThrow(res: Response) {
  if (res.ok) return res.json();
  const text = await res.text().catch(() => "");
  throw new Error(text || `Request failed (${res.status})`);
}

export default function KanbanBoard({
  initialApps,
}: {
  initialApps: AppRow[];
}) {
  const router = useRouter();

  const [apps, setApps] = useState<AppRow[]>(initialApps ?? []);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const [mounted, setMounted] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [filterSlaBreached, setFilterSlaBreached] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterNeedsFollowUp, setFilterNeedsFollowUp] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveStage, setBulkMoveStage] = useState<Stage>("APPLIED");
  const [bulkBusy, setBulkBusy] = useState(false);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const p = readPrefs();
    if (!p) return;

    if (p.density === "compact") setDensity("compact");
    if (typeof p.filterSlaBreached === "boolean") {
      setFilterSlaBreached(p.filterSlaBreached);
    }
    if (typeof p.filterOverdue === "boolean") {
      setFilterOverdue(p.filterOverdue);
    }
    if (typeof p.filterNeedsFollowUp === "boolean") {
      setFilterNeedsFollowUp(p.filterNeedsFollowUp);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    writePrefs({
      density,
      filterSlaBreached,
      filterOverdue,
      filterNeedsFollowUp,
    });
  }, [mounted, density, filterSlaBreached, filterOverdue, filterNeedsFollowUp]);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const D =
    density === "compact"
      ? {
          colW: 290,
          laneInnerPad: 10,
          gap: 10,
          laneHeaderPad: 8,
          laneHeaderH: 42,
        }
      : {
          colW: 320,
          laneInnerPad: 12,
          gap: 12,
          laneHeaderPad: 10,
          laneHeaderH: 44,
        };

  const isNarrow = useMediaQuery("(max-width: 820px)");
  const vw = useViewportWidth();

  const mobileColW = useMemo(() => {
    const gutters = 24;
    return Math.max(280, Math.min(420, vw - gutters));
  }, [vw]);

  const colW = isNarrow ? mobileColW : D.colW;

  function openCard(appId: string) {
    router.push(`/dashboard/applications/${appId}`);
  }

  function setSavingMany(ids: string[], on: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function markSaving(id: string, on: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function persistStageChange(id: string, nextStage: Stage) {
    markSaving(id, true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });

      const updated = (await fetchJsonOrThrow(res)) as AppRow;

      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, ...updated, events: updated.events ?? a.events }
            : a,
        ),
      );

      router.refresh();
    } finally {
      markSaving(id, false);
    }
  }

  async function persistNextActionAt(id: string, nextActionAt: string | null) {
    markSaving(id, true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextActionAt }),
      });

      const updated = (await fetchJsonOrThrow(res)) as AppRow;

      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, ...updated, events: updated.events ?? a.events }
            : a,
        ),
      );

      router.refresh();
    } finally {
      markSaving(id, false);
    }
  }

  async function runBulkAction(
    payload:
      | { ids: string[]; action: "SET_FOLLOW_UP"; nextActionAt: string }
      | { ids: string[]; action: "CLEAR_FOLLOW_UP" }
      | { ids: string[]; action: "MOVE_STAGE"; stage: Stage }
      | { ids: string[]; action: "ARCHIVE" }
      | { ids: string[]; action: "DELETE" },
  ) {
    const ids = payload.ids;
    if (ids.length === 0) return;

    setBulkBusy(true);
    setSavingMany(ids, true);

    try {
      const res = await fetch("/api/applications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await fetchJsonOrThrow(res);

      if (payload.action === "DELETE") {
        setApps((prev) => prev.filter((a) => !ids.includes(a.id)));
        setSelectedIds(new Set());
        router.refresh();
        return;
      }

      if (payload.action === "ARCHIVE") {
        const nowIso = new Date().toISOString();
        setApps((prev) =>
          prev.map((a) =>
            ids.includes(a.id)
              ? {
                  ...a,
                  stage: "ARCHIVED",
                  stageEnteredAt: nowIso,
                  archivedAt: nowIso,
                  archivedFromStage: a.stage,
                  updatedAt: nowIso,
                  events: [
                    {
                      type: "STAGE_CHANGED",
                      message: `${a.stage} → ARCHIVED`,
                      createdAt: nowIso,
                    },
                    ...(a.events ?? []),
                  ],
                }
              : a,
          ),
        );
        setSelectedIds(new Set());
        router.refresh();
        return;
      }

      if (payload.action === "MOVE_STAGE") {
        const nowIso = new Date().toISOString();
        setApps((prev) =>
          prev.map((a) =>
            ids.includes(a.id) && a.stage !== payload.stage
              ? {
                  ...a,
                  stage: payload.stage,
                  stageEnteredAt: nowIso,
                  archivedAt: a.stage === "ARCHIVED" ? null : a.archivedAt,
                  archivedFromStage:
                    a.stage === "ARCHIVED" ? null : a.archivedFromStage,
                  updatedAt: nowIso,
                  events: [
                    {
                      type: "STAGE_CHANGED",
                      message: `${a.stage} → ${payload.stage}`,
                      createdAt: nowIso,
                    },
                    ...(a.events ?? []),
                  ],
                }
              : a,
          ),
        );
        if (payload.stage === "ARCHIVED") setSelectedIds(new Set());
        router.refresh();
        return;
      }

      if (payload.action === "SET_FOLLOW_UP") {
        setApps((prev) =>
          prev.map((a) =>
            ids.includes(a.id)
              ? { ...a, nextActionAt: payload.nextActionAt }
              : a,
          ),
        );
        router.refresh();
        return;
      }

      if (payload.action === "CLEAR_FOLLOW_UP") {
        setApps((prev) =>
          prev.map((a) =>
            ids.includes(a.id) ? { ...a, nextActionAt: null } : a,
          ),
        );
        router.refresh();
      }
    } finally {
      setBulkBusy(false);
      setSavingMany(ids, false);
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragEnd() {
    setDraggingId(null);
    setOverStage(null);
  }

  function onDragOverColumn(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    setOverStage(stage);
    e.dataTransfer.dropEffect = "move";
  }

  async function onDropToColumn(e: React.DragEvent, targetStage: Stage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setOverStage(null);
    setDraggingId(null);
    if (!id) return;

    const current = apps.find((a) => a.id === id);
    if (!current) return;
    if (current.stage === targetStage) return;

    const prevStage = current.stage;
    const prevEvents = current.events ?? [];
    const prevStageEnteredAt = current.stageEnteredAt;

    const optimisticNow = new Date().toISOString();
    const optimisticEvent: EventRow = {
      type: "STAGE_CHANGED",
      message: `${prevStage} → ${targetStage}`,
      createdAt: optimisticNow,
    };

    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              stage: targetStage,
              stageEnteredAt: optimisticNow,
              updatedAt: optimisticNow,
              events: [optimisticEvent, ...(a.events ?? [])],
            }
          : a,
      ),
    );

    try {
      await persistStageChange(id, targetStage);
    } catch (err) {
      console.error(err);
      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                stage: prevStage,
                stageEnteredAt: prevStageEnteredAt,
                events: prevEvents,
              }
            : a,
        ),
      );
    }
  }

  function toggleSelected(appId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkSetFollowUpTomorrow() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const iso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await runBulkAction({
      ids,
      action: "SET_FOLLOW_UP",
      nextActionAt: iso,
    });
  }

  async function bulkClearFollowUp() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await runBulkAction({ ids, action: "CLEAR_FOLLOW_UP" });
  }

  async function bulkMoveToStage(stage: Stage) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await runBulkAction({ ids, action: "MOVE_STAGE", stage });
  }

  async function bulkArchiveSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await runBulkAction({ ids, action: "ARCHIVE" });
  }

  async function bulkDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Delete ${ids.length} application${ids.length > 1 ? "s" : ""}? This cannot be undone.`,
    );
    if (!ok) return;
    await runBulkAction({ ids, action: "DELETE" });
  }

  const filteredApps = useMemo(() => {
    const nonArchived = apps.filter((a) => a.stage !== "ARCHIVED");
    if (now === null) return nonArchived;

    return filterApplications(nonArchived, now, {
      filterSlaBreached,
      filterOverdue,
      filterNeedsFollowUp,
    });
  }, [apps, now, filterSlaBreached, filterOverdue, filterNeedsFollowUp]);

  const appsByStage = useMemo(() => {
    const stageKeys = BOARD_STAGES.map((s) => s.key);
    const sortByOldestInStage =
      filterSlaBreached || filterOverdue || filterNeedsFollowUp;

    if (now === null) {
      return groupByStage(filteredApps, stageKeys as any, false);
    }

    return groupByStage(filteredApps, stageKeys as any, sortByOldestInStage);
  }, [
    filteredApps,
    now,
    filterSlaBreached,
    filterOverdue,
    filterNeedsFollowUp,
  ]);

  const anyFilterOn = filterSlaBreached || filterOverdue || filterNeedsFollowUp;
  const selectedCount = selectedIds.size;
  const anySaving = savingIds.size > 0 || bulkBusy;

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
    ro.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [selectedCount, anyFilterOn, density, bulkBusy]);

  const boardH = useMemo(
    () => `calc(100dvh - ${headerHeight + 24}px)`,
    [headerHeight],
  );

  return (
    <>
      <style>{`
        @keyframes boardFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gap: 12,
          minWidth: 0,
          animation: "boardFadeIn 240ms ease",
        }}
      >
        <div
          ref={headerRef}
          className="panel-glass"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 60,
            padding: 12,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <span className="text-muted" style={{ fontSize: 13 }}>
                Filters:
              </span>

              <FilterPill
                label="SLA breached"
                active={filterSlaBreached}
                onClick={() => setFilterSlaBreached((v) => !v)}
                tone="danger"
              />
              <FilterPill
                label="Overdue"
                active={filterOverdue}
                onClick={() => setFilterOverdue((v) => !v)}
                tone="warn"
              />
              <FilterPill
                label="Needs follow-up"
                active={filterNeedsFollowUp}
                onClick={() => setFilterNeedsFollowUp((v) => !v)}
              />

              {anyFilterOn ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setFilterSlaBreached(false);
                    setFilterOverdue(false);
                    setFilterNeedsFollowUp(false);
                  }}
                  style={{
                    marginLeft: 6,
                    fontSize: 13,
                    padding: "6px 10px",
                    minHeight: "auto",
                    borderRadius: 999,
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Segmented
                value={density}
                onChange={(v) => setDensity(v as "comfortable" | "compact")}
                options={[
                  { value: "comfortable", label: "Comfort" },
                  { value: "compact", label: "Compact" },
                ]}
              />

              <span
                className="text-muted-2"
                style={{
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                Tip: Shift+Click or Ctrl/Cmd+Click to select multiple
              </span>
            </div>
          </div>

          {selectedCount > 0 ? (
            <div
              className="bulk-bar"
              style={{ marginTop: 10, borderRadius: 14 }}
            >
              <span className="bulk-bar-count">{selectedCount} selected</span>

              <ActionBtn
                label={bulkBusy ? "Working..." : "Set follow-up tomorrow"}
                disabled={bulkBusy}
                onClick={(e) => {
                  e.preventDefault();
                  void bulkSetFollowUpTomorrow();
                }}
              />

              <ActionBtn
                label={bulkBusy ? "Working..." : "Clear follow-up"}
                disabled={bulkBusy}
                onClick={(e) => {
                  e.preventDefault();
                  void bulkClearFollowUp();
                }}
              />

              <ActionBtn
                tone="danger"
                label={bulkBusy ? "Working..." : "Archive selected"}
                disabled={bulkBusy}
                onClick={(e) => {
                  e.preventDefault();
                  void bulkArchiveSelected();
                }}
              />

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  className="form-select"
                  value={bulkMoveStage}
                  onChange={(e) => setBulkMoveStage(e.target.value as Stage)}
                  disabled={bulkBusy}
                  style={{
                    fontSize: 13,
                    padding: "6px 10px",
                    minHeight: "auto",
                    borderRadius: 12,
                    width: "auto",
                    minWidth: 140,
                  }}
                >
                  {BULK_STAGE_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      Move to: {s.label}
                    </option>
                  ))}
                </select>

                <ActionBtn
                  label={bulkBusy ? "Working..." : "Apply"}
                  disabled={bulkBusy}
                  onClick={(e) => {
                    e.preventDefault();
                    void bulkMoveToStage(bulkMoveStage);
                  }}
                />
              </div>

              <ActionBtn
                tone="danger"
                label={bulkBusy ? "Working..." : "Delete selected"}
                disabled={bulkBusy}
                onClick={(e) => {
                  e.preventDefault();
                  void bulkDeleteSelected();
                }}
              />

              <ActionBtn
                label="Clear selection"
                disabled={bulkBusy}
                onClick={(e) => {
                  e.preventDefault();
                  clearSelection();
                }}
              />

              {anySaving ? (
                <span className="text-muted-2" style={{ fontSize: 12 }}>
                  updating…
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="boardScroll"
          style={{
            height: boardH,
            minHeight: 0,
            gap: D.gap,
            paddingInline: 14,
            paddingBottom: 12,
            scrollSnapType: isNarrow ? "x mandatory" : "x proximity",
            scrollPaddingInline: 12,
          }}
        >
          {BOARD_STAGES.map((s) => {
            const items = (appsByStage as any)[s.key] ?? [];
            const isOver = overStage === s.key;

            return (
              <section
                key={s.key}
                className={`board-lane${isOver ? " is-drop-target" : ""}`}
                onDragOver={(e) => onDragOverColumn(e, s.key)}
                onDrop={(e) => onDropToColumn(e, s.key)}
                style={{
                  minWidth: colW,
                  maxWidth: colW,
                  flex: `0 0 ${colW}px`,
                  height: "100%",
                  minHeight: 0,
                }}
              >
                <div
                  className="board-lane-header"
                  style={{
                    padding: D.laneHeaderPad,
                  }}
                >
                  <div
                    className="board-lane-title-row"
                    style={{
                      height: D.laneHeaderH - 2,
                      paddingInline: 12,
                    }}
                  >
                    <span className="board-lane-title">{s.label}</span>

                    <span className="board-lane-count">{items.length}</span>
                  </div>
                </div>

                <div
                  className="board-lane-body"
                  style={{
                    paddingTop: 10,
                    paddingInline: D.laneInnerPad + 2,
                    paddingBottom: D.laneInnerPad,
                    gap: D.gap + 2,
                    scrollPaddingTop: D.laneHeaderH + D.laneHeaderPad + 12,
                  }}
                >
                  {items.length === 0 ? (
                    <div className="board-lane-empty">No items.</div>
                  ) : null}

                  {items.map((a: AppRow) => {
                    const isDragging = draggingId === a.id;

                    return (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, a.id)}
                        onDragEnd={onDragEnd}
                        style={{
                          opacity: isDragging ? 0.5 : 1,
                          transform: isDragging
                            ? "scale(0.985) rotate(0.15deg)"
                            : "scale(1)",
                          transition:
                            "transform 160ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease",
                          willChange: "transform, opacity",
                          minWidth: 0,
                        }}
                        title="Drag to move stage"
                      >
                        <ApplicationCard
                          app={a}
                          nowMs={now ?? 0}
                          compact={density === "compact"}
                          onOpen={openCard}
                          onSetFollowUp={(id, iso) => {
                            const target = apps.find((x) => x.id === id);
                            const prevNextActionAt =
                              target?.nextActionAt ?? null;

                            setApps((prev) =>
                              prev.map((x) =>
                                x.id === id ? { ...x, nextActionAt: iso } : x,
                              ),
                            );

                            void persistNextActionAt(id, iso).catch((err) => {
                              console.error(err);
                              setApps((prev) =>
                                prev.map((x) =>
                                  x.id === id
                                    ? {
                                        ...x,
                                        nextActionAt: prevNextActionAt,
                                      }
                                    : x,
                                ),
                              );
                            });
                          }}
                          selected={selectedIds.has(a.id)}
                          onToggleSelected={toggleSelected}
                          isSaving={savingIds.has(a.id)}
                          disableHoverLift={isNarrow}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
