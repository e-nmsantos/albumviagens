import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 paragem", "3 paragens" */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A copy of `list` with the item at `from` moved to `to` (indexes outside the list are clamped). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  if (item === undefined) return list;
  next.splice(target, 0, item);
  return next;
}
