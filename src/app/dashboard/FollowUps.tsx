"use client";

import { useEffect } from "react";
import TodayQueue from "./TodayQueue";
import EmailTemplates from "./EmailTemplates";
import { useApplicationsStore } from "@/lib/store/useApplicationsStore";
import type { Application } from "@/domain/application/types";

export default function FollowupsPage() {
  const setApps = useApplicationsStore((s) => s.setApps);

  useEffect(() => {
    async function loadApps() {
      const res = await fetch("/api/applications", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load applications");

      const data = (await res.json()) as Application[];
      setApps(data);
    }

    void loadApps();
  }, [setApps]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <EmailTemplates />
      <TodayQueue />
    </div>
  );
}
