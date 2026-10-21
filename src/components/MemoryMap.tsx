import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import { escapeHtml } from "@/lib/html";

type Pin = {
  id: string;
  title: string;
  date: string;
  lat: number | null;
  lng: number | null;
  trip: string | null;
};

type Props = {
  memories?: Pin[];
  showRoutes?: boolean;
  onPick?: (lat: number, lng: number) => void;
  picked?: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void;
  className?: string;
  wishes?: { id: string; place: string; lat: number | null; lng: number | null }[];
};

const ROUTE_COLORS = ["#c4654a", "#4a6741", "#e8a87c", "#87a878", "#8b6f5e"];
// Stable defaults, so the map doesn't re-fit itself on every parent render.
const NO_PINS: Pin[] = [];
const NO_WISHES: NonNullable<Props["wishes"]> = [];

export function MemoryMap({
  memories = NO_PINS,
  wishes = NO_WISHES,
  showRoutes,
  onPick,
  picked,
  onSelect,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const [ready, setReady] = useState(false);

  const propsRef = useRef({ onPick, onSelect, memories, wishes, picked, showRoutes });
  propsRef.current = { onPick, onSelect, memories, wishes, picked, showRoutes };

  useEffect(() => {
    let isMounted = true;
    if (typeof window === "undefined" || !containerRef.current) return;

    // Dynamically load leaflet on the client only to avoid SSR "window is not defined"
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
      .then(([leafletMod]) => {
        if (!isMounted || !containerRef.current) return;
        const L = (leafletMod.default || leafletMod) as typeof LType;
        leafletRef.current = L;

        // Initialize Leaflet Map
        const map = L.map(containerRef.current, {
          center: [20, 0],
          zoom: 2,
          minZoom: 2,
          maxZoom: 18,
        });
        mapRef.current = map;

        // Standard OpenStreetMap tiles (100% free, no watermark, no API key required)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;

        map.on("click", (e: LType.LeafletMouseEvent) => {
          propsRef.current.onPick?.(e.latlng.lat, e.latlng.lng);
        });

        // Invalidate map size after render to prevent layout glitches
        setTimeout(() => {
          map.invalidateSize();
        }, 250);

        setReady(true);
      })
      .catch((err) => {
        console.error("Failed to load Leaflet map:", err);
      });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers, routes and picked point whenever ready or props change
  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!L || !map || !group) return;

    group.clearLayers();

    const { memories = [], wishes = [], picked, showRoutes, onSelect } = propsRef.current;
    const validMemories = memories.filter((m) => m.lat != null && m.lng != null);
    const validWishes = wishes.filter((w) => w.lat != null && w.lng != null);

    const bounds = L.latLngBounds([]);

    // 1. Draw Memory Pins (warm terracotta circle)
    validMemories.forEach((m) => {
      const latlng: LType.LatLngExpression = [m.lat!, m.lng!];
      bounds.extend(latlng);

      const marker = L.circleMarker(latlng, {
        radius: 8,
        fillColor: "#c4654a",
        color: "#ffffff",
        weight: 2.5,
        fillOpacity: 0.95,
      });

      marker.bindPopup(
        `<strong>${escapeHtml(m.title)}</strong><br/><small>${escapeHtml(m.date)}</small>`,
      );
      marker.on("click", () => {
        if (onSelect) onSelect(m.id);
      });
      marker.addTo(group);
    });

    // 2. Draw Wish Pins (emerald green star/circle)
    validWishes.forEach((w) => {
      const latlng: LType.LatLngExpression = [w.lat!, w.lng!];
      bounds.extend(latlng);

      const marker = L.circleMarker(latlng, {
        radius: 7,
        fillColor: "#4a6741",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.9,
      });

      marker.bindPopup(`<strong>Desejo:</strong> ${escapeHtml(w.place)}`);
      marker.addTo(group);
    });

    // 3. Draw Routes between places of the same trip
    if (showRoutes) {
      const trips = new Map<string, Pin[]>();
      validMemories.forEach((m) => {
        if (m.trip) {
          trips.set(m.trip, [...(trips.get(m.trip) ?? []), m]);
        }
      });

      let colorIdx = 0;
      trips.forEach((tripItems) => {
        if (tripItems.length < 2) return;
        const sorted = [...tripItems].sort((a, b) => a.date.localeCompare(b.date));
        const latlngs: LType.LatLngExpression[] = sorted.map((p) => [p.lat!, p.lng!]);
        const color = ROUTE_COLORS[colorIdx % ROUTE_COLORS.length];
        colorIdx++;

        L.polyline(latlngs, {
          color,
          dashArray: "6, 8",
          weight: 3,
          opacity: 0.85,
        }).addTo(group);
      });
    }

    // 4. Draw Picked Point (location picker in MemoryForm)
    if (picked) {
      const pickedLatLng: LType.LatLngExpression = [picked.lat, picked.lng];
      bounds.extend(pickedLatLng);

      const pickedMarker = L.circleMarker(pickedLatLng, {
        radius: 10,
        fillColor: "#2563eb",
        color: "#ffffff",
        weight: 3,
        fillOpacity: 1,
      });
      pickedMarker.bindPopup("Lugar selecionado");
      pickedMarker.addTo(group);

      map.panTo(pickedLatLng);
    }

    // Adjust zoom / bounds
    if (bounds.isValid()) {
      if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
        map.setView(bounds.getCenter(), 8);
      } else {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [ready, memories, wishes, picked, showRoutes]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-80 w-full rounded-xl"}
      style={{ minHeight: "260px" }}
    />
  );
}
