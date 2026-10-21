import { describe, expect, it } from "vitest";
import {
  MAX_NOTES,
  PHOTO_DATA_URL,
  cleanStory,
  parseStops,
  storyInputSchema,
  templateStory,
} from "@/lib/ai-text";
import { errorMessage } from "@/lib/errors";

describe("AI text helpers", () => {
  it("cleans quotes and a repeated title from a story", () => {
    expect(cleanStory('"Sintra: um dia de nevoeiro."', "Sintra")).toBe("um dia de nevoeiro.");
    expect(cleanStory(". O sol começa a mergulhar.")).toBe("O sol começa a mergulhar.");
  });

  it("reads the stops array even with text around it", () => {
    const out =
      'Claro!\n[{"title":"Templo","time":"09:00","place":"Quioto, Japão","notes":"Ir cedo."},{"bad":1}]';
    expect(parseStops(out)).toEqual([
      { title: "Templo", time: "09:00", place: "Quioto, Japão", notes: "Ir cedo." },
    ]);
    // A real answer from the free service, missing the last closing brace.
    const broken =
      '[{"title":"A","time":"10:00","place":"Ubud, Indonésia","notes":"x"},\n{"title":"B","time":"19:00","place":"Etl, Ubud","notes":"Peça \\"Babi\\" kecap"\n]';
    expect(parseStops(broken)?.map((s) => s.title)).toEqual(["A", "B"]);
    expect(parseStops(broken)?.[1]?.notes).toBe('Peça "Babi" kecap');
    expect(parseStops("sem json")).toBeNull();
    expect(parseStops("[]")).toBeNull();
  });

  it("builds a draft only from what the person wrote", () => {
    const t = templateStory({
      title: "Pôr do sol",
      place: "Lisboa, Portugal",
      date: "",
      notes: "Vimos o Tejo.",
    });
    expect(t).toContain("Pôr do sol em Lisboa.");
    expect(t).toContain("Vimos o Tejo.");
  });

  it("accepts only image data URLs as photos", () => {
    expect(PHOTO_DATA_URL.test("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    expect(PHOTO_DATA_URL.test("https://example.com/a.jpg")).toBe(false);
  });
});

describe("what the AI accepts", () => {
  const story = { title: "Fim de tarde", place: "Nazaré, Portugal", notes: "", photos: [] };

  it("accepts dates written for people, with or without the day", () => {
    expect(storyInputSchema.safeParse({ ...story, date: "12 de setembro de 2025" }).success).toBe(
      true,
    );
    expect(storyInputSchema.safeParse({ ...story, date: "setembro de 2025" }).success).toBe(true);
  });

  it("refuses notes longer than the limit (the form cuts them first)", () => {
    expect(
      storyInputSchema.safeParse({ ...story, date: "", notes: "x".repeat(MAX_NOTES + 1) }).success,
    ).toBe(false);
  });
});

describe("error messages", () => {
  it("hides technical validation reports behind a plain message", () => {
    const zod = new Error('[{"code":"too_big","maximum":20,"path":["date"]}]');
    expect(errorMessage(zod, "Não foi possível escrever o texto.")).toBe(
      "Não foi possível escrever o texto.",
    );
    expect(errorMessage(new Error("Sem ligação à internet."), "x")).toBe("Sem ligação à internet.");
  });
});
