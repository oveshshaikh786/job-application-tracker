"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import CreateApplicationDialog from "@/components/CreateApplicationDialog";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";
import { isClosed } from "@/domain/application/stage";
import { getFollowUpInfo } from "@/domain/application/followup";

type User = { name: string | null; email: string | null; image: string | null };
type Workspace = { id: string; name: string; role: string };

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Pipeline", subtitle: "Your active application board" },
  "/dashboard/applications": { title: "Applications", subtitle: "All applications in one place" },
  "/dashboard/followups": { title: "Follow-ups", subtitle: "Stay on top of recruiter comms" },
  "/dashboard/analytics": { title: "Analytics", subtitle: "Pipeline metrics and trends" },
  "/dashboard/archived": { title: "Archived", subtitle: "Applications removed from board" },
  "/dashboard/new": { title: "Add Application", subtitle: "Track a new job opportunity" },
  "/dashboard/settings": { title: "Settings", subtitle: "Workspace members and invites" },
};

export default function DashboardShell({
  children,
  user,
  workspaces,
  currentWorkspaceId,
}: {
  children: React.ReactNode;
  user?: User;
  workspaces?: Workspace[];
  currentWorkspaceId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const apps = useApplicationsStore((s) => s.apps);
  const nowMs = Date.now();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("jt-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("is-theme-switching");
    root.setAttribute("data-theme", next);
    localStorage.setItem("jt-theme", next);
    setTheme(next);
    setTimeout(() => root.classList.remove("is-theme-switching"), 350);
  }, [theme]);

  const counts = useMemo(() => {
    const nonArchived = apps.filter((a) => a.stage !== "ARCHIVED");
    const active = nonArchived.filter((a) => !isClosed(a.stage));
    const due7d = active.filter((a) => {
      const f = getFollowUpInfo(a, nowMs);
      if (f?.kind !== "due" || !a.nextActionAt) return false;
      return new Date(a.nextActionAt).getTime() - nowMs <= 7 * 86_400_000;
    });
    return { total: nonArchived.length, active: active.length, due7d: due7d.length };
  }, [apps, nowMs]);

  const meta = PAGE_META[pathname] ?? { title: "Dashboard", subtitle: "" };
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);
  const close = () => setMobileNavOpen(false);

  const currentWs = workspaces?.find((w) => w.id === currentWorkspaceId);

  async function switchWorkspace(id: string) {
    if (id === currentWorkspaceId || switching) return;
    setSwitching(true);
    setWsSwitcherOpen(false);
    try {
      await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: id }),
      });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  const NAV = [
    { href: "/dashboard", icon: "▦", label: "Dashboard" },
    { href: "/dashboard/applications", icon: "≡", label: "Applications", count: counts.total },
    { href: "/dashboard/followups", icon: "◷", label: "Follow-ups", badge: counts.due7d },
    { href: "/dashboard/analytics", icon: "⌁", label: "Analytics" },
    { href: "/dashboard/archived", icon: "□", label: "Archived" },
    { href: "/dashboard/new", icon: "＋", label: "Add job" },
    { href: "/dashboard/settings", icon: "◈", label: "Settings" },
  ];

  return (
    <div className="jt-shell">
      {mobileNavOpen && <div className="jt-mobile-overlay" onClick={close} />}
      {wsSwitcherOpen && (
        <div className="jt-ws-backdrop" onClick={() => setWsSwitcherOpen(false)} />
      )}

      <aside className={`jt-sidebar${mobileNavOpen ? " is-mobile-open" : ""}`}>
        {/* Brand + workspace switcher */}
        <div className="jt-sidebar-brand">
          {workspaces && workspaces.length > 1 ? (
            <button
              className="jt-ws-trigger"
              onClick={() => setWsSwitcherOpen((v) => !v)}
              disabled={switching}
            >
              <span className="jt-ws-trigger-name">
                {switching ? "Switching…" : (currentWs?.name ?? "JobTrack")}
              </span>
              <span className="jt-ws-trigger-chevron">⌄</span>
            </button>
          ) : (
            <span className="jt-ws-trigger-name">{currentWs?.name ?? "JobTrack"}</span>
          )}

          {/* Workspace dropdown */}
          {wsSwitcherOpen && workspaces && (
            <div className="jt-ws-dropdown">
              <p className="jt-ws-dropdown-label">Switch workspace</p>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  className={`jt-ws-option${ws.id === currentWorkspaceId ? " is-active" : ""}`}
                  onClick={() => switchWorkspace(ws.id)}
                >
                  <span className="jt-ws-option-dot" />
                  <span className="jt-ws-option-name">{ws.name}</span>
                  <span className="jt-ws-option-role">{ws.role}</span>
                </button>
              ))}
              <div className="jt-ws-dropdown-footer">
                <Link href="/dashboard/settings" onClick={() => setWsSwitcherOpen(false)}
                  className="jt-ws-settings-link">
                  Manage workspace →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="jt-sidebar-nav">
          {NAV.map(({ href, icon, label, count, badge }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              className={`jt-sidebar-link${isActive(href) ? " is-active" : ""}`}
            >
              <span className="jt-sidebar-icon">{icon}</span>
              <span>{label}</span>
              {count != null && count > 0 && <span className="jt-sidebar-count">{count}</span>}
              {badge != null && badge > 0 && <span className="jt-sidebar-badge">{badge}</span>}
            </Link>
          ))}
        </nav>

        {/* User profile + sign-out */}
        <div className="jt-sidebar-footer">
          {/* Theme toggle */}
          <div className="jt-theme-toggle-row">
            <span className="jt-theme-toggle-label">{theme === "dark" ? "Dark" : "Light"}</span>
            <button
              className="jt-theme-pill"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              <span className="jt-theme-pill-thumb">
                {theme === "dark" ? "🌙" : "☀"}
              </span>
            </button>
          </div>
          <div className="jt-user-row">
            <div className="jt-user-avatar">
              {user?.image ? (
                <img src={user.image} alt={user.name ?? "User"} referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </div>
            <div className="jt-user-info">
              <div className="jt-user-name">{user?.name ?? "You"}</div>
              <div className="jt-user-email">{user?.email ?? ""}</div>
            </div>
            <button
              className="jt-signout-btn"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              title="Sign out"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <section className="jt-main">
        <header className="jt-topbar">
          <button type="button" className="jt-mobile-menu-btn" aria-label="Menu"
            onClick={() => setMobileNavOpen(true)}>☰</button>
          <div>
            <h1 className="jt-topbar-title">{meta.title}</h1>
            <p className="jt-topbar-subtitle">{meta.subtitle} · {counts.active} active</p>
          </div>
          <div className="jt-topbar-actions">
            <Link href="/dashboard/archived" className="jt-topbar-btn">Archive</Link>
            <button type="button" className="jt-topbar-btn" onClick={() => setQuickAddOpen(true)}>
              ⌘K Quick add
            </button>
            <Link href="/dashboard/new" className="jt-topbar-btn is-primary">+ New job</Link>
          </div>
        </header>

        <div className="jt-main-scroll">{children}</div>
      </section>

      <CreateApplicationDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
