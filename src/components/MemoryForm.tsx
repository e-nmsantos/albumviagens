import { ClientOnly, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MemoryMap } from "@/components/MemoryMap";
import { PhotoOrganizer } from "@/components/PhotoOrganizer";
import { geocodePlace, type LatLng } from "@/lib/geocode";
import { writeStory } from "@/lib/ai.functions";
import { MAX_NOTES } from "@/lib/ai-text";
import {
  memoryDate,
  monthEnd,
  tripNames,
  useMemories,
  useSaveMemory,
  type Memory,
} from "@/lib/memories";
import { toIsoDay } from "@/lib/dates";
import {
  deletePhotos,
  resizeImage,
  thumbnailDataUrl,
  uploadPhoto,
  usePhotoUrls,
} from "@/lib/photos";
import { errorMessage } from "@/lib/errors";

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const field =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-ring";

const PORTUGAL = { lat: 39.6, lng: -8.0, zoom: 6 };

type Prefill = { place: string; lat?: number | undefined; lng?: number | undefined };

export function MemoryForm({
  initial,
  prefill,
}: {
  initial?: Memory;
  prefill?: Prefill | undefined;
}) {
  const nav = useNavigate();
  const save = useSaveMemory();
  const { data: all = [] } = useMemories();
  const trips = tripNames(all);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [place, setPlace] = useState(initial?.place ?? prefill?.place ?? "");
  // When it happened: month and year are required, the day is optional.
  const start = initial?.date ?? toIsoDay(new Date());
  const [year, setYear] = useState(start.slice(0, 4));
  const [month, setMonth] = useState(Number(start.slice(5, 7)));
  const [day, setDay] = useState(
    initial?.date_precision === "month" ? "" : String(Number(start.slice(8, 10))),
  );
  const daysInMonth = new Date(Number(year) || 2000, month, 0).getDate();
  const validYear = /^\d{4}$/.test(year);
  const date = !validYear
    ? ""
    : day
      ? `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`
      : monthEnd(Number(year), month);
  const precision = day ? "day" : "month";
  const [text, setText] = useState(initial?.text ?? "");
  const [trip, setTrip] = useState(initial?.trip ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const [pos, setPos] = useState<LatLng | null>(
    initial?.lat != null && initial?.lng != null
      ? { lat: initial.lat, lng: initial.lng }
      : prefill?.lat != null && prefill?.lng != null
        ? { lat: prefill.lat, lng: prefill.lng }
        : null,
  );
  const [locatedFor, setLocatedFor] = useState(pos ? place : "");
  const urls = usePhotoUrls(photos);
  const [writing, setWriting] = useState(false);

  // Photos uploaded in this form but never saved are removed when the form closes.
  const fresh = useRef(new Set<string>());
  useEffect(() => {
    const pending = fresh.current;
    return () => {
      if (pending.size) void deletePhotos([...pending]);
    };
  }, []);

  async function aiWrite() {
    setWriting(true);
    try {
      const thumbs: string[] = [];
      for (const p of photos.slice(0, 4)) {
        const url = urls[p];
        if (url) thumbs.push(await thumbnailDataUrl(url).catch(() => ""));
      }
      const r = await writeStory({
        data: {
          title,
          place,
          date: date ? memoryDate({ date, date_precision: precision }) : "",
          notes: text.slice(0, MAX_NOTES),
          photos: thumbs.filter(Boolean),
        },
      });
      if (r.source === "ai") {
        setText(r.text);
        toast.success("Texto escrito — ajusta-o à tua maneira.");
      } else if (text.trim()) {
        // Never replace what the person wrote with the plain draft.
        toast(
          "Nenhum serviço de IA respondeu agora. O teu texto ficou como estava; tenta daqui a pouco.",
        );
      } else {
        setText(r.text);
        toast("Nenhum serviço de IA respondeu; deixei um rascunho simples para completar.");
      }
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível escrever o texto."));
    } finally {
      setWriting(false);
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        const key = await uploadPhoto(await resizeImage(f));
        fresh.current.add(key);
        setPhotos((p) => [...p, key]);
      } catch (e) {
        toast.error(errorMessage(e, `Não foi possível carregar ${f.name}.`));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function removePhoto(key: string) {
    setPhotos((p) => p.filter((x) => x !== key));
    if (fresh.current.delete(key)) void deletePhotos([key]);
  }

  async function locate(): Promise<LatLng | null> {
    const q = place.trim();
    if (q.length < 2 || q === locatedFor) return pos;
    const r = await geocodePlace(q);
    setLocatedFor(q);
    if (r) setPos(r);
    else toast("Não encontrei esse lugar no mapa — toque no mapa para o marcar.");
    return r ?? pos;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = await locate();
    try {
      const m = await save.mutateAsync({
        id: initial?.id,
        title: title.trim(),
        place: place.trim(),
        date,
        date_precision: precision,
        text,
        photos,
        trip: trip.trim() || null,
        lat: p?.lat ?? null,
        lng: p?.lng ?? null,
        is_public: initial?.is_public ?? false,
      });
      fresh.current.clear();
      nav({ to: "/memoria/$id", params: { id: m.id } });
    } catch {
      // Shown by the global mutation error handler.
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto grid max-w-6xl gap-x-10 gap-y-8 px-6 pb-24 md:grid-cols-2"
    >
      <div className="space-y-5">
        <h1 className="text-5xl">
          {initial ? "Editar" : "Nova"} <em className="text-primary">memória</em>
        </h1>
        <label className="block text-sm">
          Título
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
            placeholder="Pôr do sol em Sintra"
          />
        </label>
        <label className="block text-sm">
          Lugar
          <input
            required
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onBlur={() => void locate()}
            className={field}
            placeholder="Sintra, Portugal"
          />
        </label>
        <fieldset>
          <legend className="text-sm">
            Quando foi? <span className="text-muted-foreground">(o dia é opcional)</span>
          </legend>
          <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-3">
            <label className="block text-xs text-muted-foreground">
              Mês
              <select
                required
                value={month}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setMonth(m);
                  const max = new Date(Number(year) || 2000, m, 0).getDate();
                  if (Number(day) > max) setDay(String(max));
                }}
                className={field}
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-muted-foreground">
              Ano
              <input
                required
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={field}
                aria-invalid={!validYear}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Dia
              <select value={day} onChange={(e) => setDay(e.target.value)} className={field}>
                <option value="">—</option>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <label className="block text-sm">
          Viagem <span className="text-muted-foreground">(opcional — junta várias memórias)</span>
          <input
            list="trips"
            value={trip}
            onChange={(e) => setTrip(e.target.value)}
            className={field}
            placeholder="Japão 2024"
          />
          <datalist id="trips">
            {trips.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <div className="flex items-center justify-between text-sm">
          <span>A história</span>
          <button
            type="button"
            onClick={aiWrite}
            disabled={writing || uploading > 0 || (!photos.length && !title && !text)}
            className="rounded-full border border-primary/40 px-3 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          >
            {writing ? "A escrever…" : text ? "✦ Melhorar com IA" : "✦ Escrever com IA"}
          </button>
        </div>
        <label className="block text-sm">
          <span className="sr-only">A história</span>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={field}
            placeholder="O que aconteceu, o que sentiste…"
          />
        </label>
        <p className="-mt-3 text-xs text-muted-foreground">
          A IA recebe o título, o lugar, a data, o texto e miniaturas das fotos, e envia-os a um
          serviço de IA externo.
        </p>
        <div>
          <span className="text-sm">Fotos</span>
          <label className="mt-1 flex cursor-pointer items-center justify-center rounded-md border border-dashed border-input bg-card py-6 text-sm text-muted-foreground hover:border-primary">
            {uploading ? `A carregar ${uploading}…` : "Escolher fotos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {photos.length > 0 && (
            <PhotoOrganizer
              photos={photos}
              urls={urls}
              onChange={setPhotos}
              onRemove={removePhoto}
            />
          )}
        </div>
      </div>
      <div>
        <p className="text-sm">
          Onde foi?{" "}
          <span className="text-muted-foreground">
            Escreve o lugar e ele aparece no mapa — ou toca no mapa para ajustar.
          </span>
        </p>
        <div className="polaroid mt-2">
          <ClientOnly fallback={<div className="h-[60vh] bg-muted" />}>
            <MemoryMap
              picked={pos}
              onPick={(lat, lng) => setPos({ lat, lng })}
              start={PORTUGAL}
              className="h-[45vh] w-full bg-muted md:h-[60vh]"
            />
          </ClientOnly>
        </div>
      </div>
      {/* After the map on phones, so the place is checked before saving. */}
      <div className="md:col-span-2">
        <button
          disabled={save.isPending || uploading > 0}
          className="w-full rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 disabled:opacity-50 md:w-auto"
        >
          {save.isPending ? "A guardar…" : "Guardar memória"}
        </button>
      </div>
    </form>
  );
}
