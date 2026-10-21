import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  PHOTO_DATA_URL,
  STOPS_SYSTEM,
  STORY_SYSTEM,
  cleanStory,
  parseStops,
  stopsPrompt,
  storyPrompt,
  templateStops,
  templateStory,
} from "@/lib/ai-text";
import { complete, mayUsePaidAI } from "@/lib/ai.server";

export type AISource = "ai" | "template";

/** Drafts a memory story (pt-PT) from title, place, notes and up to 4 small photos. */
export const writeStory = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        title: z.string().max(200),
        place: z.string().max(200),
        date: z.string().max(20),
        notes: z.string().max(4000),
        photos: z.array(z.string().max(400_000).regex(PHOTO_DATA_URL)).max(4),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<{ text: string; source: AISource }> => {
    const allowPaid = await mayUsePaidAI();
    const out = await complete({
      system: STORY_SYSTEM,
      prompt: storyPrompt(data, allowPaid ? data.photos.length : 0),
      textPrompt: storyPrompt(data, 0),
      images: data.photos,
      allowPaid,
      allowFree: true,
    });
    return out
      ? { text: cleanStory(out, data.title), source: "ai" }
      : { text: templateStory(data), source: "template" };
  });

/** Suggests three itinerary stops for a trip. */
export const suggestStops = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        destination: z.string().min(1).max(200),
        title: z.string().max(200),
        dates: z.string().max(100),
        existing: z.array(z.string().max(200)).max(60),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const out = await complete({
      system: STOPS_SYSTEM,
      prompt: stopsPrompt(data),
      json: true,
      allowPaid: await mayUsePaidAI(),
      allowFree: true,
    });
    const stops = out ? parseStops(out) : null;
    if (out && !stops) console.warn("Resposta da IA sem paragens válidas:", out.slice(0, 300));
    return stops
      ? { stops, source: "ai" as AISource }
      : { stops: templateStops(data.destination), source: "template" as AISource };
  });
