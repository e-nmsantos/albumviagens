import { ClientOnly, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MemoryMap } from "@/components/MemoryMap";
import { geocodePlace, type LatLng } from "@/lib/geocode";
import { writeStory } from "@/lib/ai.functions";
import { tripNames, useMemories, useSaveMemory, type Memory } from "@/lib/memories";
import {
  deletePhotos,
  resizeImage,
  thumbnailDataUrl,
  uploadPhoto,
  usePhotoUrls,
} from "@/lib/photos";
import { errorMessage } from "@/lib/errors";

const field =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-ring";

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
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
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
        data: { title, place, date, notes: text, photos: thumbs.filter(Boolean) },
      });
      setText(r.text);
      if (r.source === "ai") toast.success("Texto escrito — ajusta-o à tua maneira.");
      else toast("Nenhum serviço de IA respondeu; deixei um rascunho simples para completar.");
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
    <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 md:grid-cols-2">
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
        <div className="grid grid-cols-2 gap-4">
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
          <label className="block text-sm">
            Data
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={field}
            />
          </label>
        </div>
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
            <div className="mt-3 grid grid-cols-4 gap-2">
              {photos.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => removePhoto(p)}
                  title="Tirar esta foto"
                  className="group relative aspect-square overflow-hidden rounded-sm bg-muted"
                >
                  {urls[p] && <img src={urls[p]} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute inset-0 hidden items-center justify-center bg-foreground/50 text-xl text-background group-hover:flex">
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          disabled={save.isPending || uploading > 0}
          className="rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "A guardar…" : "Guardar memória"}
        </button>
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
              className="h-[60vh] w-full bg-muted"
            />
          </ClientOnly>
        </div>
      </div>
    </form>
  );
}
