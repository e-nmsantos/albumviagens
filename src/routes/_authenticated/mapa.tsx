import { createFileRoute, ClientOnly, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MemoryMap } from "@/components/MemoryMap";
import { tripNames, useMemories } from "@/lib/memories";
import { plural } from "@/lib/utils";
import { useWishes } from "@/lib/wishes";
import { features } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de viagens — Memórias" },
      {
        name: "description",
        content: "Todos os lugares por onde passou, num só mapa, com o percurso de cada viagem.",
      },
      { property: "og:title", content: "Mapa de viagens — Memórias" },
      { property: "og:description", content: "Todos os lugares por onde passou, num só mapa." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { data: items = [] } = useMemories();
  const nav = useNavigate();
  const { data: allWishes = [] } = useWishes();
  const wishes = features.wishes ? allWishes : [];
  const [showWishes, setShowWishes] = useState(true);
  const [trip, setTrip] = useState("");
  const trips = tripNames(items);
  const shown = trip ? items.filter((m) => m.trip?.trim() === trip) : items;
  const count = shown.filter((m) => m.lat != null).length;
  // A route line is only drawn for trips with at least two places on the map.
  const hasRoutes = tripNames(shown).some(
    (t) => shown.filter((m) => m.trip?.trim() === t && m.lat != null && m.lng != null).length > 1,
  );
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl">
              O mapa das <em className="text-primary">memórias</em>
            </h1>
            <p className="mt-2 text-muted-foreground">
              {plural(count, "lugar marcado", "lugares marcados")}. Toca num ponto para abrir a
              memória.
              {hasRoutes && " As linhas ligam os lugares de cada viagem, por ordem de data."}
              {features.wishes && " Os pontos verdes são lugares que queres visitar."}
            </p>
            {features.wishes && (
              <label className="mt-3 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showWishes}
                  onChange={(e) => setShowWishes(e.target.checked)}
                  className="accent-primary"
                />
                Mostrar a lista de desejos
              </label>
            )}
          </div>
          {trips.length > 0 && (
            <select
              value={trip}
              onChange={(e) => setTrip(e.target.value)}
              className="rounded-full border border-input bg-card px-4 py-2 text-sm"
            >
              <option value="">Todas as viagens</option>
              {trips.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
        <div className="polaroid mt-8">
          <ClientOnly fallback={<div className="h-[55vh] bg-muted md:h-[70vh]" />}>
            <MemoryMap
              memories={shown}
              wishes={showWishes ? wishes.filter((w) => !w.done) : []}
              showRoutes
              className="h-[55vh] w-full bg-muted md:h-[70vh]"
              onSelect={(id) => nav({ to: "/memoria/$id", params: { id } })}
            />
          </ClientOnly>
        </div>
      </section>
    </div>
  );
}
