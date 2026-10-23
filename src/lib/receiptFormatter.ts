import { BRAND_CONFIG } from "@/config/brand.config";
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { VendaDetalhada } from "@/types/dashboard";

export interface FiscalReceiptOptions {
  empresaNome?: string;
  empresaCnpj?: string;
  empresaTelefone?: string;
  empresaEndereco?: string;
  pixKey?: string;
  instagram?: string;
  receiptUrl?: string;
}

/**
 * Gera um comprovante / cupom digital estruturado no formato fiscal para WhatsApp
 */
export function formatFiscalReceiptText(
  venda: VendaDetalhada,
  options: FiscalReceiptOptions = {}
): string {
  const companyName = options.empresaNome || BRAND_CONFIG.companyName;
  const companyTagline = BRAND_CONFIG.tagline;
  const customerName = venda.cliente_nome ? venda.cliente_nome.trim() : "Cliente";
  const dateFormatted = formatDateTime(venda.data_venda);
  const paymentMethodLabel = PAYMENT_METHOD_LABELS[venda.forma_pagamento] || venda.forma_pagamento;
  const shortId = venda.id.length > 8 ? venda.id.slice(-6).toUpperCase() : venda.id.toUpperCase();

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

  // Informações específicas do meio de pagamento
  let paymentDetails = `💳 Forma de Pagamento: *${paymentMethodLabel}*`;
  if (venda.forma_pagamento === "Pix") {
    paymentDetails += `\n⚡ Pix Stone OpenBank: *Confirmado ✅*`;
    if (venda.pix_txid) {
      paymentDetails += `\n🔑 ID Transação (txid): \`${venda.pix_txid}\``;
    }
    const pixKey = options.pixKey || BRAND_CONFIG.tonConfig.pixKey;
    if (pixKey) {
      paymentDetails += `\n📱 Chave Pix: \`${pixKey}\``;
    }
  } else if (venda.forma_pagamento === "Cartao_Credito" || venda.forma_pagamento === "Cartao_Debito") {
    paymentDetails += `\n📠 Maquininha Stone / Ton: *Autorizado ✅*`;
    paymentDetails += `\n🔢 Autorização: \`AUT-${shortId}\``;
  } else if (venda.forma_pagamento === "Dinheiro") {
    paymentDetails += `\n💵 Pagamento em Espécie: *Recebido no Caixa ✅*`;
  }

  const receipt = `🧾 *${companyName.toUpperCase()}*
_${companyTagline}_
${doubleDivider}
*CUPOM NÃO FISCAL DE VENDA*
*Pedido Nº:* #${shortId}
*Data/Hora:* ${dateFormatted}
*Cliente:* ${customerName}
${divider}
*ITENS DO PEDIDO:*
${itemsText}
${divider}
Qtd. Total de Itens: *${totalQuantity} unidade(s)*
*VALOR TOTAL:* *${formatCurrency(venda.valor_total)}*
${divider}
*DETALHES DO PAGAMENTO:*
${paymentDetails}
${options.receiptUrl ? `\n📥 *Acesse seu cupom e baixe em PDF / Excel a qualquer momento:*\n${options.receiptUrl}\n` : ""}
${doubleDivider}
✨ *Agradecemos imensamente pela preferência!*
Esperamos que você se delicie com nossos geladinhos artesanais gourmet de 150ml feitos com muito carinho! ❤️🍦
${options.instagram ? `📸 Instagram: ${options.instagram}\n` : ""}
${divider}
_Desenvolvido por:_
*PereiraLabs*
_Divisão de Tecnologia e IA_
_Louzada & Pereira - Soluções Digitais_`.trim();

  return receipt;
}
