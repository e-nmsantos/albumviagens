import { describe, expect, it } from "vitest";
import {
  compareTrips,
  dateOfDay,
  formatRange,
  formatWhen,
  statusLabel,
  tripStatus,
  whenKey,
} from "@/lib/dates";

const trip = (start_date: string, end_date: string, created_at = "") => ({
  start_date,
  end_date,
  dates: "",
  created_at,
});
const today = new Date(2026, 9, 21); // 21 Oct 2026

describe("trip dates", () => {
  it("formats ranges compactly", () => {
    expect(formatRange("2025-01-12", "2025-01-18")).toBe("12 – 18 jan 2025");
    expect(formatRange("2025-01-28", "2025-02-03")).toBe("28 jan – 3 fev 2025");
    expect(formatRange("2025-12-28", "2026-01-03")).toBe("28 dez 2025 – 3 jan 2026");
    expect(formatRange("2025-05-01")).toBe("1 mai 2025");
  });

  it("gives the date of each itinerary day", () => {
    expect(dateOfDay(trip("2025-01-30", ""), 3)?.getDate()).toBe(1); // 1 Feb
    expect(dateOfDay(trip("", ""), 1)).toBeNull();
  });

  it("counts down, follows the trip and knows when it ended", () => {
    expect(statusLabel(tripStatus(trip("2026-11-02", "2026-11-09"), today))).toBe("Faltam 12 dias");
    expect(statusLabel(tripStatus(trip("2026-10-22", "2026-10-25"), today))).toBe("É amanhã!");
    expect(statusLabel(tripStatus(trip("2026-10-19", "2026-10-25"), today))).toBe(
      "A decorrer · dia 3 de 7",
    );
    expect(tripStatus(trip("2026-10-01", "2026-10-05"), today)?.kind).toBe("past");
    expect(tripStatus(trip("", ""), today)).toBeNull();
  });

  it("orders trips: happening now, upcoming soonest first, undated, then past", () => {
    const list = [
      { id: "past-old", ...trip("2024-01-01", "2024-01-05") },
      { id: "later", ...trip("2027-03-01", "2027-03-05") },
      { id: "undated", ...trip("", "", "2026-01-01") },
      { id: "now", ...trip("2026-10-20", "2026-10-23") },
      { id: "soon", ...trip("2026-11-01", "2026-11-05") },
      { id: "past-recent", ...trip("2026-09-01", "2026-09-05") },
    ];
    expect(list.sort(compareTrips(today)).map((t) => t.id)).toEqual([
      "now",
      "soon",
      "later",
      "undated",
      "past-recent",
      "past-old",
    ]);
  });

  it("formats reservation times and keeps old free text", () => {
    expect(formatWhen("2025-01-12T08:30")).toBe("12 jan 2025, 08:30");
    expect(formatWhen("12 Jan - 08:30")).toBe("12 Jan - 08:30");
    expect(whenKey("2025-01-12T08:30") < whenKey("texto antigo")).toBe(true);
  });
});
