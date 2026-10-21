import { describe, expect, it } from "vitest";
import { countryOf, memoryDate, monthEnd, onThisDay, totalKm } from "./memories";

describe("memories helpers", () => {
  it("country is the last part of the place", () => {
    expect(countryOf("Quioto, Japão")).toBe("Japão");
  });
  it("on this day only returns earlier years with same day/month", () => {
    const r = onThisDay(
      [{ date: "2024-10-20" }, { date: "2026-10-20" }, { date: "2024-10-21" }],
      new Date(2026, 9, 20),
    );
    expect(r).toEqual([{ date: "2024-10-20" }]);
  });
  it("km sums legs in date order", () => {
    const km = totalKm([
      { date: "2024-01-02", lat: 0, lng: 1 },
      { date: "2024-01-01", lat: 0, lng: 0 },
    ]);
    expect(km).toBe(111);
  });
});

describe("dates without a day", () => {
  it("shows month and year, or the full date when the day is known", () => {
    expect(memoryDate({ date: "2025-06-30", date_precision: "month" })).toBe("junho de 2025");
    expect(memoryDate({ date: "2025-06-12", date_precision: "day" })).toBe("12 de junho de 2025");
    expect(memoryDate({ date: "2025-06-12" })).toBe("12 de junho de 2025");
  });

  it("stores month-only dates as the month's last day, so they sort after dated ones", () => {
    expect(monthEnd(2024, 2)).toBe("2024-02-29");
    expect(monthEnd(2025, 6)).toBe("2025-06-30");
    expect(["2025-06-30", "2025-06-12"].sort()).toEqual(["2025-06-12", "2025-06-30"]);
  });

  it("leaves month-only memories out of “on this day”", () => {
    const today = new Date(2026, 5, 30); // 30 June 2026
    const r = onThisDay(
      [
        { date: "2025-06-30", date_precision: "month" as const },
        { date: "2024-06-30", date_precision: "day" as const },
      ],
      today,
    );
    expect(r).toEqual([{ date: "2024-06-30", date_precision: "day" }]);
  });
});
