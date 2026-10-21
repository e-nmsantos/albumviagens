import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, Star, CalendarDays, Pencil, Plane, Undo2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Modal, ModalActions } from "@/components/planner/ui";
import { input as modalInput, label as modalLabel } from "@/components/planner/styles";
import { MemoryMap } from "@/components/MemoryMap";
import { Globe } from "@/components/Globe";
import { geocodePlace } from "@/lib/geocode";
import { countryOf, distanceKm, useMemories } from "@/lib/memories";
import { useWishes, useWishMutations, type Wish } from "@/lib/wishes";
import { plural } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/desejos")({
  head: () => ({
    meta: [
      { title: "Lista de desejos — Memórias" },
      {
        name: "description",
        content: "Os lugares que queres visitar um dia, num globo e no mapa.",
      },
      { property: "og:title", content: "Lista de desejos — Memórias" },
      { property: "og:description", content: "Os lugares que queres visitar um dia." },
    ],
  }),
  component: Wishes,
});

const field =
  "w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
const PRIO = ["", "Um dia", "Gostava muito", "Sonho de vida"];

function Wishes() {
  const { data: wishes = [] } = useWishes();
  const { data: ms = [] } = useMemories();
  const { add, toggle, remove } = useWishMutations();
  const [editing, setEditing] = useState<Wish | null>(null);
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const [prio, setPrio] = useState(2);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<"prio" | "near">("prio");

  const last = ms.find((m) => m.lat != null && m.lng != null);
  const km = (w: Wish) =>
    last && w.lat != null && w.lng != null
      ? Math.round(distanceKm({ lat: last.lat!, lng: last.lng! }, { lat: w.lat, lng: w.lng }))
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!place.trim()) return;
    setBusy(true);
    try {
      const pos = await geocodePlace(place);
      await add.mutateAsync({
        place: place.trim(),
        note: note.trim(),
        when_text: when.trim(),
        priority: prio,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
      });
      setPlace("");
      setNote("");
      setWhen("");
      setPrio(2);
      toast.success(
        pos ? "Novo desejo — já brilha no globo." : "Adicionado (não encontrámos o lugar no mapa).",
      );
    } catch {
      // Shown by the global mutation error handler.
    } finally {
      setBusy(false);
    }
  }

  const removeWish = (w: Wish) => {
    if (confirm(`Tirar “${w.place}” da lista?`)) remove.mutate(w.id);
  };

  const open = wishes
    .filter((w) => !w.done)
    .sort((a, b) => (sort === "prio" ? b.priority - a.priority : (km(a) ?? 1e9) - (km(b) ?? 1e9)));
  const done = wishes.filter((w) => w.done);
  const pct = wishes.length ? Math.round((done.length / wishes.length) * 100) : 0;
  const [hero, ...rest] = open;

  return (
    <div className="min-h-screen pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6">
        {/* Cabeçalho */}
        <section className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-forest">Um dia…</p>
            <h1 className="mt-2 text-5xl leading-[1.02] md:text-7xl">
              Os lugares que <em className="text-primary">ainda</em> me esperam.
            </h1>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <div className="flex justify-between text-sm">
              <span>{open.length} por visitar</span>
              <span className="text-forest">{plural(done.length, "cumprido", "cumpridos")}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-sage transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 font-display text-3xl">
              {pct}%{" "}
              <span className="text-base italic text-muted-foreground">da lista cumprida</span>
            </p>
          </div>
        </section>

        {/* Formulário */}
        <form
          onSubmit={submit}
          className="mt-10 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-polaroid)] md:p-7"
        >
          <p className="font-display text-2xl">Novo desejo</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              required
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Para onde? — ex.: Patagónia, Argentina"
              className={field}
            />
            <input
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              placeholder="Quando? — ex.: Primavera 2027"
              className={field}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Porquê? O que queres lá fazer…"
              className={`${field} md:col-span-2`}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPrio(p)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${prio === p ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:border-primary"}`}
                >
                  {Array.from({ length: p }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                  {PRIO[p]}
                </button>
              ))}
            </div>
            <button
              disabled={busy}
              className="rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-md hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "A procurar no mapa…" : "Juntar à lista"}
            </button>
          </div>
        </form>

        {wishes.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <Globe lat={null} lng={null} size={200} />
            <p className="mt-6 font-display text-3xl italic">O mundo é grande.</p>
            <p className="mt-1 text-muted-foreground">Escreve o primeiro lugar com que sonhas.</p>
          </div>
        )}

        {hero && (
          <section className="mt-12">
            <div className="flex items-end justify-between">
              <h2 className="text-3xl">Próximos destinos</h2>
              <div className="flex rounded-full border border-input bg-card p-1 text-sm">
                <button
                  onClick={() => setSort("prio")}
                  className={`rounded-full px-3 py-1 ${sort === "prio" ? "bg-primary text-primary-foreground" : ""}`}
                >
                  Mais desejados
                </button>
                <button
                  onClick={() => setSort("near")}
                  disabled={!last}
                  className={`rounded-full px-3 py-1 disabled:opacity-40 ${sort === "near" ? "bg-primary text-primary-foreground" : ""}`}
                >
                  Mais perto
                </button>
              </div>
            </div>
            {/* Destaque */}
            <article className="mt-6 grid items-center gap-6 overflow-hidden rounded-3xl bg-secondary p-6 md:grid-cols-[auto_1fr] md:p-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="mx-auto">
                <Globe lat={hero.lat} lng={hero.lng} size={240} />
              </div>
              <WishBody
                w={hero}
                km={km(hero)}
                big
                onToggle={() => toggle.mutate(hero)}
                onRemove={() => removeWish(hero)}
                onEdit={() => setEditing(hero)}
              />
            </article>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((w, i) => (
                <article
                  key={w.id}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[var(--shadow-polaroid)] animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex justify-center">
                    <Globe lat={w.lat} lng={w.lng} size={130} />
                  </div>
                  <div className="mt-4 flex-1">
                    <WishBody
                      w={w}
                      km={km(w)}
                      onToggle={() => toggle.mutate(w)}
                      onRemove={() => removeWish(w)}
                      onEdit={() => setEditing(w)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {open.some((w) => w.lat != null) && (
          <section className="mt-14">
            <h2 className="text-3xl">No mapa</h2>
            <div className="polaroid mt-4">
              <ClientOnly fallback={<div className="h-[45vh] bg-muted" />}>
                <MemoryMap wishes={open} className="h-[45vh] w-full bg-muted" />
              </ClientOnly>
            </div>
          </section>
        )}

        {done.length > 0 && (
          <section className="mt-14">
            <h2 className="text-3xl">
              Já fui <span className="text-forest">✓</span>
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {done.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-2 rounded-full bg-sage/20 py-1.5 pl-3 pr-1.5 text-sm"
                >
                  <Check className="h-4 w-4 text-forest" />
                  {w.place}
                  <Link
                    to="/nova"
                    search={{ place: w.place, lat: w.lat ?? undefined, lng: w.lng ?? undefined }}
                    className="rounded-full bg-card px-2.5 py-0.5 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Criar memória
                  </Link>
                  <button
                    onClick={() => toggle.mutate(w)}
                    aria-label="Voltar à lista"
                    className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
      {editing && <EditWishModal wish={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function WishBody({
  w,
  km,
  big,
  onToggle,
  onRemove,
  onEdit,
}: {
  w: Wish;
  km: number | null;
  big?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const country = w.place.includes(",") ? countryOf(w.place) : "";
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 text-primary">
        {Array.from({ length: w.priority }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-current" />
        ))}
        <span className="ml-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {PRIO[w.priority] ?? ""}
          {country && ` · ${country}`}
        </span>
      </div>
      <h3 className={`mt-2 font-display leading-none ${big ? "text-5xl md:text-6xl" : "text-3xl"}`}>
        {w.place.split(",")[0]}
      </h3>
      {w.note && (
        <p className={`mt-3 font-display italic text-muted-foreground ${big ? "text-xl" : ""}`}>
          “{w.note}”
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {w.when_text && (
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {w.when_text}
          </span>
        )}
        {km != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1">
            <Plane className="h-3.5 w-3.5" />
            {km.toLocaleString("pt-PT")} km da última memória
          </span>
        )}
        {w.lat == null && (
          <span className="rounded-full bg-background px-2.5 py-1 text-muted-foreground">
            sem lugar no mapa
          </span>
        )}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-5">
        <button
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          <Check className="h-4 w-4" />
          Já fui!
        </button>
        <button
          onClick={onEdit}
          aria-label="Editar desejo"
          className="ml-auto rounded-full p-2 text-muted-foreground opacity-60 hover:text-foreground hover:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onRemove}
          aria-label="Apagar desejo"
          className="rounded-full p-2 text-muted-foreground opacity-60 hover:text-destructive hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EditWishModal({ wish, onClose }: { wish: Wish; onClose: () => void }) {
  const { edit } = useWishMutations();
  const [place, setPlace] = useState(wish.place);
  const [note, setNote] = useState(wish.note);
  const [when, setWhen] = useState(wish.when_text);
  const [prio, setPrio] = useState(wish.priority);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const moved = place.trim() !== wish.place;
    const pos = moved ? await geocodePlace(place) : { lat: wish.lat, lng: wish.lng };
    try {
      await edit.mutateAsync({
        ...wish,
        place: place.trim(),
        note: note.trim(),
        when_text: when.trim(),
        priority: prio,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
      });
      toast.success(
        moved && !pos ? "Desejo atualizado (lugar não encontrado no mapa)." : "Desejo atualizado.",
      );
      onClose();
    } catch {
      // Shown by the global mutation error handler.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Editar desejo" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className={modalLabel}>
          Para onde?
          <input
            required
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className={modalInput}
          />
        </label>
        <label className={modalLabel}>
          Quando?
          <input
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            placeholder="ex.: primavera de 2027"
            className={modalInput}
          />
        </label>
        <label className={modalLabel}>
          Porquê?
          <input value={note} onChange={(e) => setNote(e.target.value)} className={modalInput} />
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPrio(p)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${prio === p ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:border-primary"}`}
            >
              {Array.from({ length: p }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
              {PRIO[p]}
            </button>
          ))}
        </div>
        <ModalActions onCancel={onClose} submitLabel="Guardar" busy={busy} />
      </form>
    </Modal>
  );
}
