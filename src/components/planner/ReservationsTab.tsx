import { useState } from "react";
import { toast } from "sonner";
import {
  Building,
  Calendar,
  Compass,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Ticket,
  Trash2,
} from "lucide-react";
import { formatWhen, isIsoDateTime } from "@/lib/dates";
import { tripOps, type TripPlan, type TripReservation } from "@/lib/trips";
import { RESERVATION_TYPES } from "@/lib/types";
import { EmptyState, Modal, ModalActions } from "./ui";
import { input, label } from "./styles";
import type { TripUpdate } from "./types";

const ICONS: Record<TripReservation["type"], React.ReactNode> = {
  flight: <Plane className="h-5 w-5 text-blue-500" />,
  hotel: <Building className="h-5 w-5 text-amber-500" />,
  ticket: <Ticket className="h-5 w-5 text-emerald-500" />,
  transport: <Compass className="h-5 w-5 text-purple-500" />,
};

export function ReservationsTab({ trip, update }: { trip: TripPlan; update: TripUpdate }) {
  // null: closed; "new": adding; a reservation: editing it.
  const [editing, setEditing] = useState<TripReservation | "new" | null>(null);

  function remove(r: TripReservation) {
    if (confirm(`Remover “${r.title}”?`)) void update(tripOps.removeReservation(r.id));
  }

  return (
    <div className="mt-8 space-y-6 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl">Carteira de viagem & reservas</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Voos, alojamentos e bilhetes, sempre à mão e por ordem de data.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Adicionar reserva
        </button>
      </div>

      {trip.reservations.length === 0 ? (
        <EmptyState icon={<Ticket className="h-12 w-12" />} title="Sem reservas">
          <p className="mx-auto mt-1 max-w-sm text-xs">
            Guarda aqui números de voo, moradas de check-in, códigos e bilhetes.
          </p>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trip.reservations.map((res) => (
            <div
              key={res.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  {ICONS[res.type]}
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {RESERVATION_TYPES[res.type]}
                  </span>
                </div>
                {res.reference && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-bold">
                    {res.reference}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <h4 className="font-serif text-lg font-semibold">{res.title}</h4>
                {(res.date_start || res.date_end) && (
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{formatWhen(res.date_start)}</span>
                    {res.date_end && <span>→ {formatWhen(res.date_end)}</span>}
                  </p>
                )}
                {res.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{res.location}</span>
                  </p>
                )}
              </div>
              {res.details && (
                <div className="mt-3 whitespace-pre-line rounded-xl border border-border/60 bg-muted/40 p-3 text-xs">
                  {res.details}
                </div>
              )}
              <div className="mt-4 flex justify-end gap-4 text-[11px] opacity-70 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setEditing(res)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
                <button
                  onClick={() => remove(res)}
                  className="flex items-center gap-1 text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ReservationModal
          trip={trip}
          reservation={editing === "new" ? undefined : editing}
          update={update}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** "2025-01-12T08:30" for the date-time input; older free-text values can't go in it. */
const forInput = (s: string | undefined) =>
  !isIsoDateTime(s) ? "" : s.length === 10 ? `${s}T12:00` : s;

/** Adds a reservation, or edits `reservation`. */
function ReservationModal({
  trip,
  reservation: r,
  update,
  onClose,
}: {
  trip: TripPlan;
  reservation?: TripReservation | undefined;
  update: TripUpdate;
  onClose: () => void;
}) {
  const [type, setType] = useState<TripReservation["type"]>(r?.type ?? "flight");
  const [title, setTitle] = useState(r?.title ?? "");
  const [reference, setReference] = useState(r?.reference ?? "");
  const [start, setStart] = useState(
    forInput(r?.date_start) || (trip.start_date && !r ? `${trip.start_date}T12:00` : ""),
  );
  const [end, setEnd] = useState(forInput(r?.date_end));
  const [location, setLocation] = useState(r?.location ?? "");
  const [details, setDetails] = useState(r?.details ?? "");
  const [busy, setBusy] = useState(false);
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  // Free-text dates from older versions stay unless a real date replaces them.
  const oldStart = r && !isIsoDateTime(r.date_start) ? r.date_start : "";
  const oldEnd = r?.date_end && !isIsoDateTime(r.date_end) ? r.date_end : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (start && end && end < start) {
      toast.error("O fim tem de ser depois do início.");
      return;
    }
    setBusy(true);
    const fields: Omit<TripReservation, "id"> = {
      type,
      title: title.trim(),
      reference: opt(reference),
      date_start: start || oldStart,
      date_end: opt(end || oldEnd),
      location: opt(location),
      details: opt(details),
    };
    const ok = await update(
      r ? tripOps.updateReservation(r.id, fields) : tripOps.addReservation(fields),
    );
    setBusy(false);
    if (!ok) return;
    toast.success(r ? "Reserva atualizada." : "Reserva adicionada à carteira.");
    onClose();
  }

  return (
    <Modal
      title={r ? "Editar reserva" : "Adicionar reserva"}
      subtitle="Voos, estadias e bilhetes importantes."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        <label className={label}>
          Tipo
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TripReservation["type"])}
            className={input}
          >
            <option value="flight">Voo</option>
            <option value="hotel">Hotel / alojamento</option>
            <option value="ticket">Bilhete / museu / espetáculo</option>
            <option value="transport">Comboio / carro / transfer</option>
          </select>
        </label>
        <label className={label}>
          Título
          <input
            required
            placeholder="ex: TAP TP1234, Hotel Central"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          Código de reserva
          <input
            placeholder="ex: QTR-8820B"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={`${input} font-mono`}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={label}>
            Início / partida
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={input}
            />
            {oldStart && !start && (
              <span className="mt-1 block text-[11px]">Atual: “{oldStart}”</span>
            )}
          </label>
          <label className={label}>
            Fim / chegada (opcional)
            <input
              type="datetime-local"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              className={input}
            />
            {oldEnd && !end && <span className="mt-1 block text-[11px]">Atual: “{oldEnd}”</span>}
          </label>
        </div>
        <label className={label}>
          Local / endereço / terminal
          <input
            placeholder="ex: Terminal 1, morada do hotel"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          Detalhes (código da porta, Wi-Fi, lugares)
          <textarea
            rows={2}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className={input}
          />
        </label>
        <ModalActions
          onCancel={onClose}
          submitLabel={r ? "Guardar" : "Guardar na carteira"}
          busy={busy}
        />
      </form>
    </Modal>
  );
}
