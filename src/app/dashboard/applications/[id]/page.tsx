import Link from "next/link";
import { headers } from "next/headers";
import MetaEditor from "./MetaEditor";
import StagePicker from "./StagePicker";
import FollowUpPicker from "./FollowUpPicker";
import NoteComposer from "@/app/api/applications/[id]/NoteComposer";

type EventType = "CREATED" | "STAGE_CHANGED" | "NOTE" | string;

function prettyStage(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseStageChange(message?: string) {
  if (!message) return null;

  const arrow = message.split("→").map((x) => x.trim());
  if (arrow.length === 2 && arrow[0] && arrow[1]) {
    return { from: arrow[0], to: arrow[1] };
  }

  const m = message.match(/from\s+([A-Z_]+)\s+to\s+([A-Z_]+)/i);
  if (m?.[1] && m?.[2]) return { from: m[1], to: m[2] };

  return null;
}

function formatEvent(e: any): {
  icon: string;
  title: string;
  subtitle?: string;
} {
  const type: EventType = e?.type ?? "EVENT";
  const msg: string | undefined = e?.message;

  if (type === "CREATED") {
    return {
      icon: "✨",
      title: "Application created",
      subtitle: msg && msg !== "Application created" ? msg : undefined,
    };
  }

  if (type === "STAGE_CHANGED") {
    const parsed = parseStageChange(msg);
    if (parsed) {
      return {
        icon: "🔁",
        title: "Stage updated",
        subtitle: `${prettyStage(parsed.from)} → ${prettyStage(parsed.to)}`,
      };
    }
    return {
      icon: "🔁",
      title: "Stage updated",
      subtitle: msg,
    };
  }

  if (type === "NOTE") {
    return {
      icon: "📝",
      title: "Note added",
      subtitle: msg,
    };
  }

  return {
    icon: "•",
    title: prettyStage(type),
    subtitle: msg,
  };
}

async function getApplication(id: string) {
  const h = await headers();
  const host = h.get("host");
  if (!host) throw new Error("Missing Host header");

  const proto = process.env.NODE_ENV === "development" ? "http" : "https";

  const res = await fetch(`${proto}://${host}/api/applications/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to load application");
  return res.json();
}

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await getApplication(id);

  const title = app?.role?.title ?? "Untitled role";
  const company = app?.role?.company?.name ?? "Unknown company";
  const stage = app?.stage ?? "UNKNOWN";
  const events = Array.isArray(app?.events) ? app.events : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(12px, 3vw, 24px)",
        maxWidth: 900,
        display: "grid",
        gap: 14,
      }}
    >
      <Link href="/dashboard" className="back-link">
        ← Back to board
      </Link>

      <div>
        <h1 className="page-title">
          {title} @ {company}
        </h1>
      </div>

      <StagePicker id={id} currentStage={stage} />

      <div className="form-panel">
        <div className="form-label" style={{ fontSize: 14, fontWeight: 800 }}>
          Add note
        </div>
        <NoteComposer id={id} />
      </div>

      <FollowUpPicker id={id} initialNextActionAt={app?.nextActionAt ?? null} />

      <MetaEditor
        id={id}
        initialCompany={company}
        initialTitle={title}
        initialSource={app?.source ?? null}
      />

      <section style={{ marginTop: 8 }}>
        <h2 className="page-title" style={{ fontSize: 18 }}>
          Timeline
        </h2>

        {events.length === 0 ? (
          <p className="text-muted" style={{ marginTop: 8 }}>
            No events yet.
          </p>
        ) : (
          <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: "none" }}>
            {events.map((e: any) => {
              const f = formatEvent(e);

              return (
                <li
                  key={e.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                    }}
                  >
                    <div style={{ width: 22, opacity: 0.95 }}>{f.icon}</div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800 }}>{f.title}</div>

                      {f.subtitle ? (
                        <div className="text-muted" style={{ marginTop: 4 }}>
                          {f.subtitle}
                        </div>
                      ) : null}

                      <div
                        className="text-muted-2"
                        style={{ fontSize: 12, marginTop: 6 }}
                      >
                        {e.createdAt
                          ? new Date(e.createdAt).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
