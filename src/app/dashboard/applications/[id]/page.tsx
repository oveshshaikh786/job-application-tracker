import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplicationById } from "@/lib/server/applications";
import MetaEditor from "./MetaEditor";
import StagePicker from "./StagePicker";
import FollowUpPicker from "./FollowUpPicker";
import NoteComposer from "@/components/NoteComposer";

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

function formatEvent(e: {
  type: string;
  message?: string;
}): { icon: string; title: string; subtitle?: string } {
  const type = e?.type ?? "EVENT";
  const msg = e?.message;

  if (type === "CREATED") {
    return { icon: "✦", title: "Application created",
      subtitle: msg && msg !== "Application created" ? msg : undefined };
  }
  if (type === "STAGE_CHANGED") {
    const parsed = parseStageChange(msg);
    if (parsed) return { icon: "⇄", title: "Stage updated",
      subtitle: `${prettyStage(parsed.from)} → ${prettyStage(parsed.to)}` };
    return { icon: "⇄", title: "Stage updated", subtitle: msg };
  }
  if (type === "NOTE_ADDED") return { icon: "◎", title: "Note added", subtitle: msg };
  if (type === "FOLLOW_UP_SET") return { icon: "◷", title: "Follow-up set", subtitle: msg };
  if (type === "FOLLOW_UP_CLEARED") return { icon: "◌", title: "Follow-up cleared" };
  if (type === "META_UPDATED") return { icon: "◈", title: "Details updated", subtitle: msg };
  return { icon: "·", title: prettyStage(type), subtitle: msg };
}

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApplicationById(id);

  if (!app) notFound();

  const title = app.role?.title ?? "Untitled role";
  const company = app.role?.company?.name ?? "Unknown company";
  const stage = app.stage ?? "UNKNOWN";
  const events = Array.isArray(app.events) ? app.events : [];

  const stageColorMap: Record<string, string> = {
    DRAFT: "var(--text-3)",
    APPLIED: "var(--accent)",
    RECRUITER_SCREEN: "#d8b4fe",
    TECH_SCREEN: "#fdba74",
    ONSITE: "#fde68a",
    OFFER: "var(--ok)",
    REJECTED: "var(--danger)",
    WITHDRAWN: "var(--text-3)",
    ARCHIVED: "var(--text-3)",
  };
  const stageColor = stageColorMap[stage] ?? "var(--text-2)";

  return (
    <main className="jt-detail-page">
      {/* Header */}
      <div className="jt-detail-header">
        <div className="jt-detail-breadcrumb">
          <Link href="/dashboard/applications" className="back-link">← Applications</Link>
          <span className="jt-detail-breadcrumb-sep">/</span>
          <span className="jt-detail-breadcrumb-current">{company}</span>
        </div>

        <div className="jt-detail-hero">
          <div className="jt-detail-hero-text">
            <p className="jt-detail-eyebrow">{company}</p>
            <h1 className="jt-detail-title">{title}</h1>
          </div>
          <div className="jt-detail-stage-badge"
            style={{ color: stageColor, borderColor: stageColor }}>
            {prettyStage(stage)}
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="jt-detail-grid">
        {/* LEFT — notes + timeline */}
        <section className="jt-detail-main">
          <div className="jt-detail-card">
            <p className="jt-section-label">Notes</p>
            <NoteComposer id={id} />
          </div>

          <div className="jt-detail-card">
            <p className="jt-section-label">Timeline</p>
            {events.length === 0 ? (
              <p className="jt-timeline-empty">No activity yet.</p>
            ) : (
              <ul className="jt-timeline-list">
                {events.map((e) => {
                  const f = formatEvent(e);
                  return (
                    <li key={e.id} className="jt-timeline-item">
                      <div className="jt-timeline-icon">{f.icon}</div>
                      <div className="jt-timeline-body">
                        <div className="jt-timeline-title">{f.title}</div>
                        {f.subtitle && (
                          <div className="jt-timeline-subtitle">{f.subtitle}</div>
                        )}
                        <div className="jt-timeline-date">
                          {e.createdAt
                            ? new Date(e.createdAt).toLocaleString(undefined, {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* RIGHT — stage, follow-up, metadata */}
        <aside className="jt-detail-sidebar">
          <div className="jt-detail-card">
            <p className="jt-section-label">Stage</p>
            <StagePicker id={id} currentStage={stage} />
          </div>

          <div className="jt-detail-card">
            <p className="jt-section-label">Follow-up</p>
            <FollowUpPicker id={id} initialNextActionAt={app.nextActionAt ?? null} />
          </div>

          <div className="jt-detail-card">
            <p className="jt-section-label">Details</p>
            <MetaEditor
              id={id}
              initialCompany={company}
              initialTitle={title}
              initialSource={app.source ?? null}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
