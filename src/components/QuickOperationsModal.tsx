import React, { useState } from "react";
import {
  X,
  PlusCircle,
  PackagePlus,
  ShoppingCart,
  RotateCcw,
  Sparkles,
  Check,
  ChefHat,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { EstoquePorProduto, FichaTecnicaProduto, PaymentMethod } from "@/types/dashboard";
import { NewProductPayload, NewSalePayload } from "@/services/dataService";
import { CashShift } from "@/services/cashShiftService";

interface QuickOperationsModalProps {
  isOpen: boolean;
  initialTab: "venda" | "estoque";
  onClose: () => void;
  inventoryByFlavor: EstoquePorProduto[];
  fichasTecnicas?: FichaTecnicaProduto[];
  onSubmitSale: (payload: NewSalePayload) => Promise<void>;
  onUpdateStock: (produtoId: string, newQty: number) => Promise<void>;
  onCreateProduct: (payload: NewProductPayload) => Promise<void>;
  onResetDemoData: () => void;
  dataSource: "supabase" | "demo_local";
  currentShift?: CashShift | null;
  onOpenCashShift?: () => void;
}

export const QuickOperationsModal: React.FC<QuickOperationsModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  inventoryByFlavor,
  fichasTecnicas = [],
  onSubmitSale,
  onUpdateStock,
  onCreateProduct,
  onResetDemoData,
  dataSource,
  currentShift,
  onOpenCashShift,
}) => {
  const [activeTab, setActiveTab] = useState<"venda" | "estoque">(initialTab);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [stockSuccessMsg, setStockSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New flavor form state
  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState("8.50");
  const [novoCusto, setNovoCusto] = useState("3.10");
  const [novoEstoque, setNovoEstoque] = useState("20");

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleQtyChange = (produtoId: string, delta: number) => {
    const item = inventoryByFlavor.find((p) => p.produto_id === produtoId);
    const maxDisponivel = item ? item.quantidade_disponivel : 0;

    setQuantities((prev) => {
      const current = prev[produtoId] || 0;
      if (delta > 0 && current >= maxDisponivel) {
        return prev;
      }
      const next = Math.max(0, Math.min(maxDisponivel, current + delta));
      return { ...prev, [produtoId]: next };
    });
  };

  const selectedItems = inventoryByFlavor
    .map((prod) => ({
      ...prod,
      qtdSelecionada: quantities[prod.produto_id] || 0,
    }))
    .filter((i) => i.qtdSelecionada > 0);

  const totalVenda = selectedItems.reduce(
    (acc, item) => acc + item.qtdSelecionada * item.preco_venda,
    0
  );
  const lucroEstimadoVenda = selectedItems.reduce(
    (acc, item) =>
      acc + item.qtdSelecionada * (item.preco_venda - item.custo_estimado),
    0
  );

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    if (!currentShift) {
      if (onOpenCashShift) {
        onClose();
        onOpenCashShift();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitSale({
        forma_pagamento: paymentMethod,
        itens: selectedItems.map((i) => ({
          produto_id: i.produto_id,
          quantidade: i.qtdSelecionada,
        })),
      });
      setQuantities({});
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFlavor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateProduct({
        nome: novoNome.trim(),
        preco_venda: parseFloat(novoPreco) || 8.0,
        custo_estimado: parseFloat(novoCusto) || 3.0,
        estoque_inicial: parseInt(novoEstoque, 10) || 15,
      });
      setNovoNome("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-bold text-foreground">
              Central Rápida — Geladinhos da Roze
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-secondary/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("venda")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === "venda"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Registrar Nova Venda
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("estoque")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              activeTab === "estoque"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <PackagePlus className="h-4 w-4" />
            Estoque & Sabores
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "venda" ? (
            <form onSubmit={handleConfirmSale} className="space-y-5">
              {!currentShift && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Caixa Fechado:</strong> É obrigatório abrir o caixa informando o troco inicial antes de lançar vendas.
                    </span>
                  </div>
                  {onOpenCashShift && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onOpenCashShift();
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      Abrir Caixa Agora
                    </Button>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Selecione os Sabores e Quantidades
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {inventoryByFlavor.map((prod) => {
                    const qtd = quantities[prod.produto_id] || 0;
                    return (
                      <div
                        key={prod.produto_id}
                        className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                          qtd > 0
                            ? "border-primary bg-primary/5"
                            : "border-border/70 bg-background/60"
                        }`}
                      >
                        <div className="pr-2">
                          <p className="text-xs font-bold text-foreground">
                            {prod.nome}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatCurrency(prod.preco_venda)} • Est:{" "}
                            <span
                              className={
                                prod.abaixo_do_minimo
                                  ? "font-semibold text-amber-500"
                                  : ""
                              }
                            >
                              {prod.quantidade_disponivel} un.
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(prod.produto_id, -1)}
                            disabled={qtd === 0}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-sm font-bold hover:bg-secondary disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-extrabold">
                            {qtd}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(prod.produto_id, 1)}
                            disabled={
                              prod.quantidade_disponivel <= 0 ||
                              qtd >= prod.quantidade_disponivel
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      "Pix",
                      "Cartao_Credito",
                      "Cartao_Debito",
                      "Dinheiro",
                    ] as PaymentMethod[]
                  ).map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setPaymentMethod(metodo)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                        paymentMethod === metodo
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                      }`}
                    >
                      {PAYMENT_METHOD_LABELS[metodo]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total da Venda ({selectedItems.reduce((a, b) => a + b.qtdSelecionada, 0)}{" "}
                    geladinhos)
                  </p>
                  <p className="text-2xl font-extrabold text-foreground">
                    {formatCurrency(totalVenda)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Lucro bruto estimado: +{formatCurrency(lucroEstimadoVenda)}
                  </p>
                </div>

                {!currentShift ? (
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => {
                      onClose();
                      if (onOpenCashShift) onOpenCashShift();
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Abrir Caixa para Vender</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={selectedItems.length === 0 || isSubmitting}
                    className="bg-gradient-to-r from-rose-600 to-rose-500 text-white"
                  >
                    <Check className="h-4 w-4" />
                    {isSubmitting ? "Salvando..." : "Concluir Venda"}
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Add new flavor form */}
              <form
                onSubmit={handleCreateFlavor}
                className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3"
              >
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                  <PlusCircle className="h-4 w-4 text-rose-500" />
                  Cadastrar Novo Sabor Gourmet
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Nome do Sabor
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sensação Trufado"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Preço Venda (R$)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      required
                      value={novoPreco}
                      onChange={(e) => setNovoPreco(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Custo Unit. (R$)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      required
                      value={novoCusto}
                      onChange={(e) => setNovoCusto(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3 pt-1">
                  <div className="w-40">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Estoque Inicial (un.)
                    </label>
                    <input
                      type="number"
                      required
                      value={novoEstoque}
                      onChange={(e) => setNovoEstoque(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    Adicionar Sabor
                  </Button>
                </div>
              </form>

              {/* Quick Inventory List */}
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Reposição por Receita & Ajuste de Lotes
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Adicione o rendimento exato da batelada ou digite um valor livre.
                    </p>
                  </div>
                  {dataSource === "demo_local" && (
                    <button
                      type="button"
                      onClick={onResetDemoData}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restaurar Dados Demo Padrão
                    </button>
                  )}
                </div>

                {stockSuccessMsg && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{stockSuccessMsg}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  {inventoryByFlavor.map((item) => {
                    const ficha = fichasTecnicas.find(
                      (f) => f.produto_id === item.produto_id
                    );
                    const rendimento = ficha?.rendimento_unidades || 8;
                    const customVal = customValues[item.produto_id] || "";

                    const handleAddYield = async (multiplier = 1) => {
                      const added = rendimento * multiplier;
                      await onUpdateStock(
                        item.produto_id,
                        item.quantidade_disponivel + added
                      );
                      setStockSuccessMsg(
                        `+${added} un. (${multiplier}x receita de ${item.nome}) adicionadas ao estoque!`
                      );
                      setTimeout(() => setStockSuccessMsg(null), 3500);
                    };

                    const handleApplyCustom = async (mode: "somar" | "definir") => {
                      const num = parseInt(customVal, 10);
                      if (isNaN(num) || num < 0) return;
                      const targetQty =
                        mode === "somar" ? item.quantidade_disponivel + num : num;
                      await onUpdateStock(item.produto_id, targetQty);
                      setCustomValues((prev) => ({
                        ...prev,
                        [item.produto_id]: "",
                      }));
                      setStockSuccessMsg(
                        mode === "somar"
                          ? `+${num} un. somadas ao estoque de ${item.nome} (Total: ${targetQty} un.)`
                          : `Estoque de ${item.nome} ajustado para exatamente ${targetQty} un.`
                      );
                      setTimeout(() => setStockSuccessMsg(null), 3500);
                    };

                    return (
                      <div
                        key={item.produto_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/90 p-3.5 transition-all hover:border-primary/40 shadow-sm"
                      >
                        {/* Flavor Info & Recipe Yield */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-foreground">
                              {item.nome}
                            </span>
                            {item.abaixo_do_minimo ? (
                              <Badge variant="warning" className="text-[10px]">
                                Estoque Baixo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                OK
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>
                              Disponível:{" "}
                              <strong
                                className={
                                  item.abaixo_do_minimo
                                    ? "text-amber-600 dark:text-amber-400 font-black"
                                    : "text-foreground font-black"
                                }
                              >
                                {item.quantidade_disponivel} un.
                              </strong>
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-primary font-semibold">
                              <ChefHat className="h-3 w-3" />
                              Receita rende: <strong>{rendimento} un.</strong>
                            </span>
                          </div>
                        </div>

                        {/* Actions: Recipe Yield Buttons & Custom Input */}
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          {/* Opção 1: Repor Quantidade da Receita */}
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => handleAddYield(1)}
                              title={`Adicionar 1 receita de ${rendimento} unidades`}
                              className="bg-primary text-primary-foreground font-bold text-xs gap-1 shadow-sm px-2.5 py-1"
                            >
                              <ChefHat className="h-3 w-3" />
                              <span>+1 Rec. (+{rendimento})</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddYield(2)}
                              title={`Adicionar 2 receitas (+${rendimento * 2} unidades)`}
                              className="text-xs font-semibold px-2 py-1"
                            >
                              <span>+2x (+{rendimento * 2})</span>
                            </Button>
                          </div>

                          {/* Opção 2: Valor Digitado Livre pelo Administrador */}
                          <div className="flex items-center gap-1 pl-1.5 border-l border-border/80">
                            <input
                              type="number"
                              min="0"
                              placeholder="Qtd..."
                              value={customVal}
                              onChange={(e) =>
                                setCustomValues((prev) => ({
                                  ...prev,
                                  [item.produto_id]: e.target.value,
                                }))
                              }
                              className="w-16 rounded-xl border border-input bg-card px-2 py-1 text-center text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={!customVal || parseInt(customVal, 10) <= 0}
                              onClick={() => handleApplyCustom("somar")}
                              title="Somar quantidade digitada ao estoque atual"
                              className="text-xs font-bold px-2 py-1"
                            >
                              + Somar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!customVal || parseInt(customVal, 10) < 0}
                              onClick={() => handleApplyCustom("definir")}
                              title="Acertar o saldo exato em estoque para a quantidade digitada"
                              className="text-[10px] text-muted-foreground hover:text-foreground font-semibold px-2 py-1"
                            >
                              Acertar Estoque
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
