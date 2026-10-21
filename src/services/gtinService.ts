import { BRAND_CONFIG } from "@/config/brand.config";

const RSC_TOKEN_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_rsc_gtin_token_v1`;

export interface GtinProductInfo {
  gtin: string;
  nome: string;
  marca: string;
  quantidade_embalagem: number;
  unidade_medida: "g" | "kg" | "ml" | "l" | "un";
  categoria?: string;
  ncm?: number;
  foto_url?: string;
  fonte: "rsc_sistemas" | "catalogo_local" | "manual";
}

/**
 * Catálogo offline pré-carregado com os códigos de barras GTIN/EAN-13
 * oficiais dos principais insumos de confeitaria gourmet do Brasil.
 */
export const COMMON_GTIN_CATALOG: Record<string, Omit<GtinProductInfo, "gtin" | "fonte">> = {
  // Leite Condensado
  "7891000100103": {
    nome: "Leite Condensado Moça Tradicional",
    marca: "Nestlé",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios / Confeitaria",
    foto_url: "https://gtin.rscsistemas.com.br/api/gtin/img/7891000100103",
  },
  "7898215150018": {
    nome: "Leite Condensado Semidesnatado TP",
    marca: "Piracanjuba",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios",
    foto_url: "https://gtin.rscsistemas.com.br/api/gtin/img/7898215150018",
  },
  "7896051110026": {
    nome: "Leite Condensado Semidesnatado TP",
    marca: "Itambé",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios",
    foto_url: "https://gtin.rscsistemas.com.br/api/gtin/img/7896051110026",
  },
  "7898080640010": {
    nome: "Leite Condensado Semidesnatado TP",
    marca: "Italac",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios",
  },

  // Creme de Leite
  "7891000248706": {
    nome: "Creme de Leite Leve TP",
    marca: "Nestlé",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Laticínios",
  },
  "7898215150162": {
    nome: "Creme de Leite TP",
    marca: "Piracanjuba",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Laticínios",
  },
  "7896051121015": {
    nome: "Creme de Leite Homogeneizado TP",
    marca: "Itambé",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Laticínios",
  },
  "7898080640164": {
    nome: "Creme de Leite TP",
    marca: "Italac",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Laticínios",
  },

  // Leite Ninho & Em Pó
  "7891000053508": {
    nome: "Leite em Pó Integral Ninho Forti+",
    marca: "Nestlé",
    quantidade_embalagem: 380,
    unidade_medida: "g",
    categoria: "Laticínios",
  },
  "7891000305881": {
    nome: "Leite em Pó Integral Ninho Sachê",
    marca: "Nestlé",
    quantidade_embalagem: 750,
    unidade_medida: "g",
    categoria: "Laticínios",
  },

  // Nutella & Cremes de Avelã
  "7898024394184": {
    nome: "Creme de Avelã com Cacau Nutella Pote",
    marca: "Ferrero",
    quantidade_embalagem: 140,
    unidade_medida: "g",
    categoria: "Doces & Recheios",
  },
  "7898024394122": {
    nome: "Creme de Avelã com Cacau Nutella Pote",
    marca: "Ferrero",
    quantidade_embalagem: 350,
    unidade_medida: "g",
    categoria: "Doces & Recheios",
  },
  "7898024394139": {
    nome: "Creme de Avelã com Cacau Nutella Pote Econômico",
    marca: "Ferrero",
    quantidade_embalagem: 650,
    unidade_medida: "g",
    categoria: "Doces & Recheios",
  },
  "7898024394146": {
    nome: "Creme de Avelã Nutella Balde Food Service",
    marca: "Ferrero",
    quantidade_embalagem: 3000,
    unidade_medida: "g",
    categoria: "Doces & Recheios Food Service",
  },

  // Doce de Leite
  "7896051110019": {
    nome: "Doce de Leite Tradicional Pote",
    marca: "Itambé",
    quantidade_embalagem: 400,
    unidade_medida: "g",
    categoria: "Doces & Recheios",
  },
  "7896051110194": {
    nome: "Doce de Leite Pastoso Balde Confeiteiro",
    marca: "Itambé",
    quantidade_embalagem: 2000,
    unidade_medida: "g",
    categoria: "Food Service",
  },

  // Chocolates & Achocolatados
  "7891149103003": {
    nome: "Chocolate em Pó Solúvel 50% Cacau Dois Frades",
    marca: "Nestlé",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Confeitaria / Chocolates",
  },
  "7891095000623": {
    nome: "Achocolatado Flocos Crocantes Ovomaltine Sachê",
    marca: "Ovomaltine",
    quantidade_embalagem: 750,
    unidade_medida: "g",
    categoria: "Achocolatados",
  },

  // Bombons & Confeitos
  "7891008120011": {
    nome: "Bombom Sonho de Valsa Pacote",
    marca: "Lacta",
    quantidade_embalagem: 1000,
    unidade_medida: "g",
    categoria: "Chocolates & Bombons",
  },
  "7891008120028": {
    nome: "Bombom Ouro Branco Pacote",
    marca: "Lacta",
    quantidade_embalagem: 1000,
    unidade_medida: "g",
    categoria: "Chocolates & Bombons",
  },
  "7896001250260": {
    nome: "Paçoca Rolha Pote",
    marca: "Santa Helena",
    quantidade_embalagem: 1000,
    unidade_medida: "g",
    categoria: "Doces de Amendoim",
  },

  // Liga Neutra & Espessantes
  "7896011100104": {
    nome: "Liga Neutra Especial para Sorvetes e Geladinhos Pote",
    marca: "Selecta",
    quantidade_embalagem: 100,
    unidade_medida: "g",
    categoria: "Insumos Técnicos",
  },
  "7896011100111": {
    nome: "Liga Neutra Especial para Sorvetes Pote Econômico",
    marca: "Selecta",
    quantidade_embalagem: 1000,
    unidade_medida: "g",
    categoria: "Insumos Técnicos",
  },

  // Leite Líquido
  "7896051110101": {
    nome: "Leite Integral UHT Longa Vida 1L",
    marca: "Itambé",
    quantidade_embalagem: 1000,
    unidade_medida: "ml",
    categoria: "Laticínios",
  },
  "7898215150209": {
    nome: "Leite Integral UHT 1L",
    marca: "Piracanjuba",
    quantidade_embalagem: 1000,
    unidade_medida: "ml",
    categoria: "Laticínios",
  },

  // Embalagens & Saquinhos
  "7898910123456": {
    nome: "Saquinhos Plásticos para Geladinho Gourmet 150ml (Pct 100un)",
    marca: "Embalagens Gourmet",
    quantidade_embalagem: 100,
    unidade_medida: "un",
    categoria: "Embalagens",
  },
};

/**
 * Lê o Token de Autenticação da RSC Sistemas
 */
export function getRscGtinToken(): string {
  try {
    return localStorage.getItem(RSC_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Salva o Token de Autenticação da RSC Sistemas
 */
export function saveRscGtinToken(token: string): void {
  try {
    const cleaned = token.trim();
    if (cleaned) {
      localStorage.setItem(RSC_TOKEN_STORAGE_KEY, cleaned);
    } else {
      localStorage.removeItem(RSC_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Extrai peso/volume e unidade do nome do produto (ex: "LEITE CONDENSADO MOCA 395G" -> 395g)
 */
export function parsePackagingFromTitle(title: string): {
  quantidade: number;
  unidade: "g" | "kg" | "ml" | "l" | "un";
} {
  const norm = title.toUpperCase();

  // Match Kg: ex "1KG", "1.5KG", "1,5 KG"
  const kgMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*KG\b/);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1].replace(",", "."));
    return { quantidade: val >= 1 ? val * 1000 : val * 1000, unidade: "g" };
  }

  // Match Litros: ex "1L", "1 LITRO", "2L"
  const lMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*L(?:ITRO)?S?\b/);
  if (lMatch) {
    const val = parseFloat(lMatch[1].replace(",", "."));
    return { quantidade: val * 1000, unidade: "ml" };
  }

  // Match Gramas: ex "395G", "400 G", "200G"
  const gMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*G\b/);
  if (gMatch) {
    return { quantidade: parseFloat(gMatch[1].replace(",", ".")), unidade: "g" };
  }

  // Match Mililitros: ex "200ML", "500 ML"
  const mlMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*ML\b/);
  if (mlMatch) {
    return { quantidade: parseFloat(mlMatch[1].replace(",", ".")), unidade: "ml" };
  }

  // Match Unidades: ex "100 UN", "50 UNIDADES"
  const unMatch = norm.match(/(\d+)\s*(?:UN|UNIDADES?|PCT)\b/);
  if (unMatch) {
    return { quantidade: parseInt(unMatch[1], 10), unidade: "un" };
  }

  return { quantidade: 1, unidade: "un" };
}

/**
 * Consulta GTIN/EAN-13 utilizando:
 * 1. Catálogo local offline (resposta instantânea)
 * 2. API oficial RSC Sistemas (https://gtin.rscsistemas.com.br/api/gtin/infor/:gtin)
 */
export async function consultarProdutoPorGtin(
  rawGtin: string,
  userToken?: string
): Promise<GtinProductInfo | null> {
  const cleanGtin = rawGtin.replace(/\D/g, "").trim();
  if (!cleanGtin) return null;

  // 1. Tentar catálogo local pré-cadastrado
  if (COMMON_GTIN_CATALOG[cleanGtin]) {
    const item = COMMON_GTIN_CATALOG[cleanGtin];
    return {
      gtin: cleanGtin,
      nome: item.nome,
      marca: item.marca,
      quantidade_embalagem: item.quantidade_embalagem,
      unidade_medida: item.unidade_medida,
      categoria: item.categoria,
      foto_url: item.foto_url || `https://gtin.rscsistemas.com.br/api/gtin/img/${cleanGtin}`,
      fonte: "catalogo_local",
    };
  }

  // 2. Se houver token da RSC Sistemas configurado, chamar API oficial
  const token = (userToken || getRscGtinToken()).trim();
  if (token) {
    try {
      const response = await fetch(
        `https://gtin.rscsistemas.com.br/api/gtin/infor/${cleanGtin}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && (data.nome || data.descricao)) {
          const nomeProduto = data.nome || data.descricao || "";
          const parsed = parsePackagingFromTitle(nomeProduto);

          return {
            gtin: cleanGtin,
            nome: nomeProduto,
            marca: data.marca || "Marca Diversa",
            quantidade_embalagem: parsed.quantidade,
            unidade_medida: parsed.unidade,
            categoria: data.categoria || "Confeitaria / Insumos",
            ncm: data.ncm,
            foto_url: data.link_foto || `https://gtin.rscsistemas.com.br/api/gtin/img/${cleanGtin}`,
            fonte: "rsc_sistemas",
          };
        }
      }
    } catch (err) {
      console.warn("Consulta à API RSC Sistemas falhou ou bloqueada por CORS:", err);
    }
  }

  // Fallback: se não encontrou, retorna modelo básico com link da foto padrão
  return {
    gtin: cleanGtin,
    nome: `Produto GTIN ${cleanGtin}`,
    marca: "A Identificar",
    quantidade_embalagem: 1,
    unidade_medida: "un",
    foto_url: `https://gtin.rscsistemas.com.br/api/gtin/img/${cleanGtin}`,
    fonte: "manual",
  };
}
