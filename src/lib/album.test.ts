import { describe, expect, it } from "vitest";
import { buildBook, chunkSizes, dpi, nextLayout, type Page, type PhotoInfo } from "@/lib/album";
import type { Memory } from "@/lib/types";

const memory = (id: string, photos: string[], text = ""): Memory => ({
  id,
  user_id: "local",
  title: `Memória ${id}`,
  place: "Lisboa, Portugal",
  date: `2024-0${id}-01`,
  text,
  photos,
  lat: null,
  lng: null,
  trip: null,
  is_public: false,
});
const opts = { chapters: false, spreads: true, seed: 0 };
const kinds = (pages: Page[]) => pages.map((p) => p.kind);

describe("album layout", () => {
  it("groups photos into pages of one to four that read well", () => {
    expect(chunkSizes(1)).toEqual([1]);
    expect(chunkSizes(4)).toEqual([4]);
    expect(chunkSizes(5)).toEqual([3, 2]);
    expect(chunkSizes(6)).toEqual([3, 3]);
    expect(chunkSizes(7)).toEqual([4, 3]);
    expect(chunkSizes(9)).toEqual([4, 3, 2]);
  });

  it("always has an even number of pages, ending with the closing page", () => {
    for (const n of [0, 1, 2, 3, 6]) {
      const photos = Array.from({ length: n }, (_, i) => `p${i}`);
      const pages = buildBook([memory("1", photos)], {}, opts);
      expect(pages.length % 2).toBe(0);
      expect(pages[0]!.kind).toBe("title");
      expect(pages[pages.length - 1]!.kind).toBe("end");
    }
  });

  it("puts a wide photo across two facing pages, starting on a left page", () => {
    const info: Record<string, PhotoInfo> = { wide: { w: 4000, h: 2000 }, a: { w: 3000, h: 4000 } };
    const pages = buildBook([memory("1", ["hero", "a", "wide"])], info, opts);
    const at = pages.findIndex((p) => p.kind === "spread");
    expect(at).toBeGreaterThan(-1);
    expect((at + 1) % 2).toBe(0); // page numbers start at 1; even numbers are left pages
    expect(pages[at + 1]).toMatchObject({ kind: "spread", side: "right" });
    expect(
      buildBook([memory("1", ["hero", "a", "wide"])], info, { ...opts, spreads: false }).some(
        (p) => p.kind === "spread",
      ),
    ).toBe(false);
  });

  it("gives long stories their own page", () => {
    const pages = buildBook([memory("1", ["hero"], "x".repeat(600))], {}, opts);
    expect(kinds(pages)).toContain("story");
  });

  it("lets a page's layout be changed by hand", () => {
    const pages = buildBook([memory("1", ["hero", "a", "b"])], {}, opts);
    const page = pages.find((p): p is Extract<Page, { kind: "photos" }> => p.kind === "photos")!;
    const next = nextLayout(page);
    expect(next).not.toBe(page.layout);
    const again = buildBook([memory("1", ["hero", "a", "b"])], {}, opts, { [page.key]: next });
    expect(again.find((p) => p.kind === "photos")).toMatchObject({ layout: next });
  });

  it("measures print resolution of a photo filling a box", () => {
    // 3000 px across 300 mm (11.8 in) ≈ 254 dpi
    expect(dpi({ w: 3000, h: 3000 }, { w: 300, h: 300 })).toBe(254);
    // a 1600 px photo on the same page is too soft
    expect(dpi({ w: 1600, h: 1200 }, { w: 300, h: 300 })).toBeLessThan(150);
  });
});
