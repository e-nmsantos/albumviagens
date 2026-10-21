import { useState } from "react";
import { toast } from "sonner";
import { tripOps, type TripPlan } from "@/lib/trips";
import type { TripUpdate } from "./types";

/** Free-form notes; saved when the field loses focus. Mount with `key={trip.id}`. */
export function NotesTab({ trip, update }: { trip: TripPlan; update: TripUpdate }) {
  const [notes, setNotes] = useState(trip.notes);

  async function save() {
    if (notes === trip.notes) return;
    if (await update(tripOps.set({ notes }))) toast.success("Notas guardadas.");
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm print:hidden">
      <h3 className="font-serif text-xl">Notas e ideias</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Dicas de amigos, restaurantes, links úteis… Guardado automaticamente ao sair do campo.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => void save()}
        placeholder="Escreve aqui listas, links úteis, ideias de locais a visitar…"
        rows={10}
        className="mt-4 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
