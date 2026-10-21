import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { byYear, formatDate, useMemories } from "@/lib/memories";
import { usePhotoUrls } from "@/lib/photos";

export const Route = createFileRoute("/_authenticated/linha-do-tempo")({
  head: () => ({
    meta: [
      { title: "Linha do tempo — Memórias" },
      { name: "description", content: "Todas as memórias de viagem, ano a ano." },
      { property: "og:title", content: "Linha do tempo — Memórias" },
      { property: "og:description", content: "Todas as memórias de viagem, ano a ano." },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const { data: ms = [] } = useMemories();
  const urls = usePhotoUrls(ms.map((m) => m.photos[0]));
  // Newest first, like the diary; the button flips it.
  const [newestFirst, setNewestFirst] = useState(true);
  const years = byYear(ms, newestFirst);
  return (
    <div className="min-h-screen pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-5xl md:text-6xl">
            A linha do <em className="text-primary">tempo</em>
          </h1>
          {ms.length > 1 && (
            <button
              onClick={() => setNewestFirst((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-sm hover:bg-secondary"
            >
              <ArrowDownUp className="h-4 w-4 text-primary" />
              {newestFirst ? "Mais recentes primeiro" : "Mais antigas primeiro"}
            </button>
          )}
        </div>
        {ms.length === 0 && <p className="mt-10 text-muted-foreground">Ainda não há memórias.</p>}
        {years.map(([y, list]) => (
          <section key={y} className="relative mt-14">
            <h2 className="sticky top-20 z-10 inline-block rounded-full bg-primary px-5 py-1 font-display text-3xl text-primary-foreground shadow">
              {y}
            </h2>
            <ol className="relative ml-4 mt-6 border-l-2 border-dashed border-sage/60 md:ml-8">
              {list.map((m, i) => (
                <li key={m.id} className="relative mb-10 pl-8 md:pl-12">
                  <span className="absolute -left-[9px] top-3 h-4 w-4 rounded-full border-4 border-background bg-primary" />
                  <Link
                    to="/memoria/$id"
                    params={{ id: m.id }}
                    className={`polaroid flex max-w-xl gap-4 ${i % 2 ? "md:ml-16 rotate-[0.6deg]" : "-rotate-[0.6deg]"}`}
                  >
                    {m.photos[0] && urls[m.photos[0]] ? (
                      <img
                        src={urls[m.photos[0]]}
                        alt=""
                        className="h-28 w-28 shrink-0 object-cover md:h-36 md:w-36"
                      />
                    ) : (
                      <div className="h-28 w-28 shrink-0 bg-muted md:h-36 md:w-36" />
                    )}
                    <div className="min-w-0 py-1">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {formatDate(m.date)}
                      </p>
                      <p className="mt-1 font-display text-2xl leading-tight md:text-3xl">
                        {m.title}
                      </p>
                      <p className="text-sm text-primary">{m.place}</p>
                      {m.text && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{m.text}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
    </div>
  );
}
