"use client";

import { useState } from "react";

type Member = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isSelf: boolean;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

type Props = {
  workspace: Workspace;
  members: Member[];
  isOwner: boolean;
  currentUserId: string;
};

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? "User"}
        className="settings-member-avatar"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <div className="settings-member-avatar settings-member-avatar--initials">{initials}</div>;
}

export default function SettingsClient({ workspace, members: initialMembers, isOwner }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function generateInvite() {
    setGenerating(true);
    try {
      const res = await fetch("/api/workspace/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.token) {
        setInviteLink(`${window.location.origin}/invite/${data.token}`);
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function removeMember(userId: string) {
    setRemovingId(userId);
    try {
      await fetch(`/api/workspace/members?userId=${userId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      // ignore
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-hero">
        <div>
          <p className="analytics-eyebrow">Workspace</p>
          <h1 className="analytics-title">Settings</h1>
          <p className="analytics-subtitle">
            Manage your workspace members and invite links.
          </p>
        </div>
      </div>

      {/* Workspace info card */}
      <section className="settings-section">
        <h2 className="settings-section-title">Workspace info</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-key">Name</span>
            <span className="settings-val">{workspace.name}</span>
          </div>
          <div className="settings-row">
            <span className="settings-key">Slug</span>
            <span className="settings-val settings-val--mono">{workspace.slug}</span>
          </div>
          <div className="settings-row">
            <span className="settings-key">Created</span>
            <span className="settings-val">
              {new Date(workspace.createdAt).toLocaleDateString(undefined, {
                month: "long", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-key">Members</span>
            <span className="settings-val">{members.length}</span>
          </div>
        </div>
      </section>

      {/* Members */}
      <section className="settings-section">
        <h2 className="settings-section-title">Members</h2>
        <div className="settings-card settings-card--list">
          {members.map((m) => (
            <div key={m.id} className="settings-member-row">
              <Avatar name={m.name} image={m.image} />

              <div className="settings-member-info">
                <div className="settings-member-name">
                  {m.name ?? "Unknown"}
                  {m.isSelf && <span className="settings-you-tag">you</span>}
                </div>
                <div className="settings-member-email">{m.email}</div>
              </div>

              <div className="settings-member-actions">
                <span className={`settings-role-pill settings-role-pill--${m.role.toLowerCase()}`}>
                  {m.role}
                </span>

                {isOwner && !m.isSelf && (
                  <button
                    className="settings-remove-btn"
                    onClick={() => removeMember(m.userId)}
                    disabled={removingId === m.userId}
                    title="Remove member"
                  >
                    {removingId === m.userId ? "…" : "Remove"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Invite — owner only */}
      {isOwner && (
        <section className="settings-section">
          <h2 className="settings-section-title">Invite a teammate</h2>
          <div className="settings-card">
            <p className="settings-invite-desc">
              Generate a 7-day invite link. Anyone with the link can join this
              workspace as a Member.
            </p>

            {!inviteLink ? (
              <button
                className="btn btn-primary"
                onClick={generateInvite}
                disabled={generating}
                style={{ width: "fit-content" }}
              >
                {generating ? "Generating…" : "Generate invite link"}
              </button>
            ) : (
              <div className="settings-invite-link-row">
                <input
                  readOnly
                  value={inviteLink}
                  className="settings-invite-input"
                />
                <button className="btn" onClick={copyLink}>
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setInviteLink(null); }}
                >
                  New
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
