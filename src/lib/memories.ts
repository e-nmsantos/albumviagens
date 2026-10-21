import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { currentScope, isCloud, useAuth, type Scope } from "@/hooks/use-auth";
import { cloudError } from "@/lib/cloud";
import { localDB } from "@/lib/local-db";
import { deletePhotos } from "@/lib/photos";
import type { Memory, MemoryInput } from "@/lib/types";

export type { Memory, MemoryInput };

const byDateDesc = (a: Memory, b: Memory) => b.date.localeCompare(a.date);

export async function fetchMemories(scope: Scope): Promise<Memory[]> {
  if (!isCloud(scope)) return (await localDB.getAll<Memory>("memories")).sort(byDateDesc);
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", scope)
    .order("date", { ascending: false });
  if (error) throw cloudError("abrir as memórias", error);
  return data as Memory[];
}

export const memoriesQuery = (scope: Scope) =>
  queryOptions({ queryKey: ["memories", scope], queryFn: () => fetchMemories(scope) });

export function useMemories() {
  const { scope, ready } = useAuth();
  return useQuery({ ...memoriesQuery(scope), enabled: ready });
}

const fields = (m: MemoryInput) => ({
  title: m.title,
  place: m.place,
  date: m.date,
  text: m.text,
  photos: m.photos,
  lat: m.lat,
  lng: m.lng,
  trip: m.trip,
  is_public: m.is_public,
});

/** Creates (no id) or updates (with id) a memory. `id` may be given for new rows when importing. */
export async function saveMemoryTo(scope: Scope, m: MemoryInput, create = !m.id): Promise<Memory> {
  if (!isCloud(scope)) {
    return localDB.put<Memory>("memories", {
      ...fields(m),
      id: m.id ?? crypto.randomUUID(),
      user_id: "local",
    });
  }
  const q = create
    ? supabase.from("memories").upsert({ ...fields(m), ...(m.id ? { id: m.id } : {}) })
    : supabase.from("memories").update(fields(m)).eq("id", m.id!);
  const { data, error } = await q.select().single();
  if (error) throw cloudError("guardar a memória", error);
  return data as Memory;
}

export function useSaveMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: MemoryInput) => {
      const scope = await currentScope();
      const before = m.id
        ? qc.getQueryData<Memory[]>(["memories", scope])?.find((x) => x.id === m.id)
        : undefined;
      const saved = await saveMemoryTo(scope, m);
      if (before) await deletePhotos(before.photos.filter((p) => !saved.photos.includes(p)));
      return saved;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });
}

export function useDeleteMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Memory) => {
      const scope = await currentScope();
      if (isCloud(scope)) {
        const { error } = await supabase.from("memories").delete().eq("id", m.id);
        if (error) throw cloudError("apagar a memória", error);
      } else {
        await localDB.remove("memories", m.id);
      }
      await deletePhotos(m.photos);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });
}

export function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function countryOf(place: string) {
  const parts = place
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? place;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371,
    r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r,
    dLng = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Located = { date: string; lat: number | null; lng: number | null };
const hasPos = (m: Located): m is Located & { lat: number; lng: number } =>
  m.lat != null && m.lng != null;

/** Total km travelled: memories in date order, summed leg by leg. */
export function totalKm(ms: Located[]) {
  const pts = ms.filter(hasPos).sort((a, b) => a.date.localeCompare(b.date));
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += distanceKm(pts[i - 1]!, pts[i]!);
  return Math.round(km);
}

/** Memories from the same day and month in earlier years. */
export function onThisDay<T extends { date: string }>(ms: T[], today = new Date()) {
  const md = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return ms.filter(
    (m) => m.date.slice(5) === md && Number(m.date.slice(0, 4)) < today.getFullYear(),
  );
}

/** Group memories by year; `newestFirst` orders both the years and the memories inside them. */
export function byYear<T extends { date: string }>(ms: T[], newestFirst = true) {
  const dir = newestFirst ? -1 : 1;
  const map = new Map<string, T[]>();
  [...ms]
    .sort((a, b) => dir * a.date.localeCompare(b.date))
    .forEach((m) => {
      const y = m.date.slice(0, 4);
      map.set(y, [...(map.get(y) ?? []), m]);
    });
  return [...map.entries()].sort((a, b) => dir * a[0].localeCompare(b[0]));
}

/** Distinct trip names, in the order they first appear. */
export const tripNames = (ms: Memory[]) => [
  ...new Set(ms.map((m) => m.trip?.trim()).filter((t): t is string => !!t)),
];
