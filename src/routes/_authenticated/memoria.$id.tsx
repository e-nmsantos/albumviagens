import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Lightbox } from "@/components/Lightbox";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, useDeleteMemory, useMemories, useSaveMemory } from "@/lib/memories";
import { usePhotoUrls } from "@/lib/photos";

export const Route = createFileRoute("/_authenticated/memoria/$id")({
  head: () => ({
    meta: [
      { title: "Memória de viagem — Fica na Memória" },
      { name: "description", content: "Uma memória de viagem com fotos e histórias." },
      { property: "og:title", content: "Memória de viagem — Fica na Memória" },
      { property: "og:description", content: "Uma memória de viagem com fotos e histórias." },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { data, isPending } = useMemories();
  const { user } = useAuth();
  const del = useDeleteMemory();
  const save = useSaveMemory();
  const nav = useNavigate();
  const [open, setOpen] = useState<number | null>(null);
  const m = data?.find((x) => x.id === id);
  const urls = usePhotoUrls(m?.photos ?? []);

  if (isPending)
    return (
      <div className="min-h-screen">
        <SiteHeader />
      </div>
    );
  if (!m)
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="py-20 text-center text-muted-foreground">
          Memória não encontrada.{" "}
          <Link to="/diario" className="text-primary underline">
            Voltar
          </Link>
        </p>
      </div>
    );

  const sameTrip = m.trip ? (data ?? []).filter((x) => x.trip === m.trip && x.id !== m.id) : [];
  const list = m.photos.map((p) => urls[p]).filter((u): u is string => !!u);
  const [cover, ...rest] = m.photos;
  // The diary lists newest first, so the next item there is the older memory.
  const at = (data ?? []).findIndex((x) => x.id === m.id);
  const older = data?.[at + 1];
  const newer = at > 0 ? data?.[at - 1] : undefined;
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/partilha/${m.id}` : "";

  async function toggleShare() {
    const next = !m!.is_public;
    try {
      await save.mutateAsync({ ...m!, is_public: next });
    } catch {
      return; // Shown by the global mutation error handler.
    }
    if (next) {
      const copied = await navigator.clipboard?.writeText(shareUrl).then(
        () => true,
        () => false,
      );
      toast.success(
        copied ? "Link copiado — quem o tiver pode ver esta memória." : "Memória partilhada.",
      );
    } else toast("Esta memória voltou a ser privada.");
  }

  async function remove() {
    if (!confirm("Apagar esta memória e as fotos dela?")) return;
    await del.mutateAsync(m!).then(
      () => nav({ to: "/diario" }),
      () => undefined, // Shown by the global mutation error handler.
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-6 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link to="/diario" className="text-muted-foreground hover:text-foreground">
            ← Diário
          </Link>
          <div className="flex gap-4">
            <Link
              to="/memoria/$id/editar"
              params={{ id: m.id }}
              className="text-muted-foreground hover:text-foreground"
            >
              Editar
            </Link>
            {user ? (
              <button
                onClick={toggleShare}
                disabled={save.isPending}
                className="text-primary hover:underline"
              >
                {m.is_public ? "Deixar de partilhar" : "Partilhar"}
              </button>
            ) : (
              <Link
                to="/auth"
                className="text-muted-foreground hover:text-foreground"
                title="Partilhar exige uma conta, porque a memória tem de estar na nuvem"
              >
                Entrar para partilhar
              </Link>
            )}
          </div>
        </div>
        {user && m.is_public && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-secondary p-3 text-sm">
            <span className="truncate">{shareUrl}</span>
            <button
              onClick={() =>
                navigator.clipboard?.writeText(shareUrl).then(
                  () => toast.success("Link copiado."),
                  () => toast.error("Não foi possível copiar."),
                )
              }
              className="ml-auto shrink-0 text-primary"
            >
              Copiar
            </button>
          </div>
        )}
        {cover && (
          <button
            onClick={() => urls[cover] && setOpen(list.indexOf(urls[cover]))}
            className="mt-6 block w-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted shadow-lg"
          >
            {urls[cover] ? (
              <img src={urls[cover]} alt={m.title} className="max-h-[65vh] w-full object-cover" />
            ) : (
              <div className="aspect-[4/3] w-full" />
            )}
          </button>
        )}
        {m.trip && <p className="mt-8 text-xs uppercase tracking-[0.3em] text-forest">{m.trip}</p>}
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-primary">
          {m.place} · {formatDate(m.date)}
        </p>
        <h1 className="mt-3 text-5xl leading-tight md:text-6xl">{m.title}</h1>
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">{m.text}</p>
        <div className="mt-10 columns-1 gap-4 sm:columns-2">
          {rest.map(
            (p, i) =>
              urls[p] && (
                <button
                  key={p}
                  onClick={() => setOpen(list.indexOf(urls[p]!))}
                  className="polaroid mb-4 block w-full break-inside-avoid cursor-zoom-in"
                >
                  <img src={urls[p]} alt={`${m.title} ${i + 2}`} className="w-full" />
                </button>
              ),
          )}
        </div>
        {sameTrip.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl">Mais desta viagem</h2>
            <ul className="mt-4 space-y-2">
              {sameTrip.map((x) => (
                <li key={x.id}>
                  <Link to="/memoria/$id" params={{ id: x.id }} className="hover:text-primary">
                    {x.title}{" "}
                    <span className="text-sm text-muted-foreground">
                      · {x.place} · {formatDate(x.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(older || newer) && (
          <nav className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
            {older ? (
              <Link to="/memoria/$id" params={{ id: older.id }} className="group min-w-0">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  ← Mais antiga
                </span>
                <span className="block truncate font-display text-xl group-hover:text-primary">
                  {older.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer && (
              <Link
                to="/memoria/$id"
                params={{ id: newer.id }}
                className="group min-w-0 text-right"
              >
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Mais recente →
                </span>
                <span className="block truncate font-display text-xl group-hover:text-primary">
                  {newer.title}
                </span>
              </Link>
            )}
          </nav>
        )}
        <button
          onClick={remove}
          disabled={del.isPending}
          className="mt-12 text-sm text-destructive hover:underline disabled:opacity-50"
        >
          {del.isPending ? "A apagar…" : "Apagar memória"}
        </button>
      </article>
      <Lightbox urls={list} index={open} onChange={setOpen} />
    </div>
  );
}
