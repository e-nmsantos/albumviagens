import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { WorldMap } from "@/components/WorldMap";
import { countryOf, totalKm, useMemories } from "@/lib/memories";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({
    meta: [
      { title: "As minhas viagens em números — Memórias" },
      {
        name: "description",
        content: "Países visitados, quilómetros percorridos e anos de viagem.",
      },
      { property: "og:title", content: "As minhas viagens em números — Memórias" },
      { property: "og:description", content: "Países visitados e quilómetros percorridos." },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { data: ms = [] } = useMemories();
  const byCountry = new Map<string, number>();
  ms.forEach((m) =>
    byCountry.set(countryOf(m.place), (byCountry.get(countryOf(m.place)) ?? 0) + 1),
  );
  const countries = [...byCountry.entries()].sort((a, b) => b[1] - a[1]);
  const namedTrips = new Set(ms.map((m) => m.trip?.trim()).filter(Boolean));
  const standaloneTrips = ms.filter((m) => !m.trip?.trim()).length;
  const trips = namedTrips.size + standaloneTrips;
  const years = new Set(ms.map((m) => m.date.slice(0, 4))).size;
  const photos = ms.reduce((n, m) => n + m.photos.length, 0);
  const km = totalKm(ms);
  const stats = [
    { n: countries.length, l: countries.length === 1 ? "país" : "países" },
    { n: km.toLocaleString("pt-PT"), l: "km entre lugares" },
    { n: ms.length, l: ms.length === 1 ? "memória" : "memórias" },
    { n: trips, l: trips === 1 ? "viagem" : "viagens" },
    { n: photos, l: photos === 1 ? "foto" : "fotos" },
    { n: years, l: years === 1 ? "ano a viajar" : "anos a viajar" },
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
              <p className="font-display text-6xl text-primary">{s.n}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Os quilómetros são a distância em linha reta entre as memórias, por ordem de data.
        </p>
        <section className="mt-12">
          <h2 className="mb-4 text-3xl">Onde já estive</h2>
          <WorldMap
            points={ms.flatMap((m) =>
              m.lat != null && m.lng != null ? [{ lat: m.lat, lng: m.lng }] : [],
            )}
          />
        </section>
        {countries.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl">Países</h2>
            <ul className="mt-4 space-y-3">
              {countries.map(([c, n]) => (
                <li key={c} className="flex items-center gap-4">
                  <span className="w-40 shrink-0">{c}</span>
                  <span
                    className="h-2 rounded-full bg-sage"
                    style={{ width: `${(n / (countries[0]?.[1] ?? 1)) * 60}%` }}
                  />
                  <span className="text-sm text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
