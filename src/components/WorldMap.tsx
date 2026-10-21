import { useMemo, useState } from "react";
import { geoBounds, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { countries } from "@/lib/world";
import { visitedOf, type Dot, type Painted, type Place } from "@/lib/visited";
import { plural } from "@/lib/utils";

const W = 960,
  H = 500;

/** A projection framing the visited places with some context, or the whole world. */
function framing(painted: Painted[], dots: Dot[]) {
  const world = geoNaturalEarth1().fitSize([W, H], { type: "Sphere" });
  const shapes: Feature<Geometry>[] = [
    ...painted.map((p) => p.shape as Feature<Geometry>),
    ...dots.map((d) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] },
    })),
  ];
  if (!shapes.length) return world;
  const [[x0, y0], [x1, y1]] = geoBounds({
    type: "FeatureCollection",
    features: shapes,
  } as FeatureCollection);
  const width = x1 - x0;
  // Places spread across the globe (or crossing the date line): show the world.
  if (width < 0 || width > 200) return world;
  const pad = Math.max(8, Math.max(width, y1 - y0) * 0.35);
  const box: Feature = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPoint",
      coordinates: [
        [Math.max(-180, x0 - pad), Math.max(-85, y0 - pad)],
        [Math.min(180, x1 + pad), Math.min(85, y1 + pad)],
      ],
    },
  };
  return geoNaturalEarth1().fitExtent(
    [
      [12, 12],
      [W - 12, H - 12],
    ],
    box,
  );
}

export function WorldMap({ places }: { places: Place[] }) {
  const { painted, dots } = useMemo(() => visitedOf(places), [places]);
  const [whole, setWhole] = useState(false);
  const projection = useMemo(
    () => (whole ? geoNaturalEarth1().fitSize([W, H], { type: "Sphere" }) : framing(painted, dots)),
    [whole, painted, dots],
  );
  const path = geoPath(projection);
  const total = painted.length + dots.length;

  return (
    <div className="polaroid">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Mapa com os países visitados"
      >
        <rect width={W} height={H} className="fill-muted" />
        {countries.map((c, i) => (
          <path key={i} d={path(c) ?? ""} className="fill-card stroke-border" strokeWidth={0.5}>
            <title>{c.properties.name}</title>
          </path>
        ))}
        {/* Visited countries on top, without far-away territories nobody went to. */}
        {painted.map((p) => (
          <path
            key={String(p.country.id)}
            d={path(p.shape) ?? ""}
            className="fill-primary stroke-card"
            strokeWidth={0.5}
            data-visited={p.country.properties.name}
          >
            <title>{p.country.properties.name}</title>
          </path>
        ))}
        {dots.map((d) => {
          const xy = projection([d.lng, d.lat]);
          return (
            xy && (
              <circle
                key={d.name}
                cx={xy[0]}
                cy={xy[1]}
                r={6}
                className="fill-primary stroke-card"
                strokeWidth={2}
              >
                <title>{d.name}</title>
              </circle>
            )
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {plural(total, "país visitado", "países visitados")}
          {dots.length > 0 && " · os países muito pequenos aparecem como um ponto"}
        </span>
        {total > 0 && (
          <button onClick={() => setWhole((w) => !w)} className="text-primary hover:underline">
            {whole ? "Aproximar" : "Ver o mundo inteiro"}
          </button>
        )}
      </div>
    </div>
  );
}
