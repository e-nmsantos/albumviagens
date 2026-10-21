import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 paragem", "3 paragens" */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
