import { useState } from "react";
import { toast } from "sonner";
import { Building, Calendar, Compass, MapPin, Plane, Plus, Ticket, Trash2 } from "lucide-react";
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
  const [adding, setAdding] = useState(false);

  function remove(r: TripReservation) {
    if (confirm(`Remover “${r.title}”?`)) void update(tripOps.removeReservation(r.id));
  }

  return (
    <div className="mt-8 space-y-6 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl">Carteira de viagem & reservas</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Voos, alojamentos e bilhetes, sempre à mão.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
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
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md"
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
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>{res.date_start}</span>
                  {res.date_end && <span>→ {res.date_end}</span>}
                </p>
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
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => remove(res)}
                  className="flex items-center gap-1 text-[11px] text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddReservationModal trip={trip} update={update} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function AddReservationModal({
  trip,
  update,
  onClose,
}: {
  trip: TripPlan;
  update: TripUpdate;
  onClose: () => void;
}) {
  const [type, setType] = useState<TripReservation["type"]>("flight");
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await update(
      tripOps.addReservation({
        type,
        title: title.trim(),
        reference: opt(reference),
        date_start: start.trim() || trip.dates,
        date_end: opt(end),
        location: opt(location),
        details: opt(details),
      }),
    );
    setBusy(false);
    if (!ok) return;
    toast.success("Reserva adicionada à carteira.");
    onClose();
  }

  return (
    <Modal
      title="Adicionar reserva"
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
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Código de reserva
            <input
              placeholder="ex: QTR-8820B"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={`${input} font-mono`}
            />
          </label>
          <label className={label}>
            Início / partida
            <input
              placeholder="ex: 12 Out 08:30"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={input}
            />
          </label>
        </div>
        <label className={label}>
          Fim / chegada (opcional)
          <input
            placeholder="ex: 18 Out"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={input}
          />
        </label>
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
        <ModalActions onCancel={onClose} submitLabel="Guardar na carteira" busy={busy} />
      </form>
    </Modal>
  );
}
