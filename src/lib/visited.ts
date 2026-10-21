import { geoContains, geoPath } from "d3-geo";
import { MICROSTATES, countryCodeOf, numericOf } from "@/lib/countries";
import { countries } from "@/lib/world";

export type Country = (typeof countries)[number];
export type Place = { place: string; lat: number | null; lng: number | null };
export type Dot = { name: string; lng: number; lat: number };

const byId = new Map(countries.map((c) => [String(c.id), c]));

/** Country under a point, for places whose country isn't written in their name. Lisboa and
 *  other coastal cities can fall just outside the simplified borders, so look ~10 km around. */
function countryAt(lat: number, lng: number): Country | undefined {
  const hit = (x: number, y: number) => countries.find((c) => geoContains(c, [x, y]));
  const direct = hit(lng, lat);
  if (direct) return direct;
  for (let a = 0; a < 360; a += 45) {
    const t = (a * Math.PI) / 180;
    const f = hit(lng + 0.1 * Math.cos(t), lat + 0.1 * Math.sin(t));
    if (f) return f;
  }
  return undefined;
}

/** Visited countries (painted) and microstates (dots), from what each memory says. */
export function visitedOf(places: Place[]) {
  const painted = new Set<Country>();
  const dots = new Map<string, Dot>();
  for (const p of places) {
    const code = countryCodeOf(p.place);
    const feature = code ? byId.get(numericOf(code) ?? "") : undefined;
    if (code && MICROSTATES.has(code)) {
      const [lng, lat] =
        p.lat != null && p.lng != null
          ? [p.lng, p.lat]
          : feature
            ? geoPath().centroid(feature)
            : [NaN, NaN];
      if (Number.isFinite(lng))
        dots.set(code, { name: feature?.properties.name ?? code, lng, lat });
    } else if (feature) {
      painted.add(feature);
    } else if (p.lat != null && p.lng != null) {
      const f = countryAt(p.lat, p.lng);
      if (f) painted.add(f);
    }
  }
  return { painted, dots: [...dots.values()] };
}
