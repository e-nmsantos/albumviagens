import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  BookImage,
  BookOpen,
  CalendarDays,
  Clock,
  Compass,
  Globe,
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
import { HOME, features } from "@/lib/features";

type NavLink = { to: string; label: string; icon: typeof Map; on: boolean };
const shown = (list: NavLink[]) => list.filter((l) => l.on);

// The menu order. Hidden sections (see src/lib/features.ts) keep a sensible place for later.
const links = shown([
  { to: "/", label: "Início", icon: Compass, on: features.home },
  { to: "/diario", label: "Memórias", icon: BookOpen, on: true },
  { to: "/album", label: "Álbum", icon: BookImage, on: true },
  { to: "/linha-do-tempo", label: "Tempo", icon: Clock, on: true },
  { to: "/passaporte", label: "Passaporte", icon: Globe, on: true },
  { to: "/mapa", label: "Mapa", icon: Map, on: true },
  { to: "/estatisticas", label: "Números", icon: BarChart3, on: true },
  { to: "/planeador", label: "Planeador", icon: CalendarDays, on: features.planner },
  { to: "/desejos", label: "Desejos", icon: Star, on: features.wishes },
]);

// Mobile: the first four go around the "+" button; the rest in the row under the header.
const tabs = links.slice(0, 4);
const moreLinks = links.filter((l) => !tabs.some((t) => t.to === l.to));

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
    nav({ to: HOME, replace: true });
  }

  const account =
    ready &&
    (user ? (
      <button onClick={signOut} className={link} title={`Sair (${user.email ?? ""})`}>
        <span className="hidden lg:inline">Sair</span>
        <LogOut className="h-5 w-5 lg:hidden" />
      </button>
    ) : (
      <Link to="/auth" className={link} title="Entrar numa conta">
        <span className="hidden lg:inline">Entrar</span>
        <LogIn className="h-5 w-5 lg:hidden" />
      </Link>
    ));

  const tab = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground";
  // While writing a memory the "+" would only start another one.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const writing = pathname === "/nova" || pathname.endsWith("/editar");

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to={HOME} className="group flex items-center gap-2">
            <span className="whitespace-nowrap font-display text-3xl italic text-foreground transition-colors group-hover:text-primary">
              Fica na Memória
            </span>
          </Link>

          <nav className="hidden items-center gap-4 lg:flex xl:gap-5">
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
            {!writing && (
              <Link
                to="/nova"
                className="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-md hover:opacity-90"
              >
                + Nova memória
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3 lg:hidden">
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
        <nav className="flex gap-2 overflow-x-auto px-6 pb-3 lg:hidden">
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

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
        {tabs.slice(0, 2).map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={tab}
            activeOptions={{ exact: t.to === "/" }}
            activeProps={{ className: "!text-primary font-medium" }}
          >
            <t.icon className="h-5 w-5" />
            <span>{t.label}</span>
          </Link>
        ))}
        {writing ? (
          <span className="flex-1" aria-hidden />
        ) : (
          <Link to="/nova" aria-label="Nova memória" className="-mt-6 flex flex-1 justify-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
              <Plus className="h-7 w-7" />
            </span>
          </Link>
        )}
        {tabs.slice(2).map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={tab}
            activeProps={{ className: "!text-primary font-medium" }}
          >
            <t.icon className="h-5 w-5" />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
      <div className="h-4 md:h-6 print:hidden" />

      {showBackup && <BackupDialog onClose={() => setShowBackup(false)} />}
    </>
  );
}
