import { describe, expect, it } from "vitest";
import { parseBackup, referencedPhotos, remapPhotos } from "@/lib/backup";
import { isUuid, toUuid } from "@/lib/cloud";
import { escapeHtml } from "@/lib/html";
import { normalizeTrip } from "@/lib/trips";
import type { Memory } from "@/lib/types";

const memory = (id: string, photos: string[]): Memory => ({
  id,
  user_id: "local",
  title: "T",
  place: "Lisboa, Portugal",
  date: "2024-01-01",
  date_precision: "day",
  text: "",
  photos,
  lat: null,
  lng: null,
  trip: null,
  is_public: false,
});

describe("backup", () => {
  const trip = normalizeTrip({
    title: "x",
    days: [{ id: "d", day_number: 1, time: "", title: "D", place: "", photo: "local/b.jpg" }],
  });
  const b = { memories: [memory("1", ["local/a.jpg", "local/b.jpg"])], trips: [trip] };

  it("finds every photo used by memories and trips once", () => {
    expect(referencedPhotos(b)).toEqual(["local/a.jpg", "local/b.jpg"]);
  });

  it("renames photo keys everywhere they are used", () => {
    const r = remapPhotos(b, new Map([["local/b.jpg", "user/b.jpg"]]));
    expect(r.memories[0]!.photos).toEqual(["local/a.jpg", "user/b.jpg"]);
    expect(r.trips[0]!.days[0]!.photo).toBe("user/b.jpg");
  });

  it("reads older backups without photos and rejects other files", () => {
    const old = parseBackup({
      version: 2,
      memories: [memory("1", [])],
      trips: [{ id: "t", title: "Bali" }],
    });
    expect(old.photos).toEqual({});
    expect(old.wishes).toEqual([]);
    expect(old.trips[0]!.packing_list).toEqual([]);
    expect(() => parseBackup({ hello: "world" })).toThrow();
  });
});

describe("ids and escaping", () => {
  it("turns any id into a stable UUID", async () => {
    const a = await toUuid("sample-1");
    expect(isUuid(a)).toBe(true);
    expect(await toUuid("sample-1")).toBe(a);
    expect(await toUuid("sample-2")).not.toBe(a);
    const real = "0b9c7e1a-2f4d-4c3b-9a8e-1f2d3c4b5a69";
    expect(await toUuid(real)).toBe(real);
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;",
    );
  });
});
