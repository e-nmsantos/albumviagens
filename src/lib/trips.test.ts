import { describe, expect, it } from "vitest";
import { normalizeTrip, tripOps, tripPhotos } from "@/lib/trips";
import { suggestPacking } from "@/lib/packing";
import { convert, toEUR } from "@/lib/currency";

describe("trips", () => {
  it("fills in defaults for trips saved by older versions", () => {
    const t = normalizeTrip({ id: "t1", title: "Açores" });
    expect(t).toMatchObject({
      id: "t1",
      destination: "Açores",
      days: [],
      expenses: [],
      budget_limit: 0,
    });
    expect(t.created_at).not.toBe("");
  });

  it("keeps itinerary stops in day order", () => {
    const t = normalizeTrip({
      title: "x",
      days: [
        { id: "b", day_number: 2, time: "", title: "B", place: "" },
        { id: "a", day_number: 1, time: "", title: "A", place: "" },
      ],
    });
    expect(t.days.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("adds several packing items at once and skips names already listed", () => {
    const t = normalizeTrip({
      title: "x",
      packing_list: [{ id: "p", name: "Passaporte", category: "documentos", packed: true }],
    });
    const next = tripOps.addPacking([
      { name: "passaporte ", category: "documentos", packed: false },
      { name: "Chapéu", category: "roupa", packed: false },
      { name: "Toalha", category: "roupa", packed: false },
    ])(t);
    expect(next.packing_list.map((i) => i.name)).toEqual(["Passaporte", "Chapéu", "Toalha"]);
    expect(new Set(next.packing_list.map((i) => i.id)).size).toBe(3);
  });

  it("lists the photos a trip uses", () => {
    const t = normalizeTrip({
      title: "x",
      days: [
        { id: "a", day_number: 1, time: "", title: "A", place: "", photo: "local/1.jpg" },
        { id: "b", day_number: 1, time: "", title: "B", place: "" },
      ],
    });
    expect(tripPhotos(t)).toEqual(["local/1.jpg"]);
  });

  it("suggests warm or cold packing from the destination", () => {
    const names = (d: string) => suggestPacking(d).map((i) => i.name);
    expect(names("Bali, Indonésia")).toContain("Protetor solar 50+");
    expect(names("Reiquiavique, Islândia")).toContain("Gorro, luvas e cachecol");
    expect(names("Porto, Portugal")).not.toContain("Adaptador de corrente universal");
  });

  it("converts currencies through EUR", () => {
    expect(toEUR(108, "USD")).toBeCloseTo(100);
    expect(convert(100, "EUR", "EUR")).toBe(100);
    expect(convert(1.08, "USD", "GBP")).toBeCloseTo(0.85);
  });
});
