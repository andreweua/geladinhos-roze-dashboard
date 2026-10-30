import { BRAND_CONFIG } from "@/config/brand.config";

const RSC_TOKEN_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_rsc_gtin_token_v1`;
const RSC_TOKEN_EXPIRES_KEY = `${BRAND_CONFIG.storagePrefix}_rsc_gtin_expires_v1`;
const EDIT_REQUESTS_STORAGE_KEY = `pereiralabs_product_edit_requests_v1`;
const APPROVED_OVERRIDES_STORAGE_KEY = `pereiralabs_approved_gtin_overrides_v1`;

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
 * Solicitação de Edição / Correção de Produto Oficial (RSC Sistemas / Banco de Dados)
 * Criada pelo usuário quando encontra dados divergentes, mas cuja aprovação é EXCLUSIVA da PereiraLabs.
 */
export interface SolicitacaoEdicaoProdutoOficial {
  id: string;
  gtin: string;
  // Dados oficiais atuais no momento da solicitação
  nome_atual: string;
  marca_atual: string;
  quantidade_embalagem_atual: number;
  unidade_medida_atual: "g" | "kg" | "ml" | "l" | "un";
  fonte_original: "rsc_sistemas" | "catalogo_local";
  // Dados sugeridos pelo usuário para correção
  nome_sugerido: string;
  marca_sugerida: string;
  quantidade_embalagem_sugerida: number;
  unidade_medida_sugerida: "g" | "kg" | "ml" | "l" | "un";
  motivo_divergencia: string;
  // Metadados da empresa/usuário solicitante
  empresa_id: string;
  empresa_nome: string;
  solicitado_por: string;
  criado_em: string;
  // Governança exclusiva PereiraLabs
  status: "pendente" | "aprovado" | "rejeitado";
  avaliado_em?: string;
  avaliado_por?: string;
  parecer_pereiralabs?: string;
}

export interface ApprovedGtinOverride {
  gtin: string;
  nome: string;
  marca: string;
  quantidade_embalagem: number;
  unidade_medida: "g" | "kg" | "ml" | "l" | "un";
  categoria?: string;
  foto_url?: string;
  aprovado_em: string;
  aprovado_por: string;
}

type GovernanceListener = () => void;
const governanceListeners = new Set<GovernanceListener>();

export function subscribeProductGovernanceChanges(listener: GovernanceListener): () => void {
  governanceListeners.add(listener);
  return () => {
    governanceListeners.delete(listener);
  };
}

function notifyGovernanceListeners(): void {
  governanceListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function getApprovedGtinOverrides(): Record<string, ApprovedGtinOverride> {
  try {
    const raw = localStorage.getItem(APPROVED_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveApprovedGtinOverride(override: ApprovedGtinOverride): void {
  try {
    const current = getApprovedGtinOverrides();
    const key = override.gtin.replace(/\D/g, "").trim() || override.nome.toUpperCase().trim();
    current[key] = override;
    localStorage.setItem(APPROVED_OVERRIDES_STORAGE_KEY, JSON.stringify(current));
    notifyGovernanceListeners();
  } catch {
    // ignore
  }
}

export function getProductEditRequests(): SolicitacaoEdicaoProdutoOficial[] {
  try {
    const raw = localStorage.getItem(EDIT_REQUESTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProductEditRequests(requests: SolicitacaoEdicaoProdutoOficial[]): void {
  try {
    localStorage.setItem(EDIT_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    notifyGovernanceListeners();
  } catch {
    // ignore
  }
}

export function getPendingEditRequestForProduct(
  gtin?: string,
  nomeAtual?: string
): SolicitacaoEdicaoProdutoOficial | undefined {
  const requests = getProductEditRequests();
  const cleanGtin = (gtin || "").replace(/\D/g, "").trim();
  const cleanNome = (nomeAtual || "").toUpperCase().trim();

  return requests.find(
    (r) =>
      r.status === "pendente" &&
      ((cleanGtin && r.gtin === cleanGtin) ||
        (!cleanGtin && cleanNome && r.nome_atual.toUpperCase().trim() === cleanNome))
  );
}

export function createProductEditRequest(payload: {
  gtin?: string;
  nome_atual: string;
  marca_atual: string;
  quantidade_embalagem_atual: number;
  unidade_medida_atual: "g" | "kg" | "ml" | "l" | "un";
  fonte_original?: "rsc_sistemas" | "catalogo_local";
  nome_sugerido: string;
  marca_sugerida: string;
  quantidade_embalagem_sugerida: number;
  unidade_medida_sugerida: "g" | "kg" | "ml" | "l" | "un";
  motivo_divergencia: string;
  empresa_id: string;
  empresa_nome: string;
  solicitado_por: string;
}): SolicitacaoEdicaoProdutoOficial {
  const requests = getProductEditRequests();
  const cleanGtin = (payload.gtin || "").replace(/\D/g, "").trim();

  const newRequest: SolicitacaoEdicaoProdutoOficial = {
    id: `req-gtin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    gtin: cleanGtin,
    nome_atual: payload.nome_atual.trim(),
    marca_atual: payload.marca_atual.trim() || "Geral",
    quantidade_embalagem_atual: Number(payload.quantidade_embalagem_atual) || 1,
    unidade_medida_atual: payload.unidade_medida_atual || "g",
    fonte_original: payload.fonte_original || "rsc_sistemas",
    nome_sugerido: payload.nome_sugerido.trim().toUpperCase(),
    marca_sugerida: payload.marca_sugerida.trim(),
    quantidade_embalagem_sugerida: Number(payload.quantidade_embalagem_sugerida) || 1,
    unidade_medida_sugerida: payload.unidade_medida_sugerida || "g",
    motivo_divergencia: payload.motivo_divergencia.trim() || "Dados divergentes da embalagem física",
    empresa_id: payload.empresa_id,
    empresa_nome: payload.empresa_nome,
    solicitado_por: payload.solicitado_por,
    criado_em: new Date().toISOString(),
    status: "pendente",
  };

  saveProductEditRequests([newRequest, ...requests]);
  return newRequest;
}

/**
 * Propaga os dados aprovados pela PereiraLabs para todas as Listas de Compras e Cotações salvas
 */
function propagateApprovedOverrideToLocalData(
  gtin: string,
  nomeAntigo: string,
  override: ApprovedGtinOverride
): void {
  try {
    // 1. Atualizar Listas de Compras
    const shoppingKey = `${BRAND_CONFIG.storagePrefix}_listas_compras_v1`;
    const rawLists = localStorage.getItem(shoppingKey);
    if (rawLists) {
      const lists = JSON.parse(rawLists);
      if (Array.isArray(lists)) {
        let changed = false;
        const updatedLists = lists.map((list: any) => {
          if (!Array.isArray(list.itens)) return list;
          const updatedItens = list.itens.map((it: any) => {
            const matchGtin = gtin && it.gtin && String(it.gtin).replace(/\D/g, "") === gtin;
            const matchNome =
              !gtin &&
              it.insumo_nome &&
              String(it.insumo_nome).toUpperCase().trim() === nomeAntigo.toUpperCase().trim();
            if (matchGtin || matchNome) {
              changed = true;
              return {
                ...it,
                insumo_nome: override.nome,
                marca: override.marca,
                quantidade_embalagem: override.quantidade_embalagem,
                unidade_embalagem: override.unidade_medida,
                unidade_medida: override.unidade_medida,
                dados_oficiais: true,
                fonte_dados: "rsc_sistemas",
              };
            }
            return it;
          });
          return { ...list, itens: updatedItens, updated_at: new Date().toISOString() };
        });
        if (changed) {
          localStorage.setItem(shoppingKey, JSON.stringify(updatedLists));
        }
      }
    }

    // 2. Atualizar Pesquisas de Preços
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("pesquisas")) {
        const rawPesq = localStorage.getItem(key);
        if (!rawPesq) continue;
        const pesquisas = JSON.parse(rawPesq);
        if (!Array.isArray(pesquisas)) continue;
        let pesqChanged = false;
        const updatedPesq = pesquisas.map((p: any) => {
          const matchGtin = gtin && p.gtin && String(p.gtin).replace(/\D/g, "") === gtin;
          const matchNome =
            !gtin &&
            p.insumo_nome &&
            String(p.insumo_nome).toUpperCase().trim() === nomeAntigo.toUpperCase().trim();
          if (matchGtin || matchNome) {
            pesqChanged = true;
            return {
              ...p,
              insumo_nome: override.nome,
              marca: override.marca,
              quantidade_embalagem: override.quantidade_embalagem,
              unidade_medida: override.unidade_medida,
              dados_oficiais: true,
              fonte_dados: "rsc_sistemas",
            };
          }
          return p;
        });
        if (pesqChanged) {
          localStorage.setItem(key, JSON.stringify(updatedPesq));
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Aprovação EXCLUSIVA da PereiraLabs:
 * Atualiza o status da solicitação para "aprovado", grava no catálogo oficial de overrides
 * e atualiza automaticamente listas de compras e cotações vinculadas.
 */
export function approveProductEditRequest(
  requestId: string,
  customData?: {
    nome?: string;
    marca?: string;
    quantidade_embalagem?: number;
    unidade_medida?: "g" | "kg" | "ml" | "l" | "un";
    parecer?: string;
  }
): SolicitacaoEdicaoProdutoOficial | null {
  const requests = getProductEditRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) return null;

  const target = requests[idx];
  const finalNome = (customData?.nome ?? target.nome_sugerido).trim().toUpperCase();
  const finalMarca = (customData?.marca ?? target.marca_sugerida).trim();
  const finalQtd = Number(customData?.quantidade_embalagem ?? target.quantidade_embalagem_sugerida) || 1;
  const finalUnidade = customData?.unidade_medida ?? target.unidade_medida_sugerida;

  const updatedReq: SolicitacaoEdicaoProdutoOficial = {
    ...target,
    nome_sugerido: finalNome,
    marca_sugerida: finalMarca,
    quantidade_embalagem_sugerida: finalQtd,
    unidade_medida_sugerida: finalUnidade,
    status: "aprovado",
    avaliado_em: new Date().toISOString(),
    avaliado_por: "PereiraLabs Master",
    parecer_pereiralabs: customData?.parecer || "Aprovado e atualizado no catálogo oficial PereiraLabs.",
  };

  requests[idx] = updatedReq;

  const override: ApprovedGtinOverride = {
    gtin: target.gtin || finalNome,
    nome: finalNome,
    marca: finalMarca,
    quantidade_embalagem: finalQtd,
    unidade_medida: finalUnidade,
    aprovado_em: updatedReq.avaliado_em!,
    aprovado_por: "PereiraLabs Master",
  };

  saveApprovedGtinOverride(override);
  propagateApprovedOverrideToLocalData(target.gtin, target.nome_atual, override);
  saveProductEditRequests(requests);

  return updatedReq;
}

/**
 * Rejeição EXCLUSIVA da PereiraLabs:
 * Mantém os dados originais da RSC Sistemas / Banco de Dados e registra o motivo.
 */
export function rejectProductEditRequest(
  requestId: string,
  parecer?: string
): SolicitacaoEdicaoProdutoOficial | null {
  const requests = getProductEditRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) return null;

  const updatedReq: SolicitacaoEdicaoProdutoOficial = {
    ...requests[idx],
    status: "rejeitado",
    avaliado_em: new Date().toISOString(),
    avaliado_por: "PereiraLabs Master",
    parecer_pereiralabs: parecer || "Solicitação recusada pela curadoria PereiraLabs. Mantidos os dados oficiais RSC Sistemas.",
  };

  requests[idx] = updatedReq;
  saveProductEditRequests(requests);
  return updatedReq;
}

/**
 * Verifica se um item (da Lista de Compras ou Cotação) possui dados oficiais da RSC Sistemas ou do Banco de Dados Oficial,
 * devendo ter seus campos cadastrais bloqueados para edição direta pelo usuário.
 */
export function isOfficialProductItem(item: {
  gtin?: string;
  insumo_nome?: string;
  dados_oficiais?: boolean;
  fonte_dados?: string;
}): boolean {
  if (item.dados_oficiais === true) return true;
  if (item.dados_oficiais === false) return false;
  if (item.fonte_dados === "rsc_sistemas" || item.fonte_dados === "catalogo_local") return true;
  if (item.fonte_dados === "manual") return false;

  const cleanGtin = (item.gtin || "").replace(/\D/g, "").trim();
  const cleanName = (item.insumo_nome || "").trim().toUpperCase();

  // Se o produto tem código GTIN válido (8 a 14 dígitos) e já foi identificado (não é placeholder genérico)
  if (
    cleanGtin.length >= 8 &&
    cleanName &&
    !cleanName.startsWith("PRODUTO GTIN") &&
    cleanName !== "NOVO INSUMO"
  ) {
    return true;
  }

  if (cleanGtin && (COMMON_GTIN_CATALOG[cleanGtin] || getApprovedGtinOverrides()[cleanGtin])) {
    return true;
  }

  return false;
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
 * Salva o Token de Autenticação da RSC Sistemas com tempo de expiração
 */
export function saveRscGtinToken(token: string, expiresIn: number = 3600): void {
  try {
    const cleaned = token.trim();
    if (cleaned) {
      localStorage.setItem(RSC_TOKEN_STORAGE_KEY, cleaned);
      const expiresAt = Date.now() + Math.max(300, expiresIn - 120) * 1000;
      localStorage.setItem(RSC_TOKEN_EXPIRES_KEY, String(expiresAt));
    } else {
      localStorage.removeItem(RSC_TOKEN_STORAGE_KEY);
      localStorage.removeItem(RSC_TOKEN_EXPIRES_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Retorna um token válido, renovando automaticamente em segundo plano
 * usando as credenciais configuradas se estiver expirado ou ausente.
 */
export async function getValidRscToken(): Promise<string> {
  try {
    const token = localStorage.getItem(RSC_TOKEN_STORAGE_KEY) || "";
    const expiresAtStr = localStorage.getItem(RSC_TOKEN_EXPIRES_KEY);
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

    // Se o token existir e ainda for válido por pelo menos 1 minuto, retorna
    if (token && expiresAt > Date.now()) {
      return token;
    }

    // Se expirou ou não existe, renova automaticamente via API v3
    if (BRAND_CONFIG.rscGtinConfig?.autoAuth && BRAND_CONFIG.rscGtinConfig.defaultPassword) {
      const auth = await loginRscSistemas(
        BRAND_CONFIG.rscGtinConfig.email,
        BRAND_CONFIG.rscGtinConfig.defaultPassword
      );
      if (auth.success && auth.token) {
        return auth.token;
      }
    }

    return token;
  } catch {
    return "";
  }
}

/**
 * Autentica diretamente na API v3 da RSC Sistemas usando e-mail e senha
 * gerando e salvando automaticamente o Bearer Token.
 */
export async function loginRscSistemas(
  email: string,
  senha: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const credentials = btoa(`${email.trim()}:${senha.trim()}`);
    const response = await fetch("https://gtin.rscsistemas.com.br/api/v3/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Usuário ou senha inválidos no RSC Sistemas." };
      }
      return { success: false, error: `Falha ao autenticar na RSC Sistemas (HTTP ${response.status})` };
    }

    const data = await response.json();
    const activeToken = data?.token || data?.access_token;
    if (activeToken) {
      const expiresIn = data?.expires_in || 3600;
      saveRscGtinToken(activeToken, expiresIn);
      return { success: true, token: activeToken };
    }
    return { success: false, error: "Token não retornado pela API RSC Sistemas." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Erro de conexão com a RSC Sistemas: ${msg}` };
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

  // 0. Verificar se existe revisão oficial já aprovada pela PereiraLabs
  const overrides = getApprovedGtinOverrides();
  if (overrides[cleanGtin]) {
    const ov = overrides[cleanGtin];
    return {
      gtin: cleanGtin,
      nome: ov.nome,
      marca: ov.marca,
      quantidade_embalagem: ov.quantidade_embalagem,
      unidade_medida: ov.unidade_medida,
      categoria: ov.categoria || "Catálogo Oficial PereiraLabs",
      foto_url: ov.foto_url || COMMON_GTIN_CATALOG[cleanGtin]?.foto_url || `https://gtin.rscsistemas.com.br/api/gtin/img/${cleanGtin}`,
      fonte: "rsc_sistemas",
    };
  }

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

  // 2. Se houver token da RSC Sistemas configurado, chamar API v3 oficial
  const token = (userToken || (await getValidRscToken())).trim();
  if (token) {
    try {
      const response = await fetch(
        `https://gtin.rscsistemas.com.br/api/v3/gtin/${cleanGtin}`,
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
        const nomeProduto = data?.nome || data?.descricao || data?.nome_acento || "";
        if (nomeProduto) {
          const parsed = parsePackagingFromTitle(nomeProduto);

          // Tenta extrair a marca do nome se vier "Desconhecido" da RSC Sistemas
          let marcaFinal = data.marca && data.marca !== "Desconhecido" ? data.marca : "";
          if (!marcaFinal) {
            const firstWord = nomeProduto.split(" ").find((w: string) => w.length > 2 && !["MIST", "BOLO", "LEITE", "DOCE", "PO", "ZERO"].includes(w.toUpperCase()));
            marcaFinal = firstWord ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase() : "Apti";
          }

          // Se a RCSistemas tiver foto direta no link_foto utiliza, caso contrário busca imagem pública
          let fotoUrl: string | undefined = data.link_foto && !data.link_foto.includes("/image") ? data.link_foto : undefined;

          // Se não veio link de foto da RSC Sistemas, busca imagem real na Open Food Facts
          if (!fotoUrl) {
            try {
              const offCheck = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanGtin}.json`);
              if (offCheck.ok) {
                const offD = await offCheck.json();
                if (offD?.product?.image_front_url || offD?.product?.image_url) {
                  fotoUrl = offD.product.image_front_url || offD.product.image_url;
                }
              }
            } catch {
              // ignore
            }
          }

          return {
            gtin: cleanGtin,
            nome: nomeProduto,
            marca: marcaFinal,
            quantidade_embalagem: parsed.quantidade,
            unidade_medida: parsed.unidade,
            categoria: data.categoria || "Confeitaria / Insumos",
            ncm: data.ncm ? parseInt(String(data.ncm).replace(/\D/g, ""), 10) : undefined,
            foto_url: fotoUrl,
            fonte: "rsc_sistemas",
          };
        }
      } else {
        console.warn(`RSC Sistemas retornou HTTP ${response.status} para GTIN ${cleanGtin}`);
      }
    } catch (err) {
      console.warn("Consulta à API v3 RSC Sistemas falhou:", err);
    }
  }

  // 3. Fallback Aberto e Gratuito: Open Food Facts Brasil (Catálogo Aberto com suporte a EAN-13 Brasileiro)
  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${cleanGtin}.json`,
      {
        headers: { Accept: "application/json" },
      }
    );
    if (offRes.ok) {
      const offData = await offRes.json();
      if (offData && offData.status === 1 && offData.product) {
        const p = offData.product;
        const nomeCompleto = p.product_name_pt || p.product_name || p.generic_name || "";
        if (nomeCompleto) {
          const parsed = parsePackagingFromTitle(`${nomeCompleto} ${p.quantity || ""}`);
          return {
            gtin: cleanGtin,
            nome: nomeCompleto,
            marca: p.brands || "Marca Diversa",
            quantidade_embalagem: parsed.quantidade,
            unidade_medida: parsed.unidade,
            categoria: p.categories || "Alimentos & Insumos",
            foto_url: p.image_url || p.image_front_url || `https://gtin.rscsistemas.com.br/api/gtin/img/${cleanGtin}`,
            fonte: "rsc_sistemas",
          };
        }
      }
    }
  } catch (err) {
    console.warn("Fallback Open Food Facts falhou:", err);
  }

  // Fallback final: se não encontrou em nenhuma base, retorna modelo básico com link da foto padrão
  return {
    gtin: cleanGtin,
    nome: `Produto GTIN ${cleanGtin}`,
    marca: "A Identificar",
    quantidade_embalagem: 1,
    unidade_medida: "un",
    foto_url: undefined,
    fonte: "manual",
  };
}
