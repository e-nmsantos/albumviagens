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
  const [dates, setDates] = useState(trip?.dates ?? "");
  const busy = saveTrip.isPending || updateTrip.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const fields = {
      title: title.trim(),
      destination: destination.trim() || title.trim(),
      dates: dates.trim(),
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
      subtitle="Define o destino e o período."
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
        <label className={label}>
          Datas
          <input
            placeholder="ex: 12 - 24 outubro 2026"
            value={dates}
            onChange={(e) => setDates(e.target.value)}
            className={input}
          />
        </label>
        <ModalActions
          onCancel={onClose}
          submitLabel={trip ? "Guardar" : "Criar viagem"}
          busy={busy}
        />
      </form>
    </Modal>
  );
}
