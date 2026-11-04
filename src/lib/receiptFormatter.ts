import { BRAND_CONFIG } from "@/config/brand.config";
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { VendaDetalhada } from "@/types/dashboard";
import { getPassaporteGrid } from "@/services/customerService";
import { getLocalCompanies, getActiveCompany } from "@/services/companyService";

export interface FiscalReceiptOptions {
  empresaNome?: string;
  empresaSubtitulo?: string;
  empresaCnpj?: string;
  empresaTelefone?: string;
  empresaEndereco?: string;
  pixKey?: string;
  instagram?: string;
  receiptUrl?: string;
  origem?: string;
  paradaNome?: string;
  proximaParada?: string;
  destino?: string;
  selosAtuais?: number;
  viagemGratisDisponivel?: boolean;
}

export const DEFAULT_RECEIPT_DESTINATION = "Cremosidade sem escalas e felicidade imediata!";
export const DEFAULT_RECEIPT_NEXT_STOP = "Casa do Cliente";

/**
 * Número do bilhete legível e estável: AAMMDD-XXXX
 * (data da venda + 4 últimos caracteres alfanuméricos do ID da venda).
 */
export function getTicketNumber(venda: Pick<VendaDetalhada, "id" | "data_venda">): string {
  const d = new Date(venda.data_venda);
  const datePart = Number.isNaN(d.getTime())
    ? "000000"
    : `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const alnum = String(venda.id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const idPart = alnum.slice(-4).padStart(4, "0");
  return `${datePart}-${idPart}`;
}

/** Forma de pagamento no cupom (PIX sempre em maiúsculas). */
export function getReceiptPaymentLabel(method: string): string {
  const label = (PAYMENT_METHOD_LABELS as Record<string, string>)[method] || method;
  return label.trim().toLowerCase() === "pix" ? "PIX" : label;
}

export interface ResolvedReceiptTexts {
  companyName: string;
  companyTagline: string;
  origem: string;
  parada: string;
  proximaParada: string;
  destino: string;
}

/**
 * Resolve os textos temáticos do cupom a partir das configurações da empresa
 * (Configurações > Dados da Empresa > Cupom / Bilhete de Embarque).
 * Opções passadas explicitamente têm prioridade.
 */
export function resolveReceiptTexts(
  venda: Pick<VendaDetalhada, "empresaId"> & Partial<Pick<VendaDetalhada, "cupom_textos">>,
  options: FiscalReceiptOptions = {}
): ResolvedReceiptTexts {
  // Link permanente: usa o snapshot gravado no momento da venda (funciona em qualquer aparelho)
  if (venda.cupom_textos) {
    const s = venda.cupom_textos;
    return {
      companyName: (options.empresaNome || s.companyName || "").trim(),
      companyTagline: (options.empresaSubtitulo || s.companyTagline || "").trim(),
      origem: (options.origem || s.origem || "").trim(),
      parada: (options.paradaNome || s.parada || "").trim(),
      proximaParada: (options.proximaParada || s.proximaParada || "").trim() || DEFAULT_RECEIPT_NEXT_STOP,
      destino: (options.destino || s.destino || "").trim() || DEFAULT_RECEIPT_DESTINATION,
    };
  }

  let company = getActiveCompany();
  try {
    const own = getLocalCompanies().find((c) => c.id === venda.empresaId);
    if (own) company = own;
  } catch {
    // mantém empresa ativa
  }
  const cfg = company.cupomConfig || {};
  const cidade = (company.cidade || "").trim();
  const shortName = (company.nome || "").split(" - ")[0].trim();
  const paradaBase =
    (options.paradaNome || cfg.paradaNome || "").trim() ||
    (company.id === "emp-estacao-da-ro" ? "Estação da Rô" : shortName);

  return {
    companyName: (options.empresaNome || company.nome || "").trim(),
    companyTagline: (options.empresaSubtitulo || company.nicho || "").trim(),
    origem: (options.origem || cfg.origem || "").trim() || cidade,
    parada: [paradaBase, cidade].filter(Boolean).join(", "),
    proximaParada: (options.proximaParada || cfg.proximaParada || "").trim() || DEFAULT_RECEIPT_NEXT_STOP,
    destino: (options.destino || cfg.destino || "").trim() || DEFAULT_RECEIPT_DESTINATION,
  };
}

/**
 * Gera um comprovante / cupom digital estruturado no formato temático:
 * BILHETE DE EMBARQUE GOURMET - ESTAÇÃO DA RÔ (Sabores da Estrada Real)
 */
export function formatFiscalReceiptText(
  venda: VendaDetalhada,
  options: FiscalReceiptOptions = {}
): string {
  const texts = resolveReceiptTexts(venda, options);
  const companyName = texts.companyName;
  const companyTagline = texts.companyTagline;
  const customerName = venda.cliente_nome ? venda.cliente_nome.trim() : "Passageiro(a) Gourmet";
  const dateFormatted = formatDateTime(venda.data_venda);
  const paymentMethodLabel = getReceiptPaymentLabel(venda.forma_pagamento);
  const shortId = venda.id.length > 8 ? venda.id.slice(-6).toUpperCase() : venda.id.toUpperCase();
  const ticketNumber = getTicketNumber(venda);
  const origin = texts.origem;
  const currentStop = texts.parada;
  const nextStop = texts.proximaParada;
  const destination = texts.destino;

  const divider = "------------------------------------------------";
  const doubleDivider = "================================";

  // Montagem da tabela de itens
  const itemsText = venda.itens
    .map((item) => {
      const totalItem = item.quantidade * item.preco_unitario;
      const unitPriceStr = formatCurrency(item.preco_unitario);
      const totalStr = formatCurrency(totalItem);
      return `  • *${item.quantidade}x ${item.produto_nome}*\n    (${unitPriceStr} un.) -> *${totalStr}*`;
    })
    .join("\n");

  const totalQuantity = venda.itens.reduce((acc, i) => acc + i.quantidade, 0);

  // Fidelidade: Passaporte da Estrada Real
  let stamps = options.selosAtuais;
  if (stamps === undefined && venda.selos_fidelidade !== undefined) {
    stamps = venda.selos_fidelidade;
  }
  if (stamps === undefined) {
    stamps = totalQuantity % 10 === 0 && totalQuantity > 0 ? 10 : totalQuantity % 10;
  }

  const isFreeTripAvailable = Boolean(
    options.viagemGratisDisponivel ||
    (venda.recompensas_fidelidade && venda.recompensas_fidelidade > 0) ||
    stamps === 10
  );

  const passportGrid = getPassaporteGrid(stamps, isFreeTripAvailable);

  // Informações específicas do meio de pagamento
  let paymentDetails = `💳 Forma de Pagamento: *${paymentMethodLabel}*`;
  if (venda.forma_pagamento === "Pix") {
    paymentDetails += `\n⚡ PIX Stone OpenBank: *Confirmado ✅*`;
    if (venda.pix_txid) {
      paymentDetails += `\n🔑 ID Transação (txid): \`${venda.pix_txid}\``;
    }
    const pixKey = options.pixKey || BRAND_CONFIG.tonConfig.pixKey;
    if (pixKey) {
      paymentDetails += `\n📱 Chave PIX: \`${pixKey}\``;
    }
  } else if (venda.forma_pagamento === "Cartao_Credito" || venda.forma_pagamento === "Cartao_Debito") {
    paymentDetails += `\n📠 Maquininha Stone / Ton: *Autorizado ✅*`;
    paymentDetails += `\n🔢 Autorização: \`AUT-${shortId}\``;
  } else if (venda.forma_pagamento === "Dinheiro") {
    paymentDetails += `\n💵 Pagamento em Espécie: *Recebido no Caixa ✅*`;
  }

  const receipt = `🚂 *${companyName.toUpperCase()}*
_${companyTagline}_
${doubleDivider}
🎫 *BILHETE DE EMBARQUE GOURMET*
*Bilhete Nº:* ${ticketNumber}
*Passageiro(a):* ${customerName}
*Origem:* ${origin}
*Parada:* ${currentStop}
*Próxima Parada:* ${nextStop}
*Destino:* ${destination}
*Data/Embarque:* ${dateFormatted}
${divider}
🍦 *SABORES A BORDO (ITENS):*
${itemsText}
${divider}
Qtd. Total de Itens: *${totalQuantity} unidade(s)*
*TOTAL DA PASSAGEM:* *${formatCurrency(venda.valor_total)}*
${divider}
*DETALHES DO PAGAMENTO:*
${paymentDetails}
${divider}
🎫 *PASSAPORTE DA ESTRADA REAL*
Progresso: ${passportGrid}
${isFreeTripAvailable ? `\n🎉 *⭐ VIAGEM DOCE GRÁTIS DISPONÍVEL! ⭐*\n_Apresente este bilhete para resgatar seu geladinho cortesia!_\n` : ""}${options.receiptUrl ? `\n📥 *Acesse seu cupom e baixe em PDF a qualquer momento:*\n${options.receiptUrl}\n` : ""}
${doubleDivider}
A cada 10 paradas, ganhe 1 viagem doce! Guarde este bilhete.
📱 WhatsApp: ${options.empresaTelefone || "(14) 98818-3327"}
📸 Instagram: ${options.instagram || "@estacaodaro.gourmet"}
${divider}
_Desenvolvido por:_
*PereiraLabs*
_Divisão de Tecnologia e IA_
_Louzada & Pereira - Soluções Digitais_`.trim();

  return receipt;
}
