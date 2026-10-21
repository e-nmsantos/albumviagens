// Dates for trips and reservations. Stored as ISO strings ("2025-01-12" or "2025-01-12T08:30");
// older data may hold free text, which is shown as written.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DAY_MS = 86_400_000;

export const isIsoDay = (s: string | undefined): s is string => !!s && ISO_DAY.test(s);
export const isIsoDateTime = (s: string | undefined): s is string =>
  !!s && (ISO_DAY.test(s) || ISO_TIME.test(s));

/** Local midnight of an ISO day. */
export function dayOf(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export const toIsoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: Date, b: Date) =>
  Math.round((dayOf(toIsoDay(b)).getTime() - dayOf(toIsoDay(a)).getTime()) / DAY_MS);

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-PT", o);
const shortMonth = (d: Date) => fmt({ month: "short" }).format(d).replace(".", "");

/** "12 – 18 jan 2025", "28 jan – 3 fev 2025", "28 dez 2025 – 3 jan 2026". */
export function formatRange(start: string, end?: string): string {
  const a = dayOf(start);
  if (!isIsoDay(end) || end === start) return `${a.getDate()} ${shortMonth(a)} ${a.getFullYear()}`;
  const b = dayOf(end);
  if (a.getFullYear() !== b.getFullYear()) {
    return `${a.getDate()} ${shortMonth(a)} ${a.getFullYear()} – ${b.getDate()} ${shortMonth(b)} ${b.getFullYear()}`;
  }
  if (a.getMonth() !== b.getMonth()) {
    return `${a.getDate()} ${shortMonth(a)} – ${b.getDate()} ${shortMonth(b)} ${b.getFullYear()}`;
  }
  return `${a.getDate()} – ${b.getDate()} ${shortMonth(b)} ${b.getFullYear()}`;
}

/** A reservation time: "12 jan 2025, 08:30" for ISO values, anything else as written. */
export function formatWhen(s: string | undefined): string {
  if (!s) return "";
  if (!isIsoDateTime(s)) return s;
  const d = dayOf(s);
  const day = `${d.getDate()} ${shortMonth(d)} ${d.getFullYear()}`;
  return s.length > 10 ? `${day}, ${s.slice(11, 16)}` : day;
}

/** "sáb, 13 jan" */
export const formatWeekday = (d: Date) =>
  `${fmt({ weekday: "short" }).format(d).replace(".", "")}, ${d.getDate()} ${shortMonth(d)}`;

type Dated = { start_date: string; end_date: string; dates: string };

/** The dates of a trip as text, or "" when unknown. */
export const tripDatesLabel = (t: Dated) =>
  isIsoDay(t.start_date) ? formatRange(t.start_date, t.end_date) : t.dates;

/** Calendar date of an itinerary day (day 1 = start date). */
export function dateOfDay(t: Dated, dayNumber: number): Date | null {
  if (!isIsoDay(t.start_date)) return null;
  const d = dayOf(t.start_date);
  d.setDate(d.getDate() + dayNumber - 1);
  return d;
}

/** Number of days in a trip, when both dates are known. */
export const tripLength = (t: Dated) =>
  isIsoDay(t.start_date) && isIsoDay(t.end_date)
    ? daysBetween(dayOf(t.start_date), dayOf(t.end_date)) + 1
    : null;

export type TripStatus =
  | { kind: "upcoming"; days: number }
  | { kind: "ongoing"; day: number; total: number | null }
  | { kind: "past" };

export function tripStatus(t: Dated, today = new Date()): TripStatus | null {
  if (!isIsoDay(t.start_date)) return null;
  const toStart = daysBetween(today, dayOf(t.start_date));
  if (toStart > 0) return { kind: "upcoming", days: toStart };
  const end = isIsoDay(t.end_date) ? t.end_date : t.start_date;
  if (daysBetween(today, dayOf(end)) >= 0)
    return { kind: "ongoing", day: 1 - toStart, total: tripLength(t) };
  return { kind: "past" };
}

export function statusLabel(s: TripStatus | null): string {
  if (!s) return "";
  if (s.kind === "upcoming") return s.days === 1 ? "É amanhã!" : `Faltam ${s.days} dias`;
  if (s.kind === "ongoing")
    return s.total ? `A decorrer · dia ${s.day} de ${s.total}` : "A decorrer";
  return "Já foi";
}

/**
 * Trips in the order you care about them: ongoing, then upcoming (soonest first),
 * then trips without dates, then past ones (most recent first).
 */
export function compareTrips<T extends Dated & { created_at: string }>(today = new Date()) {
  const rank = (t: T) => {
    const s = tripStatus(t, today);
    return s?.kind === "ongoing" ? 0 : s?.kind === "upcoming" ? 1 : s ? 3 : 2;
  };
  return (a: T, b: T) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (rank(a) === 1) return a.start_date.localeCompare(b.start_date);
    if (rank(a) === 3) return b.start_date.localeCompare(a.start_date);
    return b.created_at.localeCompare(a.created_at);
  };
}

/** Sort key for reservation times: ISO values in order, free text last. */
export const whenKey = (s: string | undefined) => (isIsoDateTime(s) ? s : `~${s ?? ""}`);
