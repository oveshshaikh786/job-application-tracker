"use client";

import { useEffect, useState } from "react";

type ThemeName = "dark" | "light" | "purple" | "emerald" | "warm";

const THEMES: { key: ThemeName; label: string }[] = [
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
  { key: "purple", label: "Purple" },
  { key: "emerald", label: "Emerald" },
  { key: "warm", label: "Warm" },
];

const STORAGE_KEY = "jobtracker:theme";

function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    const saved =
      (localStorage.getItem(STORAGE_KEY) as ThemeName | null) ?? "dark";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  return (
    <div className="theme-toggle" aria-label="Theme selector">
      {THEMES.map((t) => {
        const active = t.key === theme;
        return (
          <button
            key={t.key}
            type="button"
            className={`theme-toggle-btn${active ? " is-active" : ""}`}
            onClick={() => {
              setTheme(t.key);
              applyTheme(t.key);
            }}
            aria-pressed={active}
            title={t.label}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
