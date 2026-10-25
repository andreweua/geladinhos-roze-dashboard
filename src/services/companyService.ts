import { BRAND_CONFIG } from "@/config/brand.config";
import { Company, CompanyLifecycleStatus, SubscriptionStatus, ThemeColorOption } from "@/types/multiTenant";
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
      await supabase.from("empresas").upsert({
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
        admin_senha: newCompany.adminSenha,
        cashier_pin: newCompany.cashierPin || "1234",
        status_assinatura: newCompany.statusAssinatura,
        status_lifecycle: newCompany.statusLifecycle || "ativa",
        cortesia_validade_ate: newCompany.cortesiaValidadeAte || null,
        valor_mensalidade: newCompany.valorMensalidade,
        observacoes: newCompany.observacoes || "",
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

  // Sincroniza atualização com Supabase se disponível
  if (checkIsSupabaseConfigured() && supabase) {
    supabase
      .from("empresas")
      .upsert({
        id: updated.id,
        nome: updated.nome,
        slug: updated.slug,
        nicho: updated.nicho,
        cor_tema: updated.corTema,
        chave_pix: updated.chavePix,
        chave_pix_tipo: updated.chavePixTipo,
        whatsapp: updated.whatsapp,
        cidade: updated.cidade,
        responsavel: updated.responsavel,
        admin_email: updated.adminEmail,
        admin_senha: updated.adminSenha,
        cashier_pin: updated.cashierPin || "1234",
        status_assinatura: updated.statusAssinatura,
        status_lifecycle: updated.statusLifecycle || "ativa",
        cortesia_validade_ate: updated.cortesiaValidadeAte || null,
        valor_mensalidade: updated.valorMensalidade,
        observacoes: updated.observacoes || "",
        criado_em: updated.criadoEm,
      })
      .then(
        ({ error }) => {
          if (error) console.warn("Aviso ao sincronizar empresa no Supabase:", error.message);
        },
        (err: unknown) => {
          console.warn("Falha de rede ao sincronizar empresa:", err);
        }
      );
  }

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
 * Determina o status de ciclo de vida da empresa: "ativa" | "suspensa" | "excluida"
 */
export function getCompanyLifecycleStatus(company: Company): CompanyLifecycleStatus {
  if (company.statusLifecycle === "excluida") {
    return "excluida";
  }
  if (company.statusAssinatura === "bloqueado" || company.statusLifecycle === "suspensa") {
    return "suspensa";
  }
  if (company.statusAssinatura === "cortesia" && company.cortesiaValidadeAte) {
    const expired = new Date(company.cortesiaValidadeAte).getTime() <= Date.now();
    if (expired) return "suspensa";
  }
  return "ativa";
}

/**
 * Exclui uma empresa (soft delete para a aba de excluídas, ou permanente se solicitado)
 */
export function deleteCompany(companyId: string, permanent = false): boolean {
  const list = getLocalCompanies();
  const idx = list.findIndex((c) => c.id === companyId);
  if (idx === -1) return false;

  if (permanent) {
    list.splice(idx, 1);
    saveLocalCompanies(list);
    return true;
  }

  // Soft delete: marca como excluida
  list[idx] = {
    ...list[idx],
    statusLifecycle: "excluida",
  };
  saveLocalCompanies(list);
  return true;
}

/**
 * Restaura uma empresa que estava na lixeira/aba excluídas
 */
export function restoreCompany(companyId: string): Company | null {
  return updateCompany(companyId, {
    statusLifecycle: "ativa",
    statusAssinatura: "ativo",
  });
}

/**
 * Suspende / Bloqueia o acesso de uma empresa
 */
export function suspendCompany(companyId: string): Company | null {
  return updateCompany(companyId, {
    statusLifecycle: "suspensa",
    statusAssinatura: "bloqueado",
  });
}

/**
 * Reativa o acesso de uma empresa suspensa
 */
export function activateCompany(companyId: string): Company | null {
  return updateCompany(companyId, {
    statusLifecycle: "ativa",
    statusAssinatura: "ativo",
  });
}

/**
 * Verifica se um usuário possui credenciais Master PereiraLabs
 */
export function isPereiraLabsMaster(user: { email?: string; id?: string } | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  return (
    email === "andreweua@gmail.com" ||
    email === "admin@pereiralabs.com.br" ||
    email === "comercial@pereiralabs.com.br" ||
    email.endsWith("@pereiralabs.com.br") ||
    user.id === "usr-super-admin-andrew"
  );
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
 * Gera o Link Mágico de 1 Clique e a mensagem pronta para enviar no WhatsApp da cliente.
 * Inclui os dados completos da empresa para auto-instalação imediata no celular/PWA do cliente.
 */
export function buildMagicWhatsAppMessage(company: Company): string {
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "https://andreweua.github.io/geladinhos-roze-dashboard/";

  // Codifica credenciais seguras E o objeto completo da empresa para auto-instalação instantânea
  const payload = {
    empresaId: company.id,
    empresaNome: company.nome,
    email: company.adminEmail,
    token: btoa(`${company.id}:${company.adminSenha}`),
    company: company,
  };
  const jsonStr = JSON.stringify(payload);
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
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

/**
 * Sincronização Bidirecional entre o Portfólio Local e a Nuvem Supabase
 * Traz as empresas cadastradas em outros aparelhos e envia empresas locais pendentes.
 */
export async function syncCompaniesWithSupabase(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  if (!checkIsSupabaseConfigured() || !supabase) {
    return { success: false, count: 0, error: "Supabase não conectado" };
  }

  try {
    const { data, error } = await supabase.from("empresas").select("*");
    if (error) {
      console.warn("Aviso ao buscar empresas no Supabase:", error.message);
      return { success: false, count: 0, error: error.message };
    }

    const local = getLocalCompanies();
    const updatedList = [...local];
    let changed = false;

    if (Array.isArray(data) && data.length > 0) {
      data.forEach((row: any) => {
        const remoteComp: Company = {
          id: row.id,
          nome: row.nome,
          slug: row.slug || row.id,
          nicho: row.nicho || "Confeitaria & Alimentos",
          corTema: (row.cor_tema as ThemeColorOption) || "dourado",
          chavePix: row.chave_pix || "",
          chavePixTipo: row.chave_pix_tipo || "telefone",
          whatsapp: row.whatsapp || "",
          cidade: row.cidade || "",
          responsavel: row.responsavel || "",
          adminEmail: row.admin_email || "",
          adminSenha: row.admin_senha || "Mel@2026",
          cashierPin: row.cashier_pin || "1234",
          statusAssinatura: (row.status_assinatura as SubscriptionStatus) || "ativo",
          statusLifecycle: (row.status_lifecycle as CompanyLifecycleStatus) || "ativa",
          cortesiaValidadeAte: row.cortesia_validade_ate || undefined,
          valorMensalidade: Number(row.valor_mensalidade) || 79.9,
          criadoEm: row.criado_em || new Date().toISOString(),
          observacoes: row.observacoes || "",
        };

        const existingIdx = updatedList.findIndex((c) => c.id === remoteComp.id);
        if (existingIdx >= 0) {
          // Atualiza dados caso o servidor tenha novidades
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            ...remoteComp,
          };
          changed = true;
        } else {
          updatedList.push(remoteComp);
          changed = true;
        }
      });
    }

    // Envia para o Supabase empresas criadas localmente que ainda não estão lá
    const remoteIds = new Set((data || []).map((r: any) => r.id));
    const toPush = local.filter((c) => !remoteIds.has(c.id));
    if (toPush.length > 0) {
      for (const comp of toPush) {
        await supabase.from("empresas").upsert({
          id: comp.id,
          nome: comp.nome,
          slug: comp.slug,
          nicho: comp.nicho,
          cor_tema: comp.corTema,
          chave_pix: comp.chavePix,
          chave_pix_tipo: comp.chavePixTipo,
          whatsapp: comp.whatsapp,
          cidade: comp.cidade,
          responsavel: comp.responsavel,
          admin_email: comp.adminEmail,
          admin_senha: comp.adminSenha,
          cashier_pin: comp.cashierPin || "1234",
          status_assinatura: comp.statusAssinatura,
          status_lifecycle: comp.statusLifecycle || "ativa",
          cortesia_validade_ate: comp.cortesiaValidadeAte || null,
          valor_mensalidade: comp.valorMensalidade,
          observacoes: comp.observacoes || "",
          criado_em: comp.criadoEm,
        });
      }
    }

    if (changed) {
      saveLocalCompanies(updatedList);
    }

    return { success: true, count: updatedList.length };
  } catch (err: any) {
    console.warn("Falha na sincronização remota de empresas:", err);
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

/**
 * Exporta o portfólio completo de empresas como string Base64 compacta
 * para transferência rápida entre aparelhos via QR Code ou link
 */
export function exportPortfolioAsBase64(): string {
  const list = getLocalCompanies();
  const jsonStr = JSON.stringify(list);
  return btoa(unescape(encodeURIComponent(jsonStr)));
}

/**
 * Importa e mescla empresas recebidas de outro aparelho via QR Code, link ou JSON
 */
export function importPortfolioFromPayload(raw: string): {
  success: boolean;
  count: number;
  error?: string;
} {
  try {
    let jsonStr = raw.trim();
    if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
      jsonStr = decodeURIComponent(escape(atob(jsonStr)));
    }
    const parsed = JSON.parse(jsonStr);
    const incoming: Company[] = Array.isArray(parsed)
      ? parsed
      : parsed.companies || [parsed];

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return { success: false, count: 0, error: "Formato de dados de portfólio inválido" };
    }

    const current = getLocalCompanies();
    const merged = [...current];
    let newItemsCount = 0;

    for (const inc of incoming) {
      if (!inc.id || !inc.nome) continue;
      const idx = merged.findIndex((c) => c.id === inc.id);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...inc };
      } else {
        merged.push(inc);
        newItemsCount++;
      }
    }

    saveLocalCompanies(merged);
    return { success: true, count: merged.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || "Erro ao decodificar dados do portfólio" };
  }
}
