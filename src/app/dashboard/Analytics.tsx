"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type WeeklyTrendRow = { week: string; applied: number; rejected: number };

type AnalyticsProps = {
  stats: {
    totalApplications: number;
    activeApplications: number;
    rejectedApplications: number;
    offers: number;
    withdrawn: number;
    sourceBreakdown: Record<string, number>;
    stageBreakdown: Record<string, number>;
    weeklyTrend?: WeeklyTrendRow[];
    avgTimeInStage?: { stage: string; avgDays: number }[];
    salaryRanges?: { company: string; min: number; max: number; currency: string }[];
    sourceResponseRate?: { source: string; rate: number; total: number }[];
    exportRows?: Record<string, string | number>[];
  };
};

const STAGE_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8", APPLIED: "#3b82f6", RECRUITER_SCREEN: "#a855f7",
  TECH_SCREEN: "#f97316", ONSITE: "#eab308", OFFER: "#10b981",
  REJECTED: "#ef4444", WITHDRAWN: "#64748b", ARCHIVED: "#475569",
};
const COLORS = ["#a855f7", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];

function prettyStage(s: string) {
  const MAP: Record<string, string> = {
    DRAFT: "Draft", APPLIED: "Applied", RECRUITER_SCREEN: "Recruiter",
    TECH_SCREEN: "Technical", ONSITE: "Onsite", OFFER: "Offer",
    REJECTED: "Rejected", WITHDRAWN: "Withdrawn", ARCHIVED: "Archived",
  };
  return MAP[s] ?? s;
}

function exportCSV(rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `applications-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Analytics({ stats }: AnalyticsProps) {
  const total = stats.totalApplications || 0;
  const active = stats.activeApplications || 0;
  const rejected = stats.rejectedApplications || 0;
  const offers = stats.offers || 0;
  const withdrawn = stats.withdrawn || 0;

  const rejectionRate = total ? Math.round((rejected / total) * 100) : 0;
  const activeRate = total ? Math.round((active / total) * 100) : 0;
  const offerRate = total ? Math.round((offers / total) * 100) : 0;
  const responseRate = total
    ? Math.round(((total - (stats.stageBreakdown?.APPLIED ?? 0) - (stats.stageBreakdown?.DRAFT ?? 0)) / total) * 100)
    : 0;

  const sourceData = Object.entries(stats.sourceBreakdown || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const stageData = Object.entries(stats.stageBreakdown || {})
    .map(([name, value]) => ({ name: prettyStage(name), rawName: name, value }))
    .sort((a, b) => b.value - a.value);

  const weeklyData: WeeklyTrendRow[] = stats.weeklyTrend?.length
    ? stats.weeklyTrend
    : [{ week: "Now", applied: total, rejected }];

  const funnelData = [
    { name: "Applied", value: stats.stageBreakdown?.APPLIED ?? 0 },
    { name: "Recruiter", value: stats.stageBreakdown?.RECRUITER_SCREEN ?? 0 },
    { name: "Technical", value: stats.stageBreakdown?.TECH_SCREEN ?? 0 },
    { name: "Onsite", value: stats.stageBreakdown?.ONSITE ?? 0 },
    { name: "Offer", value: offers },
  ];

  const timeInStage = stats.avgTimeInStage ?? [];
  const salaryRanges = stats.salaryRanges ?? [];
  const sourceResponseRate = stats.sourceResponseRate ?? [];

  return (
    <div className="analytics-page">
      <div className="analytics-hero">
        <div>
          <p className="analytics-eyebrow">Pipeline Intelligence</p>
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-subtitle">
            Source quality, interview funnel, time-in-stage, and salary insights.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className="analytics-chip">{total} applications</div>
          {stats.exportRows && stats.exportRows.length > 0 && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 13 }}
              onClick={() => exportCSV(stats.exportRows!)}
            >
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Score cards */}
      <div className="analytics-matrix-grid">
        <ScoreCard label="Response Rate" value={`${responseRate}%`} sub={`${total} total apps`} tone="success" />
        <ScoreCard label="Active Pipeline" value={`${activeRate}%`} sub={`${active} active`} tone="success" />
        <ScoreCard label="Offer Rate" value={`${offerRate}%`} sub={`${offers} offers`} tone="warning" />
        <ScoreCard label="Rejection Rate" value={`${rejectionRate}%`} sub={`${rejected} rejected`} tone="danger" />
        <ScoreCard label="Withdrawn" value={withdrawn} sub="Removed by you" tone="neutral" />
      </div>

      {/* Charts row 1 */}
      <div className="analytics-chart-grid">
        <Panel label="Pipeline Stages" title="Stage distribution">
          <div className="analytics-donut-layout">
            <div className="analytics-donut">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stageData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
                    {stageData.map((entry, i) => (
                      <Cell key={i} fill={STAGE_COLORS[entry.rawName] ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="analytics-legend">
              {stageData.map((item) => (
                <div key={item.name} className="analytics-legend-row">
                  <span style={{ background: STAGE_COLORS[item.rawName] ?? "#888" }} />
                  <strong>{item.name}</strong>
                  <em>{item.value}</em>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel label="Conversion Funnel" title="Interview funnel">
          <div className="analytics-funnel">
            {funnelData.map((row, i) => {
              const max = Math.max(...funnelData.map((x) => x.value), 1);
              const width = Math.max(6, Math.round((row.value / max) * 100));
              return (
                <div key={row.name} className="analytics-funnel-row">
                  <div className="analytics-funnel-top">
                    <span>{row.name}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className="analytics-progress slim">
                    <div
                      className="analytics-progress-fill"
                      style={{ width: `${width}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Charts row 2 */}
      <div className="analytics-chart-grid">
        <Panel label="Weekly Trend" title="Application velocity">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" stroke="rgba(226,232,245,0.45)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(226,232,245,0.35)" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="applied" stroke="#3b82f6" fill="rgba(59,130,246,0.18)" strokeWidth={2.5} name="Applied" />
              <Area type="monotone" dataKey="rejected" stroke="#ef4444" fill="rgba(239,68,68,0.13)" strokeWidth={2.5} name="Rejected" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel label="Source Quality" title="Applications by source">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" stroke="rgba(226,232,245,0.35)" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={110} stroke="rgba(226,232,245,0.55)" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#a855f7" name="Applications" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Time in stage */}
      {timeInStage.length > 0 && (
        <div className="analytics-chart-grid">
          <Panel label="Velocity" title="Avg days per stage">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={timeInStage.map((x) => ({ ...x, stage: prettyStage(x.stage) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="stage" stroke="rgba(226,232,245,0.45)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(226,232,245,0.35)" tick={{ fontSize: 11 }} unit="d" />
                <Tooltip formatter={(v: unknown) => [`${v} days`, "Avg time"]} />
                <Bar dataKey="avgDays" radius={[4, 4, 0, 0]} name="Avg days">
                  {timeInStage.map((entry, i) => (
                    <Cell key={i} fill={STAGE_COLORS[entry.stage] ?? COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          {/* Response rate by source */}
          {sourceResponseRate.length > 0 && (
            <Panel label="Source Effectiveness" title="Response rate by source">
              <div className="analytics-funnel">
                {sourceResponseRate.map((row) => (
                  <div key={row.source} className="analytics-funnel-row">
                    <div className="analytics-funnel-top">
                      <span>{row.source} <em style={{ color: "var(--text-3)", fontSize: 11 }}>({row.total})</em></span>
                      <strong style={{ color: row.rate >= 30 ? "var(--ok)" : row.rate > 10 ? "var(--warn)" : "var(--text-2)" }}>
                        {row.rate}%
                      </strong>
                    </div>
                    <div className="analytics-progress slim">
                      <div
                        className="analytics-progress-fill"
                        style={{
                          width: `${Math.max(4, row.rate)}%`,
                          background: row.rate >= 30 ? "var(--ok)" : row.rate > 10 ? "var(--warn)" : "var(--danger)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* Salary ranges */}
      {salaryRanges.length > 0 && (
        <Panel label="Compensation" title="Salary ranges across applications">
          <div style={{ display: "grid", gap: 8 }}>
            {salaryRanges.slice(0, 10).map((s, i) => {
              const allMax = Math.max(...salaryRanges.map((x) => x.max || x.min), 1);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 100px", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.company}</span>
                  <div style={{ height: 8, background: "var(--border-1)", borderRadius: 4, position: "relative" }}>
                    <div style={{
                      position: "absolute", height: "100%", borderRadius: 4, background: "var(--accent)",
                      left: `${(s.min / allMax) * 100}%`,
                      width: `${((s.max - s.min) / allMax) * 100}%`,
                      minWidth: 4,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-2)", textAlign: "right" }}>
                    {s.currency} {s.min ? (s.min / 1000).toFixed(0) + "k" : "?"} – {s.max ? (s.max / 1000).toFixed(0) + "k" : "?"}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}

function ScoreCard({ label, value, sub, tone }: { label: string; value: string | number; sub: string; tone: "danger" | "success" | "warning" | "neutral" }) {
  return (
    <div className={`analytics-score-card analytics-tone-${tone}`}>
      <div className="analytics-score-top"><span>{label}</span><span>{value}</span></div>
      <div className="analytics-score-footer">{sub}</div>
    </div>
  );
}

function Panel({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="analytics-panel">
      <p className="analytics-panel-label">{label}</p>
      <h2>{title}</h2>
      <div className="analytics-panel-body">{children}</div>
    </section>
  );
}
