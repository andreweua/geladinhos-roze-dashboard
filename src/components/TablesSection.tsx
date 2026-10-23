import React, { useState } from "react";
import {
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  PackageCheck,
  MessageCircle,
  Smartphone,
  RotateCcw,
  X,
  AlertTriangle,
  HelpCircle,
  Check,
  ChefHat,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui/primitives";
import {
  formatCurrency,
  formatDateTime,
  PAYMENT_METHOD_LABELS,
} from "@/lib/utils";
import { EstoquePorProduto, FichaTecnicaProduto, VendaDetalhada } from "@/types/dashboard";

interface TablesSectionProps {
  ultimasVendas: VendaDetalhada[];
  reposicaoEstoque: EstoquePorProduto[];
  fichasTecnicas?: FichaTecnicaProduto[];
  onQuickStockChange: (produtoId: string, newQty: number) => void;
  onOpenStockModal: () => void;
  onCancelSale?: (
    vendaId: string,
    motivo: string,
    devolverAoEstoque: boolean
  ) => Promise<void>;
}

export const TablesSection: React.FC<TablesSectionProps> = ({
  ultimasVendas,
  reposicaoEstoque,
  fichasTecnicas = [],
  onQuickStockChange,
  onOpenStockModal,
  onCancelSale,
}) => {
  // Refund / Cancel Modal state
  const [saleToRefund, setSaleToRefund] = useState<VendaDetalhada | null>(null);
  const [refundReason, setRefundReason] = useState<string>("Cliente desistiu da compra");
  const [customReason, setCustomReason] = useState<string>("");
  const [returnStock, setReturnStock] = useState<boolean>(true);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState<boolean>(false);
  const [refundFeedback, setRefundFeedback] = useState<string | null>(null);

  const handleOpenWhatsAppReceipt = (venda: VendaDetalhada) => {
    const phone = venda.cliente_telefone ? venda.cliente_telefone.replace(/\D/g, "") : "";
    const customerName = venda.cliente_nome ? venda.cliente_nome : "Cliente";
    const itemsText = venda.itens
      .map(
        (i) =>
          `• ${i.quantidade}x ${i.produto_nome} (${formatCurrency(i.preco_unitario)})`
      )
      .join("\n");
    const text = `🍧 *GELADINHOS GOURMET DA ROZE — RECIBO DE COMPRA* 🍧\n\nOlá, *${customerName}*! Agradecemos pela preferência:\n\n${itemsText}\n\n💰 *Total: ${formatCurrency(
      venda.valor_total
    )}*\nForma de Pagamento: *${PAYMENT_METHOD_LABELS[venda.forma_pagamento]}*\nData: ${formatDateTime(
      venda.data_venda
    )}\n\nEsperamos que aprecie muito nossos geladinhos artesanais de 150ml! 🤤💖`;
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleOpenRefundModal = (venda: VendaDetalhada) => {
    setSaleToRefund(venda);
    setRefundReason("Cliente desistiu da compra");
    setCustomReason("");
    setReturnStock(true);
  };

  const handleConfirmRefund = async () => {
    if (!saleToRefund || !onCancelSale || isSubmittingRefund) return;

    setIsSubmittingRefund(true);
    try {
      const finalMotivo =
        refundReason === "Outro motivo" ? customReason.trim() || "Cancelado pelo operador" : refundReason;

      await onCancelSale(saleToRefund.id, finalMotivo, returnStock);
      setRefundFeedback(`Venda de ${formatCurrency(saleToRefund.valor_total)} estornada com sucesso!`);
      setSaleToRefund(null);
      setTimeout(() => setRefundFeedback(null), 4000);
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <section
      id="tabelas-operacionais"
      aria-label="Tabelas de Vendas e Estoque"
      className="grid grid-cols-1 gap-6 lg:grid-cols-12 relative"
    >
      {/* Toast Feedback */}
      {refundFeedback && (
        <div className="lg:col-span-12 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{refundFeedback}</span>
        </div>
      )}

      {/* MODAL DE ESTORNO / CANCELAMENTO DE VENDA */}
      {saleToRefund && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-foreground">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-rose-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Estornar / Cancelar Venda
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    A venda sairá das receitas e dos gráficos, mantendo o histórico auditável
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSaleToRefund(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Sale Info Card */}
              <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pedido / Cliente:</span>
                  <strong className="text-foreground">
                    {saleToRefund.cliente_nome || "Balcão / Presencial"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Forma de Pagamento:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {PAYMENT_METHOD_LABELS[saleToRefund.forma_pagamento]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor Total da Venda:</span>
                  <span className="text-base font-black text-rose-600">
                    {formatCurrency(saleToRefund.valor_total)}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-muted-foreground block mb-1">Itens do pedido:</span>
                  <div className="flex flex-wrap gap-1">
                    {saleToRefund.itens.map((i) => (
                      <span
                        key={i.id}
                        className="rounded bg-card border border-border px-1.5 py-0.5 text-[10px] font-semibold"
                      >
                        {i.quantidade}x {i.produto_nome}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial guidance alert */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Orientações Financeiras de Devolução:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {saleToRefund.forma_pagamento === "Pix" && (
                    <>
                      • <strong>Pix Já Creditado:</strong> Para devolver o dinheiro ao cliente, acesse o <em>App Stone / TON</em> ou seu banco e efetue um <strong>Pix de Devolução</strong> para a conta de origem. O BACEN estorna para a mesma chave em instantes.
                    </>
                  )}
                  {(saleToRefund.forma_pagamento === "Cartao_Credito" ||
                    saleToRefund.forma_pagamento === "Cartao_Debito") && (
                    <>
                      • <strong>Cartão Ton / Maquininha:</strong> O estorno deve ser efetuado diretamente na maquininha Ton ou pelo App Ton no menu <em>Vendas &gt; Cancelar Venda</em> para anular a cobrança na fatura do cliente.
                    </>
                  )}
                  {saleToRefund.forma_pagamento === "Dinheiro" && (
                    <>
                      • <strong>Dinheiro Físico:</strong> Devolva o valor de {formatCurrency(saleToRefund.valor_total)} em espécie diretamente ao cliente no balcão.
                    </>
                  )}
                </p>
              </div>

              {/* Reason selector */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Motivo do Estorno / Cancelamento:
                </label>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {[
                    "Cliente desistiu da compra",
                    "Sabor trocado / Indisponível",
                    "Pagamento duplicado / Erro de valor",
                    "Produto danificado / derretido",
                    "Outro motivo",
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRefundReason(m)}
                      className={`rounded-lg border p-2 text-left text-xs font-medium transition-colors ${
                        refundReason === m
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border/70 bg-card hover:bg-secondary/40 text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {refundReason === "Outro motivo" && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Descreva o motivo do estorno..."
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                )}
              </div>

              {/* Stock Return Checkbox */}
              <label className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-background p-3 cursor-pointer hover:bg-secondary/20 transition-colors">
                <input
                  type="checkbox"
                  checked={returnStock}
                  onChange={(e) => setReturnStock(e.target.checked)}
                  className="mt-0.5 rounded border-input text-primary focus:ring-primary"
                />
                <div className="text-xs">
                  <span className="font-bold text-foreground block">
                    Devolver unidades ao estoque físico do freezer?
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Se os geladinhos continuarem no congelador e aptos para venda, marque para estornar a baixa de estoque automaticamente (+
                    {saleToRefund.itens.reduce((acc, i) => acc + i.quantidade, 0)} unidades).
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border px-5 py-3.5 bg-secondary/20 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaleToRefund(null)}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isSubmittingRefund}
                onClick={handleConfirmRefund}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                <span>Confirmar Estorno</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TABELA 1: Tabela de Últimas Vendas (7 cols on lg) */}
      <Card className="lg:col-span-7">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-rose-500" />
                Tabela de Últimas Vendas
              </CardTitle>
              <CardDescription>
                Histórico completo com itens, pagamento, comprovante WhatsApp e opção de estorno
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {ultimasVendas.length} registros
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {ultimasVendas.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Nenhuma venda encontrada para o período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-3">Data / Hora</th>
                    <th className="pb-3 px-3">Cliente / Contato</th>
                    <th className="pb-3 px-3">Sabores & Qtd.</th>
                    <th className="pb-3 px-3">Pagamento</th>
                    <th className="pb-3 px-3 text-right">Valor Total</th>
                    <th className="pb-3 pl-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ultimasVendas.map((venda) => {
                    const isCanceled = venda.status === "cancelada";

                    return (
                      <tr
                        key={venda.id}
                        className={`transition-colors ${
                          isCanceled
                            ? "bg-rose-500/5 opacity-75 hover:bg-rose-500/10"
                            : "hover:bg-secondary/35"
                        }`}
                      >
                        <td className="whitespace-nowrap py-3 pr-3 text-xs text-muted-foreground">
                          {formatDateTime(venda.data_venda)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span
                              className={`text-xs font-semibold ${
                                isCanceled
                                  ? "line-through text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {venda.cliente_nome || "Balcão / Presencial"}
                            </span>
                            {venda.cliente_telefone && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {venda.cliente_telefone}
                              </span>
                            )}
                            {isCanceled && venda.motivo_cancelamento && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                                Motivo: {venda.motivo_cancelamento}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {venda.itens.map((item) => (
                              <span
                                key={item.id}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                  isCanceled
                                    ? "bg-secondary/50 text-muted-foreground line-through"
                                    : "bg-secondary/80 text-secondary-foreground"
                                }`}
                              >
                                {item.quantidade}x {item.produto_nome}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-3 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className="text-[11px]">
                              {PAYMENT_METHOD_LABELS[venda.forma_pagamento]}
                            </Badge>
                            {venda.status === "pendente" ? (
                              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
                                ⏳ Pix Pendente
                              </span>
                            ) : venda.status === "cancelada" ? (
                              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-400">
                                ❌ Estornada
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                                ✓ Concluída
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-3 px-3 text-right font-bold">
                          <span
                            className={
                              isCanceled
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }
                          >
                            {formatCurrency(venda.valor_total)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCanceled && (
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsAppReceipt(venda)}
                                title="Enviar resumo do pedido pelo WhatsApp"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>Whats</span>
                              </button>
                            )}

                            {!isCanceled && onCancelSale && (
                              <button
                                type="button"
                                onClick={() => handleOpenRefundModal(venda)}
                                title="Estornar / Cancelar esta venda"
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Estornar</span>
                              </button>
                            )}

                            {isCanceled && (
                              <span className="text-[11px] text-muted-foreground italic">
                                {venda.estornou_estoque
                                  ? "Estoque devolvido"
                                  : "Sem devolução"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABELA 2: Tabela de Reposição de Estoque (5 cols on lg) */}
      <Card className="lg:col-span-5">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-amber-500" />
                Tabela de Reposição de Estoque
              </CardTitle>
              <CardDescription>
                Sabores ordenados do menor para o maior estoque (Alerta &lt;{" "}
                {BRAND_CONFIG.lowStockThreshold} un.)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenStockModal}>
              Gerenciar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-2">Sabor Gourmet</th>
                  <th className="pb-3 px-2 text-center">Disponível</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                  <th className="pb-3 pl-2 text-right">Ajuste Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {reposicaoEstoque.map((item) => {
                  const ficha = fichasTecnicas.find(
                    (f) => f.produto_id === item.produto_id
                  );
                  const rendimento = ficha?.rendimento_unidades || 8;

                  return (
                    <tr
                      key={item.produto_id}
                      className={`transition-colors ${
                        item.abaixo_do_minimo
                          ? "bg-amber-500/[0.05] hover:bg-amber-500/[0.1]"
                          : "hover:bg-secondary/35"
                      }`}
                    >
                      <td className="py-3 pr-2">
                        <p className="font-semibold text-foreground">
                          {item.nome}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span>{formatCurrency(item.preco_venda)} / un.</span>
                          <span>•</span>
                          <span className="text-primary font-medium inline-flex items-center gap-0.5">
                            <ChefHat className="h-2.5 w-2.5" />
                            {rendimento} un./rec.
                          </span>
                        </p>
                      </td>

                      <td className="py-3 px-2 text-center">
                        <span
                          className={`text-sm font-extrabold ${
                            item.abaixo_do_minimo
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-foreground"
                          }`}
                        >
                          {item.quantidade_disponivel}
                        </span>{" "}
                        <span className="text-[11px] text-muted-foreground">
                          un.
                        </span>
                      </td>

                      <td className="py-3 px-2 text-center">
                        {item.abaixo_do_minimo ? (
                          <Badge
                            variant="warning"
                            className="inline-flex items-center gap-1 text-[10px]"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Repor (&lt;{BRAND_CONFIG.lowStockThreshold})
                          </Badge>
                        ) : (
                          <Badge
                            variant="success"
                            className="inline-flex items-center gap-1 text-[10px]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 pl-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onQuickStockChange(
                                item.produto_id,
                                Math.max(0, item.quantidade_disponivel - 1)
                              )
                            }
                            title="Diminuir 1 unidade"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickStockChange(
                                item.produto_id,
                                item.quantidade_disponivel + 1
                              )
                            }
                            title="Adicionar 1 unidade"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickStockChange(
                                item.produto_id,
                                item.quantidade_disponivel + rendimento
                              )
                            }
                            title={`Repor 1 receita completa (+${rendimento} unidades)`}
                            className="rounded-md bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 inline-flex items-center gap-1 shadow-sm"
                          >
                            <ChefHat className="h-3 w-3" />
                            <span>+{rendimento}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
