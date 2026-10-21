import { geoArea, geoCentroid, geoContains, geoDistance } from "d3-geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { MICROSTATES, countryCodeOf, numericOf } from "@/lib/countries";
import { countries } from "@/lib/world";

export type Country = (typeof countries)[number];
export type Place = { place: string; lat: number | null; lng: number | null };
export type Dot = { name: string; lng: number; lat: number };
/** A visited country, trimmed to the parts that make sense to paint. */
export type Painted = { country: Country; shape: Feature<Polygon | MultiPolygon> };

const byId = new Map(countries.map((c) => [String(c.id), c]));
const EARTH_KM = 6371;
/** Islands this close to the main territory are painted with it (Corsica, Madeira, Sicily…). */
const NEAR_MAINLAND_KM = 1300;
/** A far-away part is painted only when a memory is this close to it (the Azores, Canaries…). */
const NEAR_MEMORY_KM = 400;

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

/**
 * The parts of a country to paint: its main territory, nearby islands, and far-away parts only
 * where there is a memory. France would otherwise also paint French Guiana, Réunion and so on.
 */
export function paintableShape(country: Country, points: [number, number][]): Painted["shape"] {
  const g = country.geometry as Polygon | MultiPolygon;
  if (g.type !== "MultiPolygon") return { type: "Feature", properties: {}, geometry: g };
  const parts = g.coordinates.map((coords) => {
    const f: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: coords },
    };
    return { coords, area: geoArea(f), centre: geoCentroid(f), f };
  });
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const km = (a: [number, number], b: [number, number]) => geoDistance(a, b) * EARTH_KM;
  const kept = parts.filter(
    (p) =>
      p === main ||
      km(p.centre, main.centre) <= NEAR_MAINLAND_KM ||
      points.some((pt) => geoContains(p.f, pt) || km(p.centre, pt) <= NEAR_MEMORY_KM),
  );
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPolygon", coordinates: kept.map((p) => p.coords) },
  };
}

/** Visited countries (painted) and microstates (dots), from what each memory says. */
export function visitedOf(places: Place[]) {
  const visited = new Map<Country, [number, number][]>();
  const dots = new Map<string, Dot>();
  const visit = (c: Country, p: Place) => {
    const pts = visited.get(c) ?? [];
    if (p.lat != null && p.lng != null) pts.push([p.lng, p.lat]);
    visited.set(c, pts);
  };
  for (const p of places) {
    const code = countryCodeOf(p.place);
    const feature = code ? byId.get(numericOf(code) ?? "") : undefined;
    if (code && MICROSTATES.has(code)) {
      const [lng, lat] =
        p.lat != null && p.lng != null
          ? [p.lng, p.lat]
          : feature
            ? geoCentroid(feature)
            : [NaN, NaN];
      if (Number.isFinite(lng))
        dots.set(code, { name: feature?.properties.name ?? code, lng, lat });
    } else if (feature) {
      visit(feature, p);
    } else if (p.lat != null && p.lng != null) {
      const f = countryAt(p.lat, p.lng);
      if (f) visit(f, p);
    }
  }
  const painted: Painted[] = [...visited].map(([country, pts]) => ({
    country,
    shape: paintableShape(country, pts),
  }));
  return { painted, dots: [...dots.values()] };
}
