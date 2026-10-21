type DbError = { message: string; code?: string | undefined };

/** Turns a Supabase error into a message the person can act on. */
export function cloudError(action: string, error: DbError): Error {
  if (error.code === "PGRST205" || error.code === "42P01") {
    return new Error(
      `Não foi possível ${action}: a tabela ainda não existe na nuvem. Aplica as migrações em drizzle/migrations.`,
    );
  }
  if (error.message.toLowerCase().includes("failed to fetch")) {
    return new Error(`Não foi possível ${action}: sem ligação à internet.`);
  }
  return new Error(`Não foi possível ${action}: ${error.message}`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

/** A UUID derived from any id, so re-importing the same backup updates rows instead of duplicating them. */
export async function toUuid(id: string): Promise<string> {
  if (isUuid(id)) return id.toLowerCase();
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id)));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
