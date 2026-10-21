// Server-only helpers for the AI features: who is asking, and which AI service answers.
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig, supabaseFetch } from "@/lib/supabase";

/** Id of the signed-in user making this request, or null. */
export async function requestUserId(): Promise<string | null> {
  const auth = getRequest()?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.split(".").length !== 3) return null;
  const { url, key } = supabaseConfig();
  const sb = createClient(url, key, {
    global: { fetch: supabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  return error ? null : (data?.claims.sub ?? null);
}

/**
 * Paid AI keys are only spent for signed-in users, so a published copy of the app can't be used
 * by strangers to run up the bill. In development (`npm run dev`) local mode can use them too.
 */
export async function mayUsePaidAI(): Promise<boolean> {
  if (process.env["NODE_ENV"] !== "production") return true;
  return (await requestUserId()) !== null;
}

export type AIRequest = {
  system: string;
  prompt: string;
  /** JPEG/PNG/WebP data URLs; only sent to services that read images. */
  images?: string[];
  /** The prompt for services that don't receive the images (it must not mention them). */
  textPrompt?: string;
  json?: boolean;
  /** Allow the free public service (text only) when no paid key answers. */
  allowFree: boolean;
  allowPaid: boolean;
};

const TIMEOUT = 30_000;

function splitDataUrl(url: string) {
  const [head = "", data = ""] = url.split(",");
  return { mime: head.slice(5, head.indexOf(";")), data };
}

const wait = (ms: number) => new Promise((s) => setTimeout(s, ms));

/** Gemini answers 503/429 when busy; those are retried twice with a short pause. */
async function gemini(key: string, r: AIRequest, tries = 3): Promise<string | null> {
  const model = process.env["GEMINI_MODEL"] || "gemini-flash-latest";
  const parts: unknown[] = [{ text: r.prompt }];
  for (const img of r.images ?? []) {
    const { mime, data } = splitDataUrl(img);
    parts.push({ inline_data: { mime_type: mime, data } });
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: r.system }] },
        contents: [{ role: "user", parts }],
        ...(r.json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    },
  );
  if ((res.status === 503 || res.status === 429) && tries > 1) {
    await wait(2500);
    return gemini(key, r, tries - 1);
  }
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const j = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") || null;
}

async function openaiCompatible(
  url: string,
  key: string,
  model: string,
  r: AIRequest,
  withImages: boolean,
): Promise<string | null> {
  const content = withImages
    ? [
        { type: "text", text: r.prompt },
        ...(r.images ?? []).map((u) => ({ type: "image_url", image_url: { url: u } })),
      ]
    : (r.textPrompt ?? r.prompt);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [
        { role: "system", content: r.system },
        { role: "user", content },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content?.trim() || null;
}

/** The free service allows one request every few seconds per server; when busy, wait and retry once. */
async function pollinations(r: AIRequest, retry = true): Promise<string | null> {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: r.system },
        { role: "user", content: r.textPrompt ?? r.prompt },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if ((res.status === 402 || res.status === 429) && retry) {
    await wait(6000);
    return pollinations(r, false);
  }
  if (!res.ok) throw new Error(`Pollinations ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const t = (await res.text()).trim();
  return t.length > 30 && !/free limit|please wait/i.test(t) ? t : null;
}

/** Asks the configured AI services in turn; null when none answers. */
export async function complete(r: AIRequest): Promise<string | null> {
  const attempts: [string, () => Promise<string | null>][] = [];
  const env = (k: string) => process.env[k];
  if (r.allowPaid) {
    const g = env("GEMINI_API_KEY");
    const o = env("OPENAI_API_KEY");
    const q = env("GROQ_API_KEY");
    if (g) attempts.push(["Gemini", () => gemini(g, r)]);
    if (o) {
      const model = env("OPENAI_MODEL") || "gpt-4o-mini";
      attempts.push([
        "OpenAI",
        () => openaiCompatible("https://api.openai.com/v1/chat/completions", o, model, r, true),
      ]);
    }
    if (q) {
      const model = env("GROQ_MODEL") || "llama-3.3-70b-versatile";
      attempts.push([
        "Groq",
        () =>
          openaiCompatible("https://api.groq.com/openai/v1/chat/completions", q, model, r, false),
      ]);
    }
  }
  if (r.allowFree) attempts.push(["Pollinations", () => pollinations(r)]);

  for (const [name, call] of attempts) {
    try {
      const out = await call();
      if (out) return out;
    } catch (e) {
      console.warn(`${name} falhou:`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}
