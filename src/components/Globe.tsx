import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { countries } from "@/lib/world";

/** Small globe rotated to face a point, with a star on it. */
export function Globe({
  lat,
  lng,
  size = 160,
}: {
  lat: number | null;
  lng: number | null;
  size?: number;
}) {
  const has = lat != null && lng != null;
  const proj = geoOrthographic()
    .scale(size / 2 - 2)
    .translate([size / 2, size / 2])
    .rotate(has ? [-lng!, -lat! * 0.8] : [-10, -30])
    .clipAngle(90);
  const path = geoPath(proj);
  const pt = has ? proj([lng!, lat!]) : null;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden
      className="drop-shadow-md"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - 2}
        className="fill-secondary stroke-border"
      />
      <path
        d={path(geoGraticule10()) ?? ""}
        className="fill-none stroke-border"
        strokeWidth={0.4}
      />
      {countries.map((c, i) => (
        <path key={i} d={path(c) ?? ""} className="fill-sage/70 stroke-card" strokeWidth={0.3} />
      ))}
      {pt && (
        <g transform={`translate(${pt[0]},${pt[1]})`}>
          <circle
            r={9}
            className="fill-primary/25 animate-ping"
            style={{ transformOrigin: "center", transformBox: "fill-box" }}
          />
          <path
            d="M0,-7 2,-2.2 7,-2.2 3,1 4.5,6 0,3 -4.5,6 -3,1 -7,-2.2 -2,-2.2Z"
            className="fill-primary stroke-card"
            strokeWidth={1}
          />
        </g>
      )}
    </svg>
  );
}
