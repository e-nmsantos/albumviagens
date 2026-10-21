import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Supabase's new `sb_publishable_…` keys are not JWTs: they go in the `apikey` header and must
 * never be sent as `Authorization: Bearer`, which supabase-js does by default.
 */
export function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** URL and public key: from the Vite build in the browser, from the environment on the server. */
export function supabaseConfig() {
  const env = typeof process === "undefined" ? {} : process.env;
  const url = import.meta.env["VITE_SUPABASE_URL"] || env["SUPABASE_URL"];
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ficheiro .env (vê .env.example).",
    );
  }
  return { url: url as string, key: key as string };
}

function create() {
  const { url, key } = supabaseConfig();
  return createClient<Database>(url, key, {
    global: { fetch: supabaseFetch(key) },
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

let client: ReturnType<typeof create> | undefined;

/** The browser's Supabase client, created on first use. */
export const supabase = new Proxy({} as ReturnType<typeof create>, {
  get(_, prop, receiver) {
    client ??= create();
    return Reflect.get(client, prop, receiver);
  },
});
