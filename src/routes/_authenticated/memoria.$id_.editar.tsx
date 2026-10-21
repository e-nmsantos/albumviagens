import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { MemoryForm } from "@/components/MemoryForm";
import { useMemories } from "@/lib/memories";

export const Route = createFileRoute("/_authenticated/memoria/$id_/editar")({
  head: () => ({
    meta: [
      { title: "Editar memória — Memórias" },
      { name: "description", content: "Altera o texto, as fotos ou o lugar de uma memória." },
      { property: "og:title", content: "Editar memória — Memórias" },
      { property: "og:description", content: "Altera uma memória de viagem." },
    ],
  }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const { data, isPending } = useMemories();
  const m = data?.find((x) => x.id === id);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {isPending ? null : m ? (
        <MemoryForm key={m.id} initial={m} />
      ) : (
        <p className="py-20 text-center text-muted-foreground">Memória não encontrada.</p>
      )}
    </div>
  );
}
