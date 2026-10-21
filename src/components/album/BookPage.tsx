import type { CSSProperties, ReactNode } from "react";
import { THEMES, monthYear, type Page, type ThemeId } from "@/lib/album";
import { countryOf, formatDate, totalKm, type Memory } from "@/lib/memories";
import { placeAndCountry } from "@/lib/countries";

export type BookContext = {
  theme: ThemeId;
  w: number;
  h: number;
  /** Photos keep a white (or dark) border instead of reaching the page edge. */
  margin: boolean;
  captions: boolean;
  /** Extra millimetres around each page for the print shop to trim. */
  bleed: number;
  urls: Record<string, string>;
  title: string;
  subtitle: string;
  dedication: string;
  ms: Memory[];
  pages: Page[];
};

/** A page at its real printed size (plus bleed), in the book's theme. */
export function Sheet({
  ctx,
  children,
  folio,
}: {
  ctx: BookContext;
  children: ReactNode;
  folio?: number | undefined;
}) {
  const t = THEMES[ctx.theme];
  const b = ctx.bleed;
  const style = {
    width: `${ctx.w + 2 * b}mm`,
    height: `${ctx.h + 2 * b}mm`,
    background: t.paper,
    color: t.ink,
    "--paper": t.paper,
    "--ink": t.ink,
    "--muted": t.muted,
    "--accent": t.accent,
    "--bleed": `${b}mm`,
  } as CSSProperties;
  return (
    <section className="album-sheet relative overflow-hidden" style={style}>
      {children}
      {folio !== undefined && (
        <span
          className="absolute bottom-[calc(6mm+var(--bleed))] text-[7pt] tabular-nums tracking-[0.2em] text-[color:var(--muted)]"
          style={
            folio % 2 === 0 ? { left: `calc(10mm + ${b}mm)` } : { right: `calc(10mm + ${b}mm)` }
          }
        >
          {folio}
        </span>
      )}
    </section>
  );
}

function Photo({
  src,
  className = "",
  style,
}: {
  src?: string | undefined;
  className?: string;
  style?: CSSProperties;
}) {
  return src ? (
    <img
      src={src}
      alt=""
      className={`block h-full w-full object-cover ${className}`}
      style={style}
    />
  ) : (
    <div className={`h-full w-full bg-[color:var(--muted)]/20 ${className}`} />
  );
}

/** Inner margin for text, measured from the trimmed page edge. */
const pad = (mm: number) => `calc(${mm}mm + var(--bleed))`;

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[7.5pt] uppercase tracking-[0.35em] text-[color:var(--accent)]">
      {children}
    </p>
  );
}

function Rule() {
  return <div className="my-[5mm] h-px w-[14mm] bg-[color:var(--accent)]" />;
}

function Caption({ m, ctx, className = "" }: { m: Memory; ctx: BookContext; className?: string }) {
  if (!ctx.captions) return null;
  const { place } = placeAndCountry(m.place);
  return (
    <p className={`text-[7pt] uppercase tracking-[0.25em] text-[color:var(--muted)] ${className}`}>
      {place} · {formatDate(m.date)}
    </p>
  );
}

function Story({
  text,
  lines,
  drop,
}: {
  text: string;
  lines?: number | undefined;
  drop?: boolean;
}) {
  if (!text) return null;
  return (
    <p
      className={`whitespace-pre-line text-[9.5pt] leading-[1.7] opacity-90 ${drop ? "first-letter:float-left first-letter:mr-[2mm] first-letter:font-display first-letter:text-[34pt] first-letter:leading-[0.85] first-letter:text-[color:var(--accent)]" : ""}`}
      style={
        lines
          ? {
              display: "-webkit-box",
              WebkitLineClamp: lines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }
          : undefined
      }
    >
      {text}
    </p>
  );
}

// ---------------------------------------------------------------- cover and back cover

export function CoverPage({ ctx }: { ctx: BookContext }) {
  const t = THEMES[ctx.theme];
  const hero = ctx.ms.find((m) => m.photos[0])?.photos[0];
  const src = hero ? ctx.urls[hero] : undefined;

  if (ctx.theme === "galeria") {
    return (
      <Sheet ctx={ctx}>
        {src && (
          <div className="absolute inset-0">
            <Photo src={src} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 text-white" style={{ padding: pad(16) }}>
          <p className="text-[8pt] uppercase tracking-[0.45em] opacity-80">{ctx.subtitle}</p>
          <h1 className="mt-[3mm] font-display text-[46pt] leading-[0.95]">{ctx.title}</h1>
        </div>
      </Sheet>
    );
  }

  if (ctx.theme === "minimal") {
    return (
      <Sheet ctx={ctx}>
        <div
          className="flex h-full flex-col items-center justify-center text-center"
          style={{ padding: pad(20) }}
        >
          {src && (
            <div className="aspect-[4/3] w-[58%] overflow-hidden">
              <Photo src={src} />
            </div>
          )}
          <h1 className={`mt-[10mm] text-[30pt] leading-none ${t.display}`}>{ctx.title}</h1>
          <p className="mt-[4mm] text-[8pt] uppercase tracking-[0.4em] text-[color:var(--muted)]">
            {ctx.subtitle}
          </p>
        </div>
      </Sheet>
    );
  }

  // Clássico: a photo in a window, like a cloth-bound cover.
  return (
    <Sheet ctx={ctx}>
      <div
        className="absolute inset-0"
        style={{
          background: "#2c4a5c",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 5px)",
        }}
      />
      <div
        className="relative flex h-full flex-col items-center justify-center text-center text-[#eef3f6]"
        style={{ padding: pad(18) }}
      >
        {src && (
          <div className="aspect-[4/3] w-[56%] bg-[#fbf9f5] p-[3mm] shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
            <Photo src={src} />
          </div>
        )}
        <h1 className="mt-[10mm] font-display text-[36pt] italic leading-none">{ctx.title}</h1>
        <div className="my-[4mm] h-px w-[16mm] bg-[#add3d7]" />
        <p className="text-[8pt] uppercase tracking-[0.4em] opacity-80">{ctx.subtitle}</p>
      </div>
    </Sheet>
  );
}

export function BackCover({ ctx }: { ctx: BookContext }) {
  const years = [...new Set(ctx.ms.map((m) => m.date.slice(0, 4)))].sort();
  const span = years.length > 1 ? `${years[0]} – ${years[years.length - 1]}` : (years[0] ?? "");
  const dark = ctx.theme !== "minimal";
  return (
    <Sheet ctx={ctx}>
      <div
        className="flex h-full flex-col items-center justify-end text-center"
        style={{
          padding: pad(18),
          background: ctx.theme === "classico" ? "#2c4a5c" : undefined,
          color: dark ? "#eef3f6" : undefined,
        }}
      >
        <p className="font-display text-[14pt] italic opacity-90">Fica na Memória</p>
        <p className="mt-[2mm] text-[7pt] uppercase tracking-[0.4em] opacity-70">{span}</p>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- inner pages

export function BookPage({ page, ctx, folio }: { page: Page; ctx: BookContext; folio: number }) {
  const t = THEMES[ctx.theme];
  const u = (p?: string) => (p ? ctx.urls[p] : undefined);
  const m = ctx.margin ? 14 : 0;
  const gap = "3mm";

  switch (page.kind) {
    case "title":
      return (
        <Sheet ctx={ctx}>
          <div
            className="flex h-full flex-col items-center justify-center text-center"
            style={{ padding: pad(24) }}
          >
            <Eyebrow>Álbum de viagem</Eyebrow>
            <h1 className={`mt-[6mm] text-[34pt] leading-[1] ${t.display}`}>{ctx.title}</h1>
            <Rule />
            <p className="text-[11pt]">{ctx.subtitle}</p>
            {ctx.dedication && (
              <p className="mt-[14mm] max-w-[80%] font-display text-[12pt] italic text-[color:var(--muted)]">
                “{ctx.dedication}”
              </p>
            )}
          </div>
        </Sheet>
      );

    case "contents": {
      const items = ctx.pages
        .map((p, i) => ({ p, n: i + 1 }))
        .filter(
          (x): x is { p: Extract<Page, { kind: "opener" }>; n: number } => x.p.kind === "opener",
        );
      return (
        <Sheet ctx={ctx} folio={folio}>
          <div className="flex h-full flex-col" style={{ padding: pad(18) }}>
            <Eyebrow>Índice</Eyebrow>
            <h2 className={`mt-[3mm] text-[28pt] ${t.display}`}>As viagens</h2>
            <ol className={`mt-[8mm] gap-[10mm] text-[9pt] ${ctx.w > 250 ? "columns-2" : ""}`}>
              {items.slice(0, 30).map(({ p, n }) => (
                <li
                  key={p.key}
                  className="mb-[2.5mm] flex break-inside-avoid items-baseline gap-[2mm]"
                >
                  <span className="font-display text-[11pt]">{p.m.title}</span>
                  <span className="flex-1 border-b border-dotted border-[color:var(--muted)]/50" />
                  <span className="tabular-nums text-[color:var(--muted)]">{n}</span>
                </li>
              ))}
            </ol>
          </div>
        </Sheet>
      );
    }

    case "chapter": {
      const countries = [...new Set(page.items.map((x) => countryOf(x.place)))];
      const bg = page.items.find((x) => x.photos[0])?.photos[0];
      const when = `${monthYear(page.items[0]!.date)} · ${countries.join(" · ")}`;
      if (!bg) {
        // No photo to open the chapter with: a quiet page in the book's colours.
        return (
          <Sheet ctx={ctx}>
            <div className="flex h-full flex-col justify-end" style={{ padding: pad(18) }}>
              <Eyebrow>Capítulo</Eyebrow>
              <h2 className={`mt-[3mm] text-[40pt] leading-none ${t.display}`}>{page.name}</h2>
              <Rule />
              <p className="text-[8.5pt] uppercase tracking-[0.25em] text-[color:var(--muted)]">
                {when}
              </p>
            </div>
          </Sheet>
        );
      }
      return (
        <Sheet ctx={ctx}>
          <div className="absolute inset-0">
            <Photo src={u(bg)} />
            <div className="absolute inset-0 bg-black/45" />
          </div>
          <div
            className="relative flex h-full flex-col justify-end text-white"
            style={{ padding: pad(18) }}
          >
            <p className="text-[7.5pt] uppercase tracking-[0.4em] opacity-80">Capítulo</p>
            <h2 className="mt-[3mm] font-display text-[40pt] italic leading-none">{page.name}</h2>
            <p className="mt-[4mm] text-[8.5pt] uppercase tracking-[0.25em] opacity-85">{when}</p>
          </div>
        </Sheet>
      );
    }

    case "opener": {
      const x = page.m;
      const src = u(page.photo);
      const head = (
        <>
          <Eyebrow>{placeAndCountry(x.place).place}</Eyebrow>
          <h2 className={`mt-[3mm] text-[24pt] leading-[1.05] ${t.display}`}>{x.title}</h2>
          <p className="mt-[2mm] text-[10pt] italic text-[color:var(--muted)]">
            {formatDate(x.date)}
          </p>
          <Rule />
        </>
      );
      const long = x.text.length > 420;
      if (!src) {
        return (
          <Sheet ctx={ctx} folio={folio}>
            <div className="flex h-full items-center" style={{ padding: pad(26) }}>
              <div className="max-w-[150mm]">
                {head}
                <Story text={x.text} lines={long ? 14 : undefined} drop />
              </div>
            </div>
          </Sheet>
        );
      }
      if (page.layout === "overlay") {
        return (
          <Sheet ctx={ctx}>
            <div className="absolute inset-0">
              <Photo src={src} />
            </div>
            <div
              className="absolute inset-x-0 bottom-0"
              style={{
                padding: `${pad(8)} ${pad(14)} ${pad(10)}`,
                background: "color-mix(in srgb, var(--paper) 92%, transparent)",
              }}
            >
              {head}
              {!long && <Story text={x.text} lines={3} />}
            </div>
          </Sheet>
        );
      }
      if (page.layout === "top") {
        return (
          <Sheet ctx={ctx} folio={folio}>
            <div className="flex h-full flex-col">
              <div className="h-[58%]">
                <Photo src={src} />
              </div>
              <div
                className="flex-1 overflow-hidden"
                style={{ padding: `${pad(9)} ${pad(16)} ${pad(14)}` }}
              >
                {head}
                <Story text={x.text} lines={ctx.h > 250 ? 9 : 5} />
              </div>
            </div>
          </Sheet>
        );
      }
      return (
        <Sheet ctx={ctx} folio={folio}>
          <div className="flex h-full">
            <div className="w-[56%]">
              <Photo src={src} />
            </div>
            <div className="flex w-[44%] flex-col justify-center" style={{ padding: pad(14) }}>
              {head}
              <Story text={x.text} lines={long ? 10 : 16} drop />
            </div>
          </div>
        </Sheet>
      );
    }

    case "story":
      return (
        <Sheet ctx={ctx} folio={folio}>
          <div className="flex h-full flex-col justify-center" style={{ padding: pad(26) }}>
            <Eyebrow>{page.m.title}</Eyebrow>
            <div
              className="mt-[6mm] columns-1 gap-[10mm] md:columns-1"
              style={{ columnCount: ctx.w > 250 ? 2 : 1 }}
            >
              <Story text={page.m.text} drop />
            </div>
          </div>
        </Sheet>
      );

    case "spread":
      return (
        <Sheet ctx={ctx}>
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={u(page.photo)}
              alt=""
              className="absolute top-0 h-full max-w-none object-cover"
              style={{ width: "200%", left: page.side === "left" ? 0 : "-100%" }}
            />
          </div>
          {page.side === "right" && ctx.captions && (
            <div
              className="absolute rounded-full bg-black/35 px-[3mm] py-[1mm] text-white"
              style={{ right: pad(8), bottom: pad(8) }}
            >
              <Caption m={page.m} ctx={{ ...ctx, captions: true }} className="!text-white" />
            </div>
          )}
        </Sheet>
      );

    case "photos": {
      const ph = page.photos.map(u);
      const box = (i: number, extra = "") => (
        <div className={`min-h-0 min-w-0 overflow-hidden ${extra}`}>
          <Photo src={ph[i]} />
        </div>
      );
      const area: CSSProperties = {
        inset: m ? pad(m) : 0,
        gap: m || page.layout === "full" ? gap : "2mm",
      };
      const caption = ctx.captions && <Caption m={page.m} ctx={ctx} className="absolute" />;
      let body: ReactNode;
      switch (page.layout) {
        case "full":
          body = (
            <div className="absolute" style={{ inset: m ? pad(m) : 0 }}>
              {box(0, "h-full")}
            </div>
          );
          break;
        case "framed":
          body = (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ padding: pad(16) }}
            >
              <div className="h-[72%] w-[86%] overflow-hidden shadow-[0_4px_16px_-6px_rgba(0,0,0,0.35)]">
                <Photo src={ph[0]} />
              </div>
              {ctx.captions && <Caption m={page.m} ctx={ctx} className="mt-[5mm]" />}
            </div>
          );
          break;
        case "duo":
          body = (
            <div className="absolute grid grid-cols-2" style={area}>
              {box(0)}
              {box(1)}
            </div>
          );
          break;
        case "duo-stack":
          body = (
            <div className="absolute grid grid-rows-2" style={area}>
              {box(0)}
              {box(1)}
            </div>
          );
          break;
        case "duo-offset":
          body = (
            <div className="absolute grid grid-cols-[1.3fr_1fr] grid-rows-[1fr_1fr]" style={area}>
              {box(0, "row-span-2")}
              {box(1, "row-start-2")}
            </div>
          );
          break;
        case "trio":
          body = (
            <div className="absolute grid grid-cols-[1.6fr_1fr] grid-rows-2" style={area}>
              {box(0, "row-span-2")}
              {box(1)}
              {box(2)}
            </div>
          );
          break;
        case "trio-row":
          body = (
            <div className="absolute grid grid-cols-3" style={area}>
              {box(0)}
              {box(1)}
              {box(2)}
            </div>
          );
          break;
        case "quad":
          body = (
            <div className="absolute grid grid-cols-2 grid-rows-2" style={area}>
              {box(0)}
              {box(1)}
              {box(2)}
              {box(3)}
            </div>
          );
          break;
        case "quad-mosaic":
          body = (
            <div className="absolute grid grid-cols-3 grid-rows-2" style={area}>
              {box(0, "col-span-2")}
              {box(1)}
              {box(2)}
              {box(3, "col-span-2")}
            </div>
          );
          break;
      }
      const roomForCaption = m > 0 && page.layout !== "framed";
      return (
        <Sheet ctx={ctx} folio={m ? folio : undefined}>
          {body}
          {roomForCaption && caption && (
            // On the side opposite the page number, so they never overlap.
            <div
              className="absolute"
              style={{ [folio % 2 === 0 ? "right" : "left"]: pad(m), bottom: pad(5) }}
            >
              <Caption m={page.m} ctx={ctx} />
            </div>
          )}
        </Sheet>
      );
    }

    case "blank":
      return (
        <Sheet ctx={ctx}>
          <div className="flex h-full items-center justify-center">
            <p className={`text-[14pt] text-[color:var(--muted)] ${t.display}`}>Notas</p>
          </div>
        </Sheet>
      );

    case "end": {
      const countries = [...new Set(ctx.ms.map((x) => countryOf(x.place)))];
      const photos = ctx.ms.reduce((s, x) => s + x.photos.length, 0);
      return (
        <Sheet ctx={ctx}>
          <div
            className="flex h-full flex-col items-center justify-center text-center"
            style={{ padding: pad(18) }}
          >
            <p className={`text-[30pt] ${t.display}`}>Até à próxima viagem.</p>
            <Rule />
            <div className="flex flex-wrap justify-center gap-[12mm]">
              {[
                [ctx.ms.length, ctx.ms.length === 1 ? "memória" : "memórias"],
                [countries.length, countries.length === 1 ? "país" : "países"],
                [photos, photos === 1 ? "fotografia" : "fotografias"],
                [totalKm(ctx.ms).toLocaleString("pt-PT"), "quilómetros"],
              ].map(([v, l]) => (
                <div key={l as string}>
                  <p className="font-display text-[26pt]">{v}</p>
                  <p className="text-[7pt] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    {l}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Sheet>
      );
    }
  }
}
