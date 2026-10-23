import { BRAND_CONFIG } from "@/config/brand.config";
import { Company, SubscriptionStatus, ThemeColorOption } from "@/types/multiTenant";
import { supabase, checkIsSupabaseConfigured } from "@/lib/supabase";

const COMPANIES_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_companies_master_v1`;
const ACTIVE_COMPANY_KEY = `${BRAND_CONFIG.storagePrefix}_active_company_id_v1`;

const DEFAULT_COMPANIES: Company[] = [
  {
    id: "emp-roze-gourmet",
    nome: "Geladinhos Gourmet da Roze",
    slug: "geladinhos-roze",
    nicho: "Geladinhos Artesanais & Sobremesas Geladas",
    corTema: "rosa",
    chavePix: "14988183327",
    chavePixTipo: "telefone",
    whatsapp: "5514988183327",
    cidade: "Jaú - SP",
    responsavel: "Rozana Helena Miguel",
    adminEmail: "roze@geladinhosdaroze.com.br",
    adminSenha: "admin",
    cashierPin: "1234",
    statusAssinatura: "ativo",
    valorMensalidade: 79.9,
    criadoEm: "2026-10-01T00:00:00.000Z",
    observacoes: "Unidade Matriz - Jaú/SP",
  },
];

export function getLocalCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(COMPANIES_STORAGE_KEY);
    if (!raw) {
      saveLocalCompanies(DEFAULT_COMPANIES);
      return DEFAULT_COMPANIES;
    }
    const parsed: Company[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Garante que a Roze sempre exista
      if (!parsed.some((c) => c.id === "emp-roze-gourmet")) {
        parsed.unshift(DEFAULT_COMPANIES[0]);
        saveLocalCompanies(parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Erro ao ler empresas locais:", err);
  }
  return DEFAULT_COMPANIES;
}

// Sistema reativo de subscrição para mudanças na empresa ativa
type CompanySubscriber = (activeCompany: Company) => void;
const companySubscribers: Set<CompanySubscriber> = new Set();

export function subscribeCompanyChange(callback: CompanySubscriber): () => void {
  companySubscribers.add(callback);
  return () => {
    companySubscribers.delete(callback);
  };
}

export function notifyCompanyChange(): void {
  const active = getActiveCompany();
  companySubscribers.forEach((cb) => {
    try {
      cb(active);
    } catch (err) {
      console.warn("Erro no listener de empresa:", err);
    }
  });
}

export function saveLocalCompanies(companies: Company[]): void {
  try {
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  } catch (err) {
    console.warn("Erro ao salvar empresas locais:", err);
  }
  notifyCompanyChange();
}

export function getActiveCompanyId(): string {
  try {
    return localStorage.getItem(ACTIVE_COMPANY_KEY) || "emp-roze-gourmet";
  } catch {
    return "emp-roze-gourmet";
  }
}

export function setActiveCompanyId(companyId: string): void {
  try {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
  } catch {
    // ignore
  }
  notifyCompanyChange();
}

export function getActiveCompany(): Company {
  const companies = getLocalCompanies();
  const activeId = getActiveCompanyId();
  return companies.find((c) => c.id === activeId) || companies[0] || DEFAULT_COMPANIES[0];
}

/**
 * Cria uma nova empresa no sistema multi-empresa da PereiraLabs
 */
export async function createCompany(
  data: Omit<Company, "id" | "criadoEm">
): Promise<Company> {
  const id = `emp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const newCompany: Company = {
    ...data,
    id,
    criadoEm: nowIso,
  };

  const list = getLocalCompanies();
  list.push(newCompany);
  saveLocalCompanies(list);

  // Sincroniza com Supabase se a tabela empresas existir
  if (checkIsSupabaseConfigured() && supabase) {
    try {
      await supabase.from("empresas").insert({
        id: newCompany.id,
        nome: newCompany.nome,
        slug: newCompany.slug,
        nicho: newCompany.nicho,
        cor_tema: newCompany.corTema,
        chave_pix: newCompany.chavePix,
        chave_pix_tipo: newCompany.chavePixTipo,
        whatsapp: newCompany.whatsapp,
        cidade: newCompany.cidade,
        responsavel: newCompany.responsavel,
        admin_email: newCompany.adminEmail,
        status_assinatura: newCompany.statusAssinatura,
        cortesia_validade_ate: newCompany.cortesiaValidadeAte || null,
        valor_mensalidade: newCompany.valorMensalidade,
        criado_em: nowIso,
      });
    } catch {
      // continua com fallback local
    }
  }

  return newCompany;
}

/**
 * Atualiza dados de uma empresa existente
 */
export function updateCompany(id: string, updates: Partial<Company>): Company | null {
  const list = getLocalCompanies();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const updated: Company = {
    ...list[idx],
    ...updates,
  };
  list[idx] = updated;
  saveLocalCompanies(list);
  return updated;
}

/**
 * Renova ou concede período de cortesia (degustação) com limite de tempo
 */
export function renewCourtesy(companyId: string, additionalDays = 15): Company | null {
  const company = getLocalCompanies().find((c) => c.id === companyId);
  if (!company) return null;

  const baseDate =
    company.cortesiaValidadeAte && new Date(company.cortesiaValidadeAte).getTime() > Date.now()
      ? new Date(company.cortesiaValidadeAte)
      : new Date();

  baseDate.setDate(baseDate.getDate() + additionalDays);
  baseDate.setHours(23, 59, 59, 999);

  return updateCompany(companyId, {
    statusAssinatura: "cortesia",
    cortesiaValidadeAte: baseDate.toISOString(),
  });
}

/**
 * Altera status da mensalidade (ativo, bloqueado, cortesia)
 */
export function setSubscriptionStatus(
  companyId: string,
  status: SubscriptionStatus,
  cortesiaDias = 7
): Company | null {
  if (status === "cortesia") {
    return renewCourtesy(companyId, cortesiaDias);
  }
  return updateCompany(companyId, {
    statusAssinatura: status,
  });
}

/**
 * Valida se a empresa tem permissão para usar o sistema no momento
 */
export function checkSubscriptionAccess(company: Company): {
  allowed: boolean;
  daysRemaining?: number;
  reason?: string;
} {
  if (company.statusAssinatura === "bloqueado") {
    return {
      allowed: false,
      reason:
        "O acesso da sua empresa está temporariamente suspenso. Entre em contato com a PereiraLabs para regularizar sua assinatura.",
    };
  }

  if (company.statusAssinatura === "cortesia") {
    if (!company.cortesiaValidadeAte) {
      return { allowed: true, daysRemaining: 7 };
    }
    const expireTime = new Date(company.cortesiaValidadeAte).getTime();
    const now = Date.now();
    const diffMs = expireTime - now;

    if (diffMs <= 0) {
      return {
        allowed: false,
        daysRemaining: 0,
        reason:
          "Seu período de cortesia / degustação terminou. Para continuar utilizando o sistema e manter seus registros seguros, fale com a PereiraLabs e ative seu plano mensal.",
      };
    }

    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { allowed: true, daysRemaining };
  }

  return { allowed: true };
}

/**
 * Gera senha única aleatória e amigável para novos lojistas
 */
export function generateRandomPassword(prefix = "Mel"): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}@${randomNum}`;
}

/**
 * Redefine senha do lojista e devolve os dados para envio
 */
export function resetCompanyPassword(companyId: string, newPass?: string): {
  company: Company | null;
  newPassword: string;
} {
  const pass = newPass?.trim() || generateRandomPassword("Doce");
  const updated = updateCompany(companyId, { adminSenha: pass });
  return { company: updated, newPassword: pass };
}

/**
 * Gera o Link Mágico de 1 Clique e a mensagem pronta para enviar no WhatsApp da cliente
 */
export function buildMagicWhatsAppMessage(company: Company): string {
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "https://andreweua.github.io/geladinhos-roze-dashboard/";

  // Codifica credenciais seguras para abertura com 1 toque
  const payload = {
    empresaId: company.id,
    empresaNome: company.nome,
    email: company.adminEmail,
    token: btoa(`${company.id}:${company.adminSenha}`),
  };
  const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
  const magicLink = `${currentOrigin}?magic_auth=${encoded}`;

  const statusText =
    company.statusAssinatura === "cortesia"
      ? `🎁 Período de Cortesia Grátis liberado até: ${
          company.cortesiaValidadeAte
            ? new Date(company.cortesiaValidadeAte).toLocaleDateString("pt-BR")
            : "7 dias"
        }`
      : "⭐ Plano Mensal Ativo";

  return `🎉 *Olá, ${company.responsavel || company.nome}!*

Seu sistema de gestão comercial e frente de caixa está pronto e liberado pela *PereiraLabs*!

🏪 *Empresa:* ${company.nome}
${statusText}

🔑 *SEUS DADOS DE ACESSO:*
📧 *E-mail:* ${company.adminEmail}
🔒 *Senha Inicial:* ${company.adminSenha}
🔢 *PIN do Caixa:* ${company.cashierPin || "1234"}

✨ *ACESSO RÁPIDO EM 1 TOQUE (Sem precisar digitar):*
Basta tocar no link abaixo no seu celular para entrar direto no seu sistema:
${magicLink}

Ao abrir no celular, toque nos 3 pontinhos do navegador e selecione *"Instalar Aplicativo"* para ter o ícone do sistema na sua tela inicial!

Qualquer dúvida ou suporte, estamos à disposição!
_Desenvolvido por PereiraLabs - Divisão de Tecnologia e IA_
_Louzada & Pereira - Soluções Digitais_`;
}
