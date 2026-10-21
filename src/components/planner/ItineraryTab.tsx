import { useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { suggestStops } from "@/lib/ai.functions";
import { dateOfDay, formatWeekday, tripDatesLabel, tripLength } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { geocodePlace } from "@/lib/geocode";
import { deletePhotos, resizeImage, uploadPhoto, usePhotoUrls } from "@/lib/photos";
import { tripOps, type ItineraryDay, type TripPlan } from "@/lib/trips";
import { plural } from "@/lib/utils";
import { EmptyState, Modal, ModalActions } from "./ui";
import { input, label } from "./styles";
import type { TripUpdate } from "./types";

export function ItineraryTab({
  trip,
  urls,
  update,
}: {
  trip: TripPlan;
  urls: Record<string, string>;
  update: TripUpdate;
}) {
  // null: closed; "new": adding; a stop: editing it.
  const [editing, setEditing] = useState<ItineraryDay | "new" | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const lastDay = Math.max(0, ...trip.days.map((d) => d.day_number));
  const length = tripLength(trip);
  const nextDay = length ? Math.min(lastDay + 1, length) : lastDay + 1;

  async function suggest() {
    setSuggesting(true);
    try {
      const r = await suggestStops({
        data: {
          destination: trip.destination,
          title: trip.title,
          dates: tripDatesLabel(trip),
          existing: trip.days.slice(-60).map((d) => d.title.slice(0, 200)),
        },
      });
      const days: Omit<ItineraryDay, "id">[] = [];
      for (const s of r.stops) {
        const pos = r.source === "ai" ? await geocodePlace(s.place) : null;
        days.push({
          day_number: nextDay,
          time: s.time,
          title: s.title,
          place: s.place,
          notes: s.notes,
          lat: pos?.lat ?? null,
          lng: pos?.lng ?? null,
        });
      }
      if (!(await update((t) => days.reduce((acc, d) => tripOps.addDay(d)(acc), t)))) return;
      if (r.source === "ai")
        toast.success(
          `A IA sugeriu ${plural(days.length, "paragem", "paragens")} para o dia ${nextDay}.`,
        );
      else
        toast(
          `Nenhum serviço de IA respondeu; juntei ${days.length} ideias genéricas ao dia ${nextDay} para adaptares.`,
        );
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível sugerir paragens."));
    } finally {
      setSuggesting(false);
    }
  }

  async function removeDay(d: ItineraryDay) {
    if (!confirm(`Remover “${d.title}” do itinerário?`)) return;
    if ((await update(tripOps.removeDay(d.id))) && d.photo) await deletePhotos([d.photo]);
  }

  return (
    <div className="mt-8 space-y-6 print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          A IA recebe o destino, as datas e os títulos das paragens e envia-os a um serviço de IA
          externo.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={suggest}
            disabled={suggesting}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {suggesting ? "A pensar…" : "Sugerir com IA"}
          </button>
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Paragem
          </button>
        </div>
      </div>

      {trip.days.length === 0 ? (
        <EmptyState icon={<Calendar className="h-12 w-12" />} title="O itinerário ainda está vazio">
          <p className="mt-2 text-sm">Adiciona a primeira paragem ou pede sugestões à IA.</p>
        </EmptyState>
      ) : (
        <div className="relative pl-6 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-0.5 before:bg-border md:pl-8 md:before:left-4">
          {trip.days.map((day) => {
            const date = dateOfDay(trip, day.day_number);
            return (
              <div key={day.id} className="group relative mb-8 pl-6 last:mb-0 md:pl-8">
                <div className="absolute -left-6 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary bg-card text-xs font-bold text-primary shadow md:-left-8">
                  {day.day_number}
                </div>
                <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold uppercase tracking-wider text-primary">
                          Dia {day.day_number}
                          {date && ` · ${formatWeekday(date)}`}
                        </span>
                        {day.time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {day.time}
                          </span>
                        )}
                        {day.place && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {day.place}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 font-serif text-2xl text-foreground">{day.title}</h3>
                      {day.notes && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {day.notes}
                        </p>
                      )}
                    </div>
                    {day.photo && urls[day.photo] && (
                      <div className="shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                        <img
                          src={urls[day.photo]}
                          alt={day.title}
                          className="h-28 w-36 object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end gap-4 border-t border-border/40 pt-3 text-xs opacity-70 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setEditing(day)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => void removeDay(day)}
                      className="flex items-center gap-1 text-destructive hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <StopModal
          trip={trip}
          stop={editing === "new" ? undefined : editing}
          defaultDay={lastDay || 1}
          update={update}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** Adds a stop, or edits `stop`. */
function StopModal({
  trip,
  stop,
  defaultDay,
  update,
  onClose,
}: {
  trip: TripPlan;
  stop?: ItineraryDay | undefined;
  defaultDay: number;
  update: TripUpdate;
  onClose: () => void;
}) {
  const [dayNumber, setDayNumber] = useState(stop?.day_number ?? defaultDay);
  const [time, setTime] = useState(stop?.time ?? "10:00");
  const [title, setTitle] = useState(stop?.title ?? "");
  const [place, setPlace] = useState(stop?.place ?? "");
  const [notes, setNotes] = useState(stop?.notes ?? "");
  const [photo, setPhoto] = useState(stop?.photo ?? "");
  const [busy, setBusy] = useState(false);
  const saved = useRef(false);
  const preview = usePhotoUrls([photo])[photo];
  const length = tripLength(trip);
  const date = dateOfDay(trip, dayNumber);
  const original = stop?.photo ?? "";

  function close() {
    // A photo picked here but never saved is removed again.
    if (photo && photo !== original && !saved.current) void deletePhotos([photo]);
    onClose();
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const key = await uploadPhoto(await resizeImage(file));
      if (photo && photo !== original) void deletePhotos([photo]);
      setPhoto(key);
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível carregar a foto."));
    }
  }

  function dropPhoto() {
    if (photo !== original) void deletePhotos([photo]);
    setPhoto("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const placeChanged = !stop || place.trim() !== stop.place;
    const pos = !placeChanged
      ? { lat: stop.lat ?? null, lng: stop.lng ?? null }
      : place.trim()
        ? await geocodePlace(place)
        : null;
    const fields: Omit<ItineraryDay, "id"> = {
      day_number: dayNumber || 1,
      time: time.trim(),
      title: title.trim(),
      place: place.trim() || trip.destination,
      notes: notes.trim(),
      ...(photo ? { photo } : {}),
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
    };
    const ok = await update(stop ? tripOps.updateDay(stop.id, fields) : tripOps.addDay(fields));
    setBusy(false);
    if (!ok) return;
    saved.current = true;
    if (original && original !== photo) void deletePhotos([original]);
    const lost = placeChanged && place.trim() && !pos;
    toast.success(
      `${stop ? "Paragem atualizada" : "Paragem adicionada"}${lost ? " (lugar não encontrado no mapa)" : ""}.`,
    );
    onClose();
  }

  return (
    <Modal
      title={stop ? "Editar paragem" : "Adicionar paragem"}
      subtitle={`Viagem ${trip.title}`}
      onClose={close}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Dia da viagem
            <input
              type="number"
              min={1}
              max={length ?? undefined}
              value={dayNumber}
              onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
              className={input}
            />
            {date && <span className="mt-1 block text-[11px]">{formatWeekday(date)}</span>}
          </label>
          <label className={label}>
            Horário
            <input
              placeholder="10:30 ou Manhã"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={input}
            />
          </label>
        </div>
        <label className={label}>
          Título
          <input
            required
            placeholder="ex: Chegada, Passeio de barco, Templo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          Lugar / endereço
          <input
            placeholder="ex: Padang Padang Beach, Bali"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          Notas / dicas
          <textarea
            rows={3}
            placeholder="ex: Reservar bilhetes com antecedência…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={input}
          />
        </label>
        <div>
          <span className={label}>Foto ou captura de ecrã (opcional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              void pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="mt-1 w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-1.5 file:text-xs file:font-semibold"
          />
          {preview && (
            <div className="relative mt-2 h-16 w-16 overflow-hidden rounded-lg border border-border">
              <img src={preview} alt="Pré-visualização" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={dropPhoto}
                aria-label="Tirar a foto"
                className="absolute right-0.5 top-0.5 rounded-full bg-foreground/60 p-0.5 text-background"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        <ModalActions onCancel={close} submitLabel={stop ? "Guardar" : "Adicionar"} busy={busy} />
      </form>
    </Modal>
  );
}
