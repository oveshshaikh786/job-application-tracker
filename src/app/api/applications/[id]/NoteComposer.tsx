"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function NoteComposer({ id }: { id: string }) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return message.trim().length > 0 && !saving;
  }, [message, saving]);

  async function submit() {
    const text = message.trim();
    if (!text || saving) return;

    setSaving(true);
    setErr(null);

    try {
      const res = await fetch(`/api/applications/${id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to add note");
      }

      setMessage("");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      <textarea
        className="form-textarea"
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setErr(null);
        }}
        rows={4}
        placeholder="Recruiter call notes, interview feedback, follow-up plan..."
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn btn-primary"
          style={{
            opacity: !canSubmit ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Add note"}
        </button>

        {err ? <span className="form-error">{err}</span> : null}
      </div>
    </div>
  );
}
