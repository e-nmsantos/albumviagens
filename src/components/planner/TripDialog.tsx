import { useState } from "react";
import { toast } from "sonner";
import { useTripMutations, type TripPlan } from "@/lib/trips";
import { Modal, ModalActions } from "./ui";
import { input, label } from "./styles";

/** Creates a trip, or edits the name, destination and dates of `trip`. */
export function TripDialog({
  trip,
  onClose,
  onSaved,
}: {
  trip?: TripPlan | undefined;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { saveTrip, updateTrip } = useTripMutations();
  const [title, setTitle] = useState(trip?.title ?? "");
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [start, setStart] = useState(trip?.start_date ?? "");
  const [end, setEnd] = useState(trip?.end_date ?? "");
  const legacyDates = !trip?.start_date && trip?.dates ? trip.dates : "";
  const busy = saveTrip.isPending || updateTrip.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (start && end && end < start) {
      toast.error("O regresso tem de ser depois da partida.");
      return;
    }
    const fields = {
      title: title.trim(),
      destination: destination.trim() || title.trim(),
      start_date: start,
      end_date: start ? end : "",
      // Old free-text dates are kept until real dates replace them.
      dates: start ? "" : (trip?.dates ?? ""),
    };
    try {
      const saved = trip
        ? await updateTrip.mutateAsync({ id: trip.id, change: (t) => ({ ...t, ...fields }) })
        : await saveTrip.mutateAsync(fields);
      toast.success(trip ? "Viagem atualizada." : "Nova viagem criada! Já podes montar o roteiro.");
      onSaved(saved.id);
      onClose();
    } catch {
      // Shown by the global mutation error handler.
    }
  }

  return (
    <Modal
      title={trip ? "Editar viagem" : "Nova viagem"}
      subtitle="Define o destino e as datas."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className={label}>
          Nome da viagem
          <input
            required
            autoFocus
            placeholder="ex: Japão 2026, Férias nos Açores"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </label>
        <label className={label}>
          Destino principal
          <input
            placeholder="ex: Quioto, Japão"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={input}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Partida
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={input}
            />
          </label>
          <label className={label}>
            Regresso
            <input
              type="date"
              value={end}
              min={start || undefined}
              disabled={!start}
              onChange={(e) => setEnd(e.target.value)}
              className={`${input} disabled:opacity-50`}
            />
          </label>
        </div>
        {legacyDates && (
          <p className="text-xs text-muted-foreground">
            Datas antigas: “{legacyDates}”. Escolhe a partida e o regresso para teres a contagem
            decrescente e as datas de cada dia.
          </p>
        )}
        <ModalActions
          onCancel={onClose}
          submitLabel={trip ? "Guardar" : "Criar viagem"}
          busy={busy}
        />
      </form>
    </Modal>
  );
}
