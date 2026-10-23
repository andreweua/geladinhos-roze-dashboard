import React, { useState } from "react";
import {
  X,
  FileText,
  Download,
  Share2,
  Copy,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  FileCode,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { VendaDetalhada } from "@/types/dashboard";
import { formatFiscalReceiptText } from "@/lib/receiptFormatter";
import {
  downloadReceiptPdf,
  downloadReceiptTxt,
  downloadReceiptCsv,
  downloadReceiptOfx,
} from "@/lib/receiptExporter";
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from "@/lib/utils";

interface ReceiptExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  venda: VendaDetalhada | null;
}

export const ReceiptExportModal: React.FC<ReceiptExportModalProps> = ({
  isOpen,
  onClose,
  venda,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen || !venda) return null;

  const shortId = (venda.id.length > 8 ? venda.id.slice(-6) : venda.id).toUpperCase();
  const rawReceiptText = formatFiscalReceiptText(venda);

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawReceiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const notifySuccess = (label: string) => {
    setDownloadSuccess(label);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadPdf = () => {
    downloadReceiptPdf(venda);
    notifySuccess("Cupom em PDF baixado com sucesso!");
  };

  const handleDownloadTxt = () => {
    downloadReceiptTxt(venda);
    notifySuccess("Cupom em Texto (.txt) baixado com sucesso!");
  };

  const handleDownloadCsv = () => {
    downloadReceiptCsv(venda);
    notifySuccess("Arquivo de despesa (.csv) baixado para Excel/Mobills!");
  };

  const handleDownloadOfx = () => {
    downloadReceiptOfx(venda);
    notifySuccess("Arquivo bancário (.ofx) gerado para software financeiro!");
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = venda.cliente_telefone ? venda.cliente_telefone.replace(/\D/g, "") : "";
    const targetUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(rawReceiptText)}`
      : `https://wa.me/?text=${encodeURIComponent(rawReceiptText)}`;
    window.open(targetUrl, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-sm">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Comprovante & Cupom do Pedido
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono font-bold">
                  #{shortId}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Exporte em PDF, TXT, CSV financeiro ou envie no WhatsApp do cliente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {downloadSuccess && (
          <div className="m-4 mb-0 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 animate-in slide-in-from-top-1">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Action Grid: 4 Download Formats */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
              Escolha o Formato de Exportação:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex items-start gap-3 p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/50 transition-all text-left group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
                      Baixar Cupom em PDF
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-rose-600 border-rose-500/40">
                      .pdf
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Formatado para impressoras térmicas (80mm) ou leitura no celular.
                  </p>
                </div>
              </button>

              {/* TXT Button */}
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex items-start gap-3 p-3.5 rounded-2xl border border-border bg-card hover:bg-secondary/40 hover:border-border transition-all text-left group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground group-hover:scale-105 transition-transform">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
                      Baixar Texto / Lista
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      .txt
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Abre no Bloco de Notas e inclui lista limpa para controle pessoal.
                  </p>
                </div>
              </button>

              {/* CSV Button (Excel / Mobills / Organizze) */}
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex items-start gap-3 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all text-left group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
                      Controle Financeiro / Despesas
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-600 border-emerald-500/40">
                      .csv
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Compatível com Excel, Google Sheets, Mobills, Organizze e Notion.
                  </p>
                </div>
              </button>

              {/* OFX Button (Bank File) */}
              <button
                type="button"
                onClick={handleDownloadOfx}
                className="flex items-start gap-3 p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-left group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm group-hover:scale-105 transition-transform">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
                      Extrato Bancário / ERP
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-blue-600 border-blue-500/40">
                      .ofx
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Padrão universal aceito por softwares de contabilidade e gestão.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* WhatsApp Direct Dispatch Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent">
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Enviar Cupom pelo WhatsApp
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {venda.cliente_telefone
                  ? `Destinatário cadastrado: ${venda.cliente_telefone}`
                  : "Abre o WhatsApp para você escolher a conversa ou grupo"}
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Abrir WhatsApp</span>
            </Button>
          </div>

          {/* Visual Receipt Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pré-visualização do Cupom:
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-4 font-mono text-[11px] text-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-56 select-all shadow-inner">
              {rawReceiptText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3.5 bg-secondary/20 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Total do Pedido: <strong className="text-foreground">{formatCurrency(venda.valor_total)}</strong> • {PAYMENT_METHOD_LABELS[venda.forma_pagamento]}
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
