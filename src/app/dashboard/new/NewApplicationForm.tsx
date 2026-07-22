"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Stage =
  | "DRAFT"
  | "APPLIED"
  | "RECRUITER_SCREEN"
  | "TECH_SCREEN"
  | "ONSITE"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

type FollowUpPreset = "none" | "tomorrow" | "3d" | "7d";

const STAGES: { key: Stage; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "APPLIED", label: "Applied" },
  { key: "RECRUITER_SCREEN", label: "Recruiter Screen" },
  { key: "TECH_SCREEN", label: "Tech Screen" },
  { key: "ONSITE", label: "Onsite" },
  { key: "OFFER", label: "Offer" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];

function isoFromPreset(p: FollowUpPreset): string | null {
  const now = Date.now();
  if (p === "tomorrow") return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  if (p === "3d") return new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
  if (p === "7d") return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

export default function NewApplicationForm() {
  const router = useRouter();

  const companyRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<Stage>("APPLIED");
  const [followUpPreset, setFollowUpPreset] = useState<FollowUpPreset>("tomorrow");
  const [appliedAt, setAppliedAt] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    const t = setTimeout(() => companyRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const canSubmit = useMemo(
    () => companyName.trim() !== "" && roleTitle.trim() !== "",
    [companyName, roleTitle],
  );

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit || loading) return;

    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          roleTitle: roleTitle.trim(),
          source: source.trim() || null,
          stage,
          nextActionAt: isoFromPreset(followUpPreset),
          appliedAt:
            stage !== "DRAFT" && appliedAt
              ? new Date(appliedAt).toISOString()
              : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create application");
      }

      router.push(`/dashboard/applications/${data.id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-panel fade-in">
      <div className="form-field">
        <label className="form-label">Company</label>
        <input
          ref={companyRef}
          className="form-input"
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            if (source.trim() === "") setSource("LinkedIn");
          }}
          placeholder="e.g. Stripe"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Role title</label>
        <input
          className="form-input"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          placeholder="e.g. Frontend Engineer"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Source</label>
        <input
          className="form-input"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. LinkedIn / Referral / Career Page"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Stage</label>
        <select
          className="form-select"
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage)}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {stage !== "DRAFT" ? (
        <div className="form-field">
          <label className="form-label">Date applied</label>
          <input
            type="date"
            className="form-input"
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
          />
        </div>
      ) : null}

      <div className="form-field">
        <label className="form-label">Follow-up reminder</label>
        <select
          className="form-select"
          value={followUpPreset}
          onChange={(e) => setFollowUpPreset(e.target.value as FollowUpPreset)}
        >
          <option value="none">None</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="3d">In 3 days</option>
          <option value="7d">In 7 days</option>
        </select>
      </div>

      {err ? <div className="form-error">{err}</div> : null}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!canSubmit || loading}
      >
        {loading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
