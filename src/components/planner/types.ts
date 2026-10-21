import type { TripPlan } from "@/lib/trips";

/** Applies a change to the current trip. Resolves false when saving failed (the error is already shown). */
export type TripUpdate = (change: (t: TripPlan) => TripPlan) => Promise<boolean>;
