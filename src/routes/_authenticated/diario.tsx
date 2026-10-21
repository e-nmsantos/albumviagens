import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import {
  countryOf,
  formatDate,
  onThisDay,
  tripNames,
  useMemories,
  useSaveMemory,
} from "@/lib/memories";
import { resizeImage, uploadPhoto, usePhotoUrls } from "@/lib/photos";
import { plural } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/diario")({
  head: () => ({
    meta: [
      { title: "O meu diário — Fica na Memória" },
      { name: "description", content: "Todas as tuas memórias de viagem num mosaico de fotos." },
      { property: "og:title", content: "O meu diário — Fica na Memória" },
      { property: "og:description", content: "Todas as tuas memórias de viagem." },
    ],
  }),
  component: Diary,
});

const sel =
  "rounded-full border border-input bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Diary() {
  const { data: items, isPending: isLoading } = useMemories();
  const all = useMemo(() => items ?? [], [items]);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [trip, setTrip] = useState("");
  const urls = usePhotoUrls(all.map((m) => m.photos[0]));

  const countries = [...new Set(all.map((m) => countryOf(m.place)))].sort();
  const years = [...new Set(all.map((m) => m.date.slice(0, 4)))].sort().reverse();
  const trips = tripNames(all);
  const filtering = !!(q || country || year || trip);
  const shown = useMemo(
    () =>
      all.filter(
        (m, i) =>
          // The newest memory is already the big feature above, unless the person is searching.
          (filtering || i > 0) &&
          (!country || countryOf(m.place) === country) &&
          (!year || m.date.startsWith(year)) &&
          (!trip || m.trip?.trim() === trip) &&
          (!q || `${m.title} ${m.place} ${m.text}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [all, filtering, q, country, year, trip],
  );
  const today = onThisDay(all);
  const first = today[0];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 pb-8 pt-4">
        <p className="text-xs uppercase tracking-[0.3em] text-forest animate-in fade-in">
          {plural(all.length, "memória", "memórias")} ·{" "}
          {plural(new Set(all.map((m) => countryOf(m.place))).size, "país", "países")}
        </p>
        <h1 className="mt-3 max-w-3xl text-5xl leading-[1.05] animate-in fade-in slide-in-from-bottom-3 duration-700 md:text-7xl">
          Os lugares que <em className="text-primary">ficaram</em> comigo.
        </h1>
        {all[0] && (
          <Link
            to="/memoria/$id"
            params={{ id: all[0].id }}
            className="group relative mt-8 block overflow-hidden rounded-2xl bg-muted shadow-xl animate-in fade-in zoom-in-95 duration-700"
          >
            {all[0].photos[0] && urls[all[0].photos[0]] && (
              <img
                src={urls[all[0].photos[0]]}
                alt={all[0].title}
                className="h-[42vh] w-full object-cover transition-transform duration-[1.5s] group-hover:scale-105 md:h-[52vh]"
              />
            )}
            {!all[0].photos[0] && <div className="h-[30vh]" />}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/10 to-transparent" />
            <div className="absolute bottom-0 p-6 text-primary-foreground md:p-10">
              <p className="text-xs uppercase tracking-[0.3em] opacity-80">A mais recente</p>
              <p className="mt-1 font-display text-4xl leading-none md:text-6xl">{all[0].title}</p>
              <p className="mt-2 text-sm opacity-90">
                {all[0].place} · {formatDate(all[0].date)}
              </p>
            </div>
          </Link>
        )}
        <ImportLocal />
        {first && (
          <Link
            to="/memoria/$id"
            params={{ id: first.id }}
            className="mt-8 flex items-center gap-4 rounded-md border border-primary/30 bg-card p-4 hover:border-primary"
          >
            <span className="font-display text-3xl italic text-primary">Neste dia</span>
            <span className="text-sm">
              Há {new Date().getFullYear() - Number(first.date.slice(0, 4))} ano(s):{" "}
              <strong className="font-medium">{first.title}</strong> em {first.place}
              {today.length > 1 ? ` e mais ${today.length - 1}` : ""}
            </span>
          </Link>
        )}
        {all.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar…"
              className={`${sel} min-w-52 flex-1`}
            />
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={sel}>
              <option value="">Todos os países</option>
              {countries.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={sel}>
              <option value="">Todos os anos</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            {trips.length > 0 && (
              <select value={trip} onChange={(e) => setTrip(e.target.value)} className={sel}>
                <option value="">Todas as viagens</option>
                {trips.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </section>
      <main className="mx-auto max-w-6xl px-6 pb-24">
        {isLoading && <p className="text-muted-foreground">A abrir o diário…</p>}
        {!isLoading && all.length === 0 && (
          <p className="py-20 text-center text-muted-foreground">
            Ainda sem memórias.{" "}
            <Link to="/nova" className="text-primary underline">
              Cria a primeira
            </Link>
            .
          </p>
        )}
        {filtering && shown.length === 0 && (
          <p className="py-10 text-muted-foreground">Nada encontrado com estes filtros.</p>
        )}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {shown.map((m, i) => (
            <Link
              key={m.id}
              to="/memoria/$id"
              params={{ id: m.id }}
              className="polaroid mb-6 block break-inside-avoid animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500"
              style={{
                rotate: `${((i % 3) - 1) * 0.6}deg`,
                animationDelay: `${Math.min(i, 12) * 60}ms`,
              }}
            >
              {m.photos[0] && urls[m.photos[0]] ? (
                <img src={urls[m.photos[0]]} alt={m.title} loading="lazy" className="w-full" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-muted font-display text-2xl italic text-muted-foreground">
                  {m.place}
                </div>
              )}
              <div className="px-1 pt-3">
                {m.trip && (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-forest">{m.trip}</p>
                )}
                <h2 className="text-2xl leading-tight">{m.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.place} · {formatDate(m.date)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

const LEGACY_KEY = "memorias-viagem-v1";
type LegacyMemory = {
  title: string;
  place: string;
  date: string;
  text?: string;
  photos?: string[];
  lat?: number | null;
  lng?: number | null;
};

function readLegacy(): LegacyMemory[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    return Array.isArray(v) ? (v as LegacyMemory[]) : [];
  } catch {
    return [];
  }
}

/** Offers to bring in memories saved by the very first version of the app (kept in localStorage). */
function ImportLocal() {
  const [local, setLocal] = useState<LegacyMemory[]>([]);
  const [busy, setBusy] = useState(false);
  const save = useSaveMemory();
  useEffect(() => setLocal(readLegacy()), []);
  if (!local.length) return null;

  function forget(remaining: LegacyMemory[]) {
    try {
      if (remaining.length) localStorage.setItem(LEGACY_KEY, JSON.stringify(remaining));
      else localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* storage unavailable: nothing to clean up */
    }
    setLocal(remaining);
  }

  async function run() {
    setBusy(true);
    let left = [...local];
    try {
      for (const m of local) {
        const photos: string[] = [];
        for (const src of m.photos ?? []) photos.push(await uploadPhoto(await resizeImage(src)));
        await save.mutateAsync({
          title: m.title,
          place: m.place,
          date: m.date,
          text: m.text ?? "",
          photos,
          lat: m.lat ?? null,
          lng: m.lng ?? null,
          trip: null,
          is_public: false,
        });
        left = left.slice(1);
      }
      toast.success("Memórias importadas.");
    } catch {
      toast.error("Não foi possível importar tudo — pode tentar outra vez com as que faltam.");
    } finally {
      forget(left);
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md bg-secondary p-4 text-sm">
      Encontrámos {local.length} memórias de uma versão antiga desta app.
      <button
        disabled={busy}
        onClick={run}
        className="rounded-full bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {busy ? "A importar…" : "Importar para o diário"}
      </button>
      <button onClick={() => forget([])} className="text-muted-foreground hover:text-foreground">
        Ignorar
      </button>
    </div>
  );
}
