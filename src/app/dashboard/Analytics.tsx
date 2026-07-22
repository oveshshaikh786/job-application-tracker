"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
  };
};

const COLORS = ["#9d6fff", "#22c55e", "#f59e0b", "#f04141", "#4a9eff"];

export default function Analytics({ stats }: AnalyticsProps) {
  const total = stats.totalApplications || 0;
  const active = stats.activeApplications || 0;
  const rejected = stats.rejectedApplications || 0;
  const offers = stats.offers || 0;
  const withdrawn = stats.withdrawn || 0;

  const rejectionRate = total ? Math.round((rejected / total) * 100) : 0;
  const activeRate = total ? Math.round((active / total) * 100) : 0;
  const offerRate = total ? Math.round((offers / total) * 100) : 0;

  const sourceData = Object.entries(stats.sourceBreakdown || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const stageData = Object.entries(stats.stageBreakdown || {})
    .map(([name, value]) => ({ name: cleanStage(name), value }))
    .sort((a, b) => b.value - a.value);

  const weeklyData: WeeklyTrendRow[] =
    stats.weeklyTrend && stats.weeklyTrend.length > 0
      ? stats.weeklyTrend
      : [{ week: "Now", applied: total, rejected }];

  const funnelData = [
    { name: "Applied", value: stats.stageBreakdown?.APPLIED ?? 0 },
    { name: "Recruiter", value: stats.stageBreakdown?.RECRUITER_SCREEN ?? 0 },
    { name: "Tech", value: stats.stageBreakdown?.TECH_SCREEN ?? 0 },
    { name: "Onsite", value: stats.stageBreakdown?.ONSITE ?? 0 },
    { name: "Offer", value: offers },
  ];

  return (
    <div className="analytics-page">
      <div className="analytics-hero">
        <div>
          <p className="analytics-eyebrow">Pipeline Intelligence</p>
          <h1 className="analytics-title">Analytics Overview</h1>
          <p className="analytics-subtitle">
            Source quality, rejection pressure, funnel health, and weekly
            movement.
          </p>
        </div>

        <div className="analytics-chip">{total} total applications</div>
      </div>

      <div className="analytics-matrix-grid">
        <ScoreCard
          label="Rejection Rate"
          value={`${rejectionRate}%`}
          sub={`${rejected} rejected`}
          tone="danger"
        />
        <ScoreCard
          label="Active Pipeline"
          value={`${activeRate}%`}
          sub={`${active} active`}
          tone="success"
        />
        <ScoreCard
          label="Offer Rate"
          value={`${offerRate}%`}
          sub={`${offers} offers`}
          tone="warning"
        />
        <ScoreCard
          label="Withdrawn"
          value={withdrawn}
          sub="Removed by user"
          tone="neutral"
        />
      </div>

      <div className="analytics-chart-grid">
        <Panel label="Pipeline Stages" title="Stage distribution">
          <div className="analytics-donut-layout">
            <div className="analytics-donut">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stageData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {stageData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="analytics-legend">
              {stageData.map((item, index) => (
                <div key={item.name} className="analytics-legend-row">
                  <span style={{ background: COLORS[index % COLORS.length] }} />
                  <strong>{item.name}</strong>
                  <em>{item.value}</em>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel label="Source Quality" title="Applications by source">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis type="number" stroke="rgba(220,227,242,0.45)" />
              <YAxis
                dataKey="name"
                type="category"
                width={130}
                stroke="rgba(220,227,242,0.65)"
              />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="#9d6fff" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="analytics-chart-grid">
        <Panel label="Weekly Trend" title="Application velocity">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis dataKey="week" stroke="rgba(220,227,242,0.55)" />
              <YAxis stroke="rgba(220,227,242,0.45)" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="applied"
                stroke="#9d6fff"
                fill="rgba(157,111,255,0.22)"
                strokeWidth={3}
              />
              <Area
                type="monotone"
                dataKey="rejected"
                stroke="#f04141"
                fill="rgba(240,65,65,0.16)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel label="Conversion Funnel" title="Stage movement">
          <div className="analytics-funnel">
            {funnelData.map((row, index) => {
              const max = Math.max(...funnelData.map((x) => x.value), 1);
              const width = Math.max(10, Math.round((row.value / max) * 100));

              return (
                <div key={row.name} className="analytics-funnel-row">
                  <div className="analytics-funnel-top">
                    <span>{row.name}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className="analytics-progress slim">
                    <div
                      className="analytics-progress-fill purple"
                      style={{
                        width: `${width}%`,
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone: "danger" | "success" | "warning" | "neutral";
}) {
  return (
    <div className={`analytics-score-card analytics-tone-${tone}`}>
      <div className="analytics-score-top">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="analytics-score-footer">{sub}</div>
    </div>
  );
}

function Panel({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="analytics-panel">
      <p className="analytics-panel-label">{label}</p>
      <h2>{title}</h2>
      <div className="analytics-panel-body">{children}</div>
    </section>
  );
}

function cleanStage(stage: string) {
  return stage
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
