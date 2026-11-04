import React, { useState, useEffect, useRef } from "react";
import {
  formatEditableCurrency,
  formatEditableNumber,
  getLocaleNumberFormatInfo,
  parseLocaleNumber,
} from "@/lib/utils";

export interface LocaleCurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | string | undefined | null;
  onValueChange: (numericValue: number | undefined, rawText: string) => void;
  /** Se true, exibe vazio quando o valor é 0 inicialmente */
  emptyWhenZero?: boolean;
}

/**
 * Input de Moeda com separador padrão configurado na moeda do país (ex: "," em pt-BR / BRL).
 * Permite ao usuário apagar completamente usando o teclado (Backspace/Delete) e digitar novos valores,
 * mesmo quando o campo foi preenchido automaticamente pelo aplicativo (QR Code, Código de Barras, Catálogo).
 */
export const LocaleCurrencyInput: React.FC<LocaleCurrencyInputProps> = ({
  value,
  onValueChange,
  emptyWhenZero = false,
  onFocus,
  onBlur,
  placeholder,
  ...rest
}) => {
  const { decimalSeparator } = getLocaleNumberFormatInfo();
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState<string>(() =>
    formatEditableCurrency(value, emptyWhenZero)
  );
  const lastEmittedValueRef = useRef<number | string | undefined | null>(value);
  const lastEmittedRawRef = useRef<string>(textValue);

  useEffect(() => {
    // Quando NÃO está focado, sincroniza livremente com o valor externo formatado
    if (!isFocused) {
      setTextValue(formatEditableCurrency(value, emptyWhenZero));
      lastEmittedValueRef.current = value;
      lastEmittedRawRef.current = formatEditableCurrency(value, emptyWhenZero);
      return;
    }

    // Se ESTÁ focado e o usuário apagou o texto (""), NÃO sobrescreve com "0,00" enquanto digita!
    if (textValue === "") {
      return;
    }

    // Se o valor externo é igual ao que o próprio input acabou de emitir pelo handleChange,
    // preserva a digitação ativa (vírgula pendente, zeros, etc.)
    const externalParsed =
      typeof value === "number" ? value : parseLocaleNumber(String(value ?? ""));
    const lastEmittedParsed =
      typeof lastEmittedValueRef.current === "number"
        ? lastEmittedValueRef.current
        : parseLocaleNumber(String(lastEmittedValueRef.current ?? ""));

    if (externalParsed === lastEmittedParsed) {
      return;
    }

    // Se veio um valor genuinamente diferente de fonte externa
    setTextValue(formatEditableCurrency(value, emptyWhenZero));
    lastEmittedValueRef.current = value;
  }, [value, isFocused, emptyWhenZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Permite apagar tudo com Backspace / Delete
    if (raw === "") {
      setTextValue("");
      lastEmittedValueRef.current = undefined;
      lastEmittedRawRef.current = "";
      onValueChange(undefined, "");
      return;
    }

    // Normaliza "." ou "," digitado no teclado para o separador oficial da moeda do país
    let normalized = raw.replace(/[.,]/g, decimalSeparator);

    // Mantém apenas dígitos e no máximo um separador decimal
    const allowedRegex = new RegExp(`[^0-9\\${decimalSeparator}]`, "g");
    normalized = normalized.replace(allowedRegex, "");

    const parts = normalized.split(decimalSeparator);
    if (parts.length > 2) {
      normalized = parts[0] + decimalSeparator + parts.slice(1).join("");
    }

    // Remove zero à esquerda redundante antes de dígito inteiro (ex: "05" vira "5", mas "0," preserva)
    if (parts[0].length > 1 && parts[0].startsWith("0")) {
      const cleanInt = parts[0].replace(/^0+/, "") || "0";
      normalized = cleanInt + (parts.length > 1 ? decimalSeparator + parts[1] : "");
    }

    setTextValue(normalized);
    const parsed = parseLocaleNumber(normalized);
    lastEmittedValueRef.current = parsed;
    lastEmittedRawRef.current = normalized;
    onValueChange(parsed, normalized);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const parsed = parseLocaleNumber(textValue);
    if (parsed !== undefined) {
      const formatted = formatEditableCurrency(parsed, emptyWhenZero);
      setTextValue(formatted);
      onValueChange(parsed, formatted);
    } else {
      const fallbackFormatted = emptyWhenZero ? "" : formatEditableCurrency(0, false);
      setTextValue(fallbackFormatted);
      onValueChange(emptyWhenZero ? undefined : 0, fallbackFormatted);
    }
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={textValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder ?? `0${decimalSeparator}00`}
    />
  );
};

export interface LocaleNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | string | undefined | null;
  onValueChange: (numericValue: number | undefined, rawText: string) => void;
  /** Número máximo de casas decimais (0 para inteiros) */
  maxDecimals?: number;
  /** Valor padrão aplicado apenas ao sair do campo (onBlur) caso fique em branco */
  fallbackOnBlur?: number;
  /** Se true, exibe vazio quando o valor é 0 */
  emptyWhenZero?: boolean;
}

/**
 * Input de Valores Numéricos (não-moeda: quantidades, embalagens, pesos, estoque, taxas)
 * usando o formato de separação do país do usuário e permitindo apagar totalmente com o teclado.
 */
export const LocaleNumberInput: React.FC<LocaleNumberInputProps> = ({
  value,
  onValueChange,
  maxDecimals = 3,
  fallbackOnBlur,
  emptyWhenZero = false,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { decimalSeparator } = getLocaleNumberFormatInfo();
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState<string>(() =>
    formatEditableNumber(value, maxDecimals, emptyWhenZero)
  );
  const lastEmittedValueRef = useRef<number | string | undefined | null>(value);
  const lastEmittedRawRef = useRef<string>(textValue);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(formatEditableNumber(value, maxDecimals, emptyWhenZero));
      lastEmittedValueRef.current = value;
      lastEmittedRawRef.current = formatEditableNumber(value, maxDecimals, emptyWhenZero);
      return;
    }

    if (textValue === "") {
      return;
    }

    const externalParsed =
      typeof value === "number" ? value : parseLocaleNumber(String(value ?? ""));
    const lastEmittedParsed =
      typeof lastEmittedValueRef.current === "number"
        ? lastEmittedValueRef.current
        : parseLocaleNumber(String(lastEmittedValueRef.current ?? ""));

    if (externalParsed === lastEmittedParsed) {
      return;
    }

    setTextValue(formatEditableNumber(value, maxDecimals, emptyWhenZero));
    lastEmittedValueRef.current = value;
  }, [value, isFocused, maxDecimals, emptyWhenZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Permite apagar tudo com Backspace / Delete
    if (raw === "") {
      setTextValue("");
      lastEmittedValueRef.current = undefined;
      lastEmittedRawRef.current = "";
      onValueChange(undefined, "");
      return;
    }

    if (maxDecimals <= 0) {
      let digitsOnly = raw.replace(/\D/g, "");
      if (digitsOnly.length > 1 && digitsOnly.startsWith("0")) {
        digitsOnly = digitsOnly.replace(/^0+/, "") || "0";
      }
      setTextValue(digitsOnly);
      const parsed = digitsOnly ? parseInt(digitsOnly, 10) : undefined;
      lastEmittedValueRef.current = parsed;
      lastEmittedRawRef.current = digitsOnly;
      onValueChange(parsed, digitsOnly);
      return;
    }

    // Normaliza "." ou "," para o separador decimal do país do usuário
    let normalized = raw.replace(/[.,]/g, decimalSeparator);
    const allowedRegex = new RegExp(`[^0-9\\${decimalSeparator}]`, "g");
    normalized = normalized.replace(allowedRegex, "");

    const parts = normalized.split(decimalSeparator);
    if (parts.length > 2) {
      normalized = parts[0] + decimalSeparator + parts.slice(1).join("");
    }

    if (parts[0].length > 1 && parts[0].startsWith("0")) {
      const cleanInt = parts[0].replace(/^0+/, "") || "0";
      normalized = cleanInt + (parts.length > 1 ? decimalSeparator + parts[1] : "");
    }

    setTextValue(normalized);
    const parsed = parseLocaleNumber(normalized);
    lastEmittedValueRef.current = parsed;
    lastEmittedRawRef.current = normalized;
    onValueChange(parsed, normalized);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const parsed = parseLocaleNumber(textValue);
    if (parsed !== undefined) {
      const formatted = formatEditableNumber(parsed, maxDecimals, emptyWhenZero);
      setTextValue(formatted);
      onValueChange(parsed, formatted);
    } else if (fallbackOnBlur !== undefined) {
      const formatted = formatEditableNumber(fallbackOnBlur, maxDecimals, emptyWhenZero);
      setTextValue(formatted);
      onValueChange(fallbackOnBlur, formatted);
    } else {
      setTextValue("");
      onValueChange(undefined, "");
    }
    onBlur?.(e);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={maxDecimals <= 0 ? "numeric" : "decimal"}
      value={textValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};
