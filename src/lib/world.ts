import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-50m.json";

/** Country shapes for the SVG world map and globes. */
export const countries = (
  feature(
    world as never,
    (world as never as { objects: { countries: never } }).objects.countries,
  ) as unknown as FeatureCollection<Geometry, { name: string }>
).features;
