import React, { useState } from "react";
import {
  X,
  Lock,
  Unlock,
  Coins,
  Banknote,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MessageCircle,
  FileText,
  DollarSign,
  Printer,
} from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  CashShift,
  openCashShift,
  closeCashShift,
  formatShiftClosingReport,
} from "@/services/cashShiftService";
import { VendaDetalhada } from "@/types/dashboard";

interface CashShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: CashShift | null;
  operadorNome: string;
  vendas: VendaDetalhada[];
  onShiftUpdated: (shift: CashShift | null) => void;
  empresaId?: string;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  operadorNome,
  vendas,
  onShiftUpdated,
  empresaId,
}) => {
  // Mode: "abertura" ou "fechamento"
  const isOpening = !currentShift;

  // Form states - Abertura
  const [dinheiroCedulas, setDinheiroCedulas] = useState("50.00");
  const [moedas, setMoedas] = useState("20.00");
  const [maquininhaInicial, setMaquininhaInicial] = useState("0.00");
  const [observacoesAbertura, setObservacoesAbertura] = useState("");

  // Form states - Fechamento
  const [dinheiroCedulasFechamento, setDinheiroCedulasFechamento] = useState("");
  const [moedasFechamento, setMoedasFechamento] = useState("");
  const [maquininhaFechamento, setMaquininhaFechamento] = useState("");
  const [observacoesFechamento, setObservacoesFechamento] = useState("");
  const [closedShiftResult, setClosedShiftResult] = useState<CashShift | null>(null);

  if (!isOpen) return null;

  // Cálculos do turno aberto
  const shiftStartTime = currentShift
    ? new Date(currentShift.dataAbertura).getTime()
    : 0;
  const vendasDoTurno = vendas.filter(
    (v) =>
      v.status === "concluida" &&
      new Date(v.data_venda).getTime() >= shiftStartTime
  );

  let totalDinheiroVendas = 0;
  let totalPixVendas = 0;
  let totalCartaoVendas = 0;

  vendasDoTurno.forEach((v) => {
    if (v.forma_pagamento === "Dinheiro") totalDinheiroVendas += v.valor_total;
    else if (v.forma_pagamento === "Pix") totalPixVendas += v.valor_total;
    else if (v.forma_pagamento.startsWith("Cartao")) totalCartaoVendas += v.valor_total;
  });

  const fundoDinheiro = currentShift
    ? currentShift.abertura.dinheiroCedulas + currentShift.abertura.moedas
    : 0;
  const saldoEsperadoDinheiro = fundoDinheiro + totalDinheiroVendas;

  // Handler: Confirmar Abertura
  const handleConfirmOpen = (e: React.FormEvent) => {
    e.preventDefault();
    const newShift = openCashShift({
      empresaId,
      operadorNome,
      dinheiroCedulas: parseFloat(dinheiroCedulas) || 0,
      moedas: parseFloat(moedas) || 0,
      maquininhaCartaoInicial: parseFloat(maquininhaInicial) || 0,
      observacoes: observacoesAbertura,
    });
    onShiftUpdated(newShift);
    onClose();
  };

  // Handler: Confirmar Fechamento
  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;

    const closed = closeCashShift({
      empresaId,
      shiftId: currentShift.id,
      dinheiroCedulas: parseFloat(dinheiroCedulasFechamento) || 0,
      moedas: parseFloat(moedasFechamento) || 0,
      maquininhaCartao: parseFloat(maquininhaFechamento) || 0,
      observacoes: observacoesFechamento,
      vendasDoTurno: vendas,
    });

    setClosedShiftResult(closed);
    onShiftUpdated(null);
  };

  // Handler: Enviar Relatório no WhatsApp do Dono
  const handleSendWhatsAppReport = () => {
    if (!closedShiftResult) return;
    const text = formatShiftClosingReport(closedShiftResult);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isOpening
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              }`}
            >
              {isOpening ? (
                <Unlock className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm sm:text-base">
                {isOpening ? "Abertura de Caixa (Novo Turno)" : "Fechamento de Caixa"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Operador: <strong className="text-foreground">{operadorNome}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {closedShiftResult ? (
            /* Tela de Resultado do Fechamento */
            <div className="space-y-5 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-foreground">
                  Caixa Fechado com Sucesso!
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  O turno foi finalizado e os dados foram arquivados com segurança.
                </p>
              </div>

              {/* Balanço Dinheiro */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo Esperado em Dinheiro:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(closedShiftResult.fechamento?.saldoEsperadoDinheiro || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Dinheiro Informado:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(closedShiftResult.fechamento?.totalDinheiroInformado || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/80">
                  <span className="font-bold text-foreground">Diferença em Dinheiro:</span>
                  <span
                    className={`font-black ${
                      (closedShiftResult.fechamento?.diferencaDinheiro || 0) === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : (closedShiftResult.fechamento?.diferencaDinheiro || 0) > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {(closedShiftResult.fechamento?.diferencaDinheiro || 0) === 0
                      ? "R$ 0,00 (Caixa Exato)"
                      : (closedShiftResult.fechamento?.diferencaDinheiro || 0) > 0
                      ? `+${formatCurrency(closedShiftResult.fechamento?.diferencaDinheiro || 0)} (Sobra)`
                      : `${formatCurrency(closedShiftResult.fechamento?.diferencaDinheiro || 0)} (Falta)`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleSendWhatsAppReport}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 py-2.5 rounded-xl text-xs"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Enviar Relatório no WhatsApp</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full text-xs font-semibold"
                >
                  Concluir e Voltar
                </Button>
              </div>
            </div>
          ) : isOpening ? (
            /* Formulário: Abertura de Caixa */
            <form onSubmit={handleConfirmOpen} className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-bold">Informe o Fundo de Troco Inicial</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Informe o valor que você está colocando na gaveta para iniciar as vendas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Dinheiro em Cédulas (Notas em Papel)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={dinheiroCedulas}
                    onChange={(e) => setDinheiroCedulas(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span>Moedas (Troco em Moeda)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={moedas}
                    onChange={(e) => setMoedas(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Saldo Anterior na Maquininha (Opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={maquininhaInicial}
                    onChange={(e) => setMaquininhaInicial(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Se a maquininha já tinha vendas de turno anterior, digite o total para conferência.
                </p>
              </div>

              {/* Total do Fundo */}
              <div className="rounded-2xl border border-border bg-secondary/40 p-3.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">
                  Fundo de Troco Total em Dinheiro:
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    (parseFloat(dinheiroCedulas) || 0) + (parseFloat(moedas) || 0)
                  )}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Observações de Abertura (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoesAbertura}
                  onChange={(e) => setObservacoesAbertura(e.target.value)}
                  placeholder="Ex: Turno da manhã, troco em notas de R$ 5 e R$ 10"
                  className="w-full rounded-xl border border-border bg-background py-2 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs gap-2 shadow-md"
              >
                <Unlock className="h-4 w-4" />
                <span>Confirmar Abertura de Caixa</span>
              </Button>
            </form>
          ) : (
            /* Formulário: Fechamento de Caixa */
            <form onSubmit={handleConfirmClose} className="space-y-4">
              {/* Resumo do Turno Atual */}
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border/80">
                  <span className="font-bold text-foreground">
                    Resumo das Vendas do Turno
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {vendasDoTurno.length} pedido(s)
                  </Badge>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Fundo de Troco Inicial:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(fundoDinheiro)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Vendas em Dinheiro:</span>
                  <span className="font-semibold text-foreground">
                    +{formatCurrency(totalDinheiroVendas)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Vendas em Pix Stone:</span>
                  <span className="font-semibold text-foreground">
                    +{formatCurrency(totalPixVendas)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Vendas em Cartão (Maquininha):</span>
                  <span className="font-semibold text-foreground">
                    +{formatCurrency(totalCartaoVendas)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/80 font-bold text-foreground">
                  <span>Saldo Esperado em Dinheiro na Gaveta:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    {formatCurrency(saldoEsperadoDinheiro)}
                  </span>
                </div>
              </div>

              {/* Conferência Física na Gaveta */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conferência Física (Contagem no Fechamento)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Cédulas Contadas na Gaveta (Notas)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      required
                      placeholder="0.00"
                      value={dinheiroCedulasFechamento}
                      onChange={(e) => setDinheiroCedulasFechamento(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span>Moedas Contadas</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      required
                      placeholder="0.00"
                      value={moedasFechamento}
                      onChange={(e) => setMoedasFechamento(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>Total Tirado no Relatório da Maquininha Stone</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      required
                      placeholder="0.00"
                      value={maquininhaFechamento}
                      onChange={(e) => setMaquininhaFechamento(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Observações de Fechamento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={observacoesFechamento}
                    onChange={(e) => setObservacoesFechamento(e.target.value)}
                    placeholder="Ex: Diferença de centavos por troco arredondado"
                    className="w-full rounded-xl border border-border bg-background py-2 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs gap-2 shadow-md"
              >
                <Lock className="h-4 w-4" />
                <span>Confirmar Fechamento de Caixa</span>
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
