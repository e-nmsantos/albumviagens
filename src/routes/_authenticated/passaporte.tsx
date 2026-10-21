import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Compass, Globe, Pencil, Printer, Sparkles, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Modal, ModalActions } from "@/components/planner/ui";
import { input, label } from "@/components/planner/styles";
import { countryCodeOf, placeAndCountry } from "@/lib/countries";
import { errorMessage } from "@/lib/errors";
import { formatDate, useMemories } from "@/lib/memories";
import { deletePhotos, resizeImage, uploadPhoto, usePhotoUrls } from "@/lib/photos";
import { mrzLines, useProfile, type Profile } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/passaporte")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Passaporte de viagens — Fica na Memória" },
      {
        name: "description",
        content: "O teu passaporte com um carimbo por cada lugar onde guardaste uma memória.",
      },
    ],
  }),
  component: PassportPage,
});

// Ink colours for the rubber stamps, all within the calm blue/green palette.
const INKS = [
  "border-teal-700/80 text-teal-800 bg-teal-500/5",
  "border-blue-800/80 text-blue-900 bg-blue-500/5",
  "border-sky-800/80 text-sky-900 bg-sky-500/5",
  "border-indigo-800/70 text-indigo-900 bg-indigo-500/5",
  "border-emerald-800/70 text-emerald-900 bg-emerald-500/5",
];
const SHAPES = [
  "rounded-[50%] px-7 py-7",
  "rounded-2xl border-4 border-double p-4",
  "rounded-md p-4",
];
// Each stamp sits at its own angle and nudges into its neighbours, like a real passport page.
const LAYOUT = [
  "-rotate-6",
  "rotate-3 -ml-5 mt-6",
  "-rotate-2 -ml-4 -mt-2",
  "rotate-6 -ml-6 mt-4",
  "-rotate-3 -ml-3",
  "rotate-2 -ml-5 mt-8",
];

function PassportPage() {
  const { data: memories = [] } = useMemories();
  const { profile } = useProfile();
  const [editing, setEditing] = useState(false);

  // One stamp per place visited, dated with the first visit.
  const stamps = useMemo(() => {
    const seen = new Set<string>();
    return [...memories]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((m) => {
        const key = m.place.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((m) => ({ id: m.id, ...placeAndCountry(m.place), date: formatDate(m.date) }));
  }, [memories]);

  const countryCount = new Set(
    memories.map((m) => countryCodeOf(m.place) ?? placeAndCountry(m.place).country.toLowerCase()),
  ).size;
  const oldest = [...memories].sort((a, b) => a.date.localeCompare(b.date))[0];
  const firstYear = oldest?.date.slice(0, 4) ?? "—";
  const photoUrl = usePhotoUrls([profile.photo])[profile.photo];
  const holder = profile.name.trim() || "Viajante do Mundo";
  const [mrz1, mrz2] = mrzLines(profile.name, oldest?.date.slice(0, 4) ?? "2000");

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 pb-6 print:hidden">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Coleção de carimbos</span>
            </div>
            <h1 className="mt-1 font-serif text-3xl md:text-4xl">O teu passaporte de viagens</h1>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-accent"
          >
            <Printer className="h-4 w-4 text-primary" />
            <span>Imprimir</span>
          </button>
        </div>

        <div className="relative mx-auto overflow-hidden rounded-3xl border border-slate-300 bg-[#f7fafb] shadow-2xl print:border-none print:shadow-none">
          <div className="border-b-4 border-sky-500/60 bg-[#1c2333] px-5 py-6 text-center text-sky-200 shadow-inner md:px-8">
            <div className="flex items-center justify-center gap-3">
              <Globe className="h-6 w-6 shrink-0 text-sky-400 md:h-7 md:w-7" />
              <span className="font-serif text-lg font-medium uppercase tracking-[0.2em] md:text-xl md:tracking-[0.25em]">
                Passaporte de Memórias
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-sky-300/80">
              Documento de viagem · coleção pessoal
            </p>
          </div>

          <div className="grid divide-y divide-slate-300 md:grid-cols-12 md:divide-x md:divide-y-0">
            {/* Holder page */}
            <div className="flex min-w-0 flex-col justify-between bg-slate-50/60 p-5 md:col-span-5 md:p-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Página do titular
                  </span>
                  <span className="font-mono text-xs font-bold text-primary">
                    Nº {memories.length}24-X
                  </span>
                </div>

                <div className="mt-6 flex gap-4">
                  <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-slate-400 bg-slate-200 shadow-inner">
                    {photoUrl ? (
                      <img src={photoUrl} alt={holder} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                        <Compass className="h-8 w-8" />
                        <span className="mt-1 text-[10px] font-bold uppercase">Sem foto</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-2 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Titular
                      </span>
                      <span className="block break-words font-serif text-sm font-semibold text-slate-900">
                        {holder}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nacionalidade
                      </span>
                      <span className="font-semibold text-slate-800">Portuguesa (PRT)</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Primeira viagem
                      </span>
                      <span className="font-semibold text-slate-800">{firstYear}</span>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1 pt-1 text-[11px] font-medium text-primary hover:underline print:hidden"
                    >
                      <Pencil className="h-3 w-3" />
                      {profile.name || profile.photo ? "Editar titular" : "Pôr o teu nome e foto"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-300 pt-5">
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-center">
                    <span className="block font-serif text-2xl font-bold text-primary">
                      {countryCount}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {countryCount === 1 ? "País carimbado" : "Países carimbados"}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-center">
                    <span className="block font-serif text-2xl font-bold text-forest">
                      {stamps.length}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {stamps.length === 1 ? "Lugar" : "Lugares"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Machine-readable zone */}
              <div className="mt-8 overflow-x-auto border-t border-slate-300 pt-4 font-mono text-[8px] tracking-wider text-slate-500 sm:text-[10px] sm:tracking-widest">
                <div className="whitespace-nowrap">{mrz1}</div>
                <div className="whitespace-nowrap">{mrz2}</div>
              </div>
            </div>

            {/* Stamps page */}
            <div className="relative min-w-0 p-5 md:col-span-7 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Vistos e carimbos de entrada
                </span>
                <span className="font-serif text-xs italic text-slate-500">Páginas 4 e 5</span>
              </div>

              {stamps.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center px-2 pb-4 pt-8 md:min-h-[360px] md:content-center">
                  {stamps.map((s, i) => (
                    <Link
                      key={s.id}
                      to="/memoria/$id"
                      params={{ id: s.id }}
                      title="Abrir a memória"
                      className={`relative w-36 text-center transition-transform duration-300 hover:z-10 hover:scale-105 hover:rotate-0 sm:w-40 md:w-48 ${LAYOUT[i % LAYOUT.length]}`}
                    >
                      <div
                        className={`border-2 border-dashed bg-[#f7fafb]/90 shadow-sm backdrop-blur-[1px] ${INKS[i % INKS.length]} ${SHAPES[i % SHAPES.length]}`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">
                          ★ Entrada ★
                        </div>
                        <h4 className="mt-1 font-serif text-base font-bold uppercase leading-tight tracking-tight">
                          {s.place}
                        </h4>
                        {s.country && (
                          <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase">
                            {s.country}
                          </p>
                        )}
                        <div className="mt-1.5 border-t border-current/30 pt-1 font-mono text-[9px] tracking-wider opacity-90">
                          {s.date}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <Compass className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p className="font-serif text-sm italic">Nenhum carimbo ainda.</p>
                  <p className="mt-1 text-xs">
                    Cria a tua primeira memória para receberes um carimbo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {editing && <HolderModal current={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}

function HolderModal({ current, onClose }: { current: Profile; onClose: () => void }) {
  const { save } = useProfile();
  const [name, setName] = useState(current.name);
  const [photo, setPhoto] = useState(current.photo);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = usePhotoUrls([photo])[photo];
  const saved = useRef(false);

  function close() {
    if (photo && photo !== current.photo && !saved.current) void deletePhotos([photo]);
    onClose();
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      const key = await uploadPhoto(await resizeImage(file, 800));
      if (photo && photo !== current.photo) void deletePhotos([photo]);
      setPhoto(key);
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível carregar a foto."));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ name: name.trim(), photo });
      saved.current = true;
      if (current.photo && current.photo !== photo) void deletePhotos([current.photo]);
      toast.success("Passaporte atualizado.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível guardar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Titular do passaporte" onClose={close}>
      <form onSubmit={submit} className="space-y-4">
        <label className={label}>
          Nome
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Nuno Santos"
            className={input}
          />
        </label>
        <div>
          <span className={label}>Fotografia</span>
          <div className="mt-2 flex items-center gap-4">
            <div className="relative h-24 w-20 overflow-hidden rounded-lg border border-border bg-muted">
              {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
              {photo && (
                <button
                  type="button"
                  onClick={() => {
                    if (photo !== current.photo) void deletePhotos([photo]);
                    setPhoto("");
                  }}
                  aria-label="Tirar a foto"
                  className="absolute right-1 top-1 rounded-full bg-foreground/60 p-0.5 text-background"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-input px-4 py-2 text-xs font-semibold hover:bg-secondary"
            >
              <Camera className="h-3.5 w-3.5" />
              {photo ? "Trocar foto" : "Escolher foto"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <ModalActions onCancel={close} submitLabel="Guardar" busy={busy} />
      </form>
    </Modal>
  );
}
