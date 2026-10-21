// Photo book layout: formats, themes and the "assistant" that lays memories out on pages.
// Pure functions, so the rules can be tested without a browser.
import type { Memory } from "@/lib/types";

/** Print sizes in millimetres, like the common photo-book formats. */
export const FORMATS = {
  sq21: { label: "Quadrado", size: "21 × 21 cm", w: 210, h: 210 },
  sq30: { label: "Quadrado XL", size: "30 × 30 cm", w: 300, h: 300 },
  land: { label: "Horizontal", size: "28 × 21 cm", w: 280, h: 210 },
  port: { label: "Vertical", size: "21 × 28 cm", w: 210, h: 280 },
  pano: { label: "Panorâmico", size: "39 × 29 cm", w: 390, h: 290 },
} as const;
export type FormatId = keyof typeof FORMATS;

export const THEMES = {
  classico: {
    label: "Clássico",
    hint: "Papel marfim, títulos em itálico",
    paper: "#fbf9f5",
    ink: "#1f2a33",
    muted: "#6b7782",
    accent: "#386a86",
    display: "font-display italic",
  },
  galeria: {
    label: "Galeria",
    hint: "Fundo escuro que faz brilhar as fotos",
    paper: "#1c2126",
    ink: "#eef3f6",
    muted: "#9aa7b1",
    accent: "#add3d7",
    display: "font-display",
  },
  minimal: {
    label: "Minimal",
    hint: "Branco, muito espaço, letra simples",
    paper: "#ffffff",
    ink: "#1b2832",
    muted: "#7c8a94",
    accent: "#2f6050",
    display: "font-sans font-light tracking-tight",
  },
} as const;
export type ThemeId = keyof typeof THEMES;

/** Ways to place the photos of one page. */
export const PHOTO_LAYOUTS = {
  1: ["full", "framed"],
  2: ["duo", "duo-stack", "duo-offset"],
  3: ["trio", "trio-row"],
  4: ["quad", "quad-mosaic"],
} as const;
export type PhotoLayout = (typeof PHOTO_LAYOUTS)[1 | 2 | 3 | 4][number];

export type Page =
  | { kind: "title" }
  | { kind: "contents" }
  | { kind: "chapter"; key: string; name: string; items: Memory[] }
  | {
      kind: "opener";
      key: string;
      m: Memory;
      photo?: string | undefined;
      /** split: photo beside the text · top: photo above · overlay: full page with a text band. */
      layout: OpenerLayout;
    }
  | { kind: "story"; key: string; m: Memory }
  | { kind: "photos"; key: string; m: Memory; photos: string[]; layout: PhotoLayout }
  | { kind: "spread"; key: string; m: Memory; photo: string; side: "left" | "right" }
  | { kind: "blank"; key: string }
  | { kind: "end" };

export type OpenerLayout = "split" | "top" | "overlay";

/** Natural size of a photo, in pixels. */
export type PhotoInfo = { w: number; h: number };

export type BookOptions = {
  chapters: boolean;
  /** Use a photo across two facing pages when it is wide enough. */
  spreads: boolean;
  /** A different starting point gives a different mix of layouts. */
  seed: number;
};

const ratio = (info?: PhotoInfo) => (info ? info.w / info.h : 1);
export const isWide = (info?: PhotoInfo) => ratio(info) >= 1.55;
const isLandscape = (info?: PhotoInfo) => ratio(info) > 1.15;

/** Splits n photos into page groups of 1–4 that read well (5 → 3+2, 6 → 3+3, 7 → 4+3…). */
export function chunkSizes(n: number): number[] {
  const out: number[] = [];
  let left = n;
  while (left > 0) {
    const take = left === 5 || left === 6 ? 3 : Math.min(4, left);
    out.push(take);
    left -= take;
  }
  return out;
}

/** The layout the assistant picks for a group of photos, before any change by hand. */
function autoLayout(photos: string[], info: Record<string, PhotoInfo>, n: number): PhotoLayout {
  const options = PHOTO_LAYOUTS[photos.length as 1 | 2 | 3 | 4];
  if (photos.length === 2) {
    // Two landscape photos sit better one above the other.
    if (photos.every((p) => isLandscape(info[p]))) return "duo-stack";
    return n % 3 === 2 ? "duo-offset" : "duo";
  }
  return options[n % options.length]!;
}

/**
 * Lays the memories out. Page 1 is a right-hand page (the title page), so even page numbers are
 * on the left; a photo across two pages (a spread) must start on a left page.
 */
export function buildBook(
  ms: Memory[],
  info: Record<string, PhotoInfo>,
  opts: BookOptions,
  overrides: Record<string, PhotoLayout> = {},
): Page[] {
  const pages: Page[] = [{ kind: "title" }];
  if (ms.length > 1) pages.push({ kind: "contents" });
  const nextIsLeft = () => (pages.length + 1) % 2 === 0;

  const groups: [string, Memory[]][] = [];
  for (const m of ms) {
    const key = m.trip?.trim() || m.date.slice(0, 4);
    const g = groups.find(([k]) => k === key);
    if (g) g[1].push(m);
    else groups.push([key, [m]]);
  }

  let n = opts.seed;
  for (const [name, items] of groups) {
    if (opts.chapters) pages.push({ kind: "chapter", key: `ch:${name}`, name, items });
    for (const m of items) {
      const [hero, ...rest] = m.photos;
      // Portrait photos sit beside the text; landscape ones above it or across the page.
      const layout: OpenerLayout =
        hero && isLandscape(info[hero]) ? (n % 2 ? "overlay" : "top") : "split";
      n++;
      pages.push({ kind: "opener", key: `op:${m.id}`, m, photo: hero, layout });
      // Long stories get a page of their own instead of being cut short on the opener.
      if (m.text.length > 420) pages.push({ kind: "story", key: `st:${m.id}`, m });

      let queue = [...rest];
      let group = 0;
      while (queue.length) {
        const wide = queue.find((p) => isWide(info[p]));
        if (opts.spreads && wide && nextIsLeft()) {
          queue = queue.filter((p) => p !== wide);
          pages.push({ kind: "spread", key: `sp:${m.id}:${wide}`, m, photo: wide, side: "left" });
          pages.push({
            kind: "spread",
            key: `sp:${m.id}:${wide}:r`,
            m,
            photo: wide,
            side: "right",
          });
          continue;
        }
        // A wide photo waiting for a left page: lay out the other photos first, so the
        // spread lands on the next left page instead of being squeezed into a collage.
        const waiting = opts.spreads && wide && queue.some((p) => !isWide(info[p]));
        const pool = waiting ? queue.filter((p) => !isWide(info[p])) : queue;
        const size = chunkSizes(pool.length)[0]!;
        const photos = pool.slice(0, size);
        queue = queue.filter((p) => !photos.includes(p));
        const key = `ph:${m.id}:${group++}`;
        pages.push({
          kind: "photos",
          key,
          m,
          photos,
          layout: overrides[key] ?? autoLayout(photos, info, n++),
        });
      }
    }
  }

  // A printed book has an even number of pages: close with the end page on the left if needed.
  if (pages.length % 2 === 0) pages.push({ kind: "blank", key: "blank:end" });
  pages.push({ kind: "end" });
  return pages;
}

/** The next layout for a page when "Trocar esquema" is pressed. */
export function nextLayout(page: Extract<Page, { kind: "photos" }>): PhotoLayout {
  const options = PHOTO_LAYOUTS[page.photos.length as 1 | 2 | 3 | 4] as readonly PhotoLayout[];
  return options[(options.indexOf(page.layout) + 1) % options.length]!;
}

/** Approximate size of each photo box on a page, in millimetres (for the print quality check). */
export function slotSizes(
  layout: PhotoLayout | "spread" | OpenerLayout,
  page: { w: number; h: number },
  margin: boolean,
): { w: number; h: number }[] {
  const m = margin ? 14 : 0;
  const g = 3;
  const W = page.w - 2 * m;
  const H = page.h - 2 * m;
  switch (layout) {
    case "spread":
      return [{ w: page.w * 2, h: page.h }];
    case "full":
      return [{ w: page.w, h: page.h }];
    case "framed":
      return [{ w: page.w * 0.78, h: page.h * 0.66 }];
    case "split":
      return [{ w: page.w * 0.56, h: page.h }];
    case "top":
      return [{ w: page.w, h: page.h * 0.58 }];
    case "overlay":
      return [{ w: page.w, h: page.h }];
    case "duo":
    case "duo-offset":
      return [0, 1].map(() => ({ w: (W - g) / 2, h: H }));
    case "duo-stack":
      return [0, 1].map(() => ({ w: W, h: (H - g) / 2 }));
    case "trio":
      return [{ w: W * 0.62, h: H }, ...[0, 1].map(() => ({ w: W * 0.38 - g, h: (H - g) / 2 }))];
    case "trio-row":
      return [0, 1, 2].map(() => ({ w: (W - 2 * g) / 3, h: H }));
    case "quad":
    case "quad-mosaic":
      return [0, 1, 2, 3].map(() => ({ w: (W - g) / 2, h: (H - g) / 2 }));
  }
}

/** Print resolution of a photo filling a box (cropped to cover it), in dots per inch. */
export function dpi(photo: PhotoInfo, box: { w: number; h: number }): number {
  return Math.round(Math.min(photo.w / (box.w / 25.4), photo.h / (box.h / 25.4)));
}

/** Below this the print may look soft; photo labs usually ask for 150–300 dpi. */
export const MIN_DPI = 150;

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
/** "março 2024" */
export const monthYear = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
