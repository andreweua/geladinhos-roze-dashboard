import { BRAND_CONFIG } from "@/config/brand.config";
import { getActiveCompanyId, getActiveCompany } from "@/services/companyService";

export interface AuditoriaEstoqueLog {
  id: string;
  empresa_id?: string;
  timestamp: string;
  admin_responsavel: string;
  tipo_item: "geladinho_pronto" | "materia_prima_insumo";
  item_id: string;
  item_nome: string;
  unidade_medida: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  diferenca: number;
  motivo_ajuste: string;
  observacoes?: string;
  emails_notificados: string[];
  status_envio_email: "enviado" | "simulado_local" | "pendente";
}

export interface MateriaPrimaItem {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_em_estoque: number;
  embalagem_padrao: string;
  custo_por_unidade: number;
}

function getAuditStorageKey(companyId?: string): string {
  const currentId = companyId || getActiveCompanyId();
  if (currentId === "emp-roze-gourmet") {
    return `${BRAND_CONFIG.storagePrefix}_estoque_audit_logs_v1`;
  }
  return `${BRAND_CONFIG.storagePrefix}_estoque_audit_logs_${currentId}_v1`;
}

function getRecipientsStorageKey(companyId?: string): string {
  const currentId = companyId || getActiveCompanyId();
  if (currentId === "emp-roze-gourmet") {
    return `${BRAND_CONFIG.storagePrefix}_audit_email_recipients_v1`;
  }
  return `${BRAND_CONFIG.storagePrefix}_audit_email_recipients_${currentId}_v1`;
}

function getMateriaPrimaStorageKey(companyId?: string): string {
  const currentId = companyId || getActiveCompanyId();
  if (currentId === "emp-roze-gourmet") {
    return `${BRAND_CONFIG.storagePrefix}_materia_prima_estoque_v1`;
  }
  return `${BRAND_CONFIG.storagePrefix}_materia_prima_estoque_${currentId}_v1`;
}

const DEFAULT_EMAILS = [
  "andrew@pereiralabs.com",
  "rozana.miguel@gmail.com",
];

const DEFAULT_MATERIA_PRIMA: MateriaPrimaItem[] = [
  {
    id: "mp-1",
    nome: "Leite Ninho em Pó",
    categoria: "Laticínios & Bases",
    unidade: "g",
    quantidade_em_estoque: 330,
    embalagem_padrao: "Lata 380g",
    custo_por_unidade: 0.044,
  },
  {
    id: "mp-2",
    nome: "Achocolatado Ovomaltine",
    categoria: "Chocolates & Pós",
    unidade: "g",
    quantidade_em_estoque: 540,
    embalagem_padrao: "Pacote 600g",
    custo_por_unidade: 0.029,
  },
  {
    id: "mp-3",
    nome: "Chocolate em Pó 50% Cacau",
    categoria: "Chocolates & Pós",
    unidade: "g",
    quantidade_em_estoque: 960,
    embalagem_padrao: "Barra / Pacote 1,01 kg",
    custo_por_unidade: 0.034,
  },
  {
    id: "mp-4",
    nome: "Nutella Original Ferrero",
    categoria: "Cremes & Recheios",
    unidade: "g",
    quantidade_em_estoque: 120,
    embalagem_padrao: "Pote 140g / 650g",
    custo_por_unidade: 0.061,
  },
  {
    id: "mp-5",
    nome: "Açúcar Refinado União",
    categoria: "Açúcares & Caldas",
    unidade: "g",
    quantidade_em_estoque: 550,
    embalagem_padrao: "Pacote 1 kg",
    custo_por_unidade: 0.005,
  },
  {
    id: "mp-6",
    nome: "Morango Congelado Selecionado",
    categoria: "Frutas & Geleias",
    unidade: "g",
    quantidade_em_estoque: 520,
    embalagem_padrao: "Pacote 1,02 kg",
    custo_por_unidade: 0.021,
  },
  {
    id: "mp-7",
    nome: "Leite Condensado 395g (Estoque Fechado)",
    categoria: "Laticínios & Bases",
    unidade: "un",
    quantidade_em_estoque: 12,
    embalagem_padrao: "Caixa / Lata 395g",
    custo_por_unidade: 6.89,
  },
  {
    id: "mp-8",
    nome: "Creme de Leite 200g (Estoque Fechado)",
    categoria: "Laticínios & Bases",
    unidade: "un",
    quantidade_em_estoque: 16,
    embalagem_padrao: "Caixa TP 200g",
    custo_por_unidade: 2.75,
  },
  {
    id: "mp-9",
    nome: "Saquinhos Transparentes 150ml (6x24cm)",
    categoria: "Embalagens",
    unidade: "un",
    quantidade_em_estoque: 350,
    embalagem_padrao: "Pacote c/ 500 un",
    custo_por_unidade: 0.07,
  },
  {
    id: "mp-10",
    nome: "Adesivos da Marca Personalizados",
    categoria: "Embalagens",
    unidade: "un",
    quantidade_em_estoque: 280,
    embalagem_padrao: "Rolo c/ 500 adesivos",
    custo_por_unidade: 0.12,
  },
];

export function loadAuditRecipients(companyId?: string): string[] {
  const currentId = companyId || getActiveCompanyId();
  try {
    const raw = localStorage.getItem(getRecipientsStorageKey(currentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Erro ao ler destinatários de e-mail de auditoria:", err);
  }
  return currentId === "emp-roze-gourmet" ? DEFAULT_EMAILS : ["andrew@pereiralabs.com"];
}

export function saveAuditRecipients(emails: string[], companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  try {
    const valid = Array.from(
      new Set(
        emails
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes("@") && e.includes("."))
      )
    );
    localStorage.setItem(getRecipientsStorageKey(currentId), JSON.stringify(valid));
  } catch (err) {
    console.warn("Erro ao salvar destinatários:", err);
  }
}

export function loadMateriaPrimaCatalog(companyId?: string): MateriaPrimaItem[] {
  const currentId = companyId || getActiveCompanyId();
  try {
    const raw = localStorage.getItem(getMateriaPrimaStorageKey(currentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Erro ao ler matérias-primas:", err);
  }
  if (currentId === "emp-roze-gourmet") {
    return DEFAULT_MATERIA_PRIMA;
  }
  return [];
}

export function saveMateriaPrimaCatalog(items: MateriaPrimaItem[], companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  try {
    localStorage.setItem(getMateriaPrimaStorageKey(currentId), JSON.stringify(items));
  } catch (err) {
    console.warn("Erro ao salvar matérias-primas:", err);
  }
}

export function updateMateriaPrimaStock(
  itemId: string,
  novaQuantidade: number,
  adminNome: string,
  motivoAjuste: string,
  observacoes?: string,
  companyId?: string
): { item: MateriaPrimaItem; log: AuditoriaEstoqueLog } {
  const currentId = companyId || getActiveCompanyId();
  const catalog = loadMateriaPrimaCatalog(currentId);
  const index = catalog.findIndex((i) => i.id === itemId);
  if (index === -1) {
    throw new Error(`Matéria-prima com ID ${itemId} não encontrada.`);
  }

  const item = catalog[index];
  const anterior = item.quantidade_em_estoque;
  const diferenca = novaQuantidade - anterior;

  item.quantidade_em_estoque = Math.max(0, novaQuantidade);
  catalog[index] = item;
  saveMateriaPrimaCatalog(catalog, currentId);

  const log = addAuditLog(
    {
      admin_responsavel: adminNome,
      tipo_item: "materia_prima_insumo",
      item_id: item.id,
      item_nome: item.nome,
      unidade_medida: item.unidade,
      quantidade_anterior: anterior,
      quantidade_nova: item.quantidade_em_estoque,
      diferenca,
      motivo_ajuste: motivoAjuste,
      observacoes,
    },
    currentId
  );

  return { item, log };
}

export function loadAuditLogs(companyId?: string): AuditoriaEstoqueLog[] {
  const currentId = companyId || getActiveCompanyId();
  try {
    const raw = localStorage.getItem(getAuditStorageKey(currentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (log: AuditoriaEstoqueLog) =>
            !log.empresa_id || log.empresa_id === currentId
        );
      }
    }
  } catch (err) {
    console.warn("Erro ao ler logs de auditoria:", err);
  }
  return [];
}

export function addAuditLog(
  entry: Omit<
    AuditoriaEstoqueLog,
    "id" | "timestamp" | "emails_notificados" | "status_envio_email"
  >,
  companyId?: string
): AuditoriaEstoqueLog {
  const currentId = companyId || getActiveCompanyId();
  const logs = loadAuditLogs(currentId);
  const recipients = loadAuditRecipients(currentId);

  const newLog: AuditoriaEstoqueLog = {
    ...entry,
    empresa_id: currentId,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
    timestamp: new Date().toISOString(),
    emails_notificados: recipients,
    status_envio_email: "enviado",
  };

  const updated = [newLog, ...logs].slice(0, 300); // Guardar até 300 eventos
  try {
    localStorage.setItem(getAuditStorageKey(currentId), JSON.stringify(updated));
  } catch (err) {
    console.warn("Erro ao salvar log de auditoria:", err);
  }

  return newLog;
}

export function generateAuditEmailContent(log: AuditoriaEstoqueLog): {
  subject: string;
  body: string;
  mailtoUrl: string;
} {
  const activeComp = getActiveCompany();
  const deltaStr = log.diferenca > 0 ? `+${log.diferenca}` : `${log.diferenca}`;
  const subject = `[AUDITORIA DE ESTOQUE - ${activeComp.nome.toUpperCase()}] Ajuste de ${log.item_nome} (${deltaStr} ${log.unidade_medida}) por ${log.admin_responsavel}`;

  const body =
    `RELATÓRIO DE AUDITORIA DE ESTOQUE — ${activeComp.nome.toUpperCase()}\n` +
    `------------------------------------------------------------\n` +
    `Data/Hora: ${new Date(log.timestamp).toLocaleString("pt-BR")}\n` +
    `Administrador Responsável: ${log.admin_responsavel}\n` +
    `Tipo de Item: ${log.tipo_item === "geladinho_pronto" ? "Produto Pronto" : "Matéria-Prima / Insumo"}\n` +
    `Item Ajustado: ${log.item_nome}\n` +
    `Estoque Anterior: ${log.quantidade_anterior} ${log.unidade_medida}\n` +
    `Novo Saldo no Freezer/Despensa: ${log.quantidade_nova} ${log.unidade_medida}\n` +
    `Diferença Auditada (Delta): ${deltaStr} ${log.unidade_medida}\n` +
    `Motivo Informado: ${log.motivo_ajuste}\n` +
    (log.observacoes ? `Observações Adicionais: ${log.observacoes}\n` : "") +
    `Destinatários Registrados: ${log.emails_notificados.join(", ")}\n` +
    `------------------------------------------------------------\n` +
    `Desenvolvido por:\n` +
    `PereiraLabs\n` +
    `Divisão de Tecnologia e IA\n` +
    `Louzada & Pereira - Soluções Digitais`;

  const recipientsStr = log.emails_notificados.join(",");
  const mailtoUrl = `mailto:${encodeURIComponent(recipientsStr)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailtoUrl };
}
