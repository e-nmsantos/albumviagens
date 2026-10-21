import { describe, expect, it } from "vitest";
import { PHOTO_DATA_URL, cleanStory, parseStops, templateStory } from "@/lib/ai-text";

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
