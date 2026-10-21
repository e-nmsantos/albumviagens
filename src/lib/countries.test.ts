import { describe, expect, it } from "vitest";
import { countryCodeOf, placeAndCountry } from "@/lib/countries";
import { mrzLines } from "@/lib/profile";
import { visitedOf } from "@/lib/visited";

describe("countries", () => {
  it("recognises the country written in a place", () => {
    expect(countryCodeOf("Mónaco, Mónaco")).toBe("MC");
    expect(countryCodeOf("Nazaré, Portugal")).toBe("PT");
    expect(countryCodeOf("Quioto, Japão")).toBe("JP");
    expect(countryCodeOf("Roma, Itália")).toBe("IT");
    expect(countryCodeOf("Amesterdão, Holanda")).toBe("NL");
    expect(countryCodeOf("Algures")).toBeUndefined();
  });

  it("does not repeat a country that has the same name as the place", () => {
    expect(placeAndCountry("Mónaco, Mónaco")).toEqual({ place: "Mónaco", country: "" });
    expect(placeAndCountry("Lisboa, Portugal")).toEqual({ place: "Lisboa", country: "Portugal" });
  });

  it("shows Monaco as a dot and never paints Italy for it", () => {
    const { painted, dots } = visitedOf([
      { place: "Mónaco, Mónaco", lat: 43.7384, lng: 7.4246 },
      { place: "Lisboa, Portugal", lat: 38.7223, lng: -9.1393 },
    ]);
    const names = [...painted].map((c) => c.properties.name);
    expect(names).toEqual(["Portugal"]);
    expect(dots).toHaveLength(1);
  });

  it("falls back to the coordinates when the country isn't written", () => {
    const { painted } = visitedOf([{ place: "Sintra", lat: 38.8029, lng: -9.3817 }]);
    expect([...painted].map((c) => c.properties.name)).toEqual(["Portugal"]);
  });

  it("builds the passport's machine-readable lines from the name", () => {
    const [l1, l2] = mrzLines("Nuno Santos", "2023");
    expect(l1).toBe("P<PRTSANTOS<<NUNO".padEnd(44, "<"));
    expect(l1).toHaveLength(44);
    expect(l2).toHaveLength(44);
    expect(mrzLines("", "2023")[0].startsWith("P<PRTVIAJANTE<<EXPLORADOR")).toBe(true);
  });
});
