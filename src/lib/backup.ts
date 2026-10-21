import { isCloud, type Scope } from "@/hooks/use-auth";
import { toUuid } from "@/lib/cloud";
import { localDB } from "@/lib/local-db";
import { fetchMemories, saveMemoryTo } from "@/lib/memories";
import { dataUrlToBlob, isLocalKey, photoAsDataUrl, uploadPhoto } from "@/lib/photos";
import { fetchTrips, normalizeTrip, saveTripTo, tripPhotos } from "@/lib/trips";
import type { Backup, Memory, TripInput, TripPlan, Wish } from "@/lib/types";
import { fetchWishes, saveWishTo } from "@/lib/wishes";

export const BACKUP_VERSION = 3;

/** Every photo key referenced by memories and trips, without repeats. */
export function referencedPhotos(b: Pick<Backup, "memories" | "trips">): string[] {
  return [...new Set([...b.memories.flatMap((m) => m.photos), ...b.trips.flatMap(tripPhotos)])];
}

/** Replaces photo keys using `map`; keys not in the map are kept. */
export function remapPhotos<T extends Pick<Backup, "memories" | "trips">>(
  b: T,
  map: Map<string, string>,
): T {
  const r = (k: string) => map.get(k) ?? k;
  return {
    ...b,
    memories: b.memories.map((m) => ({ ...m, photos: m.photos.map(r) })),
    trips: b.trips.map((t) => ({
      ...t,
      days: t.days.map((d) => (d.photo ? { ...d, photo: r(d.photo) } : d)),
    })),
  };
}

/** Everything in `scope`, photos included as data URLs. */
export async function buildBackup(
  scope: Scope,
  onProgress?: (done: number, total: number) => void,
): Promise<Backup> {
  const [memories, wishes, trips] = await Promise.all([
    fetchMemories(scope),
    fetchWishes(scope),
    fetchTrips(scope),
  ]);
  const keys = referencedPhotos({ memories, trips });
  const photos: Record<string, string> = {};
  for (let i = 0; i < keys.length; i++) {
    const url = await photoAsDataUrl(keys[i]!);
    if (url) photos[keys[i]!] = url;
    onProgress?.(i + 1, keys.length);
  }
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    memories,
    wishes,
    trips,
    photos,
  };
}

/** Checks the shape of a backup file and fills defaults for older versions. */
export function parseBackup(json: unknown): Backup {
  const b = json as Partial<Backup> | null;
  if (!b || typeof b !== "object" || !Array.isArray(b.memories)) {
    throw new Error("Este ficheiro não é uma cópia de segurança da app Fica na Memória.");
  }
  const memories = b.memories.filter(
    (m): m is Memory => !!m && typeof m.title === "string" && typeof m.date === "string",
  );
  return {
    version: Number(b.version) || 1,
    exported_at: String(b.exported_at ?? ""),
    memories: memories.map((m) => ({
      ...m,
      photos: Array.isArray(m.photos) ? m.photos : [],
      date_precision: m.date_precision === "month" ? "month" : "day",
    })),
    wishes: Array.isArray(b.wishes)
      ? b.wishes.filter((w): w is Wish => !!w && typeof w.place === "string")
      : [],
    trips: Array.isArray(b.trips)
      ? b.trips
          .filter((t): t is TripPlan => !!t && typeof t.title === "string")
          .map((t) => normalizeTrip(t as TripInput))
      : [],
    photos: b.photos && typeof b.photos === "object" ? b.photos : {},
  };
}

export type RestoreResult = {
  memories: number;
  wishes: number;
  trips: number;
  missingPhotos: number;
};

/** Adds a backup to `scope`. Items with the same id are updated, so restoring twice is safe. */
export async function restoreBackup(
  scope: Scope,
  backup: Backup,
  onProgress?: (done: number, total: number) => void,
): Promise<RestoreResult> {
  const cloud = isCloud(scope);
  const keys = referencedPhotos(backup);
  const map = new Map<string, string>();
  let missingPhotos = 0;
  const total = keys.length + backup.memories.length + backup.wishes.length + backup.trips.length;
  let done = 0;
  const tick = () => onProgress?.(++done, total);

  for (const key of keys) {
    const alreadyHere = cloud
      ? key.startsWith(`${scope}/`)
      : isLocalKey(key) && (await localDB.getPhoto(key)) !== null;
    const data = backup.photos?.[key];
    if (!alreadyHere) {
      if (data) map.set(key, await uploadPhoto(await dataUrlToBlob(data), scope));
      else missingPhotos++;
    }
    tick();
  }

  const b = remapPhotos(backup, map);
  const id = (s: string) => (cloud ? toUuid(s) : Promise.resolve(s));
  for (const m of b.memories) {
    await saveMemoryTo(scope, { ...m, id: await id(m.id), trip: m.trip ?? null }, true);
    tick();
  }
  for (const w of b.wishes) {
    await saveWishTo(scope, {
      id: await id(w.id),
      place: w.place,
      note: w.note ?? "",
      lat: w.lat ?? null,
      lng: w.lng ?? null,
      done: !!w.done,
      when_text: w.when_text ?? "",
      priority: Number(w.priority) || 2,
    });
    tick();
  }
  for (const t of b.trips) {
    await saveTripTo(scope, normalizeTrip(t));
    tick();
  }
  return {
    memories: b.memories.length,
    wishes: b.wishes.length,
    trips: b.trips.length,
    missingPhotos,
  };
}
