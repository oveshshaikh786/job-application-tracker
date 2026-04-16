"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "DRAFT",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECH_SCREEN",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

type Stage = (typeof STAGES)[number];

function toLabel(stage: string) {
  return stage
    .toLowerCase()
    .split("_")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function StagePicker({
  id,
  currentStage,
}: {
  id: string;
  currentStage: string;
}) {
  const router = useRouter();

  const [stage, setStage] = useState(currentStage);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setStage(currentStage);
  }, [currentStage]);

  const changed = useMemo(() => stage !== currentStage, [stage, currentStage]);

  async function save() {
    if (!changed || saving) return;

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update stage");
      }

      setMsg("Saved");
      router.refresh();

      window.setTimeout(() => {
        setMsg(null);
      }, 1200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span className="form-label" style={{ fontSize: 14, fontWeight: 800 }}>
        Stage
      </span>

      <select
        value={stage}
        onChange={(e) => {
          setStage(e.target.value);
          setErr(null);
          setMsg(null);
        }}
        disabled={saving}
        className="form-select"
        style={{
          minWidth: 200,
          opacity: saving ? 0.7 : 1,
        }}
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {toLabel(s)}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={save}
        disabled={!changed || saving}
        className="btn"
        style={{
          opacity: !changed || saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save"}
      </button>

      {!changed && !saving ? (
        <span className="text-muted-2" style={{ fontSize: 12 }}>
          No changes
        </span>
      ) : null}

      {msg ? (
        <span className="text-muted" style={{ fontSize: 12 }}>
          {msg}
        </span>
      ) : null}

      {err ? (
        <span className="form-error" style={{ fontSize: 12 }}>
          {err}
        </span>
      ) : null}
    </div>
  );
}
