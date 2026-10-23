import { BRAND_CONFIG } from "@/config/brand.config";
import {
  ConsultingActivityLog,
  ConsultingDiagnosticNote,
  ConsultingRequest,
} from "@/types/consulting";

const CONSULTING_LOGS_KEY = `${BRAND_CONFIG.storagePrefix}_consulting_activity_logs_v1`;
const CONSULTING_REQUESTS_KEY = `${BRAND_CONFIG.storagePrefix}_consulting_requests_v1`;
const CONSULTING_DIAGNOSTICS_KEY = `${BRAND_CONFIG.storagePrefix}_consulting_diagnostics_v1`;

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
