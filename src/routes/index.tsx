import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  MapPin,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Map,
  Star,
  BookImage,
  Plus,
  Compass,
  Clock,
  Camera,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/use-auth";
import { statusLabel, tripDatesLabel, tripStatus } from "@/lib/dates";
import { useTrips, type TripPlan } from "@/lib/trips";
import { useMemories, countryOf, formatDate } from "@/lib/memories";
import { usePhotoUrls } from "@/lib/photos";
import { plural } from "@/lib/utils";

const tripCover = (t: TripPlan) => t.days.find((d) => d.photo)?.photo;

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Memórias — diário e planeador de viagens" },
      {
        name: "description",
        content:
          "O teu companheiro de viagens: cria roteiros dia a dia, organiza ideias e guarda memórias com fotos.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { data: trips = [] } = useTrips();
  const { data: memories = [] } = useMemories();
  const photoUrls = usePhotoUrls([
    ...memories.slice(0, 4).map((m) => m.photos[0]),
    ...trips.map(tripCover),
  ]);
  const featured = trips[0];
  const totalDaysPlanned = trips.reduce((acc, t) => acc + (t.days?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/5 via-background to-background py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-10 md:grid-cols-12">
            {/* Left Column: Heading & CTAs */}
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>De momentos a planos · viagens e roteiros</span>
              </div>

              <h1 className="mt-5 font-serif text-5xl font-normal leading-[1.08] tracking-tight text-foreground md:text-6xl lg:text-7xl">
                O teu mundo, <br />
                <em className="italic text-primary font-serif">planeado</em> &{" "}
                <em className="italic text-forest font-serif">recordado</em>.
              </h1>

              <p className="mt-5 max-w-xl text-lg text-muted-foreground leading-relaxed">
                Transforma fotografias e ideias em roteiros dia a dia e guarda um diário das
                histórias e dos lugares que marcaram a tua vida.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/planeador"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02]"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Abrir o planeador</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>

                <Link
                  to="/diario"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-all hover:bg-accent hover:border-foreground/20"
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>Ver o diário</span>
                </Link>

                <Link
                  to="/nova"
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-all hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova memória</span>
                </Link>
              </div>

              {/* Quick stats counter */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border/60 pt-6 text-sm">
                <div>
                  <span className="block text-2xl font-bold text-foreground font-serif">
                    {trips.length}
                  </span>
                  <span className="text-xs text-muted-foreground">Viagens planeadas</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-foreground font-serif">
                    {totalDaysPlanned}
                  </span>
                  <span className="text-xs text-muted-foreground">Paragens no roteiro</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-foreground font-serif">
                    {memories.length}
                  </span>
                  <span className="text-xs text-muted-foreground">Memórias no diário</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Sticky Note & Planner Showcase */}
            <div className="md:col-span-5">
              <div className="relative mx-auto max-w-sm">
                {/* Background decorative tilt */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-sky-400/20 via-primary/20 to-teal-400/20 blur-xl opacity-70" />

                {/* Sticky Note Inspired Card */}
                <div className="relative rounded-2xl border border-sky-200/80 bg-[#f4f9fb] p-6 text-slate-800 shadow-xl dark:border-sky-900/40 dark:bg-slate-900 dark:text-slate-100 rotate-1 transition-transform hover:rotate-0 duration-300">
                  {/* Pin badge */}
                  <div className="absolute -top-3 left-8 flex items-center gap-1.5 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                    <span>📌 Planeador</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-b border-sky-200/60 pb-3 dark:border-slate-800">
                    <span className="font-serif text-2xl italic tracking-tight font-medium text-slate-900 dark:text-white">
                      De momentos a planos
                    </span>
                    <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-2.5 py-1 rounded-full">
                      Tudo num só lugar
                    </span>
                  </div>

                  {/* Checklist items */}
                  <ul className="mt-4 space-y-3.5 text-sm">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                      <span>
                        <strong>Transforma fotos</strong> e ideias em roteiros organizados
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                      <span>
                        <strong>Itinerário dia a dia</strong> com horários, notas e locais
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                      <span>
                        <strong>Mapa de percurso</strong> para seguir cada paragem visualmente
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                      <span>
                        <strong>Sugestões com Inteligência Artificial</strong> para roteiros e
                        textos
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                      {user ? (
                        <span>
                          <strong>Guardado na tua conta</strong>, disponível em qualquer dispositivo
                        </span>
                      ) : (
                        <span>
                          <strong>Guardado neste dispositivo</strong> — entra numa conta para usar a
                          nuvem
                        </span>
                      )}
                    </li>
                  </ul>

                  {/* Mini preview of the newest trip */}
                  {featured && (
                    <div className="mt-5 rounded-xl border border-sky-200/60 bg-white/70 p-3 shadow-inner dark:border-slate-800 dark:bg-slate-800/60">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {featured.title}
                        </span>
                        <span className="text-[11px] text-sky-700 dark:text-sky-400">
                          {plural(featured.days.length, "paragem planeada", "paragens planeadas")}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1.5 overflow-hidden text-[11px] text-slate-600 dark:text-slate-400">
                        {featured.days.slice(0, 3).map((d) => (
                          <span
                            key={d.id}
                            className="truncate rounded bg-sky-100/80 px-2 py-0.5 dark:bg-slate-700"
                          >
                            D{d.day_number}: {d.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-center">
                    <Link
                      to="/planeador"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
                    >
                      <span>Abrir os meus itinerários</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Hub */}
      <main className="mx-auto max-w-6xl px-6 pt-12 space-y-16">
        {/* SECTION: Viagens no Planeador */}
        <section>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
                Itinerários e roteiros
              </p>
              <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl">
                As tuas viagens
              </h2>
            </div>
            <Link
              to="/planeador"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <span>Ver todas no planeador</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => {
              const days = trip.days;
              const cover = tripCover(trip);
              const coverPhoto = cover ? photoUrls[cover] : undefined;
              return (
                <div
                  key={trip.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/40 via-sky-300/30 to-forest/40">
                    {coverPhoto && (
                      <img
                        src={coverPhoto}
                        alt={trip.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      {tripDatesLabel(trip) && (
                        <span className="inline-block rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                          {tripDatesLabel(trip)}
                        </span>
                      )}
                      {statusLabel(tripStatus(trip)) && (
                        <span className="ml-1.5 inline-block rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                          {statusLabel(tripStatus(trip))}
                        </span>
                      )}
                      <h3 className="mt-1 text-xl font-serif font-medium text-white drop-shadow-sm">
                        {trip.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{trip.destination}</span>
                        <span>·</span>
                        <span>{plural(days.length, "paragem", "paragens")}</span>
                      </div>

                      {/* Preview of first 2 days */}
                      <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                        {days.slice(0, 2).map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400"
                          >
                            <span className="font-medium text-foreground">
                              Dia {d.day_number}: {d.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {d.time || "Geral"}
                            </span>
                          </div>
                        ))}
                        {days.length > 2 && (
                          <p className="text-[11px] text-muted-foreground italic">
                            + {plural(days.length - 2, "outra paragem", "outras paragens")}…
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60">
                      <Link
                        to="/planeador"
                        search={{ trip: trip.id }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary/80 py-2.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>Abrir o roteiro</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Card: Add New Trip */}
            <Link
              to="/planeador"
              className="group flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-card/40 p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-medium text-foreground">
                Planear uma nova viagem
              </h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Cria um itinerário dia a dia com horários, fotos, reservas e orçamento.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Começar no planeador →
              </span>
            </Link>
          </div>
        </section>

        {/* SECTION: Hub de Funcionalidades */}
        <section>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-forest font-semibold">
              Tudo o que precisas
            </p>
            <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl">
              Explora a tua app de viagens
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Planeador */}
            <Link
              to="/planeador"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Planeador e roteiros
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Organiza viagens dia a dia com horários, fotografias de inspiração, notas e mapas
                  do percurso.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Abrir o planeador →
              </span>
            </Link>

            {/* Diário de Viagens */}
            <Link
              to="/diario"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Diário de bordo
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Todas as tuas histórias e fotografias, com ajuda da IA para escrever o texto.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Ver o diário →
              </span>
            </Link>

            {/* Mapa Interativo */}
            <Link
              to="/mapa"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Map className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Mapa do mundo
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Cada lugar marcado no mapa interativo, com o percurso de cada viagem e a lista de
                  desejos.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Explorar o mapa →
              </span>
            </Link>

            {/* Linha do tempo */}
            <Link
              to="/linha-do-tempo"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Linha do tempo
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  As tuas aventuras ano após ano, desde a primeira recordação até às mais recentes.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Ver a linha do tempo →
              </span>
            </Link>

            {/* Lista de desejos */}
            <Link
              to="/desejos"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Star className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Lista de desejos
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Os próximos destinos de sonho por realizar, notas de restaurantes, monumentos e
                  lugares a não perder.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Ver os desejos →
              </span>
            </Link>

            {/* Passaporte Digital */}
            <Link
              to="/passaporte"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Passaporte de carimbos
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Uma caderneta com um carimbo por cada lugar onde guardaste uma memória.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Abrir o passaporte →
              </span>
            </Link>

            {/* Álbum & Estatísticas */}
            <Link
              to="/album"
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <BookImage className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  Álbum fotográfico
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Um álbum fotográfico paginado, pronto a imprimir ou guardar em PDF.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                Ver o álbum →
              </span>
            </Link>
          </div>
        </section>

        {/* SECTION: Memórias Recentes do Diário */}
        {memories.length > 0 && (
          <section className="rounded-3xl border border-border/80 bg-card/60 p-6 md:p-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
                  Recordações
                </p>
                <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground md:text-4xl">
                  Do teu diário de bordo
                </h2>
              </div>
              <Link
                to="/diario"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <span>
                  {memories.length === 1 ? "Ver a memória" : `Ver as ${memories.length} memórias`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {memories.slice(0, 4).map((m) => {
                const photo = m.photos[0] ? photoUrls[m.photos[0]] : null;
                return (
                  <Link
                    key={m.id}
                    to="/memoria/$id"
                    params={{ id: m.id }}
                    className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      {photo ? (
                        <img
                          src={photo}
                          alt={m.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Camera className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] font-medium text-primary">
                        {countryOf(m.place)} · {formatDate(m.date)}
                      </p>
                      <h4 className="mt-1 font-serif text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {m.title}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.text}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
