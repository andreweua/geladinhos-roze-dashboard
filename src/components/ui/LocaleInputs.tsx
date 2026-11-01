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
  const lastExternalValueRef = useRef<number | string | undefined | null>(value);

  useEffect(() => {
    // Sincroniza quando o valor muda externamente (ex: preenchimento automático, leitor QR/GTIN)
    if (!isFocused) {
      setTextValue(formatEditableCurrency(value, emptyWhenZero));
      lastExternalValueRef.current = value;
    } else if (value !== lastExternalValueRef.current) {
      const currentParsed = parseLocaleNumber(textValue);
      const externalParsed =
        typeof value === "number" ? value : parseLocaleNumber(String(value ?? ""));
      if (currentParsed !== externalParsed) {
        setTextValue(formatEditableCurrency(value, emptyWhenZero));
      }
      lastExternalValueRef.current = value;
    }
  }, [value, isFocused, emptyWhenZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Permite apagar tudo com Backspace / Delete
    if (raw === "") {
      setTextValue("");
      lastExternalValueRef.current = undefined;
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

    setTextValue(normalized);
    const parsed = parseLocaleNumber(normalized);
    lastExternalValueRef.current = parsed;
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
      setTextValue(formatEditableCurrency(parsed, emptyWhenZero));
    } else {
      setTextValue("");
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
  const lastExternalValueRef = useRef<number | string | undefined | null>(value);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(formatEditableNumber(value, maxDecimals, emptyWhenZero));
      lastExternalValueRef.current = value;
    } else if (value !== lastExternalValueRef.current) {
      const currentParsed = parseLocaleNumber(textValue);
      const externalParsed =
        typeof value === "number" ? value : parseLocaleNumber(String(value ?? ""));
      if (currentParsed !== externalParsed) {
        setTextValue(formatEditableNumber(value, maxDecimals, emptyWhenZero));
      }
      lastExternalValueRef.current = value;
    }
  }, [value, isFocused, maxDecimals, emptyWhenZero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Permite apagar tudo com Backspace / Delete
    if (raw === "") {
      setTextValue("");
      lastExternalValueRef.current = undefined;
      onValueChange(undefined, "");
      return;
    }

    if (maxDecimals <= 0) {
      const digitsOnly = raw.replace(/\D/g, "");
      setTextValue(digitsOnly);
      const parsed = digitsOnly ? parseInt(digitsOnly, 10) : undefined;
      lastExternalValueRef.current = parsed;
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

    setTextValue(normalized);
    const parsed = parseLocaleNumber(normalized);
    lastExternalValueRef.current = parsed;
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
      setTextValue(formatEditableNumber(parsed, maxDecimals, emptyWhenZero));
    } else if (fallbackOnBlur !== undefined) {
      setTextValue(formatEditableNumber(fallbackOnBlur, maxDecimals, emptyWhenZero));
      onValueChange(fallbackOnBlur, String(fallbackOnBlur));
    } else {
      setTextValue("");
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
