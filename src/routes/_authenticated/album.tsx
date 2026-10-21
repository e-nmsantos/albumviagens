import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Printer, Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  countryOf,
  formatDate,
  totalKm,
  tripNames,
  useMemories,
  type Memory,
} from "@/lib/memories";
import { usePhotoUrls } from "@/lib/photos";
import { plural } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/album")({
  head: () => ({
    meta: [
      { title: "Álbum fotográfico — Memórias" },
      {
        name: "description",
        content:
          "Escolhe as memórias e cria um álbum fotográfico pronto a imprimir ou guardar em PDF.",
      },
      { property: "og:title", content: "Álbum fotográfico — Memórias" },
      { property: "og:description", content: "Um álbum fotográfico de viagem pronto a imprimir." },
    ],
  }),
  component: Album,
});

const FORMATS = {
  a4: { label: "A4 horizontal (29,7 × 21 cm)", w: 297, h: 210 },
  sq: { label: "Quadrado (21 × 21 cm)", w: 210, h: 210 },
} as const;
type Fmt = keyof typeof FORMATS;

type Page =
  | { kind: "cover" }
  | { kind: "contents" }
  | { kind: "chapter"; name: string; items: Memory[] }
  | { kind: "memory"; m: Memory; variant: number }
  | { kind: "gallery"; m: Memory; photos: string[] }
  | { kind: "end" };

const sel = "rounded-full border border-input bg-card px-4 py-2 text-sm";
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
const monthYear = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

function buildPages(ms: Memory[], chapters: boolean): Page[] {
  const pages: Page[] = [{ kind: "cover" }, { kind: "contents" }];
  const groups: [string, Memory[]][] = [];
  for (const m of ms) {
    const key = m.trip || m.date.slice(0, 4);
    const g = groups.find(([k]) => k === key);
    if (g) g[1].push(m);
    else groups.push([key, [m]]);
  }
  let v = 0;
  for (const [name, items] of groups) {
    if (chapters) pages.push({ kind: "chapter", name, items });
    for (const m of items) {
      pages.push({ kind: "memory", m, variant: v++ });
      const extra = m.photos.slice(m.photos.length >= 3 ? 3 : 2);
      for (let i = 0; i < extra.length; i += 4)
        pages.push({ kind: "gallery", m, photos: extra.slice(i, i + 4) });
    }
  }
  pages.push({ kind: "end" });
  return pages;
}

function Album() {
  const { data: all = [] } = useMemories();
  const trips = tripNames(all);
  const [trip, setTrip] = useState("");
  // Memories left out of the album; everything else (including new memories) is in.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [dedication, setDedication] = useState("");
  const [fmt, setFmt] = useState<Fmt>("a4");

  const pool = useMemo(
    () =>
      all
        .filter((m) => !trip || m.trip?.trim() === trip)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [all, trip],
  );

  const ms = pool.filter((m) => !excluded.has(m.id));
  const thumbs = usePhotoUrls(pool.map((m) => m.photos[0]));
  const hasPages = ms.length > 0;
  const urls = usePhotoUrls(ms.flatMap((m) => m.photos));
  const pages = useMemo(() => buildPages(ms, !trip && ms.length > 3), [ms, trip]);
  const toggle = (id: string) =>
    setExcluded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const { w, h } = FORMATS[fmt];
  const book: Book = {
    title: title || trip || "Diário de viagens",
    dedication,
    ms,
    urls,
    pages,
    w,
    h,
    range: ms.length
      ? monthYear(ms[0]!.date) === monthYear(ms[ms.length - 1]!.date)
        ? monthYear(ms[0]!.date)
        : `${monthYear(ms[0]!.date)} — ${monthYear(ms[ms.length - 1]!.date)}`
      : "",
  };

  // Fit the fixed-size pages to the screen width; printing uses real millimetres.
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) =>
      setZoom(Math.min(1, e!.contentRect.width / (w * 3.7795))),
    );
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [w, hasPages]);
  // Phones: one page per screen; tapping opens it full screen, turned sideways.
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <div className="min-h-screen pb-28 print:p-0">
      <style>{`@page { size: ${w}mm ${h}mm; margin: 0; } @media print { html, body { background: var(--card) !important; background-image: none !important; padding: 0 !important; } }`}</style>
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 print:hidden">
        <h1 className="text-5xl">
          O álbum <em className="text-primary">fotográfico</em>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Escolhe as memórias e o formato. Ao imprimir, escolhe “Guardar como PDF” para levar a uma
          gráfica — as páginas já saem no tamanho certo, sem margens.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-[auto_auto_1fr_1fr_auto]">
          <select value={trip} onChange={(e) => setTrip(e.target.value)} className={sel}>
            <option value="">Todas as memórias</option>
            {trips.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select value={fmt} onChange={(e) => setFmt(e.target.value as Fmt)} className={sel}>
            {Object.entries(FORMATS).map(([k, f]) => (
              <option key={k} value={k}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Título: ${trip || "Diário de viagens"}`}
            className={sel}
          />
          <input
            value={dedication}
            onChange={(e) => setDedication(e.target.value)}
            placeholder="Dedicatória (opcional)"
            className={sel}
          />
          <button
            onClick={() => window.print()}
            disabled={!ms.length}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span>
            <strong className="font-medium">{ms.length}</strong> de {pool.length} memórias ·{" "}
            {pages.length} páginas
          </span>
          <span className="flex gap-4">
            <button onClick={() => setExcluded(new Set())} className="text-primary hover:underline">
              Escolher todas
            </button>
            <button
              onClick={() => setExcluded(new Set(pool.map((m) => m.id)))}
              className="text-muted-foreground hover:underline"
            >
              Tirar todas
            </button>
          </span>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-3">
          {pool.map((m) => {
            const on = !excluded.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                aria-pressed={on}
                className={`relative w-32 shrink-0 bg-card p-1.5 pb-2 text-left shadow-sm transition ${on ? "ring-2 ring-primary" : "opacity-50 grayscale hover:opacity-80"}`}
              >
                <div className="aspect-square bg-muted">
                  {m.photos[0] && thumbs[m.photos[0]] && (
                    <img src={thumbs[m.photos[0]]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="mt-1 truncate text-xs">{m.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {m.date.slice(0, 4)} · {plural(m.photos.length, "foto", "fotos")}
                </p>
                <span
                  className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full ${on ? "bg-primary text-primary-foreground" : "bg-card/90"}`}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {ms.length > 0 && (
        <div ref={box} className="mx-auto mt-8 max-w-5xl px-6 print:m-0 print:max-w-none print:p-0">
          <div
            className="album-book hidden space-y-8 md:block print:block print:space-y-0"
            style={{ zoom }}
          >
            {pages.map((p, i) => (
              <Sheet key={i} n={i + 1} book={book} page={p} />
            ))}
          </div>
          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:hidden print:hidden">
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => setViewing(i)}
                className="relative shrink-0 snap-center text-left"
                aria-label={`Abrir a página ${i + 1} em ecrã inteiro`}
              >
                <div style={{ zoom }}>
                  <Sheet n={i + 1} book={book} page={p} />
                </div>
                <span className="mt-2 block text-center text-xs text-muted-foreground">
                  Página {i + 1} de {pages.length} · toca para ampliar
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {viewing !== null && pages[viewing] && (
        <PageViewer index={viewing} total={pages.length} onChange={setViewing} size={{ w, h }}>
          <Sheet n={viewing + 1} book={book} page={pages[viewing]} />
        </PageViewer>
      )}
    </div>
  );
}

type Book = {
  title: string;
  dedication: string;
  range: string;
  ms: Memory[];
  urls: Record<string, string>;
  pages: Page[];
  w: number;
  h: number;
};

/** One album page full screen, turned sideways to use the whole phone. */
function PageViewer({
  index,
  total,
  onChange,
  size,
  children,
}: {
  index: number;
  total: number;
  onChange: (i: number | null) => void;
  size: { w: number; h: number };
  children: ReactNode;
}) {
  const [vp, setVp] = useState({ w: 390, h: 844 });
  useLayoutEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  const px = 3.7795; // pixels per millimetre
  const sideways = vp.h > vp.w;
  const [pw, ph] = sideways ? [vp.h - 96, vp.w - 24] : [vp.w - 24, vp.h - 96];
  const scale = Math.min(pw / (size.w * px), ph / (size.h * px));
  const btn = "rounded-full bg-background/15 px-4 py-2 text-sm text-background disabled:opacity-30";

  return (
    <div
      className="fixed inset-0 z-[60] bg-foreground/95 print:hidden"
      role="dialog"
      aria-label="Página do álbum"
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: `${size.w}mm`,
          transform: `translate(-50%, -50%) ${sideways ? "rotate(90deg)" : ""} scale(${scale})`,
        }}
      >
        {children}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button className={btn} disabled={index === 0} onClick={() => onChange(index - 1)}>
          ‹ Anterior
        </button>
        <span className="text-xs text-background/70">
          {index + 1} / {total}
        </span>
        <button className={btn} disabled={index === total - 1} onClick={() => onChange(index + 1)}>
          Seguinte ›
        </button>
      </div>
      <button
        onClick={() => onChange(null)}
        aria-label="Fechar"
        className="absolute right-4 top-4 rounded-full bg-background/15 px-3 py-1 text-2xl text-background"
      >
        ×
      </button>
    </div>
  );
}

function Sheet({ n, book, page }: { n: number; book: Book; page: Page }) {
  const showFolio = page.kind === "memory" || page.kind === "gallery" || page.kind === "contents";
  return (
    <section
      className="album-sheet relative overflow-hidden bg-card text-foreground shadow-[0_20px_50px_-20px_var(--color-foreground)] print:shadow-none"
      style={{ width: `${book.w}mm`, height: `${book.h - 0.5}mm` }}
    >
      <PageBody book={book} page={page} />
      {showFolio && (
        <div className="absolute inset-x-[14mm] bottom-[7mm] flex justify-between text-[7pt] uppercase tracking-[0.3em] text-muted-foreground">
          <span>{book.title}</span>
          <span>{n}</span>
        </div>
      )}
    </section>
  );
}

function Img({ src, className = "" }: { src?: string | undefined; className?: string }) {
  return src ? (
    <img src={src} alt="" className={`block h-full w-full object-cover ${className}`} />
  ) : (
    <div className={`h-full w-full bg-muted ${className}`} />
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[7.5pt] uppercase tracking-[0.35em] text-primary">{children}</p>;
}

function Story({ m, max = 12, drop = true }: { m: Memory; max?: number; drop?: boolean }) {
  if (!m.text) return null;
  return (
    <p
      className={`text-[9.5pt] leading-[1.65] text-foreground/85 ${drop ? "first-letter:float-left first-letter:mr-[2mm] first-letter:font-display first-letter:text-[34pt] first-letter:leading-[0.85] first-letter:text-primary" : ""}`}
      style={{
        display: "-webkit-box",
        WebkitLineClamp: max,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {m.text}
    </p>
  );
}

function Heading({ m, size = "26pt" }: { m: Memory; size?: string }) {
  return (
    <>
      <Eyebrow>{m.place}</Eyebrow>
      <h3 className="mt-[3mm] font-display leading-[1.02]" style={{ fontSize: size }}>
        {m.title}
      </h3>
      <p className="mt-[2mm] font-display text-[11pt] italic text-muted-foreground">
        {formatDate(m.date)}
      </p>
      <div className="my-[5mm] h-px w-[14mm] bg-primary" />
    </>
  );
}

function PageBody({ book, page }: { book: Book; page: Page }) {
  const u = (p?: string) => (p ? book.urls[p] : undefined);

  if (page.kind === "cover") {
    const cover = book.ms.find((m) => m.photos[0])?.photos[0];
    return (
      <div className="grid h-full grid-cols-[1.25fr_1fr]">
        <div className="p-[12mm] pr-0">
          <Img src={u(cover)} />
        </div>
        <div className="flex flex-col justify-between p-[14mm]">
          <p className="text-[7.5pt] uppercase tracking-[0.4em] text-muted-foreground">
            Álbum de viagem
          </p>
          <div>
            <h1 className="font-display text-[44pt] italic leading-[0.95]">{book.title}</h1>
            <div className="my-[6mm] h-px w-[18mm] bg-primary" />
            <p className="font-display text-[13pt]">{book.range}</p>
            {book.dedication && (
              <p className="mt-[8mm] font-display text-[12pt] italic text-muted-foreground">
                “{book.dedication}”
              </p>
            )}
          </div>
          <p className="text-[7.5pt] uppercase tracking-[0.4em] text-primary">Memórias</p>
        </div>
      </div>
    );
  }

  if (page.kind === "contents") {
    const items = book.pages
      .map((p, i) => ({ p, n: i + 1 }))
      .filter((x) => x.p.kind === "memory") as {
      p: Extract<Page, { kind: "memory" }>;
      n: number;
    }[];
    return (
      <div className="flex h-full flex-col p-[16mm]">
        <Eyebrow>Índice</Eyebrow>
        <h2 className="mt-[3mm] font-display text-[30pt] italic">As viagens</h2>
        <ol className="mt-[8mm] columns-2 gap-[12mm] text-[9pt]">
          {items.slice(0, 28).map(({ p, n }) => (
            <li
              key={p.m.id}
              className="mb-[2.5mm] flex break-inside-avoid items-baseline gap-[2mm]"
            >
              <span className="font-display text-[11pt]">{p.m.title}</span>
              <span className="flex-1 border-b border-dotted border-muted-foreground/50" />
              <span className="tabular-nums text-muted-foreground">{n}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (page.kind === "chapter") {
    const countries = [...new Set(page.items.map((m) => countryOf(m.place)))];
    const bg = page.items.find((m) => m.photos[0])?.photos[0];
    return (
      <div className="grid h-full grid-cols-2 bg-secondary">
        <div className="flex flex-col justify-center p-[18mm]">
          <Eyebrow>Capítulo</Eyebrow>
          <h2 className="mt-[4mm] font-display text-[40pt] italic leading-none">{page.name}</h2>
          <div className="my-[6mm] h-px w-[18mm] bg-primary" />
          <p className="font-display text-[12pt]">{monthYear(page.items[0]!.date)}</p>
          <p className="mt-[2mm] text-[8.5pt] uppercase tracking-[0.25em] text-muted-foreground">
            {countries.join(" · ")} · {page.items.length}{" "}
            {page.items.length === 1 ? "memória" : "memórias"}
          </p>
        </div>
        <div className="p-[10mm] pl-0">
          <Img src={u(bg)} className="grayscale-[30%]" />
        </div>
      </div>
    );
  }

  if (page.kind === "gallery") {
    const n = page.photos.length;
    return (
      <div className="flex h-full flex-col p-[12mm] pb-[16mm]">
        <p className="mb-[4mm] font-display text-[11pt] italic text-muted-foreground">
          {page.m.title} — continuação
        </p>
        <div
          className={`grid flex-1 gap-[4mm] ${n === 1 ? "" : n === 2 ? "grid-cols-2" : n === 3 ? "grid-cols-3" : "grid-cols-2 grid-rows-2"}`}
        >
          {page.photos.map((p) => (
            <div key={p} className="min-h-0">
              <Img src={u(p)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page.kind === "end") {
    const countries = [...new Set(book.ms.map((m) => countryOf(m.place)))];
    const photos = book.ms.reduce((s, m) => s + m.photos.length, 0);
    return (
      <div className="flex h-full flex-col items-center justify-center p-[18mm] text-center">
        <p className="font-display text-[34pt] italic">Até à próxima viagem.</p>
        <div className="my-[8mm] h-px w-[18mm] bg-primary" />
        <div className="flex gap-[16mm]">
          {[
            [book.ms.length, "memórias"],
            [countries.length, countries.length === 1 ? "país" : "países"],
            [photos, "fotografias"],
            [totalKm(book.ms).toLocaleString("pt-PT"), "quilómetros"],
          ].map(([v, l]) => (
            <div key={l as string}>
              <p className="font-display text-[28pt]">{v}</p>
              <p className="text-[7pt] uppercase tracking-[0.3em] text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-[10mm] max-w-[70%] text-[8pt] uppercase tracking-[0.25em] text-muted-foreground">
          {countries.join(" · ")}
        </p>
      </div>
    );
  }

  // Memory page — layout chosen by photo count, alternating sides for rhythm.
  const { m, variant } = page;
  const ph = m.photos.slice(0, m.photos.length >= 3 ? 3 : 2).map(u);
  const flip = variant % 2 === 1;

  if (ph.length === 0)
    return (
      <div className="flex h-full items-center px-[30mm]">
        <div className="max-w-[150mm]">
          <Heading m={m} size="32pt" />
          <Story m={m} max={18} />
        </div>
      </div>
    );

  if (ph.length === 1)
    return variant % 4 < 2 ? (
      <div className={`flex h-full ${flip ? "flex-row-reverse" : ""}`}>
        <div className="w-[58%]">
          <Img src={ph[0]} />
        </div>
        <div className="flex w-[42%] flex-col justify-center p-[14mm] pb-[18mm]">
          <Heading m={m} />
          <Story m={m} max={14} />
        </div>
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center p-[14mm] pb-[18mm]">
        <div className="h-[62%] w-[70%] bg-background p-[3mm] shadow-[0_4px_14px_-6px_var(--color-foreground)]">
          <Img src={ph[0]} />
        </div>
        <div className="mt-[6mm] w-[70%] text-center">
          <Eyebrow>
            {m.place} · {formatDate(m.date)}
          </Eyebrow>
          <h3 className="mt-[2mm] font-display text-[22pt]">{m.title}</h3>
          {m.text && (
            <div className="mx-auto mt-[2mm] max-w-[85%]">
              <Story m={m} max={3} drop={false} />
            </div>
          )}
        </div>
      </div>
    );

  if (ph.length === 2)
    return (
      <div
        className={`grid h-full gap-[6mm] p-[12mm] pb-[18mm] ${flip ? "grid-cols-[1fr_1.1fr_0.9fr]" : "grid-cols-[0.9fr_1.1fr_1fr]"}`}
      >
        <div className={`flex flex-col justify-end ${flip ? "order-3" : ""}`}>
          <Heading m={m} size="22pt" />
          <Story m={m} max={10} />
        </div>
        <div className="min-h-0">
          <Img src={ph[0]} />
        </div>
        <div
          className={`flex min-h-0 flex-col ${flip ? "order-first justify-start" : "justify-end"}`}
        >
          <div className="h-[70%]">
            <Img src={ph[1]} />
          </div>
        </div>
      </div>
    );

  return (
    <div className={`flex h-full gap-[5mm] p-[12mm] pb-[18mm] ${flip ? "flex-row-reverse" : ""}`}>
      <div className="w-[55%] min-h-0">
        <Img src={ph[0]} />
      </div>
      <div className="flex w-[45%] min-h-0 flex-col gap-[5mm]">
        <div className="grid h-[42%] grid-cols-2 gap-[4mm]">
          <Img src={ph[1]} />
          <Img src={ph[2]} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
          <Heading m={m} size="20pt" />
          <Story m={m} max={7} />
        </div>
      </div>
    </div>
  );
}
