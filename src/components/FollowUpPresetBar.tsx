"use client";

import React, { useMemo, useState } from "react";

type Props = {
  applicationId: string;
  disabled?: boolean;
  dense?: boolean; // compact mode for cards
  onDone?: () => void; // e.g., router.refresh()
};

function isoIn(msFromNow: number) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function Btn({
  label,
  onClick,
  disabled,
  primary,
  dense,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  primary?: boolean;
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: dense ? 12 : 13,
        padding: dense ? "7px 10px" : "8px 12px",
        borderRadius: 999,
        border: primary
          ? "1px solid rgba(255,255,255,0.26)"
          : "1px solid rgba(255,255,255,0.16)",
        background: primary ? "rgba(255,255,255,0.06)" : "transparent",
        color: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

export default function FollowUpPresetBar({
  applicationId,
  disabled,
  dense,
  onDone,
}: Props) {
  const [saving, setSaving] = useState(false);

  async function patch(nextActionAt: string | null) {
    if (saving || disabled) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextActionAt }),
      });
      if (!res.ok) throw new Error("PATCH failed");
      onDone?.();
    } finally {
      setSaving(false);
    }
  }

  const actions = useMemo(
    () => ({
      today: () => patch(isoIn(2 * 60 * 60 * 1000)), // 2h from now
      tomorrow: () => patch(isoIn(24 * 60 * 60 * 1000)),
      d3: () => patch(isoIn(3 * 24 * 60 * 60 * 1000)),
      d7: () => patch(isoIn(7 * 24 * 60 * 60 * 1000)),
      clear: () => patch(null),
    }),
    [applicationId, saving, disabled],
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
      onClick={(e) => e.stopPropagation()} // important inside cards
    >
      <Btn
        dense={dense}
        primary
        disabled={saving || disabled}
        label={saving ? "Saving…" : "Follow up today"}
        onClick={(e) => {
          e.preventDefault();
          actions.today();
        }}
      />
      <Btn
        dense={dense}
        disabled={saving || disabled}
        label="Tomorrow"
        onClick={(e) => {
          e.preventDefault();
          actions.tomorrow();
        }}
      />
      <Btn
        dense={dense}
        disabled={saving || disabled}
        label="+3d"
        onClick={(e) => {
          e.preventDefault();
          actions.d3();
        }}
      />
      <Btn
        dense={dense}
        disabled={saving || disabled}
        label="+7d"
        onClick={(e) => {
          e.preventDefault();
          actions.d7();
        }}
      />
      <Btn
        dense={dense}
        disabled={saving || disabled}
        label="Clear"
        onClick={(e) => {
          e.preventDefault();
          actions.clear();
        }}
      />
    </div>
  );
}
