
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InterviewRound, InterviewOutcome } from "@/domain/application/types";

const INTERVIEW_TYPES = [
  "Phone Screen", "Recruiter Screen", "Technical", "System Design",
  "Behavioral", "Take-home", "Onsite", "Bar Raiser", "HR", "Other",
];

const OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  PENDING: "Pending",
  PASSED: "Passed ✓",
  FAILED: "Failed ✗",
  CANCELLED: "Cancelled",
};

const OUTCOME_COLORS: Record<InterviewOutcome, string> = {
  PENDING: "var(--text-2)",
  PASSED: "var(--ok)",
  FAILED: "var(--danger)",
  CANCELLED: "var(--text-3)",
};

function fmt(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function InterviewTracker({
  applicationId,
  initialRounds,
}: {
  applicationId: string;
  initialRounds: InterviewRound[];
}) {
  const router = useRouter();
  const [rounds, setRounds] = useState<InterviewRound[]>(initialRounds);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "Phone Screen",
    scheduledAt: "",
    notes: "",
    interviewers: "",
  });

  async function addRound() {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: rounds.length + 1,
          type: form.type,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
          notes: form.notes || null,
          interviewers: form.interviewers || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const created = await res.json() as InterviewRound;
      setRounds((prev) => [...prev, created]);
      setForm({ type: "Phone Screen", scheduledAt: "", notes: "", interviewers: "" });
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function updateOutcome(id: string, outcome: InterviewOutcome) {
    const completedAt = (outcome === "PASSED" || outcome === "FAILED")
      ? new Date().toISOString() : null;
    const res = await fetch(`/api/applications/${applicationId}/interviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, completedAt }),
    });
    if (!res.ok) return;
    const updated = await res.json() as InterviewRound;
    setRounds((prev) => prev.map((r) => r.id === id ? updated : r));
    router.refresh();
  }

  async function deleteRound(id: string) {
    if (!confirm("Remove this interview round?")) return;
    await fetch(`/api/applications/${applicationId}/interviews/${id}`, { method: "DELETE" });
    setRounds((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div style={{ marginTop: 4 }}>
      {rounds.length === 0 && !adding && (
        <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 10 }}>
          No interview rounds yet. Track each round as you progress.
        </p>
      )}

      {rounds.map((r) => (
        <div key={r.id} className="interview-round-row">
          <div className="interview-round-badge">{r.round}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{r.type}</span>
              {r.scheduledAt && (
                <span style={{ fontSize: 11, color: "var(--text-2)" }}>{fmt(r.scheduledAt)}</span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, color: OUTCOME_COLORS[r.outcome] }}>
                {OUTCOME_LABELS[r.outcome]}
              </span>
            </div>
            {r.interviewers && (
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                👤 {r.interviewers}
              </div>
            )}
            {r.notes && (
              <div style={{ fontSize: 12, color: "var(--text-1)", marginTop: 4, lineHeight: 1.5 }}>
                {r.notes}
              </div>
            )}
            {r.outcome === "PENDING" && (
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <button className="interview-outcome-btn pass" onClick={() => updateOutcome(r.id, "PASSED")}>
                  ✓ Passed
                </button>
                <button className="interview-outcome-btn fail" onClick={() => updateOutcome(r.id, "FAILED")}>
                  ✗ Failed
                </button>
                <button className="interview-outcome-btn cancel" onClick={() => updateOutcome(r.id, "CANCELLED")}>
                  Cancel
                </button>
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: "2px 8px", fontSize: 11, flexShrink: 0 }}
            onClick={() => deleteRound(r.id)}
          >
            ✕
          </button>
        </div>
      ))}

      {adding ? (
        <div className="form-panel fade-in" style={{ marginTop: 10 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <label className="form-field">
              <span className="form-label">Round type</span>
              <select
                className="form-input"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {INTERVIEW_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Scheduled date</span>
              <input
                type="date"
                className="form-input"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Interviewers (optional)</span>
              <input
                className="form-input"
                value={form.interviewers}
                onChange={(e) => setForm((f) => ({ ...f, interviewers: e.target.value }))}
                placeholder="Jane D., John S."
              />
            </label>
            <label className="form-field">
              <span className="form-label">Notes</span>
              <textarea
                className="form-input"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Topics covered, questions asked..."
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={addRound} disabled={saving}>
              {saving ? "Adding..." : "Add round"}
            </button>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-ghost"
          style={{ marginTop: 8 }}
          onClick={() => setAdding(true)}
        >
          + Add round {rounds.length > 0 ? rounds.length + 1 : 1}
        </button>
      )}
    </div>
  );
}
