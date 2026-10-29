import { BRAND_CONFIG } from "@/config/brand.config";
import {
  ConsultingActivityLog,
  ConsultingDiagnosticNote,
  ConsultingRequest,
  ConsultorAutorizado,
} from "@/types/consulting";
import { UserProfile } from "@/types/auth";
import { isPereiraLabsMaster } from "@/services/companyService";

const CONSULTING_LOGS_KEY = `${BRAND_CONFIG.storagePrefix}_consulting_activity_logs_v1`;
const CONSULTING_REQUESTS_KEY = `${BRAND_CONFIG.storagePrefix}_consulting_requests_v1`;
const CONSULTING_DIAGNOSTICS_KEY = `${BRAND_CONFIG.storagePrefix}_consulting_diagnostics_v1`;
const AUTHORIZED_CONSULTANTS_KEY = `${BRAND_CONFIG.storagePrefix}_authorized_consultants_v1`;

const DEFAULT_CONSULTANTS: ConsultorAutorizado[] = [
  {
    id: "consultor-pereiralabs-oficial",
    empresaId: "*", // Acesso global
    nome: "Consultoria Estratégica PereiraLabs",
    email: "consultoria@pereiralabs.com",
    telefone: "14988183327",
    especialidade: "Engenharia de Cardápio, Custos & Aceleração Comercial",
    tipo: "oficial_pereiralabs",
    statusAprovacao: "aprovado",
    dataCadastro: "2026-01-01T00:00:00.000Z",
    aprovadoPor: "PereiraLabs Master",
    aprovadoEm: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "consultor-pereiralabs-andrew",
    empresaId: "*",
    nome: "Andrew Pereira",
    email: "andrew@pereiralabs.com",
    telefone: "14988183327",
    especialidade: "Inteligência Artificial, Precificação & Sistemas",
    tipo: "oficial_pereiralabs",
    statusAprovacao: "aprovado",
    dataCadastro: "2026-01-01T00:00:00.000Z",
    aprovadoPor: "PereiraLabs Master",
    aprovadoEm: "2026-01-01T00:00:00.000Z",
  },
];

const DEFAULT_DIAGNOSTICS: ConsultingDiagnosticNote[] = [
  {
    id: "diag-init-1",
    empresaId: "emp-roze-gourmet",
    consultorNome: "Equipe PereiraLabs IA",
    titulo: "Diagnóstico Preliminar: Engenharia de Cardápio & Margem iFood",
    parecerTecnico:
      "A análise das receitas de 150ml identificou que os sabores com recheios nobres (ex: Ninho c/ Nutella) possuem excelente aceitação no balcão, porém a taxa do iFood de 26,2% pode comprimir o lucro se o preço de delivery não for ajustado com a fórmula de repasse integral.",
    planoDeAcao: [
      "Aplicar a fórmula de repasse líquido automático em todos os sabores no iFood.",
      "Padronizar a aplicação de recheio no saquinho em 15g a 20g para evitar desperdício de insumos.",
      "Realizar cotações semanais de leite condensado e creme de leite no atacado para travar o lote com menor CMV.",
    ],
    dataEmissao: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export function getConsultingLogs(empresaId?: string): ConsultingActivityLog[] {
  try {
    const raw = localStorage.getItem(CONSULTING_LOGS_KEY);
    const list: ConsultingActivityLog[] = raw ? JSON.parse(raw) : [];
    if (!empresaId) return list;
    return list.filter((l) => l.empresaId === empresaId);
  } catch {
    return [];
  }
}

export function logConsultingActivity(
  log: Omit<ConsultingActivityLog, "id" | "dataHora">
): void {
  try {
    const list = getConsultingLogs();
    const newEntry: ConsultingActivityLog = {
      ...log,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      dataHora: new Date().toISOString(),
    };
    // Mantém os últimos 150 registros
    const updated = [newEntry, ...list].slice(0, 150);
    localStorage.setItem(CONSULTING_LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Erro ao registrar log de atividade de consultoria:", err);
  }
}

export function getConsultingRequests(empresaId?: string): ConsultingRequest[] {
  try {
    const raw = localStorage.getItem(CONSULTING_REQUESTS_KEY);
    const list: ConsultingRequest[] = raw ? JSON.parse(raw) : [];
    if (!empresaId) return list;
    return list.filter((r) => r.empresaId === empresaId);
  } catch {
    return [];
  }
}

export function submitConsultingRequest(
  data: Omit<ConsultingRequest, "id" | "dataSolicitacao" | "status">
): ConsultingRequest {
  const list = getConsultingRequests();
  const newRequest: ConsultingRequest = {
    ...data,
    id: `req-${Date.now()}`,
    dataSolicitacao: new Date().toISOString(),
    status: "solicitada",
  };
  const updated = [newRequest, ...list];
  try {
    localStorage.setItem(CONSULTING_REQUESTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Erro ao salvar solicitação de consultoria:", err);
  }
  return newRequest;
}

export function getConsultingDiagnostics(empresaId: string): ConsultingDiagnosticNote[] {
  try {
    const raw = localStorage.getItem(CONSULTING_DIAGNOSTICS_KEY);
    let list: ConsultingDiagnosticNote[] = raw ? JSON.parse(raw) : [];
    if (list.length === 0) {
      list = DEFAULT_DIAGNOSTICS;
      localStorage.setItem(CONSULTING_DIAGNOSTICS_KEY, JSON.stringify(list));
    }
    return list.filter((d) => d.empresaId === empresaId);
  } catch {
    return DEFAULT_DIAGNOSTICS;
  }
}

export function addConsultingDiagnostic(
  note: Omit<ConsultingDiagnosticNote, "id" | "dataEmissao">
): ConsultingDiagnosticNote {
  try {
    const raw = localStorage.getItem(CONSULTING_DIAGNOSTICS_KEY);
    const list: ConsultingDiagnosticNote[] = raw ? JSON.parse(raw) : DEFAULT_DIAGNOSTICS;
    const newNote: ConsultingDiagnosticNote = {
      ...note,
      id: `diag-${Date.now()}`,
      dataEmissao: new Date().toISOString(),
    };
    const updated = [newNote, ...list];
    localStorage.setItem(CONSULTING_DIAGNOSTICS_KEY, JSON.stringify(updated));
    return newNote;
  } catch {
    const fallback: ConsultingDiagnosticNote = {
      ...note,
      id: `diag-${Date.now()}`,
      dataEmissao: new Date().toISOString(),
    };
    return fallback;
  }
}

/**
 * Retorna todos os consultores autorizados (oficiais PereiraLabs e externos aprovados ou pendentes)
 */
export function getAuthorizedConsultants(empresaId?: string): ConsultorAutorizado[] {
  try {
    const raw = localStorage.getItem(AUTHORIZED_CONSULTANTS_KEY);
    let list: ConsultorAutorizado[] = raw ? JSON.parse(raw) : [];
    if (list.length === 0) {
      list = DEFAULT_CONSULTANTS;
      localStorage.setItem(AUTHORIZED_CONSULTANTS_KEY, JSON.stringify(list));
    }
    if (!empresaId) return list;
    return list.filter((c) => c.empresaId === "*" || c.empresaId === empresaId);
  } catch {
    return DEFAULT_CONSULTANTS;
  }
}

/**
 * Solicitação de cadastro de Consultor Externo pelo Administrador da Loja
 * O consultor é salvo com status 'pendente_aprovacao' até aprovação expressa da PereiraLabs
 */
export function registerExternalConsultant(data: {
  empresaId: string;
  nome: string;
  email: string;
  telefone?: string;
  especialidade: string;
  solicitadoPor: string;
  observacoes?: string;
}): ConsultorAutorizado {
  const currentList = getAuthorizedConsultants();
  const cleanEmail = data.email.trim().toLowerCase();

  const newConsultant: ConsultorAutorizado = {
    id: `consultor-ext-${Date.now()}`,
    empresaId: data.empresaId,
    nome: data.nome.trim(),
    email: cleanEmail,
    telefone: data.telefone?.replace(/\D/g, ""),
    especialidade: data.especialidade.trim(),
    tipo: "externo_cadastrado",
    statusAprovacao: "pendente_aprovacao",
    dataCadastro: new Date().toISOString(),
    solicitadoPor: data.solicitadoPor,
    observacoes: data.observacoes,
  };

  const updated = [newConsultant, ...currentList.filter((c) => c.email !== cleanEmail)];
  localStorage.setItem(AUTHORIZED_CONSULTANTS_KEY, JSON.stringify(updated));
  return newConsultant;
}

/**
 * Atualiza o status de aprovação de um consultor (Exclusivo PereiraLabs Master)
 */
export function updateConsultantApprovalStatus(
  id: string,
  status: "aprovado" | "rejeitado",
  aprovadorNome: string = "PereiraLabs Master"
): void {
  const currentList = getAuthorizedConsultants();
  const updated = currentList.map((c) => {
    if (c.id === id) {
      return {
        ...c,
        statusAprovacao: status,
        aprovadoPor: status === "aprovado" ? aprovadorNome : undefined,
        aprovadoEm: status === "aprovado" ? new Date().toISOString() : undefined,
      };
    }
    return c;
  });
  localStorage.setItem(AUTHORIZED_CONSULTANTS_KEY, JSON.stringify(updated));
}

/**
 * Valida com rigor estrito se o usuário atual tem permissão para redigir pareceres na Consultoria
 * Regra: Somente consultor oficial PereiraLabs OU consultor externo com aprovação confirmada pela PereiraLabs
 */
export function checkUserConsultingPermission(
  currentUser: UserProfile | null,
  empresaId?: string
): {
  canWrite: boolean;
  isPereiraLabsOficial: boolean;
  status: "autorizado_oficial" | "autorizado_externo" | "pendente_aprovacao" | "rejeitado" | "bloqueado";
  mensagem: string;
  consultantRecord?: ConsultorAutorizado;
} {
  if (!currentUser) {
    return {
      canWrite: false,
      isPereiraLabsOficial: false,
      status: "bloqueado",
      mensagem: "Faça login com uma conta autorizada para acessar a consultoria.",
    };
  }

  const userEmail = (currentUser.email || "").trim().toLowerCase();

  // 1. É Administrador Master da PereiraLabs?
  if (isPereiraLabsMaster(currentUser)) {
    return {
      canWrite: true,
      isPereiraLabsOficial: true,
      status: "autorizado_oficial",
      mensagem: "Consultor Oficial Master PereiraLabs.",
    };
  }

  // 2. Possui role nativo de consultoria e email PereiraLabs?
  if (currentUser.role === "consultoria" && userEmail.endsWith("@pereiralabs.com")) {
    return {
      canWrite: true,
      isPereiraLabsOficial: true,
      status: "autorizado_oficial",
      mensagem: "Consultor Credenciado Oficial PereiraLabs.",
    };
  }

  // 3. Verifica na lista de consultores autorizados
  const allConsultants = getAuthorizedConsultants(empresaId);
  const found = allConsultants.find((c) => c.email.toLowerCase() === userEmail);

  if (found) {
    if (found.tipo === "oficial_pereiralabs" || found.statusAprovacao === "aprovado") {
      return {
        canWrite: true,
        isPereiraLabsOficial: found.tipo === "oficial_pereiralabs",
        status: found.tipo === "oficial_pereiralabs" ? "autorizado_oficial" : "autorizado_externo",
        mensagem: `Consultor ${found.tipo === "oficial_pereiralabs" ? "Oficial PereiraLabs" : "Externo Credenciado & Aprovado pela PereiraLabs"}.`,
        consultantRecord: found,
      };
    }

    if (found.statusAprovacao === "pendente_aprovacao") {
      return {
        canWrite: false,
        isPereiraLabsOficial: false,
        status: "pendente_aprovacao",
        mensagem: "Cadastro de consultor externo aguardando homologação e aprovação da PereiraLabs.",
        consultantRecord: found,
      };
    }

    return {
      canWrite: false,
      isPereiraLabsOficial: false,
      status: "rejeitado",
      mensagem: "Cadastro de consultor não homologado pela PereiraLabs.",
      consultantRecord: found,
    };
  }

  // 4. Se for admin de loja mas NÃO cadastrado/aprovado como consultor
  return {
    canWrite: false,
    isPereiraLabsOficial: false,
    status: "bloqueado",
    mensagem: "Apenas consultores cadastrados da PereiraLabs ou consultores externos aprovados pela PereiraLabs podem emitir pareceres técnicos.",
  };
}
