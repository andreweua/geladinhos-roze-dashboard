import React, { useState } from "react";
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
} from "lucide-react";
import { BRAND_CONFIG, getCustomBrandConfig } from "@/config/brand.config";
import { getActiveCompany } from "@/services/companyService";
import { VendaDetalhada } from "@/types/dashboard";
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import {
  downloadReceiptPdf,
  downloadReceiptTxt,
  downloadReceiptCsv,
  downloadReceiptOfx,
} from "@/lib/receiptExporter";
import { formatFiscalReceiptText } from "@/lib/receiptFormatter";
import { Badge, Button } from "@/components/ui/primitives";

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

  const shortId = (venda.id.length > 8 ? venda.id.slice(-6) : venda.id).toUpperCase();
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
    const textWithUrl = `${rawText}\n\n👉 Acesse e baixe seu cupom em PDF a qualquer momento:\n${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(textWithUrl)}`;
    window.open(url, "_blank");
  };

  const handleOpenStoreWhatsApp = () => {
    const phone = BRAND_CONFIG.tonConfig.whatsappNumber || "5514988183327";
    const msg = `Olá, Roze! Gostaria de fazer um novo pedido de geladinhos artesanais gourmet! 🍨✨`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const totalQuantity = venda.itens.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-500/10 via-background to-secondary/30 p-4 sm:p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl backdrop-blur-xl">
        {/* Top Decorative Strip */}
        <div className="bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 p-1" />

        {/* Brand Header */}
        <div className="p-6 text-center border-b border-border/60 bg-secondary/20 relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute left-4 top-4 rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </button>
          )}

          <div className="inline-flex relative mb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-500/25">
              <IceCreamCone className="h-8 w-8" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white shadow">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-foreground">
            {getActiveCompany()?.nome || getCustomBrandConfig()?.companyName || BRAND_CONFIG.companyName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getActiveCompany()?.nicho || getCustomBrandConfig()?.tagline || BRAND_CONFIG.tagline}
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs font-mono font-bold border-rose-500/40 text-rose-600 dark:text-rose-400">
              Cupom #{shortId}
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

        {/* Receipt Content */}
        <div className="p-6 space-y-5">
          {/* Status Box */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Pagamento Confirmado
            </span>
            <p className="text-2xl font-black text-foreground">
              {formatCurrency(venda.valor_total)}
            </p>
            <p className="text-xs text-muted-foreground">
              Recebido via <strong>{PAYMENT_METHOD_LABELS[venda.forma_pagamento] || venda.forma_pagamento}</strong>
              {venda.pix_txid && ` • ID: ${venda.pix_txid.slice(0, 14)}...`}
            </p>
          </div>

          {/* Customer Name */}
          <div className="flex items-center justify-between text-xs py-1 border-b border-border/50 text-muted-foreground">
            <span>Cliente:</span>
            <span className="font-bold text-foreground">
              {venda.cliente_nome ? venda.cliente_nome.trim() : "Consumidor Final"}
            </span>
          </div>

          {/* Items Purchased Table */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Itens do Pedido ({totalQuantity} un.):
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

          {/* Download Options (PDF, TXT, CSV, OFX) */}
          <div className="space-y-2.5 pt-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Salvar / Importar no Seu Aparelho:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  downloadReceiptPdf(venda);
                  notifySuccess("Cupom em PDF baixado no seu aparelho!");
                }}
                className="flex items-center gap-2 p-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <span className="block leading-none">Baixar PDF</span>
                  <span className="text-[10px] font-normal opacity-80">Cupom térmico</span>
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
                  <span className="text-[10px] font-normal opacity-80">Lista p/ Bloco Notas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadReceiptCsv(venda);
                  notifySuccess("Arquivo .csv baixado para seu app de despesas/Excel!");
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
                  <span>Copiar Cupom</span>
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
              Amou nossos geladinhos? Quer encomendar para a sua festa ou casa?
            </p>
            <button
              type="button"
              onClick={handleOpenStoreWhatsApp}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 p-3 text-xs font-bold text-white shadow-md shadow-rose-500/20 hover:opacity-95 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Fazer Novo Pedido com a Roze no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/80 px-6 py-3 bg-secondary/30 text-center text-[10px] text-muted-foreground">
          Documento Não Fiscal • {BRAND_CONFIG.developerCredit.studio}
        </div>
      </div>
    </div>
  );
};
