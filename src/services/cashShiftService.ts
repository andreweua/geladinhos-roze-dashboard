import { BRAND_CONFIG } from "@/config/brand.config";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { VendaDetalhada } from "@/types/dashboard";
import { getActiveCompanyId } from "@/services/companyService";

export function getCurrentShiftStorageKey(empresaId?: string): string {
  const compId = empresaId || getActiveCompanyId();
  return `${BRAND_CONFIG.storagePrefix}_current_cash_shift_${compId}_v2`;
}

export function getShiftHistoryStorageKey(empresaId?: string): string {
  const compId = empresaId || getActiveCompanyId();
  return `${BRAND_CONFIG.storagePrefix}_cash_shift_history_${compId}_v2`;
}

export interface CashShiftAbertura {
  dinheiroCedulas: number;
  moedas: number;
  maquininhaCartaoInicial: number;
  totalFundoTroco: number;
  observacoes?: string;
}

export interface CashShiftFechamento {
  dataFechamento: string;
  dinheiroCedulasInformado: number;
  moedasInformado: number;
  totalDinheiroInformado: number;
  maquininhaCartaoInformado: number;
  totalGeralInformado: number;

  // Vendas acumuladas durante o turno
  totalPedidosTurno: number;
  vendasDinheiro: number;
  vendasPix: number;
  vendasCartaoCredito: number;
  vendasCartaoDebito: number;
  totalVendidoTurno: number;

  // Balanço / Diferenças
  saldoEsperadoDinheiro: number;
  diferencaDinheiro: number; // sobra (+) ou falta (-)
  saldoEsperadoMaquininha: number;
  diferencaMaquininha: number;
  observacoesFechamento?: string;
}

export interface CashShift {
  id: string;
  empresaId: string; // Isolamento estrito multi-tenant obrigatório
  operadorNome: string;
  dataAbertura: string;
  dataFechamento?: string;
  status: "aberto" | "fechado";
  abertura: CashShiftAbertura;
  fechamento?: CashShiftFechamento;
}

// Obter turno de caixa atualmente aberto (estritamente isolado por empresa)
export function getCurrentShift(empresaId?: string): CashShift | null {
  const compId = empresaId || getActiveCompanyId();
  try {
    const key = getCurrentShiftStorageKey(compId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: CashShift = JSON.parse(raw);
    return parsed.status === "aberto" && parsed.empresaId === compId ? parsed : null;
  } catch {
    return null;
  }
}

// Obter histórico de fechamentos da empresa
export function getShiftHistory(empresaId?: string): CashShift[] {
  const compId = empresaId || getActiveCompanyId();
  try {
    const key = getShiftHistoryStorageKey(compId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Abrir novo caixa / turno na empresa especificada
export function openCashShift(params: {
  empresaId?: string;
  operadorNome: string;
  dinheiroCedulas: number;
  moedas: number;
  maquininhaCartaoInicial: number;
  observacoes?: string;
}): CashShift {
  const compId = params.empresaId || getActiveCompanyId();
  const cedulas = Math.max(0, Number(params.dinheiroCedulas) || 0);
  const moedas = Math.max(0, Number(params.moedas) || 0);
  const maquininha = Math.max(0, Number(params.maquininhaCartaoInicial) || 0);
  const totalFundo = cedulas + moedas;

  const newShift: CashShift = {
    id: `shift-${Date.now()}`,
    empresaId: compId,
    operadorNome: params.operadorNome || "Operador de Caixa",
    dataAbertura: new Date().toISOString(),
    status: "aberto",
    abertura: {
      dinheiroCedulas: cedulas,
      moedas,
      maquininhaCartaoInicial: maquininha,
      totalFundoTroco: totalFundo,
      observacoes: params.observacoes,
    },
  };

  try {
    const key = getCurrentShiftStorageKey(compId);
    localStorage.setItem(key, JSON.stringify(newShift));
  } catch {
    // ignore
  }

  return newShift;
}

// Fechar caixa / turno e calcular balanço na empresa especificada
export function closeCashShift(params: {
  empresaId?: string;
  shiftId: string;
  dinheiroCedulas: number;
  moedas: number;
  maquininhaCartao: number;
  observacoes?: string;
  vendasDoTurno: VendaDetalhada[];
}): CashShift {
  const compId = params.empresaId || getActiveCompanyId();
  const current = getCurrentShift(compId);
  const shift = current && current.id === params.shiftId ? current : null;

  const cedulasInformado = Math.max(0, Number(params.dinheiroCedulas) || 0);
  const moedasInformado = Math.max(0, Number(params.moedas) || 0);
  const totalDinheiroInformado = cedulasInformado + moedasInformado;
  const maquininhaInformado = Math.max(0, Number(params.maquininhaCartao) || 0);
  const totalGeralInformado = totalDinheiroInformado + maquininhaInformado;

  // Filtrar vendas ocorridas desde a abertura deste turno E pertencentes a esta empresa
  const shiftStartTime = shift ? new Date(shift.dataAbertura).getTime() : 0;
  const vendasTurno = params.vendasDoTurno.filter(
    (v) =>
      v.status === "concluida" &&
      (!v.empresaId || v.empresaId === compId) &&
      new Date(v.data_venda).getTime() >= shiftStartTime
  );

  let vendasDinheiro = 0;
  let vendasPix = 0;
  let vendasCartaoCredito = 0;
  let vendasCartaoDebito = 0;

  vendasTurno.forEach((v) => {
    if (v.forma_pagamento === "Dinheiro") vendasDinheiro += v.valor_total;
    else if (v.forma_pagamento === "Pix") vendasPix += v.valor_total;
    else if (v.forma_pagamento === "Cartao_Credito") vendasCartaoCredito += v.valor_total;
    else if (v.forma_pagamento === "Cartao_Debito") vendasCartaoDebito += v.valor_total;
  });

  const totalVendidoTurno =
    vendasDinheiro + vendasPix + vendasCartaoCredito + vendasCartaoDebito;

  const fundoDinheiro = shift
    ? shift.abertura.dinheiroCedulas + shift.abertura.moedas
    : 0;
  const saldoEsperadoDinheiro = fundoDinheiro + vendasDinheiro;
  const diferencaDinheiro = totalDinheiroInformado - saldoEsperadoDinheiro;

  const maquininhaInicial = shift ? shift.abertura.maquininhaCartaoInicial : 0;
  const saldoEsperadoMaquininha =
    maquininhaInicial + vendasCartaoCredito + vendasCartaoDebito;
  const diferencaMaquininha = maquininhaInformado - saldoEsperadoMaquininha;

  const fechamentoData: CashShiftFechamento = {
    dataFechamento: new Date().toISOString(),
    dinheiroCedulasInformado: cedulasInformado,
    moedasInformado,
    totalDinheiroInformado,
    maquininhaCartaoInformado: maquininhaInformado,
    totalGeralInformado,
    totalPedidosTurno: vendasTurno.length,
    vendasDinheiro,
    vendasPix,
    vendasCartaoCredito,
    vendasCartaoDebito,
    totalVendidoTurno,
    saldoEsperadoDinheiro,
    diferencaDinheiro,
    saldoEsperadoMaquininha,
    diferencaMaquininha,
    observacoesFechamento: params.observacoes,
  };

  const closedShift: CashShift = {
    ...(shift || {
      id: params.shiftId,
      empresaId: compId,
      operadorNome: "Operador de Caixa",
      dataAbertura: new Date().toISOString(),
      abertura: {
        dinheiroCedulas: 0,
        moedas: 0,
        maquininhaCartaoInicial: 0,
        totalFundoTroco: 0,
      },
    }),
    dataFechamento: fechamentoData.dataFechamento,
    status: "fechado",
    fechamento: fechamentoData,
  };

  try {
    // Limpar caixa aberto atual da empresa
    const key = getCurrentShiftStorageKey(compId);
    localStorage.removeItem(key);

    // Salvar no histórico da empresa
    const history = getShiftHistory(compId);
    history.unshift(closedShift);
    const histKey = getShiftHistoryStorageKey(compId);
    localStorage.setItem(
      histKey,
      JSON.stringify(history.slice(0, 50))
    );
  } catch {
    // ignore
  }

  return closedShift;
}

// Formatar relatório de fechamento de caixa para WhatsApp / Impressão estilo Cupom Fiscal
export function formatShiftClosingReport(shift: CashShift): string {
  if (!shift.fechamento) return "";

  const f = shift.fechamento;
  const a = shift.abertura;
  const dataAberturaFmt = formatDateTime(shift.dataAbertura);
  const dataFechamentoFmt = formatDateTime(f.dataFechamento);
  const shortId = (shift.id.length > 8 ? shift.id.slice(-6) : shift.id).toUpperCase();

  const diffDinheiroLabel =
    f.diferencaDinheiro === 0
      ? "✅ CONFERÊNCIA EXATA (R$ 0,00)"
      : f.diferencaDinheiro > 0
      ? `🟢 SOBRA DE CAIXA: +${formatCurrency(f.diferencaDinheiro)}`
      : `🔴 FALTA DE CAIXA: ${formatCurrency(f.diferencaDinheiro)}`;

  const diffMaqLabel =
    f.diferencaMaquininha === 0
      ? "✅ CONFERÊNCIA EXATA (R$ 0,00)"
      : f.diferencaMaquininha > 0
      ? `🟢 SOBRA NA MAQUININHA: +${formatCurrency(f.diferencaMaquininha)}`
      : `🔴 FALTA NA MAQUININHA: ${formatCurrency(f.diferencaMaquininha)}`;

  return `🧾 *${BRAND_CONFIG.companyName.toUpperCase()}*
_${BRAND_CONFIG.tagline}_
================================
*FECHAMENTO DE CAIXA — NÃO FISCAL*
*Turno ID:* #${shortId}
*Operador:* ${shift.operadorNome}
*Abertura:* ${dataAberturaFmt}
*Fechamento:* ${dataFechamentoFmt}
--------------------------------
*1. FUNDO DE TROCO INICIAL:*
  • Cédulas em Dinheiro: ${formatCurrency(a.dinheiroCedulas)}
  • Moedas em Gaveta: ${formatCurrency(a.moedas)}
  • Total Fundo Inicial: *${formatCurrency(a.totalFundoTroco)}*
  • Saldo Maquininha Inicial: ${formatCurrency(a.maquininhaCartaoInicial)}
--------------------------------
*2. VENDAS DO TURNO (${f.totalPedidosTurno} pedidos):*
  • 💵 Dinheiro Físico: ${formatCurrency(f.vendasDinheiro)}
  • ⚡ Pix Stone OpenBank: ${formatCurrency(f.vendasPix)}
  • 💳 Cartão de Crédito: ${formatCurrency(f.vendasCartaoCredito)}
  • 💳 Cartão de Débito: ${formatCurrency(f.vendasCartaoDebito)}
  *TOTAL VENDIDO NO TURNO:* *${formatCurrency(f.totalVendidoTurno)}*
--------------------------------
*3. CONFERÊNCIA FÍSICA (GAVETA):*
  • Cédulas Contadas: ${formatCurrency(f.dinheiroCedulasInformado)}
  • Moedas Contadas: ${formatCurrency(f.moedasInformado)}
  • Total Dinheiro Apurado: *${formatCurrency(f.totalDinheiroInformado)}*
  • Saldo Teórico Esperado: ${formatCurrency(f.saldoEsperadoDinheiro)}
  👉 *BALANÇO DINHEIRO:* *${diffDinheiroLabel}*
--------------------------------
*4. CONFERÊNCIA MAQUININHA STONE/TON:*
  • Total Informado da Maquininha: *${formatCurrency(f.maquininhaCartaoInformado)}*
  • Saldo Teórico Esperado: ${formatCurrency(f.saldoEsperadoMaquininha)}
  👉 *BALANÇO MAQUININHA:* *${diffMaqLabel}*
================================
${f.observacoesFechamento ? `📝 *Observações:* ${f.observacoesFechamento}\n================================\n` : ""}✨ *Conferência de Caixa registrada no sistema.*
Conferido por: *${shift.operadorNome}*
--------------------------------
_Desenvolvido por:_
*PereiraLabs*
_Divisão de Tecnologia e IA_
_Louzada & Pereira - Soluções Digitais_`.trim();
}
