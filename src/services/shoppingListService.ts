import { BRAND_CONFIG } from "@/config/brand.config";
import {
  ListaCompras,
  ListaComprasItem,
  PesquisaPrecoLocal,
  EstoquePorProduto,
  FichaTecnicaProduto,
} from "@/types/dashboard";
import { addPesquisaPreco, calculateNormalizedPrice } from "@/services/marketSurveyService";
import { parsePackagingFromTitle } from "@/services/gtinService";

const STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_listas_compras_v1`;

/**
 * Extrai o tamanho/peso/volume e a unidade de apresentação da embalagem para a Lista de Compras,
 * mantendo os valores naturais do rótulo (ex: "1,01 kg" -> 1.01 kg, "395g" -> 395 g, "1L" -> 1 l, "Fardo c/ 1000" -> 1000 un)
 */
export function parseDisplayPackaging(text: string): {
  quantidade?: number;
  unidade: "g" | "kg" | "ml" | "l" | "un";
  containerHint?: "lata" | "pote" | "pct" | "fardo" | "cx";
} {
  if (!text) return { quantidade: undefined, unidade: "un" };
  const norm = text.toUpperCase();

  let containerHint: "lata" | "pote" | "pct" | "fardo" | "cx" | undefined;
  if (/\bLATA\b/.test(norm)) containerHint = "lata";
  else if (/\bPOTE\b/.test(norm)) containerHint = "pote";
  else if (/\bFARDO\b/.test(norm)) containerHint = "fardo";
  else if (/\b(?:PACOTE|PCT|SACH[EÊ])\b/.test(norm)) containerHint = "pct";
  else if (/\b(?:CAIXA|CX)\b/.test(norm)) containerHint = "cx";

  // 1. Pacotes/fardos com contagem explícita de unidades: ex "Fardo c/ 1000", "Pct 100un", "Pote 50un"
  const packCountMatch = norm.match(
    /(?:PCT|PACOTE|FARDO|POTE|CX|CAIXA)\s*(?:C\/|COM)?\s*(\d+)\s*(?:UN|UNID|UNIDADES?)?\b|(?:C\/\s*(\d+))|(\d+)\s*(?:UN|UNID|UNIDADES?)\b/
  );
  if (packCountMatch) {
    const val = parseInt(packCountMatch[1] || packCountMatch[2] || packCountMatch[3], 10);
    if (!isNaN(val) && val > 0) {
      return {
        quantidade: val,
        unidade: "un",
        containerHint,
      };
    }
  }

  // 2. Kg: ex "1KG", "1,01 KG", "5 KG"
  const kgMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:KG|QUILOS?)\b/);
  if (kgMatch) {
    return {
      quantidade: parseFloat(kgMatch[1].replace(",", ".")),
      unidade: "kg",
      containerHint,
    };
  }

  // 3. Litros: ex "1L", "1 LITRO", "1,5L"
  const lMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:L|LITROS?)\b/);
  if (lMatch) {
    return {
      quantidade: parseFloat(lMatch[1].replace(",", ".")),
      unidade: "l",
      containerHint,
    };
  }

  // 4. Gramas: ex "395G", "300G (LATA)", "350G/395G"
  const gMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:G|GRAMAS?)\b/);
  if (gMatch) {
    return {
      quantidade: parseFloat(gMatch[1].replace(",", ".")),
      unidade: "g",
      containerHint,
    };
  }

  // 5. Mililitros: ex "200ML", "150ML"
  const mlMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:ML|MILILITROS?)\b/);
  if (mlMatch) {
    return {
      quantidade: parseFloat(mlMatch[1].replace(",", ".")),
      unidade: "ml",
      containerHint,
    };
  }

  return { quantidade: undefined, unidade: "un", containerHint };
}

/**
 * Garante que "Quantidade Necessária (unidade_compra)" e "Embalagem / Tamanho (unidade_embalagem)"
 * nunca se misturem, inclusive migrando listas já salvas no navegador.
 */
export function normalizeShoppingListItem(item: ListaComprasItem): ListaComprasItem {
  const parsedPkg = parseDisplayPackaging(item.insumo_nome);
  const purchaseUnits = ["un", "pct", "fardo", "cx", "lata", "pote", "sache", "lote"];

  // 1. Unidade exclusiva da Quantidade Necessária (Compra)
  let unidadeCompra = item.unidade_compra;
  if (!unidadeCompra) {
    const rawMedida = (item.unidade_medida || "un").toLowerCase().trim();
    if (purchaseUnits.includes(rawMedida)) {
      unidadeCompra = rawMedida;
    } else {
      unidadeCompra = parsedPkg.containerHint || "un";
    }
  }

  // 2. Valor e Unidade exclusivos da Embalagem / Tamanho
  let qtdEmbalagem = item.quantidade_embalagem;
  let unidadeEmbalagem = item.unidade_embalagem;

  if (!unidadeEmbalagem) {
    if (parsedPkg.quantidade !== undefined) {
      unidadeEmbalagem = parsedPkg.unidade;
      // Corrige casos onde 1kg havia virado 1000g, 1.01kg havia virado 1010g ou 1L havia virado 1000ml
      if (
        !qtdEmbalagem ||
        (parsedPkg.unidade === "kg" && Math.abs(qtdEmbalagem - parsedPkg.quantidade * 1000) < 1) ||
        (parsedPkg.unidade === "l" && Math.abs(qtdEmbalagem - parsedPkg.quantidade * 1000) < 1)
      ) {
        qtdEmbalagem = parsedPkg.quantidade;
      }
    } else {
      const rawMedida = (item.unidade_medida || "un").toLowerCase().trim();
      if (["g", "kg", "ml", "l", "un"].includes(rawMedida)) {
        unidadeEmbalagem = rawMedida;
      } else {
        unidadeEmbalagem = "un";
      }
    }
  }

  if (qtdEmbalagem === undefined && parsedPkg.quantidade !== undefined) {
    qtdEmbalagem = parsedPkg.quantidade;
  }

  return {
    ...item,
    unidade_compra: unidadeCompra,
    quantidade_embalagem: qtdEmbalagem,
    unidade_embalagem: unidadeEmbalagem,
    unidade_medida: unidadeEmbalagem || item.unidade_medida || "un",
  };
}

export const SHOPPING_LIST_TEMPLATES: Array<{
  id: string;
  titulo: string;
  descricao: string;
  itens: Array<Omit<ListaComprasItem, "id" | "comprado">>;
}> = [
  {
    id: "template-lote-69",
    titulo: "Fornada Completa: 69 Geladinhos (9 Receitas Oficiais)",
    descricao: "Lista calculada para produção integral do cardápio expandido de 69 saquinhos de 150ml.",
    itens: [
      {
        insumo_nome: "Leite Condensado (395g)",
        marca: "Piracanjuba / Itambé / Moça",
        quantidade_necessaria: 10,
        unidade_compra: "un",
        unidade_medida: "g",
        quantidade_embalagem: 395,
        unidade_embalagem: "g",
        preco_estimado: 5.29,
        gtin: "7898215150018",
      },
      {
        insumo_nome: "Creme de Leite (200g)",
        marca: "Piracanjuba / Itambé / Nestlé",
        quantidade_necessaria: 8,
        unidade_compra: "un",
        unidade_medida: "g",
        quantidade_embalagem: 200,
        unidade_embalagem: "g",
        preco_estimado: 2.79,
        gtin: "7898215150162",
      },
      {
        insumo_nome: "Leite Integral UHT (1L)",
        marca: "Itambé / Piracanjuba",
        quantidade_necessaria: 4,
        unidade_compra: "un",
        unidade_medida: "l",
        quantidade_embalagem: 1,
        unidade_embalagem: "l",
        preco_estimado: 4.89,
        gtin: "7896051110101",
      },
      {
        insumo_nome: "Liga Neutra Especial para Sorvete (100g ou 1kg)",
        marca: "Selecta",
        quantidade_necessaria: 1,
        unidade_compra: "un",
        unidade_medida: "g",
        quantidade_embalagem: 100,
        unidade_embalagem: "g",
        preco_estimado: 4.5,
        gtin: "7896011100104",
      },
      {
        insumo_nome: "Creme de Avelã Nutella Pote Econômico (650g)",
        marca: "Ferrero",
        quantidade_necessaria: 1,
        unidade_compra: "pote",
        unidade_medida: "g",
        quantidade_embalagem: 650,
        unidade_embalagem: "g",
        preco_estimado: 38.9,
        gtin: "7898024394139",
      },
      {
        insumo_nome: "Leite Ninho em Pó Integral (380g)",
        marca: "Nestlé",
        quantidade_necessaria: 1,
        unidade_compra: "lata",
        unidade_medida: "g",
        quantidade_embalagem: 380,
        unidade_embalagem: "g",
        preco_estimado: 17.9,
        gtin: "7891000053508",
      },
      {
        insumo_nome: "Doce de Leite Tradicional Pote (400g)",
        marca: "Itambé",
        quantidade_necessaria: 1,
        unidade_compra: "pote",
        unidade_medida: "g",
        quantidade_embalagem: 400,
        unidade_embalagem: "g",
        preco_estimado: 9.8,
        gtin: "7896051110019",
      },
      {
        insumo_nome: "Morangos Congelados / Frescos para Geleia (1kg)",
        marca: "Original Food / Fruta Natural",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "kg",
        quantidade_embalagem: 1,
        unidade_embalagem: "kg",
        preco_estimado: 24.9,
      },
      {
        insumo_nome: "Polpa Pura de Maracujá com Sementes (1kg)",
        marca: "Brasfrut / De Marchi",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "kg",
        quantidade_embalagem: 1,
        unidade_embalagem: "kg",
        preco_estimado: 23.8,
      },
      {
        insumo_nome: "Paçoca Rolha de Amendoim (Pote 50un)",
        marca: "Santa Helena",
        quantidade_necessaria: 1,
        unidade_compra: "pote",
        unidade_medida: "un",
        quantidade_embalagem: 50,
        unidade_embalagem: "un",
        preco_estimado: 19.9,
        gtin: "7896001250260",
      },
      {
        insumo_nome: "Chocolate em Pó 50% Cacau (200g)",
        marca: "Nestlé Dois Frades",
        quantidade_necessaria: 1,
        unidade_compra: "un",
        unidade_medida: "g",
        quantidade_embalagem: 200,
        unidade_embalagem: "g",
        preco_estimado: 11.5,
        gtin: "7891149103003",
      },
      {
        insumo_nome: "Achocolatado em Flocos Crocantes Ovomaltine (750g)",
        marca: "Ovomaltine",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "g",
        quantidade_embalagem: 750,
        unidade_embalagem: "g",
        preco_estimado: 26.9,
        gtin: "7891095000623",
      },
      {
        insumo_nome: "Bombom Ouro Branco (Pacote 1kg)",
        marca: "Lacta",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "kg",
        quantidade_embalagem: 1,
        unidade_embalagem: "kg",
        preco_estimado: 42.9,
        gtin: "7891008120028",
      },
      {
        insumo_nome: "Bombom Sonho de Valsa (Pacote 1kg)",
        marca: "Lacta",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "kg",
        quantidade_embalagem: 1,
        unidade_embalagem: "kg",
        preco_estimado: 42.9,
        gtin: "7891008120011",
      },
      {
        insumo_nome: "Saquinhos Plásticos para Geladinho Gourmet 150ml (Pct 100un)",
        marca: "Embalagens Confeiteiro",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "un",
        quantidade_embalagem: 100,
        unidade_embalagem: "un",
        preco_estimado: 5.0,
        gtin: "7898910123456",
      },
    ],
  },
  {
    id: "template-quarteto-campeao",
    titulo: "Quarteto Campeão: 32 Geladinhos (Mais Vendidos)",
    descricao: "Produção rápida dos 4 sabores de maior giro: Ninho com Nutella, Morango, Maracujá e Doce de Leite.",
    itens: [
      {
        insumo_nome: "Leite Condensado (395g)",
        marca: "Piracanjuba / Itambé",
        quantidade_necessaria: 4,
        unidade_compra: "un",
        unidade_medida: "g",
        quantidade_embalagem: 395,
        unidade_embalagem: "g",
        preco_estimado: 5.29,
        gtin: "7898215150018",
      },
      {
        insumo_nome: "Creme de Leite (200g)",
        marca: "Piracanjuba / Itambé",
        quantidade_necessaria: 4,
        unidade_compra: "un",
        unidade_medida: "g",
        quantidade_embalagem: 200,
        unidade_embalagem: "g",
        preco_estimado: 2.79,
        gtin: "7898215150162",
      },
      {
        insumo_nome: "Leite Integral UHT (1L)",
        marca: "Itambé / Piracanjuba",
        quantidade_necessaria: 2,
        unidade_compra: "un",
        unidade_medida: "l",
        quantidade_embalagem: 1,
        unidade_embalagem: "l",
        preco_estimado: 4.89,
        gtin: "7896051110101",
      },
      {
        insumo_nome: "Nutella Pote (350g ou 650g)",
        marca: "Ferrero",
        quantidade_necessaria: 1,
        unidade_compra: "pote",
        unidade_medida: "g",
        quantidade_embalagem: 350,
        unidade_embalagem: "g",
        preco_estimado: 24.9,
        gtin: "7898024394122",
      },
      {
        insumo_nome: "Leite Ninho em Pó (380g)",
        marca: "Nestlé",
        quantidade_necessaria: 1,
        unidade_compra: "lata",
        unidade_medida: "g",
        quantidade_embalagem: 380,
        unidade_embalagem: "g",
        preco_estimado: 17.9,
        gtin: "7891000053508",
      },
      {
        insumo_nome: "Doce de Leite Itambé (400g)",
        marca: "Itambé",
        quantidade_necessaria: 1,
        unidade_compra: "pote",
        unidade_medida: "g",
        quantidade_embalagem: 400,
        unidade_embalagem: "g",
        preco_estimado: 9.8,
        gtin: "7896051110019",
      },
      {
        insumo_nome: "Morangos Frescos / Congelados (500g)",
        marca: "Hortifrúti / Original Food",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "g",
        quantidade_embalagem: 500,
        unidade_embalagem: "g",
        preco_estimado: 14.5,
      },
      {
        insumo_nome: "Polpa de Maracujá com Sementes (500g)",
        marca: "Brasfrut",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "g",
        quantidade_embalagem: 500,
        unidade_embalagem: "g",
        preco_estimado: 12.0,
      },
      {
        insumo_nome: "Liga Neutra (100g)",
        marca: "Selecta",
        quantidade_necessaria: 1,
        unidade_compra: "un",
        unidade_medida: "g",
        quantidade_embalagem: 100,
        unidade_embalagem: "g",
        preco_estimado: 4.5,
        gtin: "7896011100104",
      },
      {
        insumo_nome: "Saquinhos Geladinho 150ml (Pct 100un)",
        marca: "Gourmet",
        quantidade_necessaria: 1,
        unidade_compra: "pct",
        unidade_medida: "un",
        quantidade_embalagem: 100,
        unidade_embalagem: "un",
        preco_estimado: 5.0,
        gtin: "7898910123456",
      },
    ],
  },
];

export function loadShoppingLists(): ListaCompras[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((list: ListaCompras) => ({
          ...list,
          itens: Array.isArray(list.itens)
            ? list.itens.map((it) => normalizeShoppingListItem(it))
            : [],
        }));
      }
    }
  } catch (err) {
    console.warn("Erro ao ler listas de compras locais:", err);
  }

  // Se não houver nenhuma, cria a lista padrão da semana baseada no template 1
  const defaultList: ListaCompras = {
    id: `lista-${Date.now()}`,
    titulo: "Lista de Compras da Semana — Produção Roze",
    descricao: "Insumos prioritários para a fornada semanal no Atacado/Varejo.",
    cidade: "Jaú - SP",
    itens: SHOPPING_LIST_TEMPLATES[0].itens.map((it, idx) => ({
      ...it,
      id: `item-list-${idx + 1}`,
      comprado: false,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveShoppingLists([defaultList]);
  return [defaultList];
}

export function saveShoppingLists(lists: ListaCompras[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch (err) {
    console.warn("Erro ao salvar listas de compras no LocalStorage:", err);
  }
}

export function addOrUpdateShoppingList(list: ListaCompras): ListaCompras[] {
  const all = loadShoppingLists();
  const idx = all.findIndex((l) => l.id === list.id);
  let updated: ListaCompras[];
  if (idx >= 0) {
    updated = [...all];
    updated[idx] = { ...list, updated_at: new Date().toISOString() };
  } else {
    updated = [
      {
        ...list,
        id: list.id || `lista-${Date.now()}`,
        created_at: list.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...all,
    ];
  }
  saveShoppingLists(updated);
  return updated;
}

export function deleteShoppingList(listId: string): ListaCompras[] {
  const all = loadShoppingLists();
  const updated = all.filter((l) => l.id !== listId);
  saveShoppingLists(updated);
  return updated;
}

/**
 * Parser inteligente de lista em texto livre (copiado do WhatsApp, notas ou mensagens)
 * Formatos suportados:
 * - "2x Leite Condensado 395g R$ 5,49"
 * - "Nutella 650g - R$ 34,90"
 * - "10 Saquinhos 150ml"
 * - "3 caixas de creme de leite piracanjuba"
 */
export function parseShoppingListFromText(rawText: string): ListaComprasItem[] {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("---"));

  const items: ListaComprasItem[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Ignora cabeçalhos tipo "LISTA DE COMPRAS"
    if (line.toLowerCase().includes("lista de compras") || line.toLowerCase().includes("total estimado")) {
      continue;
    }

    // Limpa marcadores tipo bullet "•", "-", "*", "[ ]"
    const cleanLine = line.replace(/^[•\-\*\d+\.\)\[\]\s]+/, "").trim();
    if (!cleanLine) continue;

    // Detecta preço se existir (ex: "R$ 5,49" ou "5.49")
    let preco: number | undefined;
    const priceMatch = cleanLine.match(/R\$\s*(\d+(?:[.,]\d{2})?)|(?:\b(\d+[.,]\d{2})\b)/i);
    if (priceMatch) {
      const valStr = (priceMatch[1] || priceMatch[2]).replace(",", ".");
      preco = parseFloat(valStr);
    }

    // Detecta quantidade (ex: "2x", "3 caixas", "10 un")
    let qtd = 1;
    let unidadeCompra = "un";
    const qtdMatch = cleanLine.match(/^(\d+(?:[.,]\d+)?)\s*(x|cx|caixas?|pct|pacotes?|fardos?|un|latas?|potes?)?\b/i);
    if (qtdMatch) {
      qtd = parseFloat(qtdMatch[1].replace(",", "."));
      const rawUnit = (qtdMatch[2] || "").toLowerCase();
      if (rawUnit.startsWith("cx") || rawUnit.startsWith("caixa")) unidadeCompra = "cx";
      else if (rawUnit.startsWith("pct") || rawUnit.startsWith("pacote")) unidadeCompra = "pct";
      else if (rawUnit.startsWith("fardo")) unidadeCompra = "fardo";
      else if (rawUnit.startsWith("lata")) unidadeCompra = "lata";
      else if (rawUnit.startsWith("pote")) unidadeCompra = "pote";
    }

    // Extrai embalagem e unidade (ex: 395g, 1kg, 200ml)
    const packaging = parseDisplayPackaging(cleanLine);
    if (unidadeCompra === "un" && packaging.containerHint) {
      unidadeCompra = packaging.containerHint;
    }

    // Remove termos de preço da descrição do insumo
    let nomeInsumo = cleanLine
      .replace(/R\$\s*(\d+(?:[.,]\d{2})?)/gi, "")
      .replace(/^(\d+(?:[.,]\d+)?)\s*(?:x|cx|caixas?|pct|pacotes?|fardos?|un|latas?|potes?)\s*/i, "")
      .replace(/[-–—:]\s*$/, "")
      .trim();

    if (!nomeInsumo) nomeInsumo = cleanLine;

    items.push({
      id: `imported-${Date.now()}-${idx}`,
      insumo_nome: nomeInsumo,
      quantidade_necessaria: qtd,
      unidade_compra: unidadeCompra,
      unidade_medida: packaging.unidade,
      quantidade_embalagem: packaging.quantidade,
      unidade_embalagem: packaging.unidade,
      preco_estimado: preco,
      preco_cotado: preco,
      comprado: false,
    });
  }

  return items;
}

/**
 * Salva em lote as cotações com preços da Lista de Compras na tabela de Pesquisas de Preço do Mercado
 */
export function saveBatchQuotationsFromShoppingList(
  list: ListaCompras,
  estabelecimentoId: string,
  estabelecimentoNome: string,
  cidade: string,
  dataValidade?: string
): number {
  const hoje = new Date().toISOString().split("T")[0];
  let salvos = 0;

  for (const item of list.itens) {
    const preco = item.preco_cotado || item.preco_estimado;
    if (preco && preco > 0) {
      const qtdEmb = item.quantidade_embalagem || 1;
      const rawUn = (item.unidade_embalagem || item.unidade_medida || "un").toLowerCase().trim();
      const unMed: "g" | "ml" | "un" | "kg" | "l" =
        rawUn === "kg" || rawUn === "quilo" || rawUn === "quilos" ? "kg" :
        rawUn === "l" || rawUn === "litro" || rawUn === "litros" ? "l" :
        rawUn === "g" || rawUn === "grama" || rawUn === "gramas" ? "g" :
        rawUn === "ml" || rawUn === "mililitro" || rawUn === "mililitros" ? "ml" : "un";

      const precoVarejo = item.preco_varejo || preco;
      const precoAtacado = item.preco_atacado && item.preco_atacado > 0 ? item.preco_atacado : undefined;
      const precoNormalizado = calculateNormalizedPrice(precoVarejo, qtdEmb, unMed);
      const precoAtacadoNormalizado = precoAtacado
        ? calculateNormalizedPrice(precoAtacado, qtdEmb, unMed)
        : undefined;

      const novaCotacao: PesquisaPrecoLocal = {
        id: `pesq-batch-${Date.now()}-${salvos}`,
        estabelecimento_id: estabelecimentoId,
        estabelecimento_nome: estabelecimentoNome,
        cidade: cidade || "Jaú - SP",
        insumo_nome: item.insumo_nome,
        marca: item.marca || "Marca Padrão",
        quantidade_embalagem: qtdEmb,
        unidade_medida: unMed,
        preco_pesquisado: precoVarejo,
        preco_varejo: precoVarejo,
        preco_atacado: precoAtacado,
        qtd_minima_atacado: item.qtd_minima_atacado,
        preco_por_kg_ou_l: precoNormalizado,
        preco_atacado_por_kg_ou_l: precoAtacadoNormalizado,
        data_pesquisa: hoje,
        data_validade: dataValidade || item.data_validade,
        em_promocao: Boolean(item.em_promocao),
        gtin: item.gtin,
        observacoes: `Importado da lista: ${list.titulo}`,
      };

      addPesquisaPreco(novaCotacao);
      salvos++;
    }
  }

  return salvos;
}

/**
 * Faz o parse de arquivo ou texto JSON segundo o schema universal de compras
 */
export function parseShoppingListFromJson(jsonString: string): { titulo: string; itens: ListaComprasItem[] } | null {
  try {
    const data = JSON.parse(jsonString.trim());
    const rawItens = Array.isArray(data) ? data : data.itens || data.items || [];
    const titulo = data.lista_nome || data.titulo || "Lista Importada (JSON)";

    if (!Array.isArray(rawItens) || rawItens.length === 0) {
      return null;
    }

    const itens: ListaComprasItem[] = rawItens.map((it: any, idx: number) => {
      const nome = String(it.nome || it.insumo_nome || it.descricao || `Insumo ${idx + 1}`).trim();
      const qtd = Number(it.quantidade || it.quantidade_necessaria || it.qtd || 1);
      const precoEstimado = Number(it.preco_estimado_unitario || it.preco_estimado || it.preco || 0);
      const precoVarejo = Number(it.preco_varejo || precoEstimado || 0);
      const precoAtacado = Number(it.preco_atacado || 0);
      const qtdMinAtacado = Number(it.qtd_minima_atacado || it.qtd_min_atacado || it.min_atacado || 0);
      const statusRaw = String(it.status || "").toLowerCase();
      const status: "pendente" | "carrinho" | "comprado" =
        statusRaw === "comprado" ? "comprado" : statusRaw === "carrinho" ? "carrinho" : "pendente";

      const packaging = parseDisplayPackaging(nome);
      const unidadeCompraRaw = String(it.unidade_compra || it.unidade || it.unidade_medida || packaging.containerHint || "un").toLowerCase();
      const qtdEmbalagem = Number(it.quantidade_embalagem || packaging.quantidade || 0);
      const unidadeEmbalagem = String(it.unidade_embalagem || packaging.unidade || "un").toLowerCase();

      return {
        id: String(it.id_item || it.id || `item-json-${Date.now()}-${idx}`),
        insumo_nome: nome,
        categoria: it.categoria || "Geral",
        quantidade_necessaria: isNaN(qtd) || qtd <= 0 ? 1 : qtd,
        unidade_compra: unidadeCompraRaw,
        unidade_medida: unidadeEmbalagem,
        quantidade_embalagem: qtdEmbalagem > 0 ? qtdEmbalagem : undefined,
        unidade_embalagem: unidadeEmbalagem,
        preco_estimado: isNaN(precoVarejo) || precoVarejo <= 0 ? undefined : precoVarejo,
        preco_cotado: isNaN(precoVarejo) || precoVarejo <= 0 ? undefined : precoVarejo,
        preco_varejo: isNaN(precoVarejo) || precoVarejo <= 0 ? undefined : precoVarejo,
        preco_atacado: isNaN(precoAtacado) || precoAtacado <= 0 ? undefined : precoAtacado,
        qtd_minima_atacado: isNaN(qtdMinAtacado) || qtdMinAtacado <= 0 ? undefined : qtdMinAtacado,
        prioridade: it.prioridade === "alta" || it.prioridade === "baixa" ? it.prioridade : "media",
        estabelecimento_nome: it.fornecedor_sugerido || it.estabelecimento_nome || undefined,
        status,
        comprado: status === "comprado",
        gtin: it.gtin || undefined,
        observacoes: it.observacoes || undefined,
      };
    });

    return { titulo, itens };
  } catch (err) {
    console.warn("Erro ao fazer parse de lista JSON:", err);
    return null;
  }
}

/**
 * Faz o parse de texto CSV (compatível com Excel / Google Sheets, separador ';' ou ',')
 * Suporta o modelo oficial PereiraLabs e tabelas de cotação de mercado
 */
export function parseShoppingListFromCsv(csvText: string): { titulo: string; itens: ListaComprasItem[] } | null {
  try {
    // 1. Limpa e desmembra linhas grudadas se houver cabeçalhos colados no mesmo texto
    const rawLines = csvText.split(/\r?\n/);
    const lines: string[] = [];

    rawLines.forEach((l) => {
      const trimmed = l.trim();
      if (!trimmed) return;

      // Se houver uma linha contendo um cabeçalho colado (ex: "...Mart Minas;Categoria;Produto...")
      const gluedMatch = trimmed.match(/(.*?);(categoria;produto.*)/i);
      if (gluedMatch) {
        if (gluedMatch[1].trim()) lines.push(gluedMatch[1].trim());
        if (gluedMatch[2].trim()) lines.push(gluedMatch[2].trim());
      } else {
        lines.push(trimmed);
      }
    });

    if (lines.length === 0) return null;

    // Detect delimiter (; or ,)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(";") ? ";" : ",";

    // Helper seguro para converter preços em formato brasileiro ou americano
    const parseMoney = (val?: string): number | undefined => {
      if (!val) return undefined;
      let str = val.replace(/R\$/g, "").trim();
      if (!str) return undefined;

      if (str.includes(",") && str.includes(".")) {
        if (str.indexOf(".") < str.indexOf(",")) {
          str = str.replace(/\./g, "").replace(",", ".");
        } else {
          str = str.replace(/,/g, "");
        }
      } else if (str.includes(",")) {
        str = str.replace(",", ".");
      }
      const parsed = parseFloat(str);
      return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
    };

    const itens: ListaComprasItem[] = [];

    // Estado do cabeçalho ativo (permite importar blocos concatenados com cabeçalhos diferentes)
    let currentHeaders: string[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length === 0 || !parts[0]) return;

      const lowerParts = parts.map((p) => p.toLowerCase());
      const isHeaderLine = lowerParts.some(
        (p) =>
          p.includes("nome") ||
          p.includes("produto") ||
          p.includes("insumo") ||
          p.includes("categoria") ||
          p.includes("marca") ||
          p.includes("preco_varejo")
      );

      if (isHeaderLine) {
        currentHeaders = lowerParts;
        return;
      }

      let nome = "";
      let categoria = "Geral";
      let marca = "";
      let qtd = 1;
      let unidadeExplicitamenteInformada = "";
      let tamanhoApresentacao = "";
      let precoVarejo: number | undefined = undefined;
      let precoAtacado: number | undefined = undefined;
      let qtdMinAtacado: number | undefined = undefined;
      let prioridade: "alta" | "media" | "baixa" = "media";
      let fornecedor: string | undefined = undefined;
      let gtin: string | undefined = undefined;

      if (currentHeaders.length > 0) {
        currentHeaders.forEach((h, colIdx) => {
          const val = parts[colIdx];
          if (!val) return;

          if (h === "nome" || h === "insumo" || h === "produto" || h.includes("item")) {
            nome = val;
          } else if (h.includes("cat")) {
            categoria = val;
          } else if (h.includes("marca")) {
            marca = val;
          } else if (h.includes("tamanho") || h.includes("apresentacao") || h.includes("emb")) {
            tamanhoApresentacao = val;
          } else if (h.includes("quant") || h === "qtd") {
            const parsed = parseFloat(val.replace(",", "."));
            if (!isNaN(parsed) && parsed > 0) qtd = parsed;
          } else if (h.includes("unid") || h === "un") {
            unidadeExplicitamenteInformada = val.toLowerCase();
          } else if (h.includes("atacado") && !h.includes("min")) {
            precoAtacado = parseMoney(val);
          } else if (h.includes("min") || h.includes("minimo") || h.includes("qtd_atacado")) {
            const parsed = parseFloat(val.replace(",", "."));
            if (!isNaN(parsed) && parsed > 0) qtdMinAtacado = parsed;
          } else if (h.includes("varejo")) {
            precoVarejo = parseMoney(val);
          } else if (h.includes("prec") || h.includes("valor")) {
            const valNum = parseMoney(val);
            if (valNum) {
              if (!precoVarejo) precoVarejo = valNum;
            }
          } else if (h.includes("prior")) {
            const low = val.toLowerCase();
            if (low === "alta" || low === "baixa") prioridade = low;
          } else if (h.includes("fornec") || h.includes("loja") || h.includes("estab")) {
            fornecedor = val;
          } else if (h.includes("gtin") || h.includes("ean") || h.includes("barras") || h.includes("codigo")) {
            gtin = val.replace(/\D/g, "");
          }
        });
      } else {
        // Fallback posicional se vier sem cabeçalho
        nome = parts[0];
        if (parts[1]) categoria = parts[1];
        if (parts[2]) {
          const parsed = parseFloat(parts[2].replace(",", "."));
          if (!isNaN(parsed) && parsed > 0) qtd = parsed;
        }
        if (parts[3]) unidadeExplicitamenteInformada = parts[3].toLowerCase();
        if (parts[4]) precoVarejo = parseMoney(parts[4]);
        if (parts[5]) precoAtacado = parseMoney(parts[5]);
        if (parts[6]) {
          const parsedMin = parseFloat(parts[6].replace(",", "."));
          if (!isNaN(parsedMin) && parsedMin > 0) qtdMinAtacado = parsedMin;
        }
      }

      if (nome) {
        // Se houver marca e ela não estiver no nome, compõe o nome de forma clara
        let nomeFinal = nome;
        if (marca && !nomeFinal.toUpperCase().includes(marca.toUpperCase()) && marca.toUpperCase() !== "DIVERSAS") {
          nomeFinal = `${nome} (${marca})`;
        }
        if (tamanhoApresentacao && !nomeFinal.includes(tamanhoApresentacao)) {
          nomeFinal = `${nomeFinal} ${tamanhoApresentacao}`;
        }

        // Extrai separadamente o tamanho/embalagem (ex: 395g, 1,01 kg, 1L, 1000un)
        const packaging = parseDisplayPackaging(tamanhoApresentacao || nomeFinal);

        // Unidade da Quantidade Necessária (compra) é independente da Unidade da Embalagem!
        const unidadeCompra =
          unidadeExplicitamenteInformada ||
          packaging.containerHint ||
          "un";

        const unidadeEmbalagem = packaging.unidade || "un";

        itens.push({
          id: `item-csv-${Date.now()}-${idx}`,
          insumo_nome: nomeFinal,
          categoria,
          marca: marca || undefined,
          quantidade_necessaria: qtd,
          unidade_compra: unidadeCompra,
          unidade_medida: unidadeEmbalagem,
          quantidade_embalagem: packaging.quantidade,
          unidade_embalagem: unidadeEmbalagem,
          preco_estimado: precoVarejo || precoAtacado,
          preco_cotado: precoVarejo || precoAtacado,
          preco_varejo: precoVarejo,
          preco_atacado: precoAtacado,
          qtd_minima_atacado: qtdMinAtacado,
          prioridade,
          estabelecimento_nome: fornecedor,
          gtin: gtin || undefined,
          status: "pendente",
          comprado: false,
        });
      }
    });

    if (itens.length === 0) return null;

    return {
      titulo: `Lista Importada (${itens.length} itens - ${new Date().toLocaleDateString("pt-BR")})`,
      itens,
    };
  } catch (err) {
    console.warn("Erro ao fazer parse de lista CSV:", err);
    return null;
  }
}

/**
 * Gera automaticamente uma Lista de Compras baseada na Falta de Freezer (Estoque Crítico)
 * Analisa os produtos com estoque zerado ou abaixo do mínimo e explode suas fichas técnicas.
 */
export function generateShoppingListFromCriticalStock(
  reposicaoEstoque: EstoquePorProduto[],
  fichasTecnicas: FichaTecnicaProduto[]
): ListaCompras | null {
  const criticos = reposicaoEstoque.filter(
    (item) => item.abaixo_do_minimo || item.quantidade_disponivel <= 0
  );

  if (criticos.length === 0) return null;

  const aggregatedMap = new Map<
    string,
    {
      nome: string;
      categoria: string;
      quantidade: number;
      unidade: string;
      precoEstimadoUnit?: number;
      gtin?: string;
      sabores: string[];
    }
  >();

  // Para cada sabor com estoque crítico, calcula o lote necessário e adiciona os insumos da receita
  for (const item of criticos) {
    const ficha = fichasTecnicas.find((f) => f.produto_id === item.produto_id);
    const lotes = item.quantidade_disponivel <= 0 ? 2 : 1;

    if (ficha && ficha.ingredientes && ficha.ingredientes.length > 0) {
      for (const ing of ficha.ingredientes) {
        const key = ing.nome.toLowerCase().trim();
        const existing = aggregatedMap.get(key);
        const totalIngQtd = (ing.quantidade_receita || 1) * lotes;

        if (existing) {
          existing.quantidade += totalIngQtd;
          if (!existing.sabores.includes(item.nome)) {
            existing.sabores.push(item.nome);
          }
        } else {
          aggregatedMap.set(key, {
            nome: ing.nome,
            categoria: ing.nome.toLowerCase().includes("saquinho") || ing.unidade === "un" ? "Embalagens & Descartáveis" : "Laticínios & Confeitaria",
            quantidade: totalIngQtd,
            unidade: ing.unidade,
            precoEstimadoUnit: ing.custo_receita && ing.quantidade_receita ? ing.custo_receita / ing.quantidade_receita : undefined,
            sabores: [item.nome],
          });
        }
      }
    } else {
      // Insumo básico padrão se não houver ficha detalhada
      const baseKey = `base-leite-${item.produto_id}`;
      aggregatedMap.set(baseKey, {
        nome: `Insumos p/ ${item.nome} (${lotes} lote)`,
        categoria: "Produção",
        quantidade: lotes,
        unidade: "lote",
        sabores: [item.nome],
      });
    }
  }

  const itens: ListaComprasItem[] = Array.from(aggregatedMap.values()).map(
    (agg, idx) => ({
      id: `item-critico-${Date.now()}-${idx}`,
      insumo_nome: agg.nome,
      categoria: agg.categoria,
      quantidade_necessaria: Math.ceil(agg.quantidade * 10) / 10,
      unidade_medida: agg.unidade,
      preco_estimado: agg.precoEstimadoUnit,
      prioridade: "alta",
      status: "pendente",
      comprado: false,
      gtin: agg.gtin,
      observacoes: `Falta de estoque nos sabores: ${agg.sabores.join(", ")}`,
    })
  );

  return {
    id: `lista-critica-${Date.now()}`,
    titulo: `Reposição Crítica: ${criticos.length} Sabor(es) em Falta (${new Date().toLocaleDateString("pt-BR")})`,
    descricao: `Gerada automaticamente da falta de freezer para repor: ${criticos.map((c) => c.nome).join(", ")}.`,
    cidade: "Jaú - SP",
    itens,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
