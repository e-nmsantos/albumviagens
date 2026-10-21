import { createFileRoute } from "@tanstack/react-router";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, LayoutGrid, Printer, Shuffle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BackCover, BookPage, CoverPage, type BookContext } from "@/components/album/BookPage";
import {
  FORMATS,
  MIN_DPI,
  THEMES,
  buildBook,
  dpi,
  monthYear,
  nextLayout,
  slotSizes,
  type FormatId,
  type Page,
  type PhotoInfo,
  type PhotoLayout,
  type ThemeId,
} from "@/lib/album";
import { tripNames, useMemories } from "@/lib/memories";
import { usePhotoUrls } from "@/lib/photos";
import { plural } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/album")({
  head: () => ({
    meta: [
      { title: "Álbum fotográfico — Fica na Memória" },
      {
        name: "description",
        content:
          "Cria um livro de fotografias das tuas viagens, pronto a imprimir ou guardar em PDF.",
      },
    ],
  }),
  component: Album,
});

const PX_PER_MM = 3.7795;
const SETTINGS_KEY = "memorias.album";

type Settings = {
  format: FormatId;
  theme: ThemeId;
  margin: boolean;
  captions: boolean;
  spreads: boolean;
  bleed: boolean;
  title: string;
  dedication: string;
};
const DEFAULTS: Settings = {
  format: "sq21",
  theme: "classico",
  margin: true,
  captions: true,
  spreads: true,
  bleed: false,
  title: "",
  dedication: "",
};

/** Remembers the album choices in this browser (a convenience; nothing breaks without it). */
function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
      setS((d) => ({
        ...d,
        ...saved,
        format: saved.format && saved.format in FORMATS ? saved.format : d.format,
        theme: saved.theme && saved.theme in THEMES ? saved.theme : d.theme,
      }));
    } catch {
      /* first visit or storage blocked */
    }
  }, []);
  const set = (patch: Partial<Settings>) =>
    setS((d) => {
      const next = { ...d, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: the choice still applies now */
      }
      return next;
    });
  return [s, set] as const;
}

/** Natural pixel size of each photo, read once its URL is known. */
function usePhotoInfo(urls: Record<string, string>) {
  const [info, setInfo] = useState<Record<string, PhotoInfo>>({});
  useEffect(() => {
    let alive = true;
    for (const [key, url] of Object.entries(urls)) {
      if (info[key]) continue;
      const img = new Image();
      img.onload = () => {
        if (alive) setInfo((i) => ({ ...i, [key]: { w: img.naturalWidth, h: img.naturalHeight } }));
      };
      img.src = url;
    }
    return () => {
      alive = false;
    };
    // `info` is only read to skip photos already measured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls]);
  return info;
}

/** Lowest print resolution among the photos of a page, when any is below the limit. */
function lowestDpi(page: Page, info: Record<string, PhotoInfo>, ctx: BookContext) {
  const size = { w: ctx.w, h: ctx.h };
  let slots: { photo?: string | undefined; box: { w: number; h: number } }[] = [];
  if (page.kind === "photos")
    slots = slotSizes(page.layout, size, ctx.margin).map((box, i) => ({
      photo: page.photos[i],
      box,
    }));
  else if (page.kind === "spread" && page.side === "left")
    slots = [{ photo: page.photo, box: slotSizes("spread", size, ctx.margin)[0]! }];
  else if (page.kind === "opener" && page.photo)
    slots = [
      {
        photo: page.photo,
        box: slotSizes(page.layout, size, ctx.margin)[0]!,
      },
    ];
  let low: number | null = null;
  for (const s of slots) {
    const i = s.photo ? info[s.photo] : undefined;
    if (!i) continue;
    const d = dpi(i, s.box);
    if (d < MIN_DPI && (low === null || d < low)) low = d;
  }
  return low;
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:border-primary"}`;

function Album() {
  const { data: all = [] } = useMemories();
  const trips = tripNames(all);
  const [trip, setTrip] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [s, set] = useSettings();
  const [seed, setSeed] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, PhotoLayout>>({});

  const pool = useMemo(
    () =>
      all
        .filter((m) => !trip || m.trip?.trim() === trip)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [all, trip],
  );
  const ms = useMemo(() => pool.filter((m) => !excluded.has(m.id)), [pool, excluded]);
  const thumbs = usePhotoUrls(pool.map((m) => m.photos[0]));
  const urls = usePhotoUrls(ms.flatMap((m) => m.photos));
  const info = usePhotoInfo(urls);
  const pages = useMemo(
    () =>
      buildBook(
        ms,
        info,
        { chapters: !trip && ms.length > 3, spreads: s.spreads, seed },
        overrides,
      ),
    [ms, info, trip, s.spreads, seed, overrides],
  );
  const { w, h } = FORMATS[s.format];
  const bleed = s.bleed ? 3 : 0;

  const first = ms[0]?.date;
  const last = ms[ms.length - 1]?.date;
  const ctx: BookContext = {
    theme: s.theme,
    w,
    h,
    margin: s.margin,
    captions: s.captions,
    bleed,
    urls,
    title: s.title || trip || "Diário de viagens",
    subtitle:
      first && last
        ? monthYear(first) === monthYear(last)
          ? monthYear(first)
          : `${monthYear(first)} — ${monthYear(last)}`
        : "",
    dedication: s.dedication,
    ms,
    pages,
  };
  const lowPages = pages.filter((p) => lowestDpi(p, info, ctx) !== null).length;

  const toggle = (id: string) =>
    setExcluded((x) => {
      const n = new Set(x);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Spreads are shown at the width of the screen; printing uses real millimetres.
  const box = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(1000);
  const hasPages = ms.length > 0;
  useLayoutEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxWidth(e!.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [hasPages]);
  const sheetPx = (w + 2 * bleed) * PX_PER_MM;
  const spreadZoom = Math.min(0.9, (boxWidth - 8) / (2 * sheetPx));
  const pageZoom = Math.min(1, boxWidth / sheetPx);
  const [viewing, setViewing] = useState<number | null>(null);

  // Every printable sheet in order: cover, the pages, back cover.
  const sheets: { key: string; node: ReactNode; page?: Page; n?: number }[] = [
    { key: "cover", node: <CoverPage ctx={ctx} /> },
    ...pages.map((p, i) => ({
      key: "key" in p ? p.key : `${p.kind}`,
      page: p,
      n: i + 1,
      node: <BookPage page={p} ctx={ctx} folio={i + 1} />,
    })),
    { key: "back", node: <BackCover ctx={ctx} /> },
  ];
  // Facing pages: page 1 is on the right, opposite the inside of the cover.
  const spreads: ((typeof sheets)[number] | null)[][] = [[sheets[0]!]];
  const inner = sheets.slice(1, -1);
  spreads.push([null, inner[0] ?? null]);
  for (let i = 1; i < inner.length; i += 2) spreads.push([inner[i]!, inner[i + 1] ?? null]);
  spreads.push([sheets[sheets.length - 1]!]);

  const pageTools = (sheet: (typeof sheets)[number]) => {
    const p = sheet.page;
    if (!p) return null;
    const low = lowestDpi(p, info, ctx);
    return (
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2 print:hidden">
        {low !== null ? (
          <span
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900 shadow"
            title={`Esta foto tem resolução para cerca de ${low} dpi neste tamanho. Para imprimir bem convém ${MIN_DPI} dpi ou mais: usa uma foto maior ou um esquema com fotos mais pequenas.`}
          >
            <AlertTriangle className="h-3 w-3" />
            {low} dpi
          </span>
        ) : (
          <span />
        )}
        {p.kind === "photos" && (
          <button
            onClick={() => setOverrides((o) => ({ ...o, [p.key]: nextLayout(p) }))}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium text-foreground opacity-0 shadow transition group-hover:opacity-100"
          >
            <LayoutGrid className="h-3 w-3 text-primary" />
            Trocar esquema
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-28 print:p-0">
      <style>{`@page { size: ${w + 2 * bleed}mm ${h + 2 * bleed}mm; margin: 0; } @media print { html, body { background: #fff !important; background-image: none !important; padding: 0 !important; } .album-print > .album-sheet:not(:last-child) { break-after: page; } }`}</style>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 print:hidden">
        <h1 className="text-5xl">
          O álbum <em className="text-primary">fotográfico</em>
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Escolhe as memórias, o formato e o estilo. As fotos são distribuídas pelas páginas
          sozinhas — depois podes trocar o esquema de cada página.
        </p>

        {/* 1. Content */}
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">1. Memórias</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {trips.length > 0 && (
                <select
                  value={trip}
                  onChange={(e) => setTrip(e.target.value)}
                  className="rounded-full border border-input bg-card px-4 py-2"
                >
                  <option value="">Todas as viagens</option>
                  {trips.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setExcluded(new Set())}
                className="text-primary hover:underline"
              >
                Escolher todas
              </button>
              <button
                onClick={() => setExcluded(new Set(pool.map((m) => m.id)))}
                className="text-muted-foreground hover:underline"
              >
                Tirar todas
              </button>
            </div>
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
                      <img
                        src={thumbs[m.photos[0]]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
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
        </section>

        {/* 2. Design */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl">2. Formato</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {(Object.keys(FORMATS) as FormatId[]).map((id) => {
                const f = FORMATS[id];
                const on = s.format === id;
                const scale = 44 / Math.max(f.w, f.h);
                return (
                  <button
                    key={id}
                    onClick={() => set({ format: id })}
                    aria-pressed={on}
                    className={`flex w-[104px] flex-col items-center gap-2 rounded-xl border p-3 text-center transition ${on ? "border-primary bg-primary/5" : "border-input bg-card hover:border-primary"}`}
                  >
                    <span className="flex h-12 items-center">
                      <span
                        className={`block rounded-[2px] border ${on ? "border-primary bg-primary/20" : "border-muted-foreground/40 bg-muted"}`}
                        style={{ width: f.w * scale, height: f.h * scale }}
                      />
                    </span>
                    <span className="text-xs font-medium">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground">{f.size}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="text-2xl">3. Estilo</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const t = THEMES[id];
                const on = s.theme === id;
                return (
                  <button
                    key={id}
                    onClick={() => set({ theme: id })}
                    aria-pressed={on}
                    className={`w-[150px] rounded-xl border p-3 text-left transition ${on ? "border-primary bg-primary/5" : "border-input bg-card hover:border-primary"}`}
                  >
                    <span
                      className="flex h-10 items-end gap-1 rounded-md p-1.5"
                      style={{ background: t.paper, border: "1px solid rgba(0,0,0,0.08)" }}
                    >
                      <span
                        className="h-full w-1/2 rounded-sm"
                        style={{ background: t.accent, opacity: 0.8 }}
                      />
                      <span className="mb-1 h-1 w-6 rounded" style={{ background: t.ink }} />
                    </span>
                    <span className="mt-2 block text-xs font-medium">{t.label}</span>
                    <span className="block text-[10px] leading-tight text-muted-foreground">
                      {t.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => set({ margin: !s.margin })} className={chip(s.margin)}>
                {s.margin ? "Fotos com margem" : "Fotos até ao bordo"}
              </button>
              <button onClick={() => set({ spreads: !s.spreads })} className={chip(s.spreads)}>
                Panorâmicas em dupla página
              </button>
              <button onClick={() => set({ captions: !s.captions })} className={chip(s.captions)}>
                Legendas com lugar e data
              </button>
              <button
                onClick={() => {
                  setSeed((n) => n + 1);
                  setOverrides({});
                }}
                className={`${chip(false)} inline-flex items-center gap-1`}
              >
                <Shuffle className="h-3 w-3" />
                Variar esquemas
              </button>
            </div>
          </div>
        </section>

        {/* 3. Text and print */}
        <section className="mt-6">
          <h2 className="text-2xl">4. Capa e impressão</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <input
              value={s.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={`Título: ${trip || "Diário de viagens"}`}
              className="rounded-full border border-input bg-card px-4 py-2 text-sm"
            />
            <input
              value={s.dedication}
              onChange={(e) => set({ dedication: e.target.value })}
              placeholder="Dedicatória (opcional)"
              className="rounded-full border border-input bg-card px-4 py-2 text-sm"
            />
            <label
              className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-xs"
              title="Junta 3 mm à volta de cada página para a gráfica cortar. Usa só se a gráfica pedir."
            >
              <input
                type="checkbox"
                checked={s.bleed}
                onChange={(e) => set({ bleed: e.target.checked })}
                className="accent-primary"
              />
              Sangria de 3 mm (gráfica)
            </label>
            <button
              onClick={() => window.print()}
              disabled={!ms.length}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <strong className="font-medium text-foreground">
              {plural(ms.length, "memória", "memórias")}
            </strong>
            {" · "}
            {pages.length} páginas + capa e contracapa · {FORMATS[s.format].size}
            {pages.length < 24 && " · os livros impressos costumam pedir 24 páginas no mínimo"}
          </p>
          {lowPages > 0 && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              {plural(lowPages, "página tem", "páginas têm")} fotos com pouca resolução para este
              tamanho (marcadas na pré-visualização).
            </p>
          )}
        </section>
      </div>

      {ms.length > 0 && (
        <div ref={box} className="mx-auto mt-10 max-w-6xl px-6 print:hidden">
          {/* Computer: facing pages, like an open book. */}
          <div className="hidden space-y-10 md:block">
            {spreads.map((pair, i) => (
              <figure key={i} className="flex flex-col items-center">
                <div
                  className="relative flex shadow-[0_24px_60px_-28px_rgba(20,40,55,0.6)]"
                  style={{
                    zoom: pair.length === 1 ? Math.min(pageZoom, spreadZoom * 1.4) : spreadZoom,
                  }}
                >
                  {pair.map((sheet, j) =>
                    sheet ? (
                      <div key={sheet.key} className="group relative">
                        {sheet.node}
                        {pageTools(sheet)}
                      </div>
                    ) : (
                      <div
                        key={`empty-${j}`}
                        style={{
                          width: `${w + 2 * bleed}mm`,
                          height: `${h + 2 * bleed}mm`,
                          background: THEMES[s.theme].paper,
                          opacity: 0.6,
                        }}
                      />
                    ),
                  )}
                  {pair.length === 2 && (
                    // The fold of the book.
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[18mm] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.16)_48%,rgba(0,0,0,0.22)_50%,rgba(0,0,0,0.16)_52%,transparent)]" />
                  )}
                </div>
                <figcaption className="mt-3 text-xs text-muted-foreground">
                  {i === 0
                    ? "Capa"
                    : i === spreads.length - 1
                      ? "Contracapa"
                      : pair
                          .map((x) => x?.n)
                          .filter(Boolean)
                          .join(" – ")}
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Phone: one page per screen; tapping opens it full screen, turned sideways. */}
          <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:hidden">
            {sheets.map((sheet, i) => (
              <button
                key={sheet.key}
                onClick={() => setViewing(i)}
                className="relative shrink-0 snap-center text-left"
                aria-label={`Abrir a página ${i + 1} em ecrã inteiro`}
              >
                <div style={{ zoom: pageZoom }}>{sheet.node}</div>
                <span className="mt-2 block text-center text-xs text-muted-foreground">
                  {i === 0 ? "Capa" : i === sheets.length - 1 ? "Contracapa" : `Página ${sheet.n}`}{" "}
                  · toca para ampliar
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* What gets printed: every sheet, at its real size. */}
      {ms.length > 0 && (
        <div className="album-print hidden print:block">
          {sheets.map((sheet) => (
            <Fragment key={sheet.key}>{sheet.node}</Fragment>
          ))}
        </div>
      )}

      {viewing !== null && sheets[viewing] && (
        <PageViewer
          index={viewing}
          total={sheets.length}
          onChange={setViewing}
          size={{ w: w + 2 * bleed, h: h + 2 * bleed }}
        >
          {sheets[viewing].node}
        </PageViewer>
      )}
    </div>
  );
}

/** One album page full screen, turned sideways when that makes it bigger. */
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
  const fit = (pw: number, ph: number) =>
    Math.min(pw / (size.w * PX_PER_MM), ph / (size.h * PX_PER_MM));
  const upright = fit(vp.w - 24, vp.h - 96);
  const turned = fit(vp.h - 96, vp.w - 24);
  const sideways = turned > upright * 1.15;
  const scale = sideways ? turned : upright;
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
