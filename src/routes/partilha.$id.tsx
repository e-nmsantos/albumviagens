import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lightbox } from "@/components/Lightbox";
import { formatDate, type Memory } from "@/lib/memories";
import { usePhotoUrls } from "@/lib/photos";

export const Route = createFileRoute("/partilha/$id")({
  head: () => ({
    meta: [
      { title: "Uma memória de viagem — Memórias" },
      { name: "description", content: "Alguém partilhou contigo uma memória de viagem." },
      { property: "og:title", content: "Uma memória de viagem — Memórias" },
      { property: "og:description", content: "Alguém partilhou contigo uma memória de viagem." },
    ],
  }),
  component: Shared,
});

function Shared() {
  const { id } = Route.useParams();
  const [open, setOpen] = useState<number | null>(null);
  const {
    data: m,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["shared", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memories")
        .select("id,title,place,date,text,photos,trip")
        .eq("id", id)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data as Pick<
        Memory,
        "id" | "title" | "place" | "date" | "text" | "photos" | "trip"
      > | null;
    },
  });
  const urls = usePhotoUrls(m?.photos ?? []);
  const list = (m?.photos ?? []).map((p) => urls[p]).filter((u): u is string => !!u);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-3xl italic">
          Memórias
        </Link>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
          Criar o meu diário
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-6 pb-24">
        {isLoading ? null : isError ? (
          <p className="py-20 text-center text-muted-foreground">
            Não foi possível abrir esta memória. Verifica a ligação e tenta outra vez.
          </p>
        ) : !m ? (
          <p className="py-20 text-center text-muted-foreground">
            Esta memória não existe ou deixou de ser partilhada.
          </p>
        ) : (
          <>
            {m.trip && (
              <p className="mt-8 text-xs uppercase tracking-[0.3em] text-forest">{m.trip}</p>
            )}
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-primary">
              {m.place} · {formatDate(m.date)}
            </p>
            <h1 className="mt-3 text-5xl leading-tight md:text-6xl">{m.title}</h1>
            <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">{m.text}</p>
            <div className="mt-10 columns-1 gap-4 sm:columns-2">
              {list.map((u, i) => (
                <button
                  key={u}
                  onClick={() => setOpen(i)}
                  className="polaroid mb-4 block w-full break-inside-avoid cursor-zoom-in"
                >
                  <img src={u} alt="" className="w-full" />
                </button>
              ))}
            </div>
          </>
        )}
      </article>
      <Lightbox urls={list} index={open} onChange={setOpen} />
    </div>
  );
}
