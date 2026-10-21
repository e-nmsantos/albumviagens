import { useEffect, type ReactNode } from "react";

import { primaryBtn, secondaryBtn } from "./styles";

/** Centered dialog; closes on Escape or a click outside. */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string | undefined;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl ${wide ? "max-w-lg" : "max-w-md"}`}
      >
        <h3 className="font-serif text-2xl">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  submitLabel,
  busy,
}: {
  onCancel: () => void;
  submitLabel: string;
  busy?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className={secondaryBtn}>
        Cancelar
      </button>
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? "A guardar…" : submitLabel}
      </button>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border/80 p-12 text-center text-muted-foreground">
      <div className="mx-auto mb-2 flex justify-center opacity-40">{icon}</div>
      <h4 className="text-lg font-medium text-foreground">{title}</h4>
      {children}
    </div>
  );
}
