import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { currentScope, isCloud, useAuth, type Scope } from "@/hooks/use-auth";
import { cloudError } from "@/lib/cloud";
import { localDB } from "@/lib/local-db";
import type { Wish, WishInput } from "@/lib/types";

export type { Wish };

export async function fetchWishes(scope: Scope): Promise<Wish[]> {
  if (!isCloud(scope)) return localDB.getAll<Wish>("wishes");
  const { data, error } = await supabase
    .from("wishes")
    .select("id,place,note,lat,lng,done,when_text,priority")
    .order("created_at", { ascending: false });
  if (error) throw cloudError("abrir a lista de desejos", error);
  return data as Wish[];
}

export const wishesQuery = (scope: Scope) =>
  queryOptions({ queryKey: ["wishes", scope], queryFn: () => fetchWishes(scope) });

export function useWishes() {
  const { scope, ready } = useAuth();
  return useQuery({ ...wishesQuery(scope), enabled: ready });
}

/** Inserts or replaces a wish (keeps `id` when given). */
export async function saveWishTo(scope: Scope, w: Wish): Promise<void> {
  if (!isCloud(scope)) {
    await localDB.put("wishes", w);
    return;
  }
  const { error } = await supabase.from("wishes").upsert(w);
  if (error) throw cloudError("guardar o desejo", error);
}

export function useWishMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["wishes"] });
  return {
    add: useMutation({
      mutationFn: async (w: WishInput) =>
        saveWishTo(await currentScope(), { ...w, id: crypto.randomUUID(), done: false }),
      onSuccess: done,
    }),
    edit: useMutation({
      mutationFn: async (w: Wish) => saveWishTo(await currentScope(), w),
      onSuccess: done,
    }),
    toggle: useMutation({
      mutationFn: async (w: Wish) => saveWishTo(await currentScope(), { ...w, done: !w.done }),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const scope = await currentScope();
        if (!isCloud(scope)) return localDB.remove("wishes", id);
        const { error } = await supabase.from("wishes").delete().eq("id", id);
        if (error) throw cloudError("apagar o desejo", error);
      },
      onSuccess: done,
    }),
  };
}
