export const MS_IN_MINUTE = 60 * 1000;
export const MS_IN_HOUR = 60 * MS_IN_MINUTE;
export const MS_IN_DAY = 24 * MS_IN_HOUR;

export function toMs(value: string | number | Date) {
  return new Date(value).getTime();
}

export function ageMsFrom(createdAt: string | Date, nowMs = Date.now()) {
  return Math.max(0, nowMs - toMs(createdAt));
}

export function fmtAgoShort(value: string | number | Date, nowMs = Date.now()) {
  const diff = Math.max(0, nowMs - toMs(value));

  if (diff < MS_IN_HOUR) {
    const mins = Math.max(1, Math.floor(diff / MS_IN_MINUTE));
    return `${mins}m ago`;
  }

  if (diff < MS_IN_DAY) {
    const hours = Math.max(1, Math.floor(diff / MS_IN_HOUR));
    return `${hours}h ago`;
  }

  const days = Math.max(1, Math.floor(diff / MS_IN_DAY));
  return `${days}d ago`;
}

export function formatRelativeAgeShort(
  createdAt: string | Date,
  nowMs = Date.now(),
) {
  const diff = ageMsFrom(createdAt, nowMs);

  if (diff < MS_IN_HOUR) {
    const mins = Math.max(1, Math.floor(diff / MS_IN_MINUTE));
    return `${mins}m`;
  }

  if (diff < MS_IN_DAY) {
    const hours = Math.max(1, Math.floor(diff / MS_IN_HOUR));
    return `${hours}h`;
  }

  const days = Math.max(1, Math.floor(diff / MS_IN_DAY));
  return `${days}d`;
}

export type FreshnessKind = "new" | "recent" | "stale";

export function getFreshnessKind(
  createdAt: string | Date,
  nowMs = Date.now(),
): FreshnessKind {
  const diff = ageMsFrom(createdAt, nowMs);

  if (diff < MS_IN_DAY) return "new";
  if (diff < 3 * MS_IN_DAY) return "recent";
  return "stale";
}

export function getFreshnessLabel(
  createdAt: string | Date,
  nowMs = Date.now(),
) {
  const kind = getFreshnessKind(createdAt, nowMs);

  if (kind === "new") return "New";
  if (kind === "recent") return "Recent";
  return null;
}
