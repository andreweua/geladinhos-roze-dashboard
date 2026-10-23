import { BRAND_CONFIG } from "@/config/brand.config";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { VendaDetalhada } from "@/types/dashboard";

const CURRENT_SHIFT_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_current_cash_shift_v1`;
const SHIFT_HISTORY_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_cash_shift_history_v1`;

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
  operadorNome: string;
  dataAbertura: string;
  dataFechamento?: string;
  status: "aberto" | "fechado";
  abertura: CashShiftAbertura;
  fechamento?: CashShiftFechamento;
}

// Obter turno de caixa atualmente aberto
export function getCurrentShift(): CashShift | null {
  try {
    const raw = localStorage.getItem(CURRENT_SHIFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: CashShift = JSON.parse(raw);
    return parsed.status === "aberto" ? parsed : null;
  } catch {
    return null;
  }
}

// Obter histórico de fechamentos
export function getShiftHistory(): CashShift[] {
  try {
    const raw = localStorage.getItem(SHIFT_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Abrir novo caixa / turno
export function openCashShift(params: {
  operadorNome: string;
  dinheiroCedulas: number;
  moedas: number;
  maquininhaCartaoInicial: number;
  observacoes?: string;
}): CashShift {
  const cedulas = Math.max(0, Number(params.dinheiroCedulas) || 0);
  const moedas = Math.max(0, Number(params.moedas) || 0);
  const maquininha = Math.max(0, Number(params.maquininhaCartaoInicial) || 0);
  const totalFundo = cedulas + moedas;

  const newShift: CashShift = {
    id: `shift-${Date.now()}`,
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
    localStorage.setItem(CURRENT_SHIFT_STORAGE_KEY, JSON.stringify(newShift));
  } catch {
    // ignore
  }

  return newShift;
}

// Fechar caixa / turno e calcular balanço
export function closeCashShift(params: {
  shiftId: string;
  dinheiroCedulas: number;
  moedas: number;
  maquininhaCartao: number;
  observacoes?: string;
  vendasDoTurno: VendaDetalhada[];
}): CashShift {
  const current = getCurrentShift();
  const shift = current && current.id === params.shiftId ? current : null;

  const cedulasInformado = Math.max(0, Number(params.dinheiroCedulas) || 0);
  const moedasInformado = Math.max(0, Number(params.moedas) || 0);
  const totalDinheiroInformado = cedulasInformado + moedasInformado;
  const maquininhaInformado = Math.max(0, Number(params.maquininhaCartao) || 0);
  const totalGeralInformado = totalDinheiroInformado + maquininhaInformado;

  // Filtrar vendas ocorridas desde a abertura deste turno
  const shiftStartTime = shift ? new Date(shift.dataAbertura).getTime() : 0;
  const vendasTurno = params.vendasDoTurno.filter(
    (v) =>
      v.status === "concluida" &&
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
    // Limpar caixa aberto atual
    localStorage.removeItem(CURRENT_SHIFT_STORAGE_KEY);

    // Salvar no histórico
    const history = getShiftHistory();
    history.unshift(closedShift);
    localStorage.setItem(
      SHIFT_HISTORY_STORAGE_KEY,
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
