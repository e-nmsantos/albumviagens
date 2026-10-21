import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import { currentScope, isCloud, useAuth, type Scope } from "@/hooks/use-auth";
import { cloudError } from "@/lib/cloud";
import { localDB } from "@/lib/local-db";
import type {
  ItineraryDay,
  PackingItem,
  TripExpense,
  TripInput,
  TripPlan,
  TripReservation,
} from "@/lib/types";

export type { ItineraryDay, PackingItem, TripExpense, TripPlan, TripReservation };

const shortId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/** Fills in defaults, so trips saved by older versions of the app keep working. */
export function normalizeTrip(t: TripInput): TripPlan {
  return {
    id: t.id || shortId("trip"),
    title: t.title,
    dates: t.dates ?? "",
    destination: t.destination || t.title,
    notes: t.notes ?? "",
    days: [...(t.days ?? [])].sort((a, b) => a.day_number - b.day_number),
    budget_limit: Number(t.budget_limit) || 0,
    expenses: t.expenses ?? [],
    reservations: t.reservations ?? [],
    packing_list: t.packing_list ?? [],
    created_at: t.created_at || new Date().toISOString(),
  };
}

const newestFirst = (a: TripPlan, b: TripPlan) => b.created_at.localeCompare(a.created_at);

export async function fetchTrips(scope: Scope): Promise<TripPlan[]> {
  if (!isCloud(scope)) {
    return (await localDB.getAll<TripInput>("trips")).map(normalizeTrip).sort(newestFirst);
  }
  const { data, error } = await supabase.from("trips").select("id,data").eq("user_id", scope);
  if (error) throw cloudError("abrir o planeador", error);
  return data
    .map((r) => normalizeTrip({ ...(r.data as unknown as TripInput), id: r.id }))
    .sort(newestFirst);
}

async function fetchTrip(scope: Scope, id: string): Promise<TripPlan> {
  if (!isCloud(scope)) {
    const t = await localDB.get<TripInput>("trips", id);
    if (!t) throw new Error("Viagem não encontrada.");
    return normalizeTrip(t);
  }
  const { data, error } = await supabase.from("trips").select("id,data").eq("id", id).single();
  if (error) throw cloudError("abrir a viagem", error);
  return normalizeTrip({ ...(data.data as unknown as TripInput), id: data.id });
}

export async function saveTripTo(scope: Scope, t: TripPlan): Promise<TripPlan> {
  if (!isCloud(scope)) return localDB.put("trips", t);
  const { id, ...rest } = t;
  const { error } = await supabase
    .from("trips")
    .upsert({ id, data: rest as unknown as Json, updated_at: new Date().toISOString() });
  if (error) throw cloudError("guardar a viagem", error);
  return t;
}

// Trip changes are read-modify-write, so run them one at a time to never lose an update.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

export const tripsQuery = (scope: Scope) =>
  queryOptions({ queryKey: ["trips", scope], queryFn: () => fetchTrips(scope) });

export function useTrips() {
  const { scope, ready } = useAuth();
  return useQuery({ ...tripsQuery(scope), enabled: ready });
}

export function useTripMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ["trips"] });
  return {
    /** Creates a trip, or replaces one entirely. */
    saveTrip: useMutation({
      mutationFn: async (t: TripInput) =>
        serial(async () => saveTripTo(await currentScope(), normalizeTrip(t))),
      onSuccess,
    }),
    /** Applies a change to the latest stored version of a trip. */
    updateTrip: useMutation({
      mutationFn: async ({ id, change }: { id: string; change: (t: TripPlan) => TripPlan }) =>
        serial(async () => {
          const scope = await currentScope();
          return saveTripTo(scope, normalizeTrip(change(await fetchTrip(scope, id))));
        }),
      onSuccess,
    }),
    deleteTrip: useMutation({
      mutationFn: async (id: string) =>
        serial(async () => {
          const scope = await currentScope();
          if (!isCloud(scope)) return localDB.remove("trips", id);
          const { error } = await supabase.from("trips").delete().eq("id", id);
          if (error) throw cloudError("apagar a viagem", error);
        }),
      onSuccess,
    }),
  };
}

/** Pure trip edits, passed to `updateTrip`. */
export const tripOps = {
  addDay: (day: Omit<ItineraryDay, "id">) => (t: TripPlan) => ({
    ...t,
    days: [...t.days, { ...day, id: shortId("day") }],
  }),
  removeDay: (id: string) => (t: TripPlan) => ({ ...t, days: t.days.filter((d) => d.id !== id) }),
  addExpense: (e: Omit<TripExpense, "id">) => (t: TripPlan) => ({
    ...t,
    expenses: [{ ...e, id: shortId("exp") }, ...t.expenses],
  }),
  removeExpense: (id: string) => (t: TripPlan) => ({
    ...t,
    expenses: t.expenses.filter((e) => e.id !== id),
  }),
  addReservation: (r: Omit<TripReservation, "id">) => (t: TripPlan) => ({
    ...t,
    reservations: [...t.reservations, { ...r, id: shortId("res") }],
  }),
  removeReservation: (id: string) => (t: TripPlan) => ({
    ...t,
    reservations: t.reservations.filter((r) => r.id !== id),
  }),
  /** Adds items, skipping names already on the list. */
  addPacking: (items: Omit<PackingItem, "id">[]) => (t: TripPlan) => {
    const have = new Set(t.packing_list.map((i) => i.name.trim().toLowerCase()));
    const fresh = items.filter((i) => !have.has(i.name.trim().toLowerCase()));
    return {
      ...t,
      packing_list: [...t.packing_list, ...fresh.map((i) => ({ ...i, id: shortId("pack") }))],
    };
  },
  togglePacking: (id: string) => (t: TripPlan) => ({
    ...t,
    packing_list: t.packing_list.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i)),
  }),
  removePacking: (id: string) => (t: TripPlan) => ({
    ...t,
    packing_list: t.packing_list.filter((i) => i.id !== id),
  }),
  set: (fields: Partial<Omit<TripPlan, "id">>) => (t: TripPlan) => ({ ...t, ...fields }),
};

/** Every photo key a trip refers to. */
export const tripPhotos = (t: TripPlan) => t.days.flatMap((d) => (d.photo ? [d.photo] : []));
