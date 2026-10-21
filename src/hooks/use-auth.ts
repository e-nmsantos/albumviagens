import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Where data lives: "local" (this browser) or the signed-in user's id (Supabase). */
export type Scope = string;
export const LOCAL_SCOPE: Scope = "local";

type AuthState = { user: User | null; ready: boolean };

const SERVER_STATE: AuthState = { user: null, ready: false };
let state: AuthState = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function set(next: AuthState) {
  if (next.ready === state.ready && next.user === state.user) return;
  state = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  supabase.auth
    .getSession()
    .then(({ data }) => set({ user: data.session?.user ?? null, ready: true }))
    .catch(() => set({ user: null, ready: true }));
  supabase.auth.onAuthStateChange((_event, session) =>
    set({ user: session?.user ?? null, ready: true }),
  );
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The signed-in Supabase user, or null in local mode. `ready` is false until the session is read. */
export function useAuth() {
  const s = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
  return { user: s.user, ready: s.ready, scope: s.user?.id ?? LOCAL_SCOPE };
}

/** Scope for the current session, read fresh (used by mutations). */
export async function currentScope(): Promise<Scope> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? LOCAL_SCOPE;
}

export const isCloud = (scope: Scope) => scope !== LOCAL_SCOPE;
