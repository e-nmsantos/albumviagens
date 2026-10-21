import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CloudUpload, Download, ShieldCheck, Upload } from "lucide-react";
import { LOCAL_SCOPE, useAuth } from "@/hooks/use-auth";
import { buildBackup, parseBackup, restoreBackup, type RestoreResult } from "@/lib/backup";
import { errorMessage } from "@/lib/errors";

const box = "rounded-xl border border-border bg-muted/30 p-4";
const btn =
  "mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow disabled:opacity-50";

function summary(r: RestoreResult) {
  const parts = [`${r.memories} memórias`, `${r.wishes} desejos`, `${r.trips} viagens`];
  const missing = r.missingPhotos ? ` (${r.missingPhotos} fotos não vinham no ficheiro)` : "";
  return parts.join(", ") + missing;
}

export function BackupDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { user, scope } = useAuth();
  const [progress, setProgress] = useState<string | null>(null);
  const busy = progress !== null;
  const onProgress = (label: string) => (done: number, total: number) =>
    setProgress(`${label} ${done}/${total}…`);

  async function exportBackup() {
    setProgress("A preparar…");
    try {
      const data = await buildBackup(scope, onProgress("A juntar fotos"));
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memorias-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(
        `Cópia descarregada: ${data.memories.length} memórias e ${Object.keys(data.photos ?? {}).length} fotos.`,
      );
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível gerar a cópia de segurança."));
    } finally {
      setProgress(null);
    }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    setProgress("A ler o ficheiro…");
    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      const r = await restoreBackup(scope, backup, onProgress("A restaurar"));
      await qc.invalidateQueries();
      toast.success(`Restaurado: ${summary(r)}.`);
      onClose();
    } catch (e) {
      toast.error(
        e instanceof SyntaxError
          ? "O ficheiro não é um JSON válido."
          : errorMessage(e, "Não foi possível restaurar."),
      );
    } finally {
      setProgress(null);
    }
  }

  async function copyLocalToAccount() {
    setProgress("A ler os dados deste dispositivo…");
    try {
      const local = await buildBackup(LOCAL_SCOPE);
      const r = await restoreBackup(scope, local, onProgress("A copiar"));
      await qc.invalidateQueries();
      toast.success(`Copiado para a conta: ${summary(r)}.`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, "Não foi possível copiar os dados."));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-title"
      >
        <div className="flex items-center gap-2 text-2xl text-primary">
          <ShieldCheck className="h-6 w-6" />
          <h3 id="backup-title">Cópia de segurança</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {user
            ? `Os teus dados estão na nuvem, na conta ${user.email ?? ""}.`
            : "Os teus dados estão guardados só neste navegador. Faz cópias regularmente para não perderes nada."}
        </p>

        <div className="mt-6 space-y-4">
          <div className={box}>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Download className="h-4 w-4 text-primary" />
              Exportar
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Um ficheiro .json com memórias, desejos, viagens e todas as fotos.
            </p>
            <button
              disabled={busy}
              onClick={exportBackup}
              className={`${btn} bg-primary text-primary-foreground hover:opacity-90`}
            >
              <Download className="h-3.5 w-3.5" />
              Descarregar cópia
            </button>
          </div>

          <div className={box}>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Upload className="h-4 w-4 text-forest" />
              Restaurar
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Junta o conteúdo de uma cópia {user ? "à tua conta" : "a este navegador"}. O que já
              existe com o mesmo identificador é atualizado.
            </p>
            <label
              className={`${btn} cursor-pointer border border-input bg-card hover:bg-secondary ${busy ? "pointer-events-none opacity-50" : ""}`}
            >
              <Upload className="h-3.5 w-3.5" />
              Escolher ficheiro
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  void importBackup(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {user && (
            <div className={box}>
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <CloudUpload className="h-4 w-4 text-primary" />
                Trazer dados do modo local
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Copia para a conta o que guardaste neste navegador sem sessão iniciada.
              </p>
              <button
                disabled={busy}
                onClick={copyLocalToAccount}
                className={`${btn} border border-input bg-card hover:bg-secondary`}
              >
                <CloudUpload className="h-3.5 w-3.5" />
                Copiar para a conta
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {progress}
          </span>
          <button
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-input px-5 py-2 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
