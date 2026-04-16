"use client";

import React, { useEffect, useRef, useState } from "react";

import type { Stage, Application as AppRow } from "@/domain/application/types";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";

const STAGES: { key: Stage; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "APPLIED", label: "Applied" },
  { key: "RECRUITER_SCREEN", label: "Recruiter" },
  { key: "TECH_SCREEN", label: "Tech" },
  { key: "ONSITE", label: "Onsite" },
  { key: "OFFER", label: "Offer" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
  { key: "ARCHIVED", label: "Archived" },
];

type FollowUpPreset = "none" | "tomorrow" | "3d" | "7d";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultStage?: Stage;
};

function isoFromPreset(p: FollowUpPreset) {
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

export default function CreateApplicationDialog({
  open,
  onClose,
  defaultStage,
}: Props) {
  const addApp = useApplicationsStore((s) => s.addApp);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const companyRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLSelectElement | null>(null);
  const sourceRef = useRef<HTMLInputElement | null>(null);
  const followUpRef = useRef<HTMLSelectElement | null>(null);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<Stage>(defaultStage ?? "APPLIED");
  const [followUpPreset, setFollowUpPreset] =
    useState<FollowUpPreset>("tomorrow");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function resetForm(nextStage?: Stage) {
    setTitle("");
    setCompany("");
    setSource("");
    setStage(nextStage ?? defaultStage ?? "APPLIED");
    setFollowUpPreset("tomorrow");
    setErr(null);
    setSaving(false);
  }

  function closeAndReset() {
    resetForm();
    onClose();
  }

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => titleRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setStage(defaultStage ?? "APPLIED");
    }
  }, [open, defaultStage]);

  useEffect(() => {
    if (!open) {
      resetForm(defaultStage ?? "APPLIED");
    }
  }, [open, defaultStage]);

  function handleFieldFocus(
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    e.currentTarget.style.border = "1px solid rgba(79,140,255,0.6)";
    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(79,140,255,0.15)";
  }

  function handleFieldBlur(
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)";
    e.currentTarget.style.boxShadow = "none";
  }

  async function create() {
    if (saving) return;

    const trimmedTitle = title.trim();
    const trimmedCompany = company.trim();
    const trimmedSource = source.trim();

    if (!trimmedTitle || !trimmedCompany) {
      setErr("Title and Company are required.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const nextActionAt = isoFromPreset(followUpPreset);

      const payload = {
        companyName: trimmedCompany,
        roleTitle: trimmedTitle,
        stage,
        source: trimmedSource || null,
        nextActionAt,
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const created = (await res.json().catch(() => null)) as AppRow | null;

      if (!res.ok || !created) {
        const msg =
          (created as { error?: string } | null)?.error ??
          "Failed to create application";
        throw new Error(msg);
      }

      addApp(created);
      closeAndReset();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to create application.";
      setErr(message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalPop {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            closeAndReset();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            closeAndReset();
            return;
          }

          if (e.key !== "Enter") return;

          const target = e.target as HTMLElement;

          if (target.tagName === "INPUT" || target.tagName === "SELECT") {
            e.preventDefault();

            const fields: HTMLElement[] = [
              titleRef.current,
              companyRef.current,
              stageRef.current,
              sourceRef.current,
              followUpRef.current,
            ].filter(Boolean) as HTMLElement[];

            const idx = fields.indexOf(target);
            if (idx >= 0 && idx < fields.length - 1) {
              fields[idx + 1].focus();
              return;
            }
          }

          void create();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "grid",
          placeItems: "center",
          padding: 16,
          animation: "fadeIn 180ms ease",
        }}
      >
        <div
          style={{
            width: "min(720px, 96vw)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(10,10,10,0.92)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
            padding: 14,
            animation: "modalPop 180ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>
                New application
              </div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 2 }}>
                Enter to continue • Enter on last field to create • Esc to close
              </div>
            </div>

            <button
              type="button"
              onClick={closeAndReset}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 12,
                padding: "8px 10px",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 900,
                transition:
                  "transform 140ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease",
              }}
            >
              Close
            </button>
          </div>

          {err ? (
            <div
              style={{
                marginTop: 12,
                border: "1px solid rgba(255,92,92,0.55)",
                background: "rgba(255,92,92,0.08)",
                color: "#ffb3b3",
                borderRadius: 12,
                padding: 10,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {err}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                Title
              </label>
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                placeholder="Frontend Engineer"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "inherit",
                  padding: "10px 12px",
                  outline: "none",
                  transition: "border 140ms ease, box-shadow 140ms ease",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                Company
              </label>
              <input
                ref={companyRef}
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  if (source.trim() === "") {
                    setSource("LinkedIn");
                  }
                }}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                placeholder="Netflix"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "inherit",
                  padding: "10px 12px",
                  outline: "none",
                  transition: "border 140ms ease, box-shadow 140ms ease",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                  Stage
                </label>
                <select
                  ref={stageRef}
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage)}
                  onFocus={handleFieldFocus}
                  onBlur={handleFieldBlur}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.04)",
                    color: "inherit",
                    padding: "10px 12px",
                    outline: "none",
                    transition: "border 140ms ease, box-shadow 140ms ease",
                  }}
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                  Source
                </label>
                <input
                  ref={sourceRef}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  onFocus={handleFieldFocus}
                  onBlur={handleFieldBlur}
                  placeholder="LinkedIn / Referral / Career Page"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.04)",
                    color: "inherit",
                    padding: "10px 12px",
                    outline: "none",
                    transition: "border 140ms ease, box-shadow 140ms ease",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                Follow-up
              </label>
              <select
                ref={followUpRef}
                value={followUpPreset}
                onChange={(e) =>
                  setFollowUpPreset(e.target.value as FollowUpPreset)
                }
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "inherit",
                  padding: "10px 12px",
                  outline: "none",
                  transition: "border 140ms ease, box-shadow 140ms ease",
                }}
              >
                <option value="none">None</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="3d">In 3 days</option>
                <option value="7d">In 7 days</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void create();
                }}
                disabled={saving}
                onMouseEnter={(e) => {
                  if (saving) return;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.10)",
                  color: "inherit",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 950,
                  opacity: saving ? 0.7 : 1,
                  transition:
                    "transform 140ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease",
                }}
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
