"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString();
}

export default function FollowUpPicker({
  id,
  initialNextActionAt,
}: {
  id: string;
  initialNextActionAt?: string | null;
}) {
  const router = useRouter();

  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!initialNextActionAt) {
      setValue("");
      return;
    }

    const d = new Date(initialNextActionAt);
    if (Number.isNaN(d.getTime())) {
      setValue("");
      return;
    }

    setValue(toLocalInputValue(d));
  }, [initialNextActionAt]);

  const dirty = useMemo(() => {
    const serverMs = initialNextActionAt
      ? new Date(initialNextActionAt).getTime()
      : null;

    const localMs = value ? new Date(value).getTime() : null;

    return serverMs !== localMs;
  }, [initialNextActionAt, value]);

  async function save(nextValue: string | null) {
    if (saving) return;

    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      const res = await fetch(`/api/applications/${id}/followup`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nextActionAt: nextValue ? toIsoOrNull(nextValue) : null,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to save follow-up");
      }

      setMsg("Saved");
      router.refresh();

      setTimeout(() => {
        setMsg(null);
      }, 1200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="form-panel"
      style={{
        marginTop: 14,
      }}
    >
      <div style={{ fontWeight: 800 }}>Follow-up</div>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="datetime-local"
          className="form-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMsg(null);
            setErr(null);
          }}
          style={{
            minWidth: 260,
            width: "min(360px, 100%)",
          }}
        />

        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || !dirty}
          onClick={() => void save(value || null)}
        >
          {saving ? "Saving..." : "Save follow-up"}
        </button>

        <button
          type="button"
          className="btn"
          disabled={saving}
          onClick={() => void save(null)}
        >
          Clear
        </button>

        {!dirty && !saving ? (
          <span className="text-muted-2" style={{ fontSize: 12 }}>
            No changes
          </span>
        ) : null}

        {msg ? (
          <span
            className="text-muted"
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            {msg}
          </span>
        ) : null}

        {err ? <span className="form-error">{err}</span> : null}
      </div>
    </section>
  );
}
