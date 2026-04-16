"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function MetaEditor({
  id,
  initialCompany,
  initialTitle,
  initialSource,
}: {
  id: string;
  initialCompany: string;
  initialTitle: string;
  initialSource: string | null;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [companyName, setCompanyName] = useState(initialCompany);
  const [roleTitle, setRoleTitle] = useState(initialTitle);
  const [source, setSource] = useState(initialSource ?? "");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dirty = useMemo(() => {
    return (
      companyName !== initialCompany ||
      roleTitle !== initialTitle ||
      source !== (initialSource ?? "")
    );
  }, [
    companyName,
    initialCompany,
    roleTitle,
    initialTitle,
    source,
    initialSource,
  ]);

  async function save() {
    if (saving) return;

    setSaving(true);
    setErr(null);

    try {
      const res = await fetch(`/api/applications/${id}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          roleTitle: roleTitle.trim(),
          source: source.trim() ? source.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update");
      }

      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          setOpen((v) => !v);
          setErr(null);
        }}
      >
        {open ? "Close edit" : "Edit details"}
      </button>

      {open ? (
        <div className="form-panel fade-in" style={{ marginTop: 10 }}>
          <label className="form-field">
            <span className="form-label">Company</span>
            <input
              className="form-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Role title</span>
            <input
              className="form-input"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
            />
          </label>

          <label className="form-field">
            <span className="form-label">Source</span>
            <input
              className="form-input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="LinkedIn / Referral / Company site"
            />
          </label>

          {err ? <div className="form-error">{err}</div> : null}

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !dirty}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

            {!dirty && !saving ? (
              <span className="text-muted-2" style={{ fontSize: 12 }}>
                No changes
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
