import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { BRAND_CONFIG } from "@/config/brand.config";
import { PaymentMethod } from "@/types/dashboard";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(BRAND_CONFIG.locale, {
    style: "currency",
    currency: BRAND_CONFIG.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatNumber(value: number): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(BRAND_CONFIG.locale).format(safeValue);
}

export interface LocaleNumberFormatInfo {
  locale: string;
  currency: string;
  decimalSeparator: string;
  groupSeparator: string;
  currencySymbol: string;
}

/**
 * Obtém dinamicamente o separador decimal, separador de milhar e símbolo da moeda
 * de acordo com a configuração do país/moeda (ex: pt-BR / BRL -> decimal ",", milhar ".", símbolo "R$").
 */
export function getLocaleNumberFormatInfo(
  locale: string = BRAND_CONFIG.locale,
  currency: string = BRAND_CONFIG.currency
): LocaleNumberFormatInfo {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).formatToParts(12345.67);

    const decimalSeparator = parts.find((p) => p.type === "decimal")?.value || ",";
    const groupSeparator = parts.find((p) => p.type === "group")?.value || ".";
    const currencySymbol = parts.find((p) => p.type === "currency")?.value || "R$";

    return {
      locale,
      currency,
      decimalSeparator,
      groupSeparator,
      currencySymbol,
    };
  } catch {
    return {
      locale: "pt-BR",
      currency: "BRL",
      decimalSeparator: ",",
      groupSeparator: ".",
      currencySymbol: "R$",
    };
  }
}

/**
 * Formata um valor numérico de moeda para exibição dentro de um <input> editável,
 * usando o separador padrão da moeda configurada do país (ex: 5,49 no Brasil).
 */
export function formatEditableCurrency(
  value: number | string | undefined | null,
  allowZeroEmpty = false
): string {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "number" ? value : parseLocaleNumber(String(value));
  if (num === undefined || isNaN(num)) return "";
  if (allowZeroEmpty && num === 0) return "";

  return new Intl.NumberFormat(BRAND_CONFIG.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(num);
}

/**
 * Formata um valor numérico (não-moeda, como quantidades, pesos e tamanhos)
 * usando o separador padrão do país do usuário (ex: 1,01 ou 395 no Brasil).
 */
export function formatEditableNumber(
  value: number | string | undefined | null,
  maxDecimals = 3,
  allowZeroEmpty = false
): string {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "number" ? value : parseLocaleNumber(String(value));
  if (num === undefined || isNaN(num)) return "";
  if (allowZeroEmpty && num === 0) return "";

  return new Intl.NumberFormat(BRAND_CONFIG.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
    useGrouping: false,
  }).format(num);
}

/**
 * Converte uma string digitada pelo usuário (com separador do país "," ou ".")
 * em número ponto flutuante, retornando undefined quando vazio para permitir apagar com o teclado.
 */
export function parseLocaleNumber(raw: string): number | undefined {
  if (!raw) return undefined;
  const { decimalSeparator, groupSeparator } = getLocaleNumberFormatInfo();
  let cleaned = raw.trim().replace(/\s/g, "");
  if (!cleaned) return undefined;

  // Se o texto contém tanto o separador de milhar quanto o decimal, remove o de milhar
  if (cleaned.includes(decimalSeparator) && cleaned.includes(groupSeparator)) {
    cleaned = cleaned.split(groupSeparator).join("");
    cleaned = cleaned.replace(decimalSeparator, ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }

  // Remove caracteres não numéricos exceto ponto e sinal negativo
  cleaned = cleaned.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return undefined;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
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
