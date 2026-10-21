/**
 * The message of a thrown value, or `fallback` when it has none — or when it is a technical
 * validation report (a JSON list of issues), which means nothing to the person reading it.
 */
export function errorMessage(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message.trim() : "";
  if (!msg || msg.startsWith("[") || msg.startsWith("{")) return fallback;
  return msg;
}
