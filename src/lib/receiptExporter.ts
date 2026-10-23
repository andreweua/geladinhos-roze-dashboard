import { jsPDF } from "jspdf";
import { BRAND_CONFIG } from "@/config/brand.config";
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { VendaDetalhada } from "@/types/dashboard";
import { formatFiscalReceiptText, FiscalReceiptOptions } from "@/lib/receiptFormatter";

// Helper para acionar download no navegador / celular
function triggerDownload(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. EXPORTAÇÃO EM TEXTO (.TXT) - Cupom Térmico & Lista de Compras
 */
export function downloadReceiptTxt(
  venda: VendaDetalhada,
  options: FiscalReceiptOptions = {}
): void {
  const shortId = (venda.id.length > 8 ? venda.id.slice(-6) : venda.id).toUpperCase();
  const fiscalText = formatFiscalReceiptText(venda, options);

  // Bloco adicional: Lista de compras limpa para copiar para apps de lista/notas
  const shoppingListBlock = [
    "\n================================",
    "📝 LISTA DE ITENS (P/ CONTROLE PESSOAL)",
    "================================",
    ...venda.itens.map(
      (item) =>
        `- ${item.quantidade}x ${item.produto_nome} (${formatCurrency(
          item.preco_unitario
        )} un.) = ${formatCurrency(item.quantidade * item.preco_unitario)}`
    ),
    `Total da Compra: ${formatCurrency(venda.valor_total)}`,
    `Forma de Pagamento: ${PAYMENT_METHOD_LABELS[venda.forma_pagamento] || venda.forma_pagamento}`,
    `Data: ${formatDateTime(venda.data_venda)}`,
    "================================\n",
  ].join("\n");

  const fullText = `${fiscalText}\n${shoppingListBlock}`;
  triggerDownload(
    fullText,
    `comprovante-venda-${shortId}.txt`,
    "text/plain;charset=utf-8"
  );
}

/**
 * 2. EXPORTAÇÃO EM CSV (.CSV) - Compatível com Excel, Google Sheets, Mobills, Organizze e Apps de Despesas
 */
export function downloadReceiptCsv(venda: VendaDetalhada): void {
  const shortId = (venda.id.length > 8 ? venda.id.slice(-6) : venda.id).toUpperCase();
  const dataIso = new Date(venda.data_venda).toISOString().slice(0, 10);
  const hora = new Date(venda.data_venda).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formaPagamento =
    PAYMENT_METHOD_LABELS[venda.forma_pagamento] || venda.forma_pagamento;
  const cliente = venda.cliente_nome ? venda.cliente_nome.trim() : "Consumidor Final";

  // Cabeçalho padrão de despesas/finanças
  const header = [
    "Data",
    "Hora",
    "Estabelecimento",
    "Categoria",
    "Item",
    "Quantidade",
    "Valor_Unitario",
    "Valor_Total_Item",
    "Valor_Total_Pedido",
    "Forma_Pagamento",
    "Cliente",
    "ID_Transacao",
    "Tipo_Lancamento",
  ].join(";");

  // Linhas para cada produto comprado
  const rows = venda.itens.map((item) => {
    return [
      dataIso,
      hora,
      `"${BRAND_CONFIG.companyName}"`,
      `"Alimentação / Sobremesas"`,
      `"${item.produto_nome.replace(/"/g, '""')}"`,
      item.quantidade,
      item.preco_unitario.toFixed(2).replace(".", ","),
      (item.quantidade * item.preco_unitario).toFixed(2).replace(".", ","),
      venda.valor_total.toFixed(2).replace(".", ","),
      `"${formaPagamento}"`,
      `"${cliente.replace(/"/g, '""')}"`,
      `"${venda.pix_txid || `PED-${shortId}`}"`,
      `"Despesa"`,
    ].join(";");
  });

  // UTF-8 BOM (\uFEFF) para abrir no Excel do Windows sem caracteres desconfigurados
  const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");
  triggerDownload(
    csvContent,
    `despesa-venda-${shortId}.csv`,
    "text/csv;charset=utf-8"
  );
}

/**
 * 3. EXPORTAÇÃO EM OFX (.OFX) - Padrão Universal para Bancos e Softwares Financeiros (ContaAzul, Mobills, Organizze, QuickBooks)
 */
export function downloadReceiptOfx(venda: VendaDetalhada): void {
  const shortId = (venda.id.length > 8 ? venda.id.slice(-6) : venda.id).toUpperCase();
  const dateObj = new Date(venda.data_venda);
  const dateFormattedOfx = dateObj
    .toISOString()
    .replace(/[-:]/g, "")
    .slice(0, 14);

  const memoDescription = venda.itens
    .map((i) => `${i.quantidade}x ${i.produto_nome}`)
    .join(", ");

  const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEVERSION:NONE
NEWFILEVERSION:NONE

<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>1001</TRNUID>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>STONE</BANKID>
          <ACCTID>ROZE-GOURMET</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>${dateFormattedOfx}</DTSTART>
          <DTEND>${dateFormattedOfx}</DTEND>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>${dateFormattedOfx}</DTPOSTED>
            <TRNAMT>-${venda.valor_total.toFixed(2)}</TRNAMT>
            <FITID>VENDA-${shortId}</FITID>
            <CHECKNUM>${shortId}</CHECKNUM>
            <NAME>${BRAND_CONFIG.companyName}</NAME>
            <MEMO>${memoDescription}</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>0.00</BALAMT>
          <DTASOF>${dateFormattedOfx}</DTASOF>
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

  triggerDownload(
    ofxContent,
    `lancamento-venda-${shortId}.ofx`,
    "application/x-ofx;charset=utf-8"
  );
}

/**
 * 4. EXPORTAÇÃO EM PDF (.PDF) - Cupom Não Fiscal Profissional
 */
export function downloadReceiptPdf(
  venda: VendaDetalhada,
  options: FiscalReceiptOptions = {}
): void {
  const shortId = (venda.id.length > 8 ? venda.id.slice(-6) : venda.id).toUpperCase();
  const companyName = (options.empresaNome || BRAND_CONFIG.companyName).toUpperCase();
  const companyTagline = BRAND_CONFIG.tagline;
  const customerName = venda.cliente_nome ? venda.cliente_nome.trim() : "Consumidor Final";
  const dateFormatted = formatDateTime(venda.data_venda);
  const paymentMethodLabel =
    PAYMENT_METHOD_LABELS[venda.forma_pagamento] || venda.forma_pagamento;

  // Criar documento PDF com dimensões de cupom 80mm de largura por altura dinâmica
  // 80mm de largura x 180mm de altura
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 210],
  });

  const pageWidth = 80;
  let y = 10;

  // 1. Cabeçalho da Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(companyName, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(companyTagline, pageWidth / 2, y, { align: "center" });
  y += 4;

  if (options.empresaEndereco || BRAND_CONFIG.basesOperacionais.jau.logradouro) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const end = `${BRAND_CONFIG.basesOperacionais.jau.cidade} • Tel: (14) 98818-3327`;
    doc.text(end, pageWidth / 2, y, { align: "center" });
    y += 5;
  }

  // Divisória dupla
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(6, y, pageWidth - 6, y);
  y += 4;

  // 2. Identificação do Cupom
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CUPOM NÃO FISCAL DE COMPRA", pageWidth / 2, y, { align: "center" });
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Pedido: #${shortId}`, 6, y);
  doc.text(`Data: ${dateFormatted}`, pageWidth - 6, y, { align: "right" });
  y += 4;

  doc.text(`Cliente: ${customerName}`, 6, y);
  y += 4;

  // Linha divisória
  doc.setLineWidth(0.2);
  doc.line(6, y, pageWidth - 6, y);
  y += 4;

  // 3. Cabeçalho dos Itens
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("QTD", 6, y);
  doc.text("ITEM / SABOR", 15, y);
  doc.text("UNIT", 54, y, { align: "right" });
  doc.text("TOTAL", pageWidth - 6, y, { align: "right" });
  y += 3;

  doc.line(6, y, pageWidth - 6, y);
  y += 3.5;

  // 4. Lista de Itens
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  venda.itens.forEach((item) => {
    const totalItem = item.quantidade * item.preco_unitario;

    doc.text(`${item.quantidade}x`, 6, y);

    // Trunca nome do produto se for longo para caber na coluna
    const nomeCortado =
      item.produto_nome.length > 20
        ? item.produto_nome.slice(0, 19) + "…"
        : item.produto_nome;
    doc.text(nomeCortado, 15, y);

    doc.text(formatCurrency(item.preco_unitario), 54, y, { align: "right" });
    doc.text(formatCurrency(totalItem), pageWidth - 6, y, { align: "right" });

    y += 4;
  });

  y += 1;
  doc.line(6, y, pageWidth - 6, y);
  y += 4.5;

  // 5. Totalizador
  const totalQuantity = venda.itens.reduce((acc, i) => acc + i.quantidade, 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Qtd. Total de Itens:`, 6, y);
  doc.text(`${totalQuantity} un.`, pageWidth - 6, y, { align: "right" });
  y += 4.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL PAGO:", 6, y);
  doc.text(formatCurrency(venda.valor_total), pageWidth - 6, y, { align: "right" });
  y += 5;

  doc.line(6, y, pageWidth - 6, y);
  y += 4;

  // 6. Dados do Pagamento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("FORMA DE PAGAMENTO:", 6, y);
  doc.text(paymentMethodLabel, pageWidth - 6, y, { align: "right" });
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);

  if (venda.forma_pagamento === "Pix") {
    doc.text("Status: Pix Stone OpenBank Confirmado [OK]", 6, y);
    y += 3.5;
    if (venda.pix_txid) {
      doc.text(`ID Transacao: ${venda.pix_txid}`, 6, y);
      y += 3.5;
    }
  } else if (
    venda.forma_pagamento === "Cartao_Credito" ||
    venda.forma_pagamento === "Cartao_Debito"
  ) {
    doc.text(`Status: Autorizado Maquininha Stone/Ton [OK]`, 6, y);
    y += 3.5;
    doc.text(`Autorizacao: AUT-${shortId}`, 6, y);
    y += 3.5;
  } else if (venda.forma_pagamento === "Dinheiro") {
    doc.text("Status: Recebido em Especie no Caixa [OK]", 6, y);
    y += 3.5;
  }

  y += 3;
  doc.setLineWidth(0.4);
  doc.line(6, y, pageWidth - 6, y);
  y += 5;

  // 7. Rodapé / Agradecimento
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Agradecemos pela sua preferencia!", pageWidth / 2, y, {
    align: "center",
  });
  y += 3.5;

  doc.setFontSize(6);
  doc.text(
    "Geladinhos artesanais gourmet de 150ml feitos com amor.",
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.text("Controle Financeiro & Gestao PereiraLabs IA", pageWidth / 2, y, {
    align: "center",
  });

  // Salva o PDF no dispositivo
  doc.save(`cupom-fiscal-venda-${shortId}.pdf`);
}

/**
 * 5. GERAÇÃO DE LINK PERMANENTE DO CUPOM
 * Sem custo de armazenamento de arquivos em servidor:
 * Os dados do pedido são codificados no próprio link (URL) em Base64 compactado,
 * permitindo que o cliente abra, visualize e baixe seu comprovante em PDF/CSV a qualquer momento
 * mesmo meses ou anos depois, em qualquer celular, sem gerar custos de nuvem ou storage!
 */
export function generatePermanentReceiptUrl(venda: VendaDetalhada): string {
  const payload = {
    i: venda.id,
    d: venda.data_venda,
    c: venda.cliente_nome || "",
    t: venda.cliente_telefone || "",
    p: venda.forma_pagamento,
    v: venda.valor_total,
    x: venda.pix_txid || "",
    it: venda.itens.map((item) => [
      item.produto_id,
      item.produto_nome,
      item.quantidade,
      item.preco_unitario,
      item.custo_unitario,
    ]),
  };

  try {
    const json = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const baseUrl = window.location.origin + window.location.pathname;
    const shortId = (venda.id.length > 8 ? venda.id.slice(-6) : venda.id).toUpperCase();
    return `${baseUrl}?recibo_d=${encoded}&id=${shortId}`;
  } catch (err) {
    console.warn("Erro ao gerar link de cupom codificado:", err);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?recibo=${venda.id}`;
  }
}

/**
 * Reconstrói a venda detalhada a partir do link codificado na URL
 */
export function parsePermanentReceiptFromUrl(): VendaDetalhada | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawData = params.get("recibo_d");
    if (!rawData) return null;

    const json = decodeURIComponent(escape(atob(rawData)));
    const p = JSON.parse(json);

    const venda: VendaDetalhada = {
      id: p.i || `PED-${Date.now().toString().slice(-6)}`,
      data_venda: p.d || new Date().toISOString(),
      cliente_nome: p.c || undefined,
      cliente_telefone: p.t || undefined,
      forma_pagamento: p.p || "Dinheiro",
      valor_total: Number(p.v) || 0,
      status: "concluida",
      pix_txid: p.x || undefined,
      itens: Array.isArray(p.it)
        ? p.it.map((item: [string, string, number, number, number], idx: number) => ({
            id: `item-${idx}`,
            produto_id: item[0],
            produto_nome: item[1],
            quantidade: Number(item[2]) || 1,
            preco_unitario: Number(item[3]) || 0,
            custo_unitario: Number(item[4]) || 0,
          }))
        : [],
    };

    return venda;
  } catch (err) {
    console.warn("Erro ao parsear dados do cupom na URL:", err);
    return null;
  }
}
