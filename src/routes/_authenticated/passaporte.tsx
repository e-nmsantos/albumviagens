import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useMemories, countryOf, formatDate } from "@/lib/memories";
import { usePhotoUrls } from "@/lib/photos";
import { Globe, Compass, Sparkles, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/passaporte")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Passaporte de viagens — Memórias" },
      {
        name: "description",
        content:
          "O teu passaporte digital com carimbos colecionáveis de todos os países e cidades visitados.",
      },
    ],
  }),
  component: PassportPage,
});

// Color themes for authentic immigration rubber stamps
const STAMP_STYLES = [
  {
    border: "border-teal-700/80 text-teal-800 dark:border-teal-400 dark:text-teal-300",
    bg: "bg-teal-500/5",
    ring: "ring-teal-500/20",
  },
  {
    border: "border-blue-800/80 text-blue-900 dark:border-blue-400 dark:text-blue-300",
    bg: "bg-blue-500/5",
    ring: "ring-blue-500/20",
  },
  {
    border: "border-teal-800/80 text-teal-900 dark:border-teal-400 dark:text-teal-300",
    bg: "bg-teal-500/5",
    ring: "ring-teal-500/20",
  },
  {
    border: "border-indigo-800/80 text-indigo-900 dark:border-indigo-400 dark:text-indigo-300",
    bg: "bg-indigo-500/5",
    ring: "ring-indigo-500/20",
  },
  {
    border: "border-sky-800/80 text-sky-900 dark:border-sky-400 dark:text-sky-300",
    bg: "bg-sky-500/5",
    ring: "ring-sky-500/20",
  },
];

function PassportPage() {
  const { data: memories = [] } = useMemories();

  // One stamp per place visited, dated with the first visit.
  const stamps = useMemo(() => {
    const seen = new Set<string>();
    return [...memories]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((m) => {
        const key = m.place.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((m) => ({
        id: m.id,
        place: m.place.split(",")[0]?.trim() || m.place,
        country: countryOf(m.place),
        date: formatDate(m.date),
      }));
  }, [memories]);

  const totalCountries = new Set(memories.map((m) => countryOf(m.place))).size;
  const oldest = [...memories].sort((a, b) => a.date.localeCompare(b.date))[0];
  const firstYear = oldest?.date.slice(0, 4) ?? "—";
  const portrait = memories.find((m) => m.photos[0])?.photos[0];
  const portraitUrl = usePhotoUrls([portrait])[portrait ?? ""];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-24">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 pt-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-6 print:hidden">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Coleção de carimbos</span>
            </div>
            <h1 className="mt-1 font-serif text-3xl md:text-4xl">O teu passaporte de viagens</h1>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            <Printer className="h-4 w-4 text-primary" />
            <span>Imprimir</span>
          </button>
        </div>

        {/* PASSPORT BOOK CONTAINER */}
        <div className="relative mx-auto overflow-hidden rounded-3xl border border-slate-300 bg-[#f7fafb] shadow-2xl dark:border-slate-800 dark:bg-[#161d22] print:shadow-none print:border-none">
          {/* Top Banner / Leather Border Effect */}
          <div className="bg-[#1c2333] px-8 py-6 text-center text-sky-200 border-b-4 border-sky-500/60 shadow-inner">
            <div className="flex items-center justify-center gap-3">
              <Globe className="h-7 w-7 text-sky-400 animate-pulse" />
              <span className="font-serif text-xl tracking-[0.25em] uppercase font-medium">
                Passaporte de Memórias
              </span>
            </div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-sky-300/80 mt-1 font-mono">
              Documento de viagem · coleção pessoal
            </p>
          </div>

          <div className="grid md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-300 dark:divide-slate-800">
            {/* LEFT PAGE: Personal Identity Page */}
            <div className="p-8 md:col-span-5 flex flex-col justify-between bg-slate-50/60 dark:bg-slate-900/40">
              <div>
                <div className="flex items-center justify-between border-b border-slate-300 pb-3 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Página do titular
                  </span>
                  <span className="font-mono text-xs font-bold text-primary">
                    PASSAPORTE Nº {memories.length}24-X
                  </span>
                </div>

                {/* Identity Layout */}
                <div className="mt-6 flex gap-4">
                  {/* Photo Box */}
                  <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-slate-400 bg-slate-200 dark:border-slate-700 dark:bg-slate-800 shadow-inner">
                    {portraitUrl ? (
                      <img
                        src={portraitUrl}
                        alt="Viajante"
                        className="h-full w-full object-cover grayscale contrast-125"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                        <Compass className="h-8 w-8" />
                        <span className="text-[10px] uppercase font-bold mt-1">Viajante</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-sky-500/10 pointer-events-none" />
                  </div>

                  {/* Personal info */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Titular
                      </span>
                      <span className="font-serif text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Viajante do Mundo
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nacionalidade
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Cidadão do mundo (PT)
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Primeira viagem
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Desde {firstYear}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Passport Key Statistics */}
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-300 dark:border-slate-800 pt-5">
                  <div className="rounded-xl border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-800/40 p-3 text-center">
                    <span className="block font-serif text-2xl font-bold text-primary">
                      {totalCountries}
                    </span>
                    <span className="text-[11px] text-slate-500">Países carimbados</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-800/40 p-3 text-center">
                    <span className="block font-serif text-2xl font-bold text-forest">
                      {stamps.length}
                    </span>
                    <span className="text-[11px] text-slate-500">Lugares</span>
                  </div>
                </div>
              </div>

              {/* Machine Readable Zone (MRZ) */}
              <div className="mt-8 border-t border-slate-300 pt-4 dark:border-slate-800 font-mono text-[10px] tracking-widest text-slate-500 select-all overflow-x-auto whitespace-nowrap">
                P&lt;PRTVIAJANTE&lt;&lt;EXPLORADOR&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                <br />
                M9981240&lt;4PRT{firstYear}
                0101M2510217&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;06
              </div>
            </div>

            {/* RIGHT PAGE: Stamps Grid (Páginas de Vistos e Carimbos) */}
            <div className="p-8 md:col-span-7 relative">
              <div className="flex items-center justify-between border-b border-slate-300 pb-3 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Vistos e carimbos de entrada
                </span>
                <span className="text-xs text-slate-500 font-serif italic">Páginas 4 e 5</span>
              </div>

              {/* Grid of Authentic Rubber Stamps */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                {stamps.map((stamp, idx) => {
                  const style = STAMP_STYLES[idx % STAMP_STYLES.length]!;
                  const rotations = [
                    "-rotate-3",
                    "rotate-2",
                    "-rotate-6",
                    "rotate-4",
                    "-rotate-2",
                    "rotate-1",
                  ];
                  const rot = rotations[idx % rotations.length];
                  const isOval = idx % 3 === 0;
                  const isHex = idx % 3 === 1;

                  return (
                    <div
                      key={stamp.id}
                      className={`group relative flex flex-col items-center justify-center p-3 transition-transform duration-300 hover:scale-105 hover:rotate-0 cursor-default ${rot}`}
                    >
                      {/* Stamp Border Shape */}
                      <div
                        className={`w-full text-center border-2 border-dashed ${style.border} ${style.bg} ${
                          isOval
                            ? "rounded-full py-4 px-2"
                            : isHex
                              ? "rounded-2xl p-3 border-double border-4"
                              : "rounded-lg p-3"
                        } shadow-sm ring-2 ${style.ring}`}
                      >
                        <div className="text-[9px] uppercase font-bold tracking-widest opacity-80">
                          ★ ENTRADA ★
                        </div>
                        <h4 className="font-serif text-sm font-bold uppercase tracking-tight mt-1 leading-tight">
                          {stamp.place}
                        </h4>
                        <p className="text-[10px] font-mono uppercase font-semibold mt-0.5">
                          {stamp.country}
                        </p>
                        <div className="mt-1.5 border-t border-current/30 pt-1 text-[9px] font-mono tracking-wider opacity-90">
                          {stamp.date}
                        </div>
                      </div>

                      <Link
                        to="/memoria/$id"
                        params={{ id: stamp.id }}
                        className="mt-1.5 opacity-70 group-hover:opacity-100 text-[10px] text-primary hover:underline transition-opacity"
                      >
                        Ver no diário →
                      </Link>
                    </div>
                  );
                })}
              </div>

              {stamps.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <Compass className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p className="text-sm font-serif italic">Nenhum carimbo registado ainda.</p>
                  <p className="text-xs mt-1">
                    Cria a tua primeira memória no diário para receberes um carimbo oficial!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
