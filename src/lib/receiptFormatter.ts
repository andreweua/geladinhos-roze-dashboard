import { BRAND_CONFIG } from "@/config/brand.config";
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { VendaDetalhada } from "@/types/dashboard";
import { getPassaporteGrid } from "@/services/customerService";
import { getLocalCompanies, getActiveCompany } from "@/services/companyService";

export interface FiscalReceiptOptions {
  tipoCupom?: "tematico_embarque" | "padrao_comercial";
  empresaNome?: string;
  empresaSubtitulo?: string;
  empresaCnpj?: string;
  empresaTelefone?: string;
  empresaEndereco?: string;
  pixKey?: string;
  instagram?: string;
  receiptUrl?: string;
  linha?: string;
  origem?: string;
  paradaNome?: string;
  proximaParada?: string;
  destino?: string;
  tipoEntrega?: "NA_ESTACAO" | "DELIVERY";
  plataformaDelivery?: string;
  enderecoEntrega?: string;
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
  tipoCupom: "tematico_embarque" | "padrao_comercial";
  companyName: string;
  companyTagline: string;
  linha: string;
  origem: string;
  parada: string;
  proximaParada: string;
  destino: string;
  tipoEntregaLabel: string;
}

/**
 * Resolve os textos temáticos ou comerciais do cupom a partir das configurações da empresa
 * e dos dados preenchidos no PDV (Entrega na Estação / Delivery e Endereço).
 */
export function resolveReceiptTexts(
  venda: Pick<VendaDetalhada, "empresaId"> &
    Partial<
      Pick<
        VendaDetalhada,
        | "cupom_textos"
        | "tipo_entrega"
        | "plataforma_delivery"
        | "endereco_entrega"
        | "linha_rota"
      >
    >,
  options: FiscalReceiptOptions = {}
): ResolvedReceiptTexts {
  // Link permanente: usa o snapshot gravado no momento da venda (funciona em qualquer aparelho)
  if (venda.cupom_textos) {
    const s = venda.cupom_textos;
    const tipoCupom = options.tipoCupom || s.tipoCupom || "tematico_embarque";
    return {
      tipoCupom,
      companyName: (options.empresaNome || s.companyName || "").trim(),
      companyTagline: (options.empresaSubtitulo || s.companyTagline || "").trim(),
      linha: (options.linha || s.linha || "").trim(),
      origem: (options.origem || s.origem || "").trim(),
      parada: (options.paradaNome || s.parada || "").trim(),
      proximaParada: (options.proximaParada || s.proximaParada || "").trim() || DEFAULT_RECEIPT_NEXT_STOP,
      destino: (options.destino || s.destino || "").trim() || DEFAULT_RECEIPT_DESTINATION,
      tipoEntregaLabel: s.tipoEntrega || "Retirada na Estação",
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
  const cidadePDV = (options.origem || cfg.origem || company.cidade || "Conselheiro Lafaiete - MG").trim();
  const matrizLinha = (cfg.linhaOrigemMatriz || "Conselheiro Lafaiete - MG").trim();
  const linha = options.linha || venda.linha_rota || `${matrizLinha} x ${cidadePDV}`;

  const tipoEntrega = options.tipoEntrega || venda.tipo_entrega || "NA_ESTACAO";
  const plataforma = options.plataformaDelivery || venda.plataforma_delivery || "Delivery Próprio";
  const enderecoEntrega = options.enderecoEntrega || venda.endereco_entrega;

  let proximaParada = "";
  let tipoEntregaLabel = "";

  if (tipoEntrega === "DELIVERY") {
    tipoEntregaLabel = `Delivery (${plataforma})`;
    proximaParada = enderecoEntrega?.trim() || options.proximaParada || cfg.proximaParada || "Casa do Cliente (Delivery)";
  } else {
    tipoEntregaLabel = "Na Estação (Retirada / Balcão)";
    proximaParada = "Retirada na Estação";
  }

  const paradaBase = (options.paradaNome || cfg.paradaNome || company.nome || "Estação da Rô").trim();

  // Se não foi explicitamente definido, Estação da Rô usa temático; outras usam padrão comercial
  const isEstacaoDaRo =
    company.id === "emp-estacao-da-ro" ||
    company.nome.toLowerCase().includes("estação") ||
    company.nome.toLowerCase().includes("estacao");

  const tipoCupom = options.tipoCupom || cfg.tipoCupom || (isEstacaoDaRo ? "tematico_embarque" : "padrao_comercial");

  return {
    tipoCupom,
    companyName: (options.empresaNome || company.nome || "").trim(),
    companyTagline: (options.empresaSubtitulo || company.nicho || "").trim(),
    linha,
    origem: cidadePDV,
    parada: paradaBase,
    proximaParada,
    destino: (options.destino || cfg.destino || "").trim() || DEFAULT_RECEIPT_DESTINATION,
    tipoEntregaLabel,
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

  const receipt = texts.tipoCupom === "padrao_comercial"
    ? `🧾 *${companyName.toUpperCase()}*
_${companyTagline}_
${doubleDivider}
*CUPOM DE VENDA (NÃO FISCAL)*
*Pedido Nº:* ${ticketNumber}
*Cliente:* ${customerName}
*Atendimento:* ${texts.tipoEntregaLabel}
${venda.tipo_entrega === "DELIVERY" && texts.proximaParada ? `*Endereço:* ${texts.proximaParada}\n` : ""}*Data:* ${dateFormatted}
${divider}
🛒 *ITENS DO PEDIDO:*
${itemsText}
${divider}
Qtd. Total de Itens: *${totalQuantity} unidade(s)*
*TOTAL A PAGAR:* *${formatCurrency(venda.valor_total)}*
${divider}
*DETALHES DO PAGAMENTO:*
${paymentDetails}
${options.receiptUrl ? `\n📥 *Comprovante Digital Permanente:*\n${options.receiptUrl}\n` : ""}
${doubleDivider}
Agradecemos a sua preferência! Volte sempre!
📱 Contato: ${options.empresaTelefone || "(14) 98818-3327"}
${options.instagram ? `📸 Instagram: ${options.instagram}\n` : ""}${divider}
_Desenvolvido por:_
*PereiraLabs*
_Divisão de Tecnologia e IA_
_Louzada & Pereira - Soluções Digitais_`.trim()
    : `════════════════════════════════
🚂 *${companyName.toUpperCase()}* 🏛️
      *JAÚ - SÃO PAULO*
_${companyTagline}_
════════════════════════════════
🎫 *BILHETE DE EMBARQUE GOURMET*
*Bilhete Nº:* ${ticketNumber}
*Linha:* ${texts.linha}
*Passageiro(a):* ${customerName}
*Embarque:* ${texts.tipoEntregaLabel}
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
