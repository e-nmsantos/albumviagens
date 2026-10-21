import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { CURRENCIES, convert, formatMoney, toEUR } from "@/lib/currency";
import { toIsoDay } from "@/lib/dates";
import { tripOps, type TripExpense, type TripPlan } from "@/lib/trips";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { plural } from "@/lib/utils";
import { Modal, ModalActions } from "./ui";
import { input, label } from "./styles";
import type { TripUpdate } from "./types";

export function BudgetTab({ trip, update }: { trip: TripPlan; update: TripUpdate }) {
  // null: closed; "new": adding; an expense: editing it.
  const [editing, setEditing] = useState<TripExpense | "new" | null>(null);
  const [editingLimit, setEditingLimit] = useState(false);
  const [calcAmount, setCalcAmount] = useState("100");
  const [calcFrom, setCalcFrom] = useState("EUR");
  const [calcTo, setCalcTo] = useState("USD");

  const spent = trip.expenses.reduce((sum, e) => sum + toEUR(e.amount, e.currency), 0);
  const limit = trip.budget_limit;
  const progress = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
  const converted = convert(parseFloat(calcAmount) || 0, calcFrom, calcTo);

  function remove(e: TripExpense) {
    if (confirm(`Remover “${e.description}”?`)) void update(tripOps.removeExpense(e.id));
  }

  return (
    <div className="mt-8 space-y-8 print:hidden">
      <div className="grid gap-6 md:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Controlo de custos
              </span>
              <h3 className="mt-0.5 font-serif text-2xl">Orçamento da viagem</h3>
            </div>
            <button
              onClick={() => setEditingLimit(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {limit > 0 ? "Alterar teto" : "Definir teto"}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-y border-border/50 py-4 text-center">
            <div>
              <span className="block text-xs text-muted-foreground">Teto</span>
              <span className="font-serif text-xl font-bold md:text-2xl">
                {limit > 0 ? formatMoney(limit) : "Livre"}
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Gasto</span>
              <span className="font-serif text-xl font-bold md:text-2xl">{formatMoney(spent)}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Restante</span>
              <span
                className={`font-serif text-xl font-bold md:text-2xl ${limit > 0 && limit - spent < 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {limit > 0 ? formatMoney(limit - spent) : "—"}
              </span>
            </div>
          </div>

          {limit > 0 && (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Progresso do orçamento</span>
                <span>{progress}% utilizado</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all duration-500 ${progress > 95 ? "bg-rose-500" : progress > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              Valores noutras moedas convertidos com taxas aproximadas.
            </p>
            <button
              onClick={() => setEditing("new")}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Registar despesa
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-6 shadow-sm md:col-span-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <ArrowRightLeft className="h-4 w-4" />
            <span>Conversor de moeda</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                aria-label="Quantia"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <CurrencySelect label="Moeda de origem" value={calcFrom} onChange={setCalcFrom} />
            </div>
            <p className="text-center text-xs text-muted-foreground">equivale a cerca de</p>
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3">
              <span className="font-serif text-2xl font-bold">
                {converted.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}
              </span>
              <CurrencySelect label="Moeda de destino" value={calcTo} onChange={setCalcTo} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Taxas fixas e aproximadas, não atualizadas em tempo real. Confirma no banco antes de
              pagar.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-serif text-xl font-medium">Despesas</h4>
          <span className="text-xs text-muted-foreground">
            {plural(trip.expenses.length, "despesa", "despesas")}
          </span>
        </div>
        {trip.expenses.length === 0 ? (
          <p className="py-6 text-center text-xs italic text-muted-foreground">
            Ainda não registaste nenhuma despesa nesta viagem.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {trip.expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {EXPENSE_CATEGORIES[exp.category] ?? exp.category}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{exp.description}</p>
                    {exp.date && (
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(exp.date + "T12:00:00").toLocaleDateString("pt-PT")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-right">
                    <span className="block font-serif font-bold">
                      {formatMoney(exp.amount, exp.currency)}
                    </span>
                    {exp.currency !== "EUR" && (
                      <span className="block text-[11px] text-muted-foreground">
                        ≈ {formatMoney(toEUR(exp.amount, exp.currency))}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setEditing(exp)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(exp)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ExpenseModal
          trip={trip}
          expense={editing === "new" ? undefined : editing}
          update={update}
          onClose={() => setEditing(null)}
        />
      )}
      {editingLimit && (
        <BudgetLimitModal trip={trip} update={update} onClose={() => setEditingLimit(false)} />
      )}
    </div>
  );
}

function CurrencySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold outline-none"
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

/** Adds an expense, or edits `expense`. */
function ExpenseModal({
  trip,
  expense: x,
  update,
  onClose,
}: {
  trip: TripPlan;
  expense?: TripExpense | undefined;
  update: TripUpdate;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(x?.description ?? "");
  const [amount, setAmount] = useState(x ? String(x.amount).replace(".", ",") : "");
  const [currency, setCurrency] = useState(x?.currency ?? trip.expenses[0]?.currency ?? "EUR");
  const [category, setCategory] = useState<TripExpense["category"]>(x?.category ?? "alimentacao");
  const [date, setDate] = useState(x?.date ?? toIsoDay(new Date()));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Escreve um valor válido.");
      return;
    }
    setBusy(true);
    const fields = { description: description.trim(), amount: value, currency, category, date };
    const ok = await update(x ? tripOps.updateExpense(x.id, fields) : tripOps.addExpense(fields));
    setBusy(false);
    if (!ok) return;
    toast.success(x ? "Despesa atualizada." : "Despesa registada.");
    onClose();
  }

  return (
    <Modal
      title={x ? "Editar despesa" : "Registar despesa"}
      subtitle={`Viagem ${trip.title}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className={label}>
          Descrição
          <input
            required
            placeholder="ex: Bilhetes de comboio, jantar…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={input}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Valor
            <input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={input}
            />
          </label>
          <label className={label}>
            Moeda
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={input}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Categoria
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TripExpense["category"])}
              className={input}
            >
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Data
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={input}
            />
          </label>
        </div>
        <ModalActions
          onCancel={onClose}
          submitLabel={x ? "Guardar" : "Guardar despesa"}
          busy={busy}
        />
      </form>
    </Modal>
  );
}

function BudgetLimitModal({
  trip,
  update,
  onClose,
}: {
  trip: TripPlan;
  update: TripUpdate;
  onClose: () => void;
}) {
  const [value, setValue] = useState(trip.budget_limit ? String(trip.budget_limit) : "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = value.trim() ? parseFloat(value.replace(",", ".")) : 0;
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Escreve um valor válido, ou deixa vazio para não ter teto.");
      return;
    }
    setBusy(true);
    const ok = await update(tripOps.set({ budget_limit: n }));
    setBusy(false);
    if (!ok) return;
    toast.success(n ? "Teto do orçamento atualizado." : "Teto removido.");
    onClose();
  }

  return (
    <Modal
      title="Teto do orçamento"
      subtitle="Total planeado em euros (€). Deixa vazio para não ter teto."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <input
          autoFocus
          inputMode="decimal"
          placeholder="ex: 1500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${input} font-serif text-lg`}
        />
        <ModalActions onCancel={onClose} submitLabel="Guardar" busy={busy} />
      </form>
    </Modal>
  );
}
