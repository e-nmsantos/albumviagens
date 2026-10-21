import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { MemoryForm } from "@/components/MemoryForm";

export const Route = createFileRoute("/_authenticated/nova")({
  head: () => ({
    meta: [
      { title: "Nova memória — Memórias" },
      { name: "description", content: "Regista uma nova memória com fotos, texto e lugar." },
      { property: "og:title", content: "Nova memória — Memórias" },
      { property: "og:description", content: "Regista uma nova memória de viagem." },
    ],
  }),
  validateSearch: z.object({
    place: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  component: NewMemory,
});

function NewMemory() {
  const s = Route.useSearch();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <MemoryForm prefill={s.place ? { place: s.place, lat: s.lat, lng: s.lng } : undefined} />
    </div>
  );
}
