"use client";

import React from "react";
import type { Application, Stage } from "@/domain/application/types";
import ApplicationCard from "@/components/ApplicationCard";

export default function StageColumn(props: {
  stage: Stage;
  label: string;
  apps: Application[];
  nowMs: number;
  compact?: boolean;

  onOpen?: (id: string) => void;
}) {
  const { label, apps, nowMs, compact, onOpen } = props;

  const width = compact ? 280 : 320;

  return (
    <section
      style={{
        minWidth: width,
        maxWidth: width,
        flex: `0 0 ${width}px`,
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          padding: 10,
          background: "rgba(20,21,20,0.85)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {apps.length}
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div
        style={{
          padding: 10,
          paddingTop: 8,
          display: "grid",
          gap: 10,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {apps.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              opacity: 0.6,
              border: "1px dashed var(--border)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            No items
          </div>
        ) : (
          apps.map((a) => (
            <ApplicationCard
              key={a.id}
              app={a}
              nowMs={nowMs}
              compact={compact}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}
