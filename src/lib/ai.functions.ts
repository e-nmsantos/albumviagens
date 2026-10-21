import { createServerFn } from "@tanstack/react-start";
import {
  STOPS_SYSTEM,
  STORY_SYSTEM,
  cleanStory,
  parseStops,
  stopsInputSchema,
  stopsPrompt,
  storyInputSchema,
  storyPrompt,
  templateStops,
  templateStory,
} from "@/lib/ai-text";
import { complete, mayUsePaidAI } from "@/lib/ai.server";

export type AISource = "ai" | "template";

/** Drafts a memory story (pt-PT) from title, place, notes and up to 4 small photos. */
export const writeStory = createServerFn({ method: "POST" })
  .inputValidator((i) => storyInputSchema.parse(i))
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
  .inputValidator((i) => stopsInputSchema.parse(i))
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
