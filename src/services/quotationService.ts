import { BRAND_CONFIG } from "@/config/brand.config";
import { TABELA_COTACAO_INSUMOS } from "@/data/insumosCatalog";
import { CotacaoInsumo, FichaTecnicaProduto } from "@/types/dashboard";

const QUOTATIONS_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_tabela_cotacoes_v1`;

export interface ImportedReceiptItem {
  id: string;
  rawDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  matchedQuotationId: string | null;
  matchedIngredientName: string | null;
  selected: boolean;
}

export interface ReceiptParsedResult {
  storeName: string;
  cnpj?: string;
  issueDate?: string;
  accessKey?: string;
  items: ImportedReceiptItem[];
  totalValue: number;
}

/**
 * Loads the current quotation catalog from localStorage or default static catalog
 */
export function loadCurrentQuotations(): CotacaoInsumo[] {
  try {
    const saved = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return [...TABELA_COTACAO_INSUMOS];
}

/**
 * Saves updated quotation catalog to localStorage
 */
export function saveQuotations(items: CotacaoInsumo[]): void {
  try {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Normalizes text for fuzzy matching of supermarket descriptions
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best match heuristic between receipt item description and quotation catalog
 */
export function matchItemWithCatalog(
  rawDesc: string,
  catalog: CotacaoInsumo[]
): {
  matchedQuotationId: string | null;
  matchedIngredientName: string | null;
} {
  const norm = normalizeText(rawDesc);

  // High priority direct keyword rules
  if (norm.includes("nutella")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("nutella"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("cond") || norm.includes("condensado")) {
    if (norm.includes("moca")) {
      const found = catalog.find((c) => normalizeText(c.produto).includes("moca"));
      if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
    }
    if (norm.includes("italac")) {
      const found = catalog.find((c) => normalizeText(c.produto).includes("italac") && normalizeText(c.produto).includes("condensado"));
      if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
    }
    const anyCond = catalog.find((c) => normalizeText(c.produto).includes("condensado"));
    if (anyCond) return { matchedQuotationId: anyCond.id, matchedIngredientName: anyCond.produto };
  }
  if (norm.includes("creme") && (norm.includes("leite") || norm.includes("lt"))) {
    if (norm.includes("itambe")) {
      const found = catalog.find((c) => normalizeText(c.produto).includes("creme de leite itambe"));
      if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
    }
    if (norm.includes("italac")) {
      const found = catalog.find((c) => normalizeText(c.produto).includes("creme de leite italac"));
      if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
    }
    const anyCreme = catalog.find((c) => normalizeText(c.produto).includes("creme de leite"));
    if (anyCreme) return { matchedQuotationId: anyCreme.id, matchedIngredientName: anyCreme.produto };
  }
  if (norm.includes("doce") && norm.includes("leite")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("doce de leite itambe"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("ninho")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("ninho"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("ovomaltine")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("ovomaltine"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("morango")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("morango"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("cacau") || norm.includes("50%")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("cacau") || normalizeText(c.produto).includes("50%"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("maracuja")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("maracuja"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("acucar")) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("acucar"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }
  if (norm.includes("leite") && (norm.includes("uht") || norm.includes("integral"))) {
    const found = catalog.find((c) => normalizeText(c.produto).includes("leite integral"));
    if (found) return { matchedQuotationId: found.id, matchedIngredientName: found.produto };
  }

  // Fallback word matching
  const words = norm.split(" ").filter((w) => w.length >= 4);
  let bestScore = 0;
  let bestCandidate: CotacaoInsumo | null = null;

  for (const cat of catalog) {
    const catNorm = normalizeText(cat.produto);
    let score = 0;
    for (const w of words) {
      if (catNorm.includes(w)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = cat;
    }
  }

  if (bestCandidate && bestScore >= 2) {
    return {
      matchedQuotationId: bestCandidate.id,
      matchedIngredientName: bestCandidate.produto,
    };
  }

  return { matchedQuotationId: null, matchedIngredientName: null };
}

/**
 * Parses XML from Brazilian SEFAZ NFe or NFC-e
 */
export function parseNFeXml(xmlString: string, catalog: CotacaoInsumo[]): ReceiptParsedResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("Formato de XML inválido. Verifique se o arquivo é um XML de NF-e / NFC-e SEFAZ válido.");
  }

  // Extract store name
  const emitenteNode = xmlDoc.getElementsByTagName("emit")[0];
  const storeName =
    emitenteNode?.getElementsByTagName("xNome")[0]?.textContent ||
    emitenteNode?.getElementsByTagName("xFant")[0]?.textContent ||
    "Supermercado / Fornecedor";
  const cnpj = emitenteNode?.getElementsByTagName("CNPJ")[0]?.textContent || "";

  // Extract date
  const ideNode = xmlDoc.getElementsByTagName("ide")[0];
  const issueDate =
    ideNode?.getElementsByTagName("dhEmi")[0]?.textContent?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  // Extract access key
  const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
  const accessKey = infNFe?.getAttribute("Id")?.replace(/\D/g, "") || "";

  const detNodes = xmlDoc.getElementsByTagName("det");
  const items: ImportedReceiptItem[] = [];
  let totalValue = 0;

  for (let i = 0; i < detNodes.length; i++) {
    const det = detNodes[i];
    const prod = det.getElementsByTagName("prod")[0];
    if (!prod) continue;

    const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || `Item ${i + 1}`;
    const qCom = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "1") || 1;
    const vUnCom = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0") || 0;
    const vProd = parseFloat(prod.getElementsByTagName("vProd")[0]?.textContent || String(qCom * vUnCom)) || qCom * vUnCom;
    const uCom = prod.getElementsByTagName("uCom")[0]?.textContent || "UN";

    totalValue += vProd;

    const match = matchItemWithCatalog(xProd, catalog);

    items.push({
      id: `xml-item-${i + 1}`,
      rawDescription: xProd,
      quantity: qCom,
      unit: uCom,
      unitPrice: Number(vUnCom.toFixed(2)),
      totalPrice: Number(vProd.toFixed(2)),
      matchedQuotationId: match.matchedQuotationId,
      matchedIngredientName: match.matchedIngredientName,
      selected: Boolean(match.matchedQuotationId),
    });
  }

  return {
    storeName,
    cnpj,
    issueDate,
    accessKey,
    items,
    totalValue: Number(totalValue.toFixed(2)),
  };
}

/**
 * Parses free text or CSV pasted from receipt or spreadsheet
 */
export function parseReceiptTextOrCsv(rawText: string, catalog: CotacaoInsumo[]): ReceiptParsedResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ImportedReceiptItem[] = [];
  let totalValue = 0;

  lines.forEach((line, idx) => {
    // Detect delimiters (tab, semicolon, comma or multiple spaces)
    let parts: string[] = [];
    if (line.includes("\t")) {
      parts = line.split("\t");
    } else if (line.includes(";")) {
      parts = line.split(";");
    } else if (line.includes(",")) {
      parts = line.split(",");
    } else {
      parts = [line];
    }

    const desc = parts[0]?.trim() || `Item ${idx + 1}`;
    let unitPrice = 0;
    let qty = 1;

    // Search for prices in remaining parts
    for (let p = 1; p < parts.length; p++) {
      const valStr = parts[p].replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
      const num = parseFloat(valStr);
      if (!Number.isNaN(num) && num > 0) {
        if (unitPrice === 0) {
          unitPrice = num;
        } else if (qty === 1) {
          qty = num;
        }
      }
    }

    // If unitPrice not found in columns, search regex for R$ or numbers at the end of the line
    if (unitPrice === 0) {
      const priceMatch = desc.match(/(?:R\$)?\s*(\d+[.,]\d{2})/);
      if (priceMatch) {
        unitPrice = parseFloat(priceMatch[1].replace(",", "."));
      }
    }

    const itemTotal = Number((unitPrice * qty).toFixed(2));
    totalValue += itemTotal;

    const match = matchItemWithCatalog(desc, catalog);

    items.push({
      id: `text-item-${idx + 1}`,
      rawDescription: desc,
      quantity: qty,
      unit: "UN",
      unitPrice: Number(unitPrice.toFixed(2)),
      totalPrice: itemTotal,
      matchedQuotationId: match.matchedQuotationId,
      matchedIngredientName: match.matchedIngredientName,
      selected: Boolean(match.matchedQuotationId),
    });
  });

  return {
    storeName: "Cupom / Cotação Importada Manualmente",
    issueDate: new Date().toISOString().slice(0, 10),
    items,
    totalValue: Number(totalValue.toFixed(2)),
  };
}

/**
 * Creates simulated sample receipt based on 44-digit NFC-e key or QR Code URL
 */
export function parseNfceKeyOrQr(keyOrUrl: string, catalog: CotacaoInsumo[]): ReceiptParsedResult {
  const cleanKey = keyOrUrl.replace(/\D/g, "");
  const isKey = cleanKey.length >= 44;

  const sampleItemsRaw = [
    { desc: "LEITE CONDENSADO MOCA TP 395G", qty: 6, price: 6.89, u: "CX" },
    { desc: "CREME DE LEITE ITALAC LEVE TP 200G", qty: 10, price: 2.49, u: "CX" },
    { desc: "CREME DE LEITE ITAMBE CX 200G", qty: 4, price: 2.99, u: "CX" },
    { desc: "CREME AVELA NUTELLA POTE 650G", qty: 2, price: 39.90, u: "UN" },
    { desc: "DOCE DE LEITE TRAD ITAMBE PT 350G", qty: 3, price: 9.98, u: "UN" },
    { desc: "LEITE EM PO NINHO INTEGRAL LT 380G", qty: 2, price: 16.90, u: "LT" },
    { desc: "CHOCOLATE EM PO 50% CACAU HARALD 1KG", qty: 1, price: 34.50, u: "KG" },
    { desc: "MORANGO CONGELADO EMB 1.02KG", qty: 2, price: 21.90, u: "PCT" },
    { desc: "ACUCAR REFINADO UNIAO 1KG", qty: 4, price: 4.89, u: "PCT" },
    { desc: "LEITE INTEGRAL UHT ITAMBE 1L", qty: 12, price: 4.49, u: "CX" },
  ];

  let totalValue = 0;
  const items: ImportedReceiptItem[] = sampleItemsRaw.map((s, idx) => {
    const itemTotal = Number((s.qty * s.price).toFixed(2));
    totalValue += itemTotal;
    const match = matchItemWithCatalog(s.desc, catalog);
    return {
      id: `nfce-item-${idx + 1}`,
      rawDescription: s.desc,
      quantity: s.qty,
      unit: s.u,
      unitPrice: s.price,
      totalPrice: itemTotal,
      matchedQuotationId: match.matchedQuotationId,
      matchedIngredientName: match.matchedIngredientName,
      selected: Boolean(match.matchedQuotationId),
    };
  });

  return {
    storeName: "Atacadão / Supermercados BH (Consulta NFC-e SEFAZ)",
    cnpj: "01.234.567/0001-89",
    accessKey: isKey ? cleanKey.slice(0, 44) : "31260401234567000189650010001234561001234567",
    issueDate: new Date().toISOString().slice(0, 10),
    items,
    totalValue: Number(totalValue.toFixed(2)),
  };
}

/**
 * Updates ingredient recipes (Fichas Técnicas) when imported quotation prices change
 */
export function applyImportedPricesToFichas(
  fichas: FichaTecnicaProduto[],
  updatedQuotations: CotacaoInsumo[],
  appliedItems: ImportedReceiptItem[]
): FichaTecnicaProduto[] {
  const priceMapByName = new Map<string, number>();

  for (const item of appliedItems) {
    if (!item.selected || !item.matchedIngredientName) continue;
    const norm = normalizeText(item.matchedIngredientName);
    priceMapByName.set(norm, item.unitPrice);
  }

  return fichas.map((ficha) => {
    const updatedIngredients = ficha.ingredientes.map((ing) => {
      const ingNorm = normalizeText(ing.nome);

      let matchedNewPrice: number | null = null;
      for (const [keyNorm, newPrice] of priceMapByName.entries()) {
        if (ingNorm.includes(keyNorm) || keyNorm.includes(ingNorm)) {
          matchedNewPrice = newPrice;
          break;
        }
      }

      // Check specific common ingredients
      if (!matchedNewPrice) {
        if (ingNorm.includes("condensado")) {
          const p = priceMapByName.get(normalizeText("leite condensado"));
          if (p) matchedNewPrice = p;
        } else if (ingNorm.includes("creme de leite")) {
          const p = priceMapByName.get(normalizeText("creme de leite"));
          if (p) matchedNewPrice = p;
        } else if (ingNorm.includes("nutella")) {
          const p = priceMapByName.get(normalizeText("nutella"));
          if (p) matchedNewPrice = p;
        } else if (ingNorm.includes("doce de leite")) {
          const p = priceMapByName.get(normalizeText("doce de leite"));
          if (p) matchedNewPrice = p;
        }
      }

      if (matchedNewPrice !== null && matchedNewPrice > 0) {
        return {
          ...ing,
          custo_receita: Number(matchedNewPrice.toFixed(2)),
          observacao: `Preço atualizado via Cupom/Nota Fiscal (${new Date().toLocaleDateString("pt-BR")})`,
        };
      }

      return ing;
    });

    return {
      ...ficha,
      ingredientes: updatedIngredients,
    };
  });
}
