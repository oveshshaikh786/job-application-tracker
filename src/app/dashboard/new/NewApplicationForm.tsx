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

export default function NewApplicationForm() {
  const router = useRouter();

  const companyRef = useRef<HTMLInputElement | null>(null);
  const roleRef = useRef<HTMLInputElement | null>(null);
  const sourceRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLSelectElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<Stage>("APPLIED");

  useEffect(() => {
    const t = setTimeout(() => companyRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const canSubmit = useMemo(() => {
    return companyName.trim() && roleTitle.trim();
  }, [companyName, roleTitle]);

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
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create application");
      }

      router.push(`/dashboard/applications/${data.id}`);
      router.refresh();
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
            const next = e.target.value;
            setCompanyName(next);

            if (source.trim() === "") {
              setSource("LinkedIn");
            }
          }}
          placeholder="e.g. Stripe"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Role title</label>
        <input
          ref={roleRef}
          className="form-input"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          placeholder="e.g. Frontend Engineer"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Source</label>
        <input
          ref={sourceRef}
          className="form-input"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. LinkedIn"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Stage</label>
        <select
          ref={stageRef}
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
