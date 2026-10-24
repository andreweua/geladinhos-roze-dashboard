import { BRAND_CONFIG } from "@/config/brand.config";
import {
  Plano,
  EmpresaFaturamento,
  TransacaoHistorico,
  CalculoProRataResultado,
  ResumoFaturamentoConsolidado,
} from "@/types/billing";
import { getLocalCompanies } from "@/services/companyService";

const BILLING_PLANS_KEY = `${BRAND_CONFIG.storagePrefix}_billing_plans_v1`;
const BILLING_COMPANIES_KEY = `${BRAND_CONFIG.storagePrefix}_billing_companies_v1`;
const BILLING_TRANSACTIONS_KEY = `${BRAND_CONFIG.storagePrefix}_billing_transactions_v1`;

/**
 * Planos padrão do sistema PereiraLabs SaaS
 */
export const DEFAULT_PLANOS: Plano[] = [
  {
    id: "plano-essencial",
    nome: "Plano Essencial",
    valorMensal: 59.9,
    descricao: "Controle de PDV, catálogo de receitas e vendas no balcão",
    limiteUsuarios: 1,
  },
  {
    id: "plano-pro",
    nome: "Plano Pro Confeitaria",
    valorMensal: 89.9,
    descricao: "Completo: PDV, Scanner GTIN, Comparador de Preços e WhatsApp",
    destaque: true,
    limiteUsuarios: 3,
  },
  {
    id: "plano-enterprise",
    nome: "Plano Enterprise / Franquia",
    valorMensal: 149.9,
    descricao: "Múltiplos terminais, controle avançado de estoque e suporte prioritário",
    limiteUsuarios: 10,
  },
];

/**
 * 1. REGRA DE NEGÓCIO: Cálculo Pró-Rata
 * Calcula o valor proporcional da mensalidade com base nos dias restantes até o primeiro vencimento.
 *
 * @param dataInicio Data de início da vigência/ativação (ISO string, "YYYY-MM-DD" ou Date)
 * @param dataVencimento Data do primeiro vencimento escolhido (ISO string, "YYYY-MM-DD" ou Date)
 * @param valorPlano Valor cheio mensal da mensalidade/plano
 * @param baseDias Base de cálculo dos dias comerciais (padrão: 30 dias)
 */
export function calcularProRata(
  dataInicio: string | Date,
  dataVencimento: string | Date,
  valorPlano: number,
  baseDias: number = 30
): CalculoProRataResultado {
  const inicio = new Date(dataInicio);
  const vencimento = new Date(dataVencimento);

  // Normaliza zerando o horário para contagem pura de dias civis
  inicio.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);

  const diffTime = vencimento.getTime() - inicio.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Se a data de vencimento for no mesmo dia ou anterior, considera 0 ou mínimo
  const diasRestantes = Math.max(0, diffDays);
  const valorDiario = valorPlano > 0 && baseDias > 0 ? valorPlano / baseDias : 0;
  const valorProRata = Number((valorDiario * diasRestantes).toFixed(2));

  return {
    valorProRata,
    diasRestantes,
    valorDiario: Number(valorDiario.toFixed(4)),
    dataInicioFormatada: inicio.toLocaleDateString("pt-BR"),
    dataVencimentoFormatada: vencimento.toLocaleDateString("pt-BR"),
  };
}

/**
 * 2. REGRA DE NEGÓCIO: Faturamento Consolidado Dinâmico
 * Filtra as empresas ativas, verifica se possuem valor customizado (exceção);
 * caso não possuam, aplica o valor do plano vinculado e retorna o somatório total.
 *
 * @param empresas Lista de empresas
 * @param planos Lista de planos cadastrados
 */
export function calcularFaturamentoConsolidado(
  empresas: EmpresaFaturamento[],
  planos: Plano[]
): number {
  if (!empresas || empresas.length === 0) return 0;

  // Cria um mapa rápido de planos por ID para acesso O(1)
  const planoMap = new Map<string, Plano>();
  planos.forEach((p) => planoMap.set(p.id, p));

  // Filtra apenas empresas ATIVAS
  const empresasAtivas = empresas.filter((emp) => emp.status === "ativa");

  const total = empresasAtivas.reduce((acumulador, emp) => {
    // 1. Prioridade: Valor customizado (se informado e for maior que 0)
    if (
      emp.valorCustomizado !== undefined &&
      emp.valorCustomizado !== null &&
      emp.valorCustomizado > 0
    ) {
      return acumulador + Number(emp.valorCustomizado);
    }

    // 2. Regra Geral: Valor do Plano vinculado
    const planoVinculado = planoMap.get(emp.planoId);
    if (planoVinculado) {
      return acumulador + Number(planoVinculado.valorMensal);
    }

    // 3. Fallback: se o plano vinculado não for achado, usa o plano padrão ou 0
    const fallbackPlano = planos[0];
    return acumulador + (fallbackPlano ? Number(fallbackPlano.valorMensal) : 0);
  }, 0);

  return Number(total.toFixed(2));
}

/**
 * Retorna o valor efetivo da mensalidade de uma empresa específica
 */
export function obterValorMensalidadeEfetiva(
  empresa: EmpresaFaturamento,
  planos: Plano[]
): {
  valor: number;
  isCustomizado: boolean;
  planoNome: string;
} {
  const plano = planos.find((p) => p.id === empresa.planoId) || planos[0];
  const planoNome = plano?.nome || "Plano Desconhecido";

  if (
    empresa.valorCustomizado !== undefined &&
    empresa.valorCustomizado !== null &&
    empresa.valorCustomizado > 0
  ) {
    return {
      valor: Number(empresa.valorCustomizado),
      isCustomizado: true,
      planoNome,
    };
  }

  return {
    valor: Number(plano?.valorMensal || 0),
    isCustomizado: false,
    planoNome,
  };
}

/**
 * Lê os planos cadastrados do LocalStorage ou inicializa com os padrões
 */
export function getPlanos(): Plano[] {
  try {
    const raw = localStorage.getItem(BILLING_PLANS_KEY);
    if (!raw) {
      savePlanos(DEFAULT_PLANOS);
      return DEFAULT_PLANOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn("Erro ao ler planos locais:", err);
  }
  return DEFAULT_PLANOS;
}

/**
 * Salva planos no LocalStorage (reajustes se refletem em cascata)
 */
export function savePlanos(planos: Plano[]): void {
  try {
    localStorage.setItem(BILLING_PLANS_KEY, JSON.stringify(planos));
  } catch (err) {
    console.error("Erro ao salvar planos:", err);
  }
}

/**
 * Atualiza o valor mensal de um plano específico (reajuste global)
 */
export function atualizarValorPlano(planoId: string, novoValorMensal: number): Plano[] {
  const planos = getPlanos();
  const updated = planos.map((p) =>
    p.id === planoId ? { ...p, valorMensal: Math.max(0, Number(novoValorMensal)) } : p
  );
  savePlanos(updated);
  return updated;
}

/**
 * Sincroniza e obtém as empresas para o módulo de faturamento
 */
export function getEmpresasFaturamento(): EmpresaFaturamento[] {
  try {
    const raw = localStorage.getItem(BILLING_COMPANIES_KEY);
    let billingCompanies: EmpresaFaturamento[] = raw ? JSON.parse(raw) : [];

    // Lê também as empresas do companyService para manter sincronia bidirecional
    const localCompanies = getLocalCompanies();

    if (!Array.isArray(billingCompanies) || billingCompanies.length === 0) {
      // Inicializa a partir das empresas do sistema
      billingCompanies = localCompanies.map((c, idx) => ({
        id: c.id,
        nome: c.nome,
        planoId: idx === 0 ? "plano-pro" : "plano-essencial",
        status:
          c.statusAssinatura === "ativo"
            ? "ativa"
            : c.statusAssinatura === "cortesia"
            ? "degustação"
            : "inativa",
        dataVencimentoMensalidade: "10",
        diaVencimento: 10,
        responsavel: c.responsavel,
        whatsapp: c.whatsapp,
        cidade: c.cidade,
        criadoEm: c.criadoEm,
      }));
      saveEmpresasFaturamento(billingCompanies);
      return billingCompanies;
    }

    // Se novas empresas foram criadas no master, sincroniza automaticamente
    let hasNew = false;
    localCompanies.forEach((lc) => {
      if (!billingCompanies.some((bc) => bc.id === lc.id)) {
        billingCompanies.push({
          id: lc.id,
          nome: lc.nome,
          planoId: "plano-pro",
          status:
            lc.statusAssinatura === "ativo"
              ? "ativa"
              : lc.statusAssinatura === "cortesia"
              ? "degustação"
              : "inativa",
          dataVencimentoMensalidade: "10",
          diaVencimento: 10,
          responsavel: lc.responsavel,
          whatsapp: lc.whatsapp,
          cidade: lc.cidade,
          criadoEm: lc.criadoEm,
        });
        hasNew = true;
      }
    });

    if (hasNew) {
      saveEmpresasFaturamento(billingCompanies);
    }

    return billingCompanies;
  } catch (err) {
    console.warn("Erro ao obter empresas de faturamento:", err);
    return [];
  }
}

/**
 * Salva a lista de empresas no módulo de faturamento
 */
export function saveEmpresasFaturamento(empresas: EmpresaFaturamento[]): void {
  try {
    localStorage.setItem(BILLING_COMPANIES_KEY, JSON.stringify(empresas));
  } catch (err) {
    console.error("Erro ao salvar empresas de faturamento:", err);
  }
}

/**
 * Atualiza uma empresa no módulo de faturamento
 */
export function updateEmpresaFaturamento(
  empresaId: string,
  updates: Partial<EmpresaFaturamento>
): EmpresaFaturamento[] {
  const current = getEmpresasFaturamento();
  const updated = current.map((e) => (e.id === empresaId ? { ...e, ...updates } : e));
  saveEmpresasFaturamento(updated);
  return updated;
}

/**
 * Exemplos iniciais de histórico de transações / pagamentos
 */
const DEFAULT_TRANSACOES: TransacaoHistorico[] = [
  {
    id: "tx-202610-001",
    empresaId: "emp-roze-gourmet",
    statusPagamento: "pago",
    dataCompensacao: "2026-10-10",
    numeroRecibo: "REC-2026-10892",
    valorPago: 89.9,
    mesReferencia: "10/2026",
    estornado: false,
    valorEstornado: 0,
  },
  {
    id: "tx-202609-001",
    empresaId: "emp-roze-gourmet",
    statusPagamento: "pago",
    dataCompensacao: "2026-09-10",
    numeroRecibo: "REC-2026-09741",
    valorPago: 89.9,
    mesReferencia: "09/2026",
    estornado: false,
    valorEstornado: 0,
  },
  {
    id: "tx-202610-002",
    empresaId: "emp-roze-gourmet",
    statusPagamento: "pago",
    dataCompensacao: "2026-10-05",
    numeroRecibo: "REC-2026-10444",
    valorPago: 59.9,
    mesReferencia: "10/2026",
    estornado: true,
    valorEstornado: 29.95,
    motivoEstorno: "Estorno parcial referente a reajuste comercial pro-rata",
    dataEstorno: "2026-10-08",
  },
];

/**
 * Obtém o histórico de transações
 */
export function getTransacoesHistorico(): TransacaoHistorico[] {
  try {
    const raw = localStorage.getItem(BILLING_TRANSACTIONS_KEY);
    if (!raw) {
      saveTransacoesHistorico(DEFAULT_TRANSACOES);
      return DEFAULT_TRANSACOES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.warn("Erro ao obter transações:", err);
  }
  return DEFAULT_TRANSACOES;
}

/**
 * Salva histórico de transações
 */
export function saveTransacoesHistorico(transacoes: TransacaoHistorico[]): void {
  try {
    localStorage.setItem(BILLING_TRANSACTIONS_KEY, JSON.stringify(transacoes));
  } catch (err) {
    console.error("Erro ao salvar transações:", err);
  }
}

/**
 * REGRA DE NEGÓCIO: Registro de Estorno (Total ou Parcial)
 * Valida rigorosamente se o estorno não ultrapassa o valor pago da transação.
 *
 * @param transacaoId ID da transação
 * @param valorEstorno Valor a estornar (não pode exceder saldo disponível)
 * @param motivo Motivo descritivo do cancelamento/estorno
 */
export function registrarEstorno(
  transacaoId: string,
  valorEstorno: number,
  motivo?: string
): { success: boolean; message: string; transacoes: TransacaoHistorico[] } {
  const transacoes = getTransacoesHistorico();
  const tx = transacoes.find((t) => t.id === transacaoId);

  if (!tx) {
    return { success: false, message: "Transação não encontrada.", transacoes };
  }

  const saldoDisponivel = Number((tx.valorPago - (tx.valorEstornado || 0)).toFixed(2));

  if (valorEstorno <= 0) {
    return {
      success: false,
      message: "O valor de estorno deve ser maior que R$ 0,00.",
      transacoes,
    };
  }

  if (valorEstorno > saldoDisponivel) {
    return {
      success: false,
      message: `Valor inválido! O estorno máximo permitido para esta transação é de R$ ${saldoDisponivel.toFixed(
        2
      )}.`,
      transacoes,
    };
  }

  const novoTotalEstornado = Number(((tx.valorEstornado || 0) + valorEstorno).toFixed(2));

  const updated = transacoes.map((t) =>
    t.id === transacaoId
      ? {
          ...t,
          estornado: true,
          valorEstornado: novoTotalEstornado,
          motivoEstorno: motivo || t.motivoEstorno || "Estorno solicitado pelo administrador",
          dataEstorno: new Date().toISOString().split("T")[0],
        }
      : t
  );

  saveTransacoesHistorico(updated);
  return {
    success: true,
    message: `Estorno de R$ ${valorEstorno.toFixed(2)} registrado com sucesso no recibo ${
      tx.numeroRecibo
    }!`,
    transacoes: updated,
  };
}

/**
 * Adiciona uma nova transação de pagamento
 */
export function registrarNovoPagamento(
  empresaId: string,
  valorPago: number,
  mesReferencia: string
): TransacaoHistorico[] {
  const transacoes = getTransacoesHistorico();
  const novaTx: TransacaoHistorico = {
    id: `tx-${Date.now()}`,
    empresaId,
    statusPagamento: "pago",
    dataCompensacao: new Date().toISOString().split("T")[0],
    numeroRecibo: `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    valorPago: Number(valorPago),
    mesReferencia,
    estornado: false,
    valorEstornado: 0,
  };

  const updated = [novaTx, ...transacoes];
  saveTransacoesHistorico(updated);
  return updated;
}

/**
 * Calcula o resumo consolidado de métricas para os cards de topo
 */
export function calcularResumoFaturamento(
  empresas: EmpresaFaturamento[],
  planos: Plano[],
  transacoes: TransacaoHistorico[]
): ResumoFaturamentoConsolidado {
  const ativas = empresas.filter((e) => e.status === "ativa").length;
  const degustacao = empresas.filter((e) => e.status === "degustação").length;
  const inativas = empresas.filter((e) => e.status === "inativa").length;

  const faturamentoMensalConsolidado = calcularFaturamentoConsolidado(empresas, planos);

  const mesAtualStr = `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;

  const transacoesMes = transacoes.filter((t) => t.mesReferencia === mesAtualStr && t.statusPagamento === "pago");

  const totalRecebidoMes = transacoesMes.reduce((acc, t) => acc + (t.valorPago - t.valorEstornado), 0);
  const totalEstornadoMes = transacoes.reduce((acc, t) => acc + (t.valorEstornado || 0), 0);

  return {
    totalEmpresas: empresas.length,
    empresasAtivas: ativas,
    empresasDegustacao: degustacao,
    empresasInativas: inativas,
    faturamentoMensalConsolidado,
    faturamentoProjetadoAnual: Number((faturamentoMensalConsolidado * 12).toFixed(2)),
    totalRecebidoMes: Number(totalRecebidoMes.toFixed(2)),
    totalEstornadoMes: Number(totalEstornadoMes.toFixed(2)),
  };
}
