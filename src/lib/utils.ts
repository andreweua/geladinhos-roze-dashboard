import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BRAND_CONFIG } from "@/config/brand.config";
import { PaymentMethod } from "@/types/dashboard";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(BRAND_CONFIG.locale, {
    style: "currency",
    currency: BRAND_CONFIG.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(BRAND_CONFIG.locale).format(value);
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(BRAND_CONFIG.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(BRAND_CONFIG.locale, {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Pix: "Pix",
  Dinheiro: "Dinheiro",
  Cartao_Credito: "Cartão de Crédito",
  Cartao_Debito: "Cartão de Débito",
};
