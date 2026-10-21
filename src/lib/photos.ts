import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { currentScope, isCloud, type Scope } from "@/hooks/use-auth";
import { localDB } from "@/lib/local-db";

const BUCKET = "photos";

/** Local photos live in IndexedDB under `local/…`; everything else is a key in the cloud bucket. */
export const isLocalKey = (key: string) => key.startsWith("local/");

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Stores a photo where the current session keeps its data and returns its key. */
export async function uploadPhoto(blob: Blob, scope?: Scope): Promise<string> {
  const s = scope ?? (await currentScope());
  if (isCloud(s)) {
    const key = `${s}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, blob, { contentType: "image/jpeg" });
    if (error) throw new Error(`Não foi possível enviar a foto: ${error.message}`);
    return key;
  }
  const key = `local/${crypto.randomUUID()}.jpg`;
  await localDB.putPhoto(key, await blobToDataUrl(blob));
  return key;
}

/** Removes photos; failures are logged because a leftover file is harmless. */
export async function deletePhotos(keys: string[]): Promise<void> {
  const local = keys.filter(isLocalKey);
  const cloud = keys.filter((k) => !isLocalKey(k) && !k.startsWith("data:"));
  try {
    await localDB.removePhotos(local);
    if (cloud.length) {
      const { error } = await supabase.storage.from(BUCKET).remove(cloud);
      if (error) throw error;
    }
  } catch (e) {
    console.warn("Não foi possível apagar algumas fotos:", e);
  }
}

/** Reads a stored photo as a data URL (for backups). */
export async function photoAsDataUrl(key: string): Promise<string | null> {
  if (key.startsWith("data:")) return key;
  if (isLocalKey(key)) return localDB.getPhoto(key);
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error || !data) return null;
  return blobToDataUrl(data);
}

/** Displayable URLs (data URLs or signed URLs), keyed by photo key. */
export function usePhotoUrls(keys: (string | undefined | null)[]): Record<string, string> {
  const key = [...new Set(keys.filter((k): k is string => !!k))].sort();
  return (
    useQuery({
      queryKey: ["photo-urls", key],
      enabled: key.length > 0,
      staleTime: 50 * 60 * 1000,
      queryFn: async () => {
        const map: Record<string, string> = {};
        const cloud: string[] = [];
        for (const k of key) {
          if (k.startsWith("data:")) map[k] = k;
          else if (isLocalKey(k)) {
            const url = await localDB.getPhoto(k);
            if (url) map[k] = url;
          } else cloud.push(k);
        }
        if (cloud.length) {
          const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(cloud, 3600);
          if (error) console.warn("Não foi possível abrir as fotos da nuvem:", error.message);
          data?.forEach((d) => {
            if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
          });
        }
        return map;
      },
    }).data ?? {}
  );
}

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagem inválida"));
    img.src = src;
  });
}

function drawScaled(img: HTMLImageElement, max: number) {
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/**
 * Shrinks a picked file to a JPEG of at most `maxSide` × `maxSide` pixels' worth of area.
 * Limiting the area (not the longest side) keeps panoramas tall enough to print: 3000 × 3000
 * covers a full 30 cm album page at about 250 dpi.
 */
export async function resizeImage(src: File | string, maxSide = 3000): Promise<Blob> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    const img = await loadImage(url);
    const byArea = Math.sqrt((maxSide * maxSide) / (img.width * img.height));
    const c = drawScaled(img, Math.max(img.width, img.height) * Math.min(1, byArea));
    return await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("Imagem inválida"))), "image/jpeg", 0.88),
    );
  } finally {
    if (typeof src !== "string") URL.revokeObjectURL(url);
  }
}

/** Small JPEG data URL of a displayable photo URL, for sending to the AI. */
export async function thumbnailDataUrl(url: string, max = 640): Promise<string> {
  return drawScaled(await loadImage(url, !url.startsWith("data:")), max).toDataURL(
    "image/jpeg",
    0.7,
  );
}
