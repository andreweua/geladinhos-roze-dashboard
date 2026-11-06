import React, { useState, useMemo } from "react";
import {
  Receipt,
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  Share2,
  CheckCircle2,
  Copy,
  ArrowLeft,
  IceCreamCone,
  ExternalLink,
  MessageCircle,
  Printer,
  Train,
  Sparkles,
  Award,
} from "lucide-react";
import { BRAND_CONFIG, getCustomBrandConfig } from "@/config/brand.config";
import { getActiveCompany } from "@/services/companyService";
import { VendaDetalhada } from "@/types/dashboard";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  downloadReceiptPdf,
  downloadReceiptTxt,
  downloadReceiptCsv,
  downloadReceiptOfx,
} from "@/lib/receiptExporter";
import { formatFiscalReceiptText, resolveReceiptTexts, getTicketNumber, getReceiptPaymentLabel } from "@/lib/receiptFormatter";
import { buscarCliente, getPassaporteGrid } from "@/services/customerService";
import { Badge, Button } from "@/components/ui/primitives";
import { ESTACAO_DA_RO_HEADER_BASE64 } from "@/data/estacaoHeaderImage";

interface CustomerReceiptViewProps {
  venda: VendaDetalhada;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const CustomerReceiptView: React.FC<CustomerReceiptViewProps> = ({
  venda,
  onClose,
  isStandalone = false,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shortId = getTicketNumber(venda);
  const receiptTexts = useMemo(() => resolveReceiptTexts(venda), [venda]);
  const rawText = formatFiscalReceiptText(venda);

  const notifySuccess = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const textWithUrl = `${rawText}\n\n👉 Acesse e baixe seu bilhete de embarque a qualquer momento:\n${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(textWithUrl)}`;
    window.open(url, "_blank");
  };

  const handleOpenStoreWhatsApp = () => {
    const phone = BRAND_CONFIG.tonConfig.whatsappNumber || "5514988183327";
    const msg = `Olá, Estação da Rô! Gostaria de fazer um novo pedido de geladinhos artesanais gourmet da Estrada Real! 🍨🚂`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePrintThermal = () => {
    window.print();
  };

  const totalQuantity = venda.itens.reduce((acc, i) => acc + i.quantidade, 0);

  // Informações de Fidelidade do Passaporte da Estrada Real
  const loyaltyData = useMemo(() => {
    const existingCust = venda.cliente_telefone
      ? buscarCliente(venda.cliente_telefone, venda.empresaId || "emp-roze-gourmet")
      : null;

    let stamps = venda.selos_fidelidade;
    if (stamps === undefined && existingCust) {
      stamps = existingCust.selos_atuais;
    }
    if (stamps === undefined) {
      stamps = totalQuantity % 10 === 0 && totalQuantity > 0 ? 10 : totalQuantity % 10;
    }

    const hasReward = Boolean(
      (venda.recompensas_fidelidade && venda.recompensas_fidelidade > 0) ||
      (existingCust && existingCust.recompensas_disponiveis > 0) ||
      stamps === 10
    );

    return {
      stamps: Math.max(0, Math.min(10, stamps)),
      hasReward,
      gridText: getPassaporteGrid(stamps, hasReward),
    };
  }, [venda, totalQuantity]);

  const passengerName = venda.cliente_nome ? venda.cliente_nome.trim() : "Passageiro(a) Gourmet";
  const originStation = receiptTexts.origem;
  const currentStopStation = receiptTexts.parada;
  const nextStopStation = receiptTexts.proximaParada;
  const destinationStation = receiptTexts.destino;
  const paymentLabel = getReceiptPaymentLabel(venda.forma_pagamento);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-500/10 via-background to-secondary/30 p-3 sm:p-6 flex flex-col items-center justify-center">
      {/* Estilos dedicados para impressão contínua em impressora térmica de 80mm */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-print-slip, #thermal-print-slip * {
            visibility: visible !important;
          }
          #thermal-print-slip {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 3mm 4mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
        }
        @media screen {
          #thermal-print-slip {
            display: none;
          }
        }
      `}</style>

      {/* BILHETE TÉRMICO OCULTO (Renderizado exclusivamente na Impressão 80mm) */}
      <div id="thermal-print-slip" className="hidden">
        {receiptTexts.tipoCupom !== "padrao_comercial" ? (
          <div style={{ textAlign: "center", marginBottom: "6px" }}>
            <img
              src={ESTACAO_DA_RO_HEADER_BASE64}
              alt="Estação da Rô"
              style={{ width: "100%", maxHeight: "115px", objectFit: "contain", margin: "0 auto 4px auto", display: "block" }}
            />
            <div style={{ borderBottom: "2px solid #000", margin: "3px 0 1px 0" }} />
            <div style={{ borderBottom: "1px solid #000", margin: "0 0 4px 0" }} />
            <strong style={{ fontSize: "11px", display: "block", letterSpacing: "0.5px" }}>BILHETE DE EMBARQUE GOURMET</strong>
            <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }} />
          </div>
        ) : (
          <div style={{ textAlign: "center", marginBottom: "4px" }}>
            <strong style={{ fontSize: "13px", display: "block" }}>{receiptTexts.companyName.toUpperCase()}</strong>
            <span style={{ fontSize: "9px", fontStyle: "italic", display: "block" }}>
              {receiptTexts.companyTagline}
            </span>
            <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }} />
            <strong style={{ fontSize: "11px", display: "block" }}>CUPOM NÃO FISCAL</strong>
            <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }} />
          </div>
        )}

        <div style={{ fontSize: "10px", marginBottom: "4px" }}>
          <div><strong>Passageiro(a):</strong> {passengerName}</div>
          <div><strong>Bilhete:</strong> {shortId}</div>
          {receiptTexts.tipoCupom !== "padrao_comercial" && <div><strong>Linha:</strong> {receiptTexts.linha}</div>}
          <div><strong>Atendimento:</strong> {receiptTexts.tipoEntregaLabel}</div>
          <div><strong>Origem:</strong> {originStation}</div>
          <div><strong>Parada:</strong> {currentStopStation}</div>
          <div><strong>Próxima Parada:</strong> {nextStopStation}</div>
          <div><strong>Destino:</strong> {destinationStation}</div>
          <div><strong>Embarque:</strong> {formatDateTime(venda.data_venda)}</div>
        </div>

        <div style={{ borderBottom: "1px solid #000", margin: "4px 0" }} />

        <div style={{ fontSize: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderBottom: "1px dashed #000", paddingBottom: "2px" }}>
            <span>QTD ITEM</span>
            <span>TOTAL</span>
          </div>
          {venda.itens.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
              <span>{it.quantidade}x {it.produto_nome.slice(0, 18)}</span>
              <span>{formatCurrency(it.quantidade * it.preco_unitario)}</span>
            </div>
          ))}
        </div>

        <div style={{ borderBottom: "1px solid #000", margin: "4px 0" }} />

        <div style={{ fontSize: "11px", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
          <span>TOTAL DA PASSAGEM:</span>
          <span>{formatCurrency(venda.valor_total)}</span>
        </div>
        <div style={{ fontSize: "9.5px", marginTop: "2px" }}>
          Pagamento: <strong>{paymentLabel}</strong>
          {venda.pix_txid && <span> • ID: {venda.pix_txid.slice(0, 12)}</span>}
        </div>

        <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }} />

        {/* Passaporte da Estrada Real na Impressão Térmica */}
        <div style={{ textAlign: "center", margin: "4px 0" }}>
          <strong style={{ fontSize: "10.5px", display: "block" }}>PASSAPORTE DA ESTRADA REAL</strong>
          <div style={{ fontFamily: "monospace", fontSize: "11px", letterSpacing: "1px", margin: "3px 0", fontWeight: "bold" }}>
            {loyaltyData.gridText}
          </div>
          {loyaltyData.hasReward && (
            <div style={{ fontWeight: "bold", fontSize: "10px", margin: "2px 0", border: "1px solid #000", padding: "2px" }}>
              ⭐ VIAGEM DOCE GRÁTIS DISPONÍVEL! ⭐
            </div>
          )}
        </div>

        <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }} />

        <div style={{ textAlign: "center", fontSize: "9px" }}>
          <p style={{ margin: "2px 0", fontStyle: "italic" }}>
            A cada 10 paradas, ganhe 1 viagem doce! Guarde este bilhete.
          </p>
          <p style={{ margin: "2px 0" }}>
            WhatsApp: (14) 98818-3327 • Instagram: @estacaodaro.gourmet
          </p>
          <div style={{ fontSize: "8px", color: "#444", marginTop: "4px" }}>
            PereiraLabs - Divisão de Tecnologia e IA
          </div>
        </div>
      </div>

      {/* CARD PRINCIPAL INTERATIVO (TELA / NAVEGADOR) */}
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-card shadow-2xl backdrop-blur-xl">
        {/* Top Decorative Railroad Strip */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 p-1.5 flex items-center justify-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
            <Train className="h-3.5 w-3.5" />
            Estrada Real • Linha Gourmet da Roze
          </span>
        </div>

        {/* Brand Boarding Pass Header */}
        <div className="p-5 text-center border-b border-border/60 bg-gradient-to-b from-amber-500/10 to-transparent relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute left-4 top-4 z-10 rounded-xl p-2 text-muted-foreground bg-background/80 hover:bg-secondary hover:text-foreground text-xs font-semibold flex items-center gap-1 transition-colors backdrop-blur-sm shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
          )}

          {receiptTexts.tipoCupom !== "padrao_comercial" ? (
            <div className="mb-3 flex flex-col items-center">
              <div className="overflow-hidden rounded-2xl border border-amber-500/40 shadow-lg shadow-amber-500/15 max-w-[360px] w-full bg-black/5">
                <img
                  src={ESTACAO_DA_RO_HEADER_BASE64}
                  alt="Estação da Rô - Jaú SP"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="inline-flex relative mb-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/25">
                  <Train className="h-8 w-8" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>

              <h2 className="text-xl font-black tracking-tight text-foreground">
                {receiptTexts.companyName.toUpperCase()}
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                {receiptTexts.companyTagline}
              </p>
            </>
          )}

          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs font-mono font-bold border-amber-500/40 text-amber-700 dark:text-amber-400">
              BILHETE {shortId}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {formatDateTime(venda.data_venda)}
            </Badge>
          </div>
        </div>

        {/* Feedback Alert */}
        {downloadSuccess && (
          <div className="m-4 mb-0 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 animate-in slide-in-from-top-1">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Boarding Details & Passport Content */}
        <div className="p-6 space-y-5">
          {/* Boarding Info Box */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <span className="text-muted-foreground">Passageiro(a):</span>
              <strong className="text-foreground text-sm">{passengerName}</strong>
            </div>
            {receiptTexts.tipoCupom !== "padrao_comercial" && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Linha:</span>
                <strong className="text-foreground text-right">{receiptTexts.linha}</strong>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Atendimento:</span>
              <strong className="text-foreground text-right">{receiptTexts.tipoEntregaLabel}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Origem:</span>
              <strong className="text-foreground">{originStation}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Parada:</span>
              <strong className="text-foreground text-right">{currentStopStation}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Próxima Parada:</span>
              <strong className="text-foreground text-right">{nextStopStation}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Destino:</span>
              <strong className="text-foreground text-right">{destinationStation}</strong>
            </div>
          </div>

          {/* Status Box */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Passagem Confirmada & Paga
            </span>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(venda.valor_total)}
            </p>
            <p className="text-xs text-muted-foreground">
              Recebido via <strong>{paymentLabel}</strong>
              {venda.pix_txid && ` • ID: ${venda.pix_txid.slice(0, 14)}...`}
            </p>
          </div>

          {/* PASSAPORTE DA ESTRADA REAL - GRADE DE 10 SELOS */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-rose-500/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                  Passaporte da Estrada Real
                </span>
              </div>
              <Badge variant="outline" className="text-[11px] font-bold border-amber-500/40 text-amber-700 dark:text-amber-300">
                {loyaltyData.stamps}/10 Paradas
              </Badge>
            </div>

            {/* Grid Visual de 10 Posições */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
              {Array.from({ length: 10 }, (_, idx) => {
                const isStamped = idx < loyaltyData.stamps;
                return (
                  <div
                    key={idx}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center border text-center transition-all ${
                      isStamped
                        ? "border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black shadow-xs scale-102"
                        : "border-border/60 bg-secondary/30 text-muted-foreground/60"
                    }`}
                  >
                    <span className="text-[9px] font-mono leading-none">{idx + 1}</span>
                    <span className="text-xs font-black leading-none mt-0.5">
                      {isStamped ? "✓" : "○"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Banner de Viagem Grátis se completou 10 paradas */}
            {loyaltyData.hasReward ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-2.5 text-center space-y-0.5 animate-pulse">
                <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  VIAGEM DOCE GRÁTIS DISPONÍVEL!
                  <Sparkles className="h-3.5 w-3.5" />
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Parabéns! Apresente este bilhete para resgatar seu geladinho cortesia.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-center text-muted-foreground italic">
                A cada 10 paradas, ganhe 1 viagem doce! Guarde este bilhete.
              </p>
            )}
          </div>

          {/* Items Purchased Table */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Sabores a Bordo ({totalQuantity} un.):
            </p>
            <div className="rounded-2xl border border-border/80 bg-secondary/30 divide-y divide-border/60 overflow-hidden">
              {venda.itens.map((item) => (
                <div
                  key={item.id}
                  className="p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">
                      {item.quantidade}x {item.produto_nome}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCurrency(item.preco_unitario)} cada
                    </p>
                  </div>
                  <span className="font-bold text-foreground">
                    {formatCurrency(item.quantidade * item.preco_unitario)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Download & Thermal Print Actions */}
          <div className="space-y-2.5 pt-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Impressão Térmica & Exportações:
            </p>

            {/* Botão de Impressão Térmica 80mm Contínua */}
            <button
              type="button"
              onClick={handlePrintThermal}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-900 dark:text-amber-200 font-black text-xs shadow-sm transition-all"
            >
              <Printer className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Imprimir Bilhete Térmico (80mm)</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  downloadReceiptPdf(venda);
                  notifySuccess("Bilhete de embarque em PDF baixado!");
                }}
                className="flex items-center gap-2 p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <span className="block leading-none">Baixar PDF</span>
                  <span className="text-[10px] font-normal opacity-80">Cupom 80mm</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadReceiptTxt(venda);
                  notifySuccess("Comprovante em Texto (.txt) baixado!");
                }}
                className="flex items-center gap-2 p-3 rounded-2xl border border-border bg-secondary/50 hover:bg-secondary text-foreground font-bold text-xs transition-colors"
              >
                <Download className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <span className="block leading-none">Salvar TXT</span>
                  <span className="text-[10px] font-normal opacity-80">Bloco de Notas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadReceiptCsv(venda);
                  notifySuccess("Arquivo .csv baixado para despesas/Excel!");
                }}
                className="flex items-center gap-2 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <span className="block leading-none">Exportar CSV</span>
                  <span className="text-[10px] font-normal opacity-80">Excel & Mobills</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadReceiptOfx(venda);
                  notifySuccess("Extrato .ofx baixado para software financeiro!");
                }}
                className="flex items-center gap-2 p-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs transition-colors"
              >
                <FileCode className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <span className="block leading-none">Baixar OFX</span>
                  <span className="text-[10px] font-normal opacity-80">Controle bancário</span>
                </div>
              </button>
            </div>
          </div>

          {/* Social / WhatsApp Sharing */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyText}
              className="flex-1 text-xs gap-1.5"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Bilhete</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleShareWhatsApp}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </Button>
          </div>

          {/* Fast Order / Return to Store Button */}
          <div className="pt-2 border-t border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground mb-2">
              Deseja pedir mais geladinhos artesanais da Estrada Real para a sua casa ou evento?
            </p>
            <button
              type="button"
              onClick={handleOpenStoreWhatsApp}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-rose-600 p-3 text-xs font-bold text-white shadow-md shadow-amber-500/20 hover:opacity-95 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Fazer Novo Pedido com a Roze no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/80 px-6 py-3 bg-secondary/30 text-center text-[10px] text-muted-foreground">
          A cada 10 paradas, ganhe 1 viagem doce! Guarde este bilhete. • {BRAND_CONFIG.developerCredit.studio}
        </div>
      </div>
    </div>
  );
};
