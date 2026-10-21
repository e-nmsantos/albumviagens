import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  BookImage,
  BookOpen,
  CalendarDays,
  Clock,
  Cloud,
  Compass,
  Globe,
  HardDrive,
  LogIn,
  LogOut,
  Map,
  Plus,
  ShieldCheck,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { BackupDialog } from "@/components/BackupDialog";

const links = [
  { to: "/", label: "Início" },
  { to: "/planeador", label: "Planeador" },
  { to: "/diario", label: "Diário" },
  { to: "/passaporte", label: "Passaporte" },
  { to: "/mapa", label: "Mapa" },
  { to: "/linha-do-tempo", label: "Tempo" },
  { to: "/desejos", label: "Desejos" },
  { to: "/album", label: "Álbum" },
  { to: "/estatisticas", label: "Números" },
] as const;

const moreLinks = [
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/linha-do-tempo", label: "Tempo", icon: Clock },
  { to: "/desejos", label: "Desejos", icon: Star },
  { to: "/album", label: "Álbum", icon: BookImage },
  { to: "/estatisticas", label: "Números", icon: BarChart3 },
] as const;

export function SiteHeader() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { user, ready } = useAuth();
  const [showBackup, setShowBackup] = useState(false);
  const link = "text-sm text-muted-foreground hover:text-foreground transition-colors";

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Não foi possível terminar a sessão.");
      return;
    }
    await qc.cancelQueries();
    qc.clear();
    toast("Sessão terminada. Estás agora no modo local deste dispositivo.");
    nav({ to: "/", replace: true });
  }

  const mode = ready && (
    <span
      title={
        user ? `Dados na nuvem (${user.email ?? "conta"})` : "Dados guardados só neste navegador"
      }
      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
    >
      {user ? <Cloud className="h-3 w-3" /> : <HardDrive className="h-3 w-3" />}
      {user ? "Na nuvem" : "Neste dispositivo"}
    </span>
  );

  const account =
    ready &&
    (user ? (
      <button onClick={signOut} className={link} title={`Sair (${user.email ?? ""})`}>
        <span className="hidden md:inline">Sair</span>
        <LogOut className="h-5 w-5 md:hidden" />
      </button>
    ) : (
      <Link to="/auth" className={link} title="Entrar numa conta">
        <span className="hidden md:inline">Entrar</span>
        <LogIn className="h-5 w-5 md:hidden" />
      </Link>
    ));

  const tab = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="group flex items-center gap-2">
            <span className="font-display text-3xl italic text-foreground transition-colors group-hover:text-primary">
              Memórias
            </span>
            <span className="hidden sm:inline-flex">{mode}</span>
          </Link>

          <nav className="hidden items-center gap-4 md:flex lg:gap-5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={link}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "!text-primary font-medium" }}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => setShowBackup(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Cópia de segurança"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Backup</span>
            </button>
            {account}
            <Link
              to="/nova"
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-md hover:opacity-90"
            >
              + Nova memória
            </Link>
          </nav>

          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setShowBackup(true)}
              aria-label="Cópia de segurança"
              className={link}
            >
              <ShieldCheck className="h-5 w-5" />
            </button>
            {account}
          </div>
        </div>
        {/* Secondary pages on mobile: a scrollable row under the header. */}
        <nav className="flex gap-2 overflow-x-auto px-6 pb-3 md:hidden">
          {moreLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              activeProps={{ className: "!border-primary !text-primary" }}
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
        <Link
          to="/"
          className={tab}
          activeOptions={{ exact: true }}
          activeProps={{ className: "!text-primary font-medium" }}
        >
          <Compass className="h-5 w-5" />
          <span>Início</span>
        </Link>
        <Link
          to="/planeador"
          className={tab}
          activeProps={{ className: "!text-primary font-medium" }}
        >
          <CalendarDays className="h-5 w-5" />
          <span>Planos</span>
        </Link>
        <Link to="/nova" aria-label="Nova memória" className="-mt-6 flex flex-1 justify-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
            <Plus className="h-7 w-7" />
          </span>
        </Link>
        <Link
          to="/passaporte"
          className={tab}
          activeProps={{ className: "!text-primary font-medium" }}
        >
          <Globe className="h-5 w-5" />
          <span>Carimbos</span>
        </Link>
        <Link to="/diario" className={tab} activeProps={{ className: "!text-primary font-medium" }}>
          <BookOpen className="h-5 w-5" />
          <span>Diário</span>
        </Link>
      </nav>
      <div className="h-4 md:h-6 print:hidden" />

      {showBackup && <BackupDialog onClose={() => setShowBackup(false)} />}
    </>
  );
}
