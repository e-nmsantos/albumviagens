import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { countryCodeOf } from "@/lib/countries";
import { countryOf, totalKm, tripNames, useMemories } from "@/lib/memories";
import { plural } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({
    meta: [
      { title: "As minhas viagens em números — Fica na Memória" },
      {
        name: "description",
        content: "Países visitados, quilómetros percorridos e anos de viagem.",
      },
      { property: "og:title", content: "As minhas viagens em números — Fica na Memória" },
      { property: "og:description", content: "Países visitados e quilómetros percorridos." },
    ],
  }),
  component: Stats,
});

/** The country a memory is in, named the same way everywhere (code first, then the text). */
function countryName(place: string) {
  const code = countryCodeOf(place);
  return code ? (regionNames.of(code) ?? countryOf(place)) : countryOf(place);
}
const regionNames = new Intl.DisplayNames(["pt-PT"], { type: "region" });

function Stats() {
  const { data: ms = [] } = useMemories();
  const byCountry = new Map<string, number>();
  ms.forEach((m) =>
    byCountry.set(countryName(m.place), (byCountry.get(countryName(m.place)) ?? 0) + 1),
  );
  const countries = [...byCountry.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const trips = tripNames(ms).length + ms.filter((m) => !m.trip?.trim()).length;
  const years = [...new Set(ms.map((m) => m.date.slice(0, 4)))].sort();
  const photos = ms.reduce((n, m) => n + m.photos.length, 0);
  const km = totalKm(ms);
  const stats = [
    { n: countries.length, l: countries.length === 1 ? "país" : "países", hint: "visitados" },
    {
      n: km.toLocaleString("pt-PT"),
      l: "km entre lugares",
      hint: "em linha reta, por ordem de data",
    },
    {
      n: ms.length,
      l: ms.length === 1 ? "memória" : "memórias",
      hint: "momentos guardados no diário",
    },
    {
      n: trips,
      l: trips === 1 ? "viagem" : "viagens",
      hint: "memórias com o mesmo nome de viagem contam como uma",
    },
    { n: photos, l: photos === 1 ? "foto" : "fotos", hint: "em todas as memórias" },
    {
      n: years.length,
      l: years.length === 1 ? "ano com viagens" : "anos com viagens",
      hint: years[0] ? `desde ${years[0]}` : "",
    },
  ];
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <h1 className="text-5xl">
          As viagens em <em className="text-primary">números</em>
        </h1>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.l} className="polaroid">
              <p className="font-display text-5xl text-primary md:text-6xl">{s.n}</p>
              <p className="mt-1 text-sm">{s.l}</p>
              {s.hint && <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>}
            </div>
          ))}
        </div>
        <section className="mt-12">
          <h2 className="mb-4 text-3xl">Onde já estive</h2>
          <WorldMap places={ms} />
        </section>
        {countries.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl">Países</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Parte das memórias passada em cada país.
            </p>
            <ul className="mt-4 space-y-3">
              {countries.map(([c, n]) => {
                const pct = Math.round((n / ms.length) * 100);
                return (
                  <li
                    key={c}
                    className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 sm:grid-cols-[10rem_1fr_auto]"
                  >
                    <span className="truncate">{c}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {plural(n, "memória", "memórias")} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
