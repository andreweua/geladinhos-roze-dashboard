import React, { useState } from "react";
import {
  X,
  PlusCircle,
  PackagePlus,
  ShoppingCart,
  RotateCcw,
  Sparkles,
  Check,
} from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { formatCurrency, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { EstoquePorProduto, PaymentMethod } from "@/types/dashboard";
import { NewProductPayload, NewSalePayload } from "@/services/dataService";

interface QuickOperationsModalProps {
  isOpen: boolean;
  initialTab: "venda" | "estoque";
  onClose: () => void;
  inventoryByFlavor: EstoquePorProduto[];
  onSubmitSale: (payload: NewSalePayload) => Promise<void>;
  onUpdateStock: (produtoId: string, newQty: number) => Promise<void>;
  onCreateProduct: (payload: NewProductPayload) => Promise<void>;
  onResetDemoData: () => void;
  dataSource: "supabase" | "demo_local";
}

export const QuickOperationsModal: React.FC<QuickOperationsModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  inventoryByFlavor,
  onSubmitSale,
  onUpdateStock,
  onCreateProduct,
  onResetDemoData,
  dataSource,
}) => {
  const [activeTab, setActiveTab] = useState<"venda" | "estoque">(initialTab);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
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

                <Button
                  type="submit"
                  size="lg"
                  disabled={selectedItems.length === 0 || isSubmitting}
                  className="bg-gradient-to-r from-rose-600 to-rose-500 text-white"
                >
                  <Check className="h-4 w-4" />
                  {isSubmitting ? "Salvando..." : "Concluir Venda"}
                </Button>
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ajuste Direto de Lotes em Estoque
                  </h3>
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

                <div className="space-y-2">
                  {inventoryByFlavor.map((item) => (
                    <div
                      key={item.produto_id}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground">
                          {item.nome}
                        </span>
                        {item.abaixo_do_minimo && (
                          <Badge variant="warning" className="ml-2 text-[10px]">
                            Estoque Baixo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground">
                          {item.quantidade_disponivel} un.
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onUpdateStock(
                              item.produto_id,
                              item.quantidade_disponivel + 15
                            )
                          }
                        >
                          +15 un.
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            onUpdateStock(
                              item.produto_id,
                              item.quantidade_disponivel + 30
                            )
                          }
                        >
                          +30 un.
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
