import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { moveItem } from "@/lib/utils";

/**
 * The photos of a memory, in order. Drag to reorder on a computer; on a phone, use the arrows
 * or "Principal". The first photo is the main one (diary, memory page, album).
 */
export function PhotoOrganizer({
  photos,
  urls,
  onChange,
  onRemove,
}: {
  photos: string[];
  urls: Record<string, string>;
  onChange: (next: string[]) => void;
  onRemove: (key: string) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => onChange(moveItem(photos, from, to));
  const iconBtn =
    "grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow hover:bg-background disabled:opacity-30";

  return (
    <div>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Fotos da memória">
        {photos.map((p, i) => (
          <li
            key={p}
            data-photo={p}
            draggable
            onDragStart={(e) => {
              setDragging(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging !== null && dragging !== i) move(dragging, i);
              setDragging(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragging(null);
              setOver(null);
            }}
            className={`group relative aspect-square cursor-grab overflow-hidden rounded-md bg-muted active:cursor-grabbing ${dragging === i ? "opacity-40" : ""} ${over === i && dragging !== i ? "ring-2 ring-primary" : ""}`}
          >
            {urls[p] && (
              <img
                src={urls[p]}
                alt={`Foto ${i + 1}`}
                draggable={false}
                className="h-full w-full object-cover"
              />
            )}
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                Principal
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(p)}
              aria-label={`Tirar a foto ${i + 1}`}
              title="Tirar esta foto"
              className={`absolute right-1 top-1 ${iconBtn}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label={`Mover a foto ${i + 1} para trás`}
                title="Mover para trás"
                className={iconBtn}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => move(i, 0)}
                  aria-label={`Tornar a foto ${i + 1} a principal`}
                  title="Tornar principal"
                  className={iconBtn}
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === photos.length - 1}
                aria-label={`Mover a foto ${i + 1} para a frente`}
                title="Mover para a frente"
                className={iconBtn}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {photos.length > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Arrasta as fotos para mudar a ordem, ou usa as setas. A primeira é a foto principal.
        </p>
      )}
    </div>
  );
}
