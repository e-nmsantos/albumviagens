import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Memory } from "@/lib/types";

// Each test gets an empty browser database and a fresh copy of the module.
beforeEach(() => {
  vi.resetModules();
  window.indexedDB = new IDBFactory();
});
const load = async () => (await import("@/lib/local-db")).localDB;

describe("local database", () => {
  it("adds the examples only when the database is first created", async () => {
    let db = await load();
    const first = await db.getAll<Memory>("memories");
    expect(first.map((m) => m.id).sort()).toEqual(["sample-1", "sample-2"]);

    for (const m of first) await db.remove("memories", m.id);
    vi.resetModules(); // as if the app was opened again
    db = await load();
    expect(await db.getAll("memories")).toEqual([]);
  });

  it("stores, reads and deletes photos", async () => {
    const db = await load();
    await db.putPhoto("local/a.jpg", "data:image/jpeg;base64,AAAA");
    expect(await db.getPhoto("local/a.jpg")).toBe("data:image/jpeg;base64,AAAA");
    await db.removePhotos(["local/a.jpg"]);
    expect(await db.getPhoto("local/a.jpg")).toBeNull();
  });

  it("replaces an item saved with the same id", async () => {
    const db = await load();
    await db.put("wishes", { id: "w", place: "Roma" });
    await db.put("wishes", { id: "w", place: "Roma, Itália" });
    expect(await db.get("wishes", "w")).toEqual({ id: "w", place: "Roma, Itália" });
  });
});
