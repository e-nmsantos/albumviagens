import { createFileRoute, ClientOnly, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Calendar,
  Camera,
  FileText,
  Image as ImageIcon,
  Luggage,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { MemoryMap } from "@/components/MemoryMap";
import { BudgetTab } from "@/components/planner/BudgetTab";
import { ItineraryTab } from "@/components/planner/ItineraryTab";
import { NotesTab } from "@/components/planner/NotesTab";
import { PackingTab } from "@/components/planner/PackingTab";
import { ReservationsTab } from "@/components/planner/ReservationsTab";
import { TripDialog } from "@/components/planner/TripDialog";
import { TripPrintBook } from "@/components/planner/TripPrintBook";
import { EmptyState } from "@/components/planner/ui";
import type { TripUpdate } from "@/components/planner/types";
import { statusLabel, tripDatesLabel, tripStatus } from "@/lib/dates";
import { deletePhotos, usePhotoUrls } from "@/lib/photos";
import { tripPhotos, useTripMutations, useTrips, type TripPlan } from "@/lib/trips";

export const Route = createFileRoute("/_authenticated/planeador")({
  validateSearch: z.object({ trip: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Planeador de viagens — Memórias" },
      {
        name: "description",
        content: "Itinerários dia a dia, reservas, despesas, mala e mapa de cada viagem.",
      },
    ],
  }),
  component: TripPlannerPage,
});

const TABS = [
  { id: "itinerary", label: "Itinerário", icon: Calendar },
  { id: "reservations", label: "Reservas", icon: Ticket },
  { id: "budget", label: "Orçamento", icon: Wallet },
  { id: "packing", label: "Mala", icon: Luggage },
  { id: "map", label: "Mapa", icon: MapIcon },
  { id: "photos", label: "Fotos", icon: ImageIcon },
  { id: "notes", label: "Notas", icon: FileText },
] as const;
type Tab = (typeof TABS)[number]["id"];

function TripPlannerPage() {
  const { trip: tripParam } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: trips = [], isPending, error } = useTrips();
  const { updateTrip, deleteTrip } = useTripMutations();
  const [tab, setTab] = useState<Tab>("itinerary");
  const [dialog, setDialog] = useState<"new" | "edit" | null>(null);

  const trip = trips.find((t) => t.id === tripParam) ?? trips[0] ?? null;
  const urls = usePhotoUrls(trip ? tripPhotos(trip) : []);
  const select = useCallback(
    (id: string) => navigate({ search: { trip: id }, replace: true }),
    [navigate],
  );

  const update: TripUpdate = useCallback(
    (change) =>
      trip
        ? updateTrip.mutateAsync({ id: trip.id, change }).then(
            () => true,
            () => false,
          )
        : Promise.resolve(false),
    [trip, updateTrip],
  );

  async function removeTrip(t: TripPlan) {
    if (!confirm(`Apagar a viagem “${t.title}” com o roteiro, reservas, despesas e fotos?`)) return;
    try {
      await deleteTrip.mutateAsync(t.id);
      await deletePhotos(tripPhotos(t));
      toast("Viagem apagada.");
      navigate({ search: {}, replace: true });
    } catch {
      // Shown by the global mutation error handler.
    }
  }

  const mapPins = useMemo(
    () =>
      (trip?.days ?? [])
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => ({
          id: d.id,
          title: `Dia ${d.day_number}: ${d.title}`,
          date: d.time,
          lat: d.lat ?? null,
          lng: d.lng ?? null,
          trip: trip!.title,
        })),
    [trip],
  );

  const counts: Partial<Record<Tab, string>> = trip
    ? {
        itinerary: String(trip.days.length),
        reservations: String(trip.reservations.length),
        ...(trip.packing_list.length
          ? {
              packing: `${Math.round((trip.packing_list.filter((i) => i.packed).length / trip.packing_list.length) * 100)}%`,
            }
          : {}),
      }
    : {};

  return (
    <div className="min-h-screen bg-background pb-24">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pt-2">
        {isPending ? (
          <p className="py-10 text-muted-foreground">A abrir o planeador…</p>
        ) : error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
            {error.message}
          </p>
        ) : !trip ? (
          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
            title="Ainda não tens viagens planeadas"
          >
            <button
              onClick={() => setDialog("new")}
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
            >
              + Planear a primeira viagem
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between print:hidden">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Planeador
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={trip.id}
                    onChange={(e) => select(e.target.value)}
                    aria-label="Escolher viagem"
                    className="min-w-0 flex-1 cursor-pointer truncate border-b-2 md:flex-none border-primary/30 bg-transparent pr-8 font-display text-3xl italic outline-none transition-colors hover:border-primary md:text-4xl"
                  >
                    {trips.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        className="bg-card font-sans text-base not-italic"
                      >
                        {t.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setDialog("edit")}
                    aria-label="Editar viagem"
                    title="Editar viagem"
                    className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void removeTrip(trip)}
                    aria-label="Apagar viagem"
                    title="Apagar viagem"
                    className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{tripDatesLabel(trip) || "Datas por definir"}</span>
                  {statusLabel(tripStatus(trip)) && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {statusLabel(tripStatus(trip))}
                    </span>
                  )}
                  <span className="text-muted-foreground/50">|</span>
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{trip.destination}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setDialog("new")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Nova viagem
                </button>
                <button
                  onClick={() => window.print()}
                  title="Imprimir ou guardar o roteiro em PDF"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Printer className="h-4 w-4 text-primary" />
                  PDF
                </button>
              </div>
            </div>

            <div
              role="tablist"
              className="scrollbar-none mt-6 flex overflow-x-auto border-b border-border text-sm print:hidden"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  {counts[t.id] && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {counts[t.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === "itinerary" && <ItineraryTab trip={trip} urls={urls} update={update} />}
            {tab === "reservations" && <ReservationsTab trip={trip} update={update} />}
            {tab === "budget" && <BudgetTab trip={trip} update={update} />}
            {tab === "packing" && <PackingTab trip={trip} update={update} />}
            {tab === "notes" && <NotesTab key={trip.id} trip={trip} update={update} />}
            {tab === "map" && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-border shadow-md print:hidden">
                {mapPins.length === 0 && (
                  <p className="bg-secondary p-3 text-center text-xs text-muted-foreground">
                    Nenhuma paragem tem lugar no mapa ainda.
                  </p>
                )}
                <ClientOnly fallback={<div className="h-[65vh] bg-muted" />}>
                  <MemoryMap memories={mapPins} showRoutes className="h-[65vh] w-full" />
                </ClientOnly>
              </div>
            )}
            {tab === "photos" && <PhotosGrid trip={trip} urls={urls} />}

            <TripPrintBook trip={trip} urls={urls} />
          </>
        )}
      </main>

      {dialog && (
        <TripDialog
          trip={dialog === "edit" ? (trip ?? undefined) : undefined}
          onClose={() => setDialog(null)}
          onSaved={select}
        />
      )}
    </div>
  );
}

function PhotosGrid({ trip, urls }: { trip: TripPlan; urls: Record<string, string> }) {
  const days = trip.days.filter((d) => d.photo);
  if (!days.length) {
    return (
      <div className="mt-8 print:hidden">
        <EmptyState icon={<Camera className="h-10 w-10" />} title="Ainda sem fotos neste roteiro">
          <p className="mt-1 text-xs">
            Ao adicionar uma paragem, podes anexar uma foto ou captura de ecrã.
          </p>
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 print:hidden">
      {days.map((d) => (
        <div key={d.id} className="polaroid">
          {urls[d.photo!] ? (
            <img
              src={urls[d.photo!]}
              alt={d.title}
              className="h-44 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="h-44 rounded-lg bg-muted" />
          )}
          <p className="mt-2 truncate text-xs font-semibold">{d.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{d.place}</p>
        </div>
      ))}
    </div>
  );
}
