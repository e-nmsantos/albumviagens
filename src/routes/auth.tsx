import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Entrar — Memórias" },
      {
        name: "description",
        content: "Entre ou crie conta para guardar as suas memórias de viagem.",
      },
      { property: "og:title", content: "Entrar — Memórias" },
      { property: "og:description", content: "Entre ou crie conta no seu diário de viagens." },
    ],
  }),
  component: AuthPage,
});

const field =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-ring";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/diario";
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) nav({ to: target as "/diario", replace: true });
  }, [ready, user, nav, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      } else if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada com sucesso!");
          nav({ to: target as "/diario", replace: true });
        } else {
          setSent(
            `Enviámos um email de confirmação para ${email}. Abra o link para ativar a sua conta.`,
          );
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("Enviámos um link para escolher uma nova palavra-passe.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg === "Invalid login credentials"
          ? "Email ou palavra-passe errados."
          : msg || "Algo correu mal.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-5xl italic">Memórias</h1>
        <p className="mt-2 text-center text-muted-foreground">
          {mode === "in"
            ? "Bem-vindo de volta."
            : mode === "up"
              ? "Crie o seu diário de viagens."
              : "Recuperar palavra-passe."}
        </p>
        {sent ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-md bg-secondary p-4 text-center text-sm">{sent}</p>
            <button
              onClick={() => {
                setSent(null);
                setMode("in");
              }}
              className="w-full text-center text-sm text-primary hover:underline"
            >
              Voltar ao início de sessão
            </button>
          </div>
        ) : (
          <>
            {mode !== "forgot" && (
              <div className="mt-8 mb-6 flex rounded-full bg-secondary p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("in")}
                  className={`flex-1 rounded-full py-1.5 font-medium transition-colors ${mode === "in" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode("up")}
                  className={`flex-1 rounded-full py-1.5 font-medium transition-colors ${mode === "up" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Criar conta
                </button>
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                  placeholder="o.teu@email.com"
                />
              </label>
              {mode !== "forgot" && (
                <label className="block text-sm">
                  Palavra-passe
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={field}
                    placeholder="Mínimo 6 caracteres"
                  />
                </label>
              )}
              <button
                disabled={busy}
                className="w-full rounded-full bg-primary py-3 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy
                  ? "Aguarde..."
                  : mode === "in"
                    ? "Entrar"
                    : mode === "up"
                      ? "Criar conta"
                      : "Enviar link"}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-border/60 text-center">
              <button
                type="button"
                onClick={() => nav({ to: "/diario", replace: true })}
                className="w-full rounded-full border border-input bg-card py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
              >
                Continuar sem conta
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                Sem conta, tudo fica guardado só neste navegador. Com conta, os dados ficam na nuvem
                e podes partilhar memórias.
              </p>
            </div>
            <div className="mt-6 flex justify-between text-sm text-muted-foreground">
              {mode === "forgot" ? (
                <button onClick={() => setMode("in")} className="hover:text-foreground">
                  Voltar a Entrar
                </button>
              ) : (
                <>
                  <span />
                  <button onClick={() => setMode("forgot")} className="hover:text-foreground">
                    Esqueci-me da palavra-passe
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
