import { useState } from "react";
import { toast } from "sonner";
import { ListChecks, Pencil, Trash2 } from "lucide-react";
import { tripOps, type PackingItem, type TripPlan } from "@/lib/trips";
import { PACKING_CATEGORIES } from "@/lib/types";
import { plural } from "@/lib/utils";
import { tripDatesLabel } from "@/lib/dates";
import { suggestPacking } from "@/lib/packing";
import type { TripUpdate } from "./types";

export function PackingTab({ trip, update }: { trip: TripPlan; update: TripUpdate }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PackingItem["category"]>("roupa");
  const items = trip.packing_list;
  const packed = items.filter((i) => i.packed).length;
  const pct = items.length ? Math.round((packed / items.length) * 100) : 0;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (await update(tripOps.addPacking([{ name: name.trim(), category, packed: false }])))
      setName("");
  }

  async function suggest() {
    const before = items.length;
    const list = suggestPacking(trip.destination, tripDatesLabel(trip));
    if (!(await update(tripOps.addPacking(list)))) return;
    const added = list.filter(
      (i) => !items.some((x) => x.name.toLowerCase() === i.name.toLowerCase()),
    ).length;
    toast.success(
      added
        ? `Juntei ${added} itens à mala.`
        : before
          ? "A mala já tinha estes itens todos."
          : "Mala preenchida.",
    );
  }

  return (
    <div className="mt-8 space-y-6 print:hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-2xl">Mala de viagem</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Para não esquecer nenhum documento, adaptador ou medicamento.
          </p>
        </div>
        <button
          onClick={() => void suggest()}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
          title="Lista base adaptada ao clima do destino"
        >
          <ListChecks className="h-3.5 w-3.5" />
          Sugerir lista base
        </button>
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {packed} de {plural(items.length, "item", "itens")} na mala
            </span>
            <span className="font-bold text-primary">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <input
          required
          placeholder="Novo item (ex: óculos de sol, carregador)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PackingItem["category"])}
            aria-label="Categoria"
            className="flex-1 rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium outline-none"
          >
            {Object.entries(PACKING_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Adicionar
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {(Object.keys(PACKING_CATEGORIES) as PackingItem["category"][]).map((cat) => {
          const list = items.filter((i) => i.category === cat);
          if (!list.length) return null;
          return (
            <div key={cat} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h4 className="mb-3 border-b border-border/50 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {PACKING_CATEGORIES[cat]}
              </h4>
              <ul className="space-y-2 text-sm">
                {list.map((item) => (
                  <PackingRow key={item.id} item={item} update={update} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackingRow({ item, update }: { item: PackingItem; update: TripUpdate }) {
  const [name, setName] = useState<string | null>(null); // non-null while renaming

  function save() {
    const next = name?.trim();
    setName(null);
    if (next && next !== item.name) void update(tripOps.renamePacking(item.id, next));
  }

  return (
    <li className="group flex items-center justify-between gap-2">
      {name !== null ? (
        <input
          autoFocus
          value={name}
          aria-label="Nome do item"
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setName(null);
          }}
          className="flex-1 rounded-md border border-input bg-background px-2 py-0.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <label className="flex flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={item.packed}
            onChange={() => void update(tripOps.togglePacking(item.id))}
            className="h-4 w-4 accent-primary"
          />
          <span
            className={
              item.packed ? "text-xs text-muted-foreground line-through" : "text-xs font-medium"
            }
          >
            {item.name}
          </span>
        </label>
      )}
      <span className="flex gap-2 opacity-60 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setName(item.name)}
          aria-label={`Mudar o nome de ${item.name}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => void update(tripOps.removePacking(item.id))}
          aria-label={`Remover ${item.name}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </span>
    </li>
  );
}
