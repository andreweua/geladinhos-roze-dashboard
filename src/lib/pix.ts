/**
 * Pix BR Code (EMV QRCPS-MPM standard) Payload Generator
 * Conforms to the official specifications from Banco Central do Brasil (BACEN)
 */

export interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId?: string;
  description?: string;
}

/**
 * Formats a single EMV TLV (Type-Length-Value) segment
 * ID (2 chars) + Length (2 chars) + Value
 */
export function formatEMV(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Normalizes text to ASCII uppercase alphanumeric without accents (standard EMV requirement)
 */
export function normalizeEMVText(text: string, maxLength: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, maxLength);
}

/**
 * Computes the 16-bit CRC (CCITT polynomial 0x1021, initial 0xFFFF) required by EMV BR Code
 */
export function computeCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generates an official Pix Copy and Paste (Copia e Cola) string / QR Code payload
 */
export function generatePixPayload(params: PixPayloadParams): {
  payload: string;
  txId: string;
  cleanKey: string;
} {
  const cleanKey = params.pixKey.trim();
  const rawTxId = params.txId ? params.txId.replace(/[^A-Za-z0-9]/g, "") : `ROZE${Date.now().toString().slice(-8)}`;
  const txId = (rawTxId || "***").slice(0, 25);

  const cleanName = normalizeEMVText(params.merchantName || "GELADINHOS DA ROZE", 25) || "GELADINHOS DA ROZE";
  const cleanCity = normalizeEMVText(params.merchantCity || "BELO HORIZONTE", 15) || "BELO HORIZONTE";

  // ID 00: Payload Format Indicator (01)
  const part00 = formatEMV("00", "01");

  // ID 26: Merchant Account Information - Pix
  // Sub 00: GUI (BR.GOV.BCB.PIX)
  // Sub 01: Pix key
  // Sub 02: Description (optional)
  let sub26 = formatEMV("00", "BR.GOV.BCB.PIX") + formatEMV("01", cleanKey);
  if (params.description) {
    const cleanDesc = normalizeEMVText(params.description, 40);
    if (cleanDesc) sub26 += formatEMV("02", cleanDesc);
  }
  const part26 = formatEMV("26", sub26);

  // ID 52: Merchant Category Code (0000 = default)
  const part52 = formatEMV("52", "0000");

  // ID 53: Transaction Currency (986 = BRL)
  const part53 = formatEMV("53", "986");

  // ID 54: Transaction Amount (formatted as '0.00' if > 0)
  const amountStr = params.amount > 0 ? params.amount.toFixed(2) : "0.00";
  const part54 = formatEMV("54", amountStr);

  // ID 58: Country Code (BR)
  const part58 = formatEMV("58", "BR");

  // ID 59: Merchant Name
  const part59 = formatEMV("59", cleanName);

  // ID 60: Merchant City
  const part60 = formatEMV("60", cleanCity);

  // ID 62: Additional Data Field Template (TxId)
  const sub62 = formatEMV("05", txId);
  const part62 = formatEMV("62", sub62);

  // ID 63: CRC16 prefix (04 characters to follow)
  const rawPayload = `${part00}${part26}${part52}${part53}${part54}${part58}${part59}${part60}${part62}6304`;
  const crc = computeCRC16(rawPayload);

  return {
    payload: `${rawPayload}${crc}`,
    txId,
    cleanKey,
  };
}
