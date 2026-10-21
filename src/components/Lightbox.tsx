import { useEffect } from "react";

type Props = { urls: string[]; index: number | null; onChange: (i: number | null) => void };

export function Lightbox({ urls, index, onChange }: Props) {
  useEffect(() => {
    if (index == null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChange(null);
      if (e.key === "ArrowRight") onChange((index + 1) % urls.length);
      if (e.key === "ArrowLeft") onChange((index - 1 + urls.length) % urls.length);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [index, urls.length, onChange]);

  if (index == null || !urls[index]) return null;
  const btn =
    "absolute top-1/2 -translate-y-1/2 rounded-full bg-background/20 px-4 py-3 text-2xl text-background hover:bg-background/40";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95"
      onClick={() => onChange(null)}
    >
      <img
        src={urls[index]}
        alt=""
        className="max-h-[90vh] max-w-[92vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {urls.length > 1 && (
        <>
          <button
            aria-label="Anterior"
            className={`${btn} left-4`}
            onClick={(e) => {
              e.stopPropagation();
              onChange((index - 1 + urls.length) % urls.length);
            }}
          >
            ‹
          </button>
          <button
            aria-label="Seguinte"
            className={`${btn} right-4`}
            onClick={(e) => {
              e.stopPropagation();
              onChange((index + 1) % urls.length);
            }}
          >
            ›
          </button>
        </>
      )}
      <button
        aria-label="Fechar"
        className="absolute right-5 top-4 text-3xl text-background"
        onClick={() => onChange(null)}
      >
        ×
      </button>
      <p className="absolute bottom-4 text-sm text-background/70">
        {index + 1} / {urls.length}
      </p>
    </div>
  );
}
