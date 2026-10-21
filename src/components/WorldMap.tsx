import { useMemo } from "react";
import { geoContains, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature } from "geojson";
import { countries } from "@/lib/world";

const W = 960,
  H = 500;

const projection = geoNaturalEarth1().fitSize([W, H], { type: "Sphere" });
const path = geoPath(projection);

/** Country containing the point; coastal cities (e.g. Lisboa) can fall just outside the
 *  simplified borders, so also probe nearby points up to ~50 km away. */
function countryAt(lat: number, lng: number) {
  const hit = (x: number, y: number) => countries.find((c) => geoContains(c, [x, y]));
  const direct = hit(lng, lat);
  if (direct) return direct;
  for (const r of [0.1, 0.25, 0.5]) {
    for (let a = 0; a < 360; a += 45) {
      const t = (a * Math.PI) / 180;
      const f = hit(lng + r * Math.cos(t), lat + r * Math.sin(t));
      if (f) return f;
    }
  }
  return undefined;
}

export function WorldMap({ points }: { points: { lat: number; lng: number }[] }) {
  const visited = useMemo(() => {
    const s = new Set<Feature>();
    for (const p of points) {
      const f = countryAt(p.lat, p.lng);
      if (f) s.add(f);
    }
    return s;
  }, [points]);
  return (
    <div className="polaroid">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Mapa-mundo com os países visitados"
      >
        <path d={path({ type: "Sphere" }) ?? ""} className="fill-muted" />
        {countries.map((c, i) => (
          <path
            key={i}
            d={path(c) ?? ""}
            className={visited.has(c) ? "fill-primary stroke-card" : "fill-card stroke-border"}
            strokeWidth={0.5}
          >
            <title>{c.properties.name}</title>
          </path>
        ))}
      </svg>
      <p className="mt-2 text-sm text-muted-foreground">
        {visited.size} {visited.size === 1 ? "país pintado" : "países pintados"} a partir dos pinos
        das memórias
      </p>
    </div>
  );
}
