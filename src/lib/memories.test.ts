import { describe, expect, it } from "vitest";
import { countryOf, onThisDay, totalKm } from "./memories";

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
