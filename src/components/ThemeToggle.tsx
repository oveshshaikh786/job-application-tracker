"use client";

// Single dark theme — just a visual indicator in the sidebar footer.
export default function ThemeToggle() {
  return (
    <div className="jt-theme-dots" title="Dark theme">
      <span
        className="jt-theme-dot is-active"
        style={{ background: "#3b4a6b", cursor: "default" }}
        aria-label="Dark theme"
      />
    </div>
  );
}
