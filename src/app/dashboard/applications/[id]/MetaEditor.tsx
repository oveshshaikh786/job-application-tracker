"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "SGD", "AED"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontSize: 20, color: n <= value ? "#f59e0b" : "var(--border-2)",
            transition: "color 0.1s",
          }}
          title={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function MetaEditor({
  id,
  initialCompany,
  initialTitle,
  initialSource,
  initialSalaryMin,
  initialSalaryMax,
  initialSalaryCurrency,
  initialContactName,
  initialContactEmail,
  initialContactRole,
  initialExcitement,
  initialJobDescription,
}: {
  id: string;
  initialCompany: string;
  initialTitle: string;
  initialSource: string | null;
  initialSalaryMin?: number | null;
  initialSalaryMax?: number | null;
  initialSalaryCurrency?: string | null;
  initialContactName?: string | null;
  initialContactEmail?: string | null;
  initialContactRole?: string | null;
  initialExcitement?: number | null;
  initialJobDescription?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basics" | "salary" | "contact" | "jd">("basics");

  const [companyName, setCompanyName] = useState(initialCompany);
  const [roleTitle, setRoleTitle] = useState(initialTitle);
  const [source, setSource] = useState(initialSource ?? "");
  const [excitement, setExcitement] = useState(initialExcitement ?? 3);

  const [salaryMin, setSalaryMin] = useState(initialSalaryMin?.toString() ?? "");
  const [salaryMax, setSalaryMax] = useState(initialSalaryMax?.toString() ?? "");
  const [salaryCurrency, setSalaryCurrency] = useState(initialSalaryCurrency ?? "USD");

  const [contactName, setContactName] = useState(initialContactName ?? "");
  const [contactEmail, setContactEmail] = useState(initialContactEmail ?? "");
  const [contactRole, setContactRole] = useState(initialContactRole ?? "");

  const [jobDescription, setJobDescription] = useState(initialJobDescription ?? "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(() => {
    return (
      companyName !== initialCompany ||
      roleTitle !== initialTitle ||
      source !== (initialSource ?? "") ||
      excitement !== (initialExcitement ?? 3) ||
      salaryMin !== (initialSalaryMin?.toString() ?? "") ||
      salaryMax !== (initialSalaryMax?.toString() ?? "") ||
      salaryCurrency !== (initialSalaryCurrency ?? "USD") ||
      contactName !== (initialContactName ?? "") ||
      contactEmail !== (initialContactEmail ?? "") ||
      contactRole !== (initialContactRole ?? "") ||
      jobDescription !== (initialJobDescription ?? "")
    );
  }, [companyName, roleTitle, source, excitement, salaryMin, salaryMax, salaryCurrency,
      contactName, contactEmail, contactRole, jobDescription,
      initialCompany, initialTitle, initialSource, initialExcitement,
      initialSalaryMin, initialSalaryMax, initialSalaryCurrency,
      initialContactName, initialContactEmail, initialContactRole, initialJobDescription]);

  async function save() {
    if (saving) return;
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/applications/${id}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          roleTitle: roleTitle.trim(),
          source: source.trim() || null,
          excitement,
          salaryMin: salaryMin ? parseInt(salaryMin) : null,
          salaryMax: salaryMax ? parseInt(salaryMax) : null,
          salaryCurrency,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactRole: contactRole.trim() || null,
          jobDescription: jobDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to update");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  const TABS = [
    { key: "basics" as const, label: "Basics" },
    { key: "salary" as const, label: "Salary" },
    { key: "contact" as const, label: "Contact" },
    { key: "jd" as const, label: "Job Description" },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" className="btn btn-ghost" onClick={() => { setOpen((v) => !v); setErr(null); }}>
        {open ? "Close edit" : "Edit details"}
      </button>

      {open && (
        <div className="form-panel fade-in" style={{ marginTop: 10 }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--border-1)", paddingBottom: 8 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  border: "none", cursor: "pointer",
                  padding: "4px 10px", borderRadius: "var(--r-sm)",
                  fontSize: 12, fontWeight: 600,
                  color: activeTab === t.key ? "var(--accent)" : "var(--text-2)",
                  background: activeTab === t.key ? "var(--accent-dim)" : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "basics" && (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="form-field">
                <span className="form-label">Company</span>
                <input className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>
              <label className="form-field">
                <span className="form-label">Role title</span>
                <input className="form-input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
              </label>
              <label className="form-field">
                <span className="form-label">Source</span>
                <input className="form-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="LinkedIn / Referral / Company site" />
              </label>
              <div className="form-field">
                <span className="form-label">Excitement</span>
                <StarRating value={excitement} onChange={setExcitement} />
              </div>
            </div>
          )}

          {activeTab === "salary" && (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="form-field">
                <span className="form-label">Currency</span>
                <select className="form-input" value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="form-field">
                  <span className="form-label">Min (annual)</span>
                  <input type="number" className="form-input" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="80000" />
                </label>
                <label className="form-field">
                  <span className="form-label">Max (annual)</span>
                  <input type="number" className="form-input" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="120000" />
                </label>
              </div>
              {salaryMin && salaryMax && (
                <div style={{ fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>
                  {salaryCurrency} {parseInt(salaryMin).toLocaleString()} – {parseInt(salaryMax).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {activeTab === "contact" && (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="form-field">
                <span className="form-label">Contact name</span>
                <input className="form-input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" />
              </label>
              <label className="form-field">
                <span className="form-label">Email</span>
                <input type="email" className="form-input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="jane@company.com" />
              </label>
              <label className="form-field">
                <span className="form-label">Their role</span>
                <input className="form-input" value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Recruiter / Hiring Manager" />
              </label>
            </div>
          )}

          {activeTab === "jd" && (
            <div style={{ display: "grid", gap: 10 }}>
              <label className="form-field">
                <span className="form-label">Job description / posting</span>
                <textarea
                  className="form-input"
                  rows={10}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here for reference..."
                  style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12 }}
                />
              </label>
            </div>
          )}

          {err && <div className="form-error" style={{ marginTop: 10 }}>{err}</div>}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
            </button>
            {!dirty && !saving && <span className="text-muted-2" style={{ fontSize: 12 }}>No changes</span>}
          </div>
        </div>
      )}
    </div>
  );
}
