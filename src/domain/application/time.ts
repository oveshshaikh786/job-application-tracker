export function toMs(d: string | Date): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

export function fmtAgoShort(diffMs: number): string {
  const s = Math.max(0, Math.floor(diffMs / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
