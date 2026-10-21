// Prompts and parsing for the AI features. Pure functions, shared by the server and the tests.
import { z } from "zod";

export type StoryInput = { title: string; place: string; date: string; notes: string };

export const STORY_SYSTEM =
  "És um escritor de diários de viagem. Escreves na primeira pessoa, em português de Portugal natural.\n" +
  "Regras:\n" +
  "- Adapta o tom ao tema (Erasmus: jovem e descontraído; aventura: enérgico; praia: relaxado).\n" +
  "- Usa só o que as notas e as fotos mostram, mais factos gerais e verdadeiros sobre o lugar.\n" +
  "- Nunca inventes nomes de pessoas nem acontecimentos concretos que não estejam nas notas ou nas fotos.\n" +
  "- Entre 80 e 130 palavras, um único parágrafo.\n" +
  "- Devolve apenas o parágrafo, sem título nem aspas.";

export function storyPrompt(s: StoryInput, photoCount: number) {
  return [
    `Lugar: ${s.place || "não indicado"}`,
    `Título da memória: ${s.title || "sem título"}`,
    `Data: ${s.date || "não indicada"}`,
    `Notas: ${s.notes || "sem notas"}`,
    photoCount ? `Junto ${photoCount} foto(s) desta memória; descreve o que se vê nelas.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Strips stray leading punctuation, wrapping quotes and a repeated title from a model's answer. */
export function cleanStory(text: string, title?: string): string {
  let t = text.trim().replace(/^[^\p{L}"“]+/u, "");
  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim();
  if (title && t.toLowerCase().startsWith(title.toLowerCase())) {
    t = t
      .slice(title.length)
      .replace(/^[\s:\-–—]+/, "")
      .trim();
  }
  return t;
}

/** Plain draft used when no AI service answers. It only restates what the person wrote. */
export function templateStory(s: StoryInput): string {
  const place = s.place.split(",")[0]?.trim() || "este lugar";
  const notes = s.notes.trim().replace(/[.!?]+$/, "");
  return [
    `${s.title.trim() || "Este dia"} em ${place}.`,
    notes ? `${notes}.` : "",
    "Escreve aqui o que viste, provaste e sentiste — os pormenores que queres lembrar daqui a uns anos.",
  ]
    .filter(Boolean)
    .join(" ");
}

export type StopsInput = { destination: string; title: string; dates: string; existing: string[] };

export const STOPS_SYSTEM =
  "És um guia de viagens experiente. Respondes só com JSON válido, sem texto à volta, em português de Portugal.";

export function stopsPrompt(s: StopsInput) {
  return [
    `Destino: ${s.destination}`,
    `Viagem: ${s.title}${s.dates ? ` (${s.dates})` : ""}`,
    s.existing.length ? `Já planeado (não repetir): ${s.existing.join("; ")}` : "",
    'Sugere 3 paragens reais e concretas para este destino. Devolve um array JSON: [{"title": "...", "time": "HH:MM", "place": "nome do lugar, cidade, país", "notes": "uma frase com uma dica útil"}]',
  ]
    .filter(Boolean)
    .join("\n");
}

const stopSchema = z.object({
  title: z.string().min(1).max(120),
  time: z.string().max(20).catch("10:00"),
  place: z.string().min(1).max(200),
  notes: z.string().max(400).catch(""),
});
export type Stop = z.infer<typeof stopSchema>;

/** Objects in a JSON array; when the JSON is broken (models sometimes drop a brace), the fields are read one by one. */
function rawObjects(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) {
    try {
      const raw: unknown = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(raw)) return raw;
    } catch {
      /* fall through to the lenient reading below */
    }
  }
  return text
    .split("{")
    .slice(1)
    .map((chunk) => {
      const obj: Record<string, string> = {};
      for (const m of chunk.matchAll(/"(title|time|place|notes)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
        try {
          obj[m[1]!] = JSON.parse(`"${m[2]}"`) as string;
        } catch {
          obj[m[1]!] = m[2]!;
        }
      }
      return obj;
    });
}

/** Reads the stops out of a model's answer; null when it isn't usable. */
export function parseStops(text: string): Stop[] | null {
  const stops = rawObjects(text).flatMap((r) => {
    const p = stopSchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
  return stops.length ? stops.slice(0, 5) : null;
}

/** Generic ideas used when no AI service answers. */
export function templateStops(destination: string): Stop[] {
  return [
    {
      title: "Mercado local e gastronomia",
      time: "09:30",
      place: destination,
      notes: "Provar os sabores típicos e ver o artesanato da região.",
    },
    {
      title: "Miradouro",
      time: "17:30",
      place: destination,
      notes: "Procurar o melhor ponto de vista para o pôr do sol.",
    },
    {
      title: "Passeio pelo centro histórico",
      time: "20:00",
      place: destination,
      notes: "Jantar num restaurante local e caminhar sem pressa.",
    },
  ];
}

export const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** Longest notes sent to the AI; longer stories are cut before sending. */
export const MAX_NOTES = 4000;

/** What the story writer accepts. `date` is the date as written for people ("junho de 2025"). */
export const storyInputSchema = z.object({
  title: z.string().max(200),
  place: z.string().max(200),
  date: z.string().max(60),
  notes: z.string().max(MAX_NOTES),
  photos: z.array(z.string().max(400_000).regex(PHOTO_DATA_URL)).max(4),
});

/** What the itinerary suggester accepts. */
export const stopsInputSchema = z.object({
  destination: z.string().min(1).max(200),
  title: z.string().max(200),
  dates: z.string().max(100),
  existing: z.array(z.string().max(200)).max(60),
});
