import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova palavra-passe — Memórias" },
      { name: "description", content: "Escolha uma nova palavra-passe para o seu diário." },
      { property: "og:title", content: "Nova palavra-passe — Memórias" },
      { property: "og:description", content: "Escolha uma nova palavra-passe." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Palavra-passe alterada.");
    nav({ to: "/diario" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-4xl">Nova palavra-passe</h1>
        <input
          required
          minLength={6}
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-md border border-input bg-card px-3 py-2"
        />
        <button
          disabled={busy}
          className="w-full rounded-full bg-primary py-3 text-primary-foreground disabled:opacity-50"
        >
          {busy ? "A guardar…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
