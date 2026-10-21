// The traveller shown in the passport: a name and a photo.
// Signed in, it lives in the Supabase user's metadata; in local mode, in this browser.
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";

export type Profile = { name: string; photo: string };

const KEY = "memorias.profile";
const EMPTY: Profile = { name: "", photo: "" };
const listeners = new Set<() => void>();

function readLocal(): Profile {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Profile>;
    return { name: v.name ?? "", photo: v.photo ?? "" };
  } catch {
    return EMPTY;
  }
}

export function useProfile() {
  const { user } = useAuth();
  const [local, setLocal] = useState<Profile>(EMPTY);

  useEffect(() => {
    const load = () => setLocal(readLocal());
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, []);

  const meta = user?.user_metadata as
    { traveler_name?: string; traveler_photo?: string } | undefined;
  const profile: Profile = user
    ? { name: meta?.traveler_name ?? "", photo: meta?.traveler_photo ?? "" }
    : local;

  async function save(next: Profile) {
    if (user) {
      const { error } = await supabase.auth.updateUser({
        data: { traveler_name: next.name, traveler_photo: next.photo },
      });
      if (error) throw new Error(`Não foi possível guardar o perfil: ${error.message}`);
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new Error("Este navegador não deixou guardar o perfil.");
    }
    listeners.forEach((l) => l());
  }

  return { profile, save };
}

/** Machine-readable zone lines for the passport, built from the traveller's name. */
export function mrzLines(name: string, year: string): [string, string] {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z ]/g, "")
      .trim();
  const parts = clean(name).split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1]! : parts[0] || "VIAJANTE";
  const given = parts.length > 1 ? parts.slice(0, -1).join("<") : "EXPLORADOR";
  const line1 = `P<PRT${surname}<<${given}`.padEnd(44, "<").slice(0, 44);
  const line2 = `M9981240<4PRT${year}0101M2510217`.padEnd(42, "<").slice(0, 42) + "06";
  return [line1, line2];
}
