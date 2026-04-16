"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, Stage } from "@/domain/application/types";

export default function ArchivedList({
  initialApps,
}: {
  initialApps: Application[];
}) {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>(initialApps);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  function setBusy(id: string, on: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function restoreApp(app: Application) {
    const restoreStage: Stage = app.archivedFromStage ?? "APPLIED";
    setBusy(app.id, true);

    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: restoreStage }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to restore application");
      }

      setApps((prev) => prev.filter((a) => a.id !== app.id));
      router.refresh();
    } finally {
      setBusy(app.id, false);
    }
  }

  async function deleteApp(id: string) {
    const ok = window.confirm("Delete this archived application permanently?");
    if (!ok) return;

    setBusy(id, true);

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to delete application");
      }

      setApps((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } finally {
      setBusy(id, false);
    }
  }

  if (apps.length === 0) {
    return <div className="archived-empty">No archived applications.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {apps.map((app) => {
        const busy = busyIds.has(app.id);

        return (
          <div key={app.id} className="archived-card fade-in">
            <div>
              <div
                className="app-card-title"
                style={{ fontSize: 20, fontWeight: 900, whiteSpace: "normal" }}
              >
                {app.role?.title ?? "Untitled"}
              </div>

              <div
                className="app-card-company"
                style={{ marginTop: 4, fontSize: 15 }}
              >
                {app.role?.company?.name ?? "Unknown company"}
              </div>

              <div className="app-card-source" style={{ marginTop: 6 }}>
                {app.source ?? "—"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="pill pill-default">Archived</span>

              {app.archivedFromStage ? (
                <span className="pill pill-muted">
                  From: {app.archivedFromStage}
                </span>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => restoreApp(app)}
                className="btn"
                style={{ opacity: busy ? 0.6 : 1 }}
              >
                {busy ? "Working..." : "Restore"}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => deleteApp(app.id)}
                className="btn btn-danger"
                style={{ opacity: busy ? 0.6 : 1 }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
