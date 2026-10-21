export type LatLng = { lat: number; lng: number };

/** Looks a place up on OpenStreetMap (Nominatim), straight from the browser. Null when not found. */
export async function geocodePlace(q: string): Promise<LatLng | null> {
  const query = q.trim();
  if (query.length < 2) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=pt-PT&q=${encodeURIComponent(query)}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = (await r.json()) as { lat: string; lon: string }[];
    const hit = j[0];
    if (!hit) return null;
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
