import React from "react";
import {
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  PackageCheck,
  MessageCircle,
  Smartphone,
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
import { EstoquePorProduto, VendaDetalhada } from "@/types/dashboard";

interface TablesSectionProps {
  ultimasVendas: VendaDetalhada[];
  reposicaoEstoque: EstoquePorProduto[];
  onQuickStockChange: (produtoId: string, newQty: number) => void;
  onOpenStockModal: () => void;
}

export const TablesSection: React.FC<TablesSectionProps> = ({
  ultimasVendas,
  reposicaoEstoque,
  onQuickStockChange,
  onOpenStockModal,
}) => {
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

  return (
    <section
      id="tabelas-operacionais"
      aria-label="Tabelas de Vendas e Estoque"
      className="grid grid-cols-1 gap-6 lg:grid-cols-12"
    >
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
                Pedidos mais recentes do período filtrado com itens, pagamento e
                status
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
                    <th className="pb-3 pl-3 text-right">Ação / WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ultimasVendas.map((venda) => (
                    <tr
                      key={venda.id}
                      className="transition-colors hover:bg-secondary/35"
                    >
                      <td className="whitespace-nowrap py-3 pr-3 text-xs text-muted-foreground">
                        {formatDateTime(venda.data_venda)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground">
                            {venda.cliente_nome || "Balcão / Presencial"}
                          </span>
                          {venda.cliente_telefone && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {venda.cliente_telefone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {venda.itens.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
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
                          ) : (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                              ✓ Concluída
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-3 px-3 text-right font-bold text-foreground">
                        {formatCurrency(venda.valor_total)}
                      </td>
                      <td className="whitespace-nowrap py-3 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppReceipt(venda)}
                          title="Enviar resumo do pedido pelo WhatsApp"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}
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
                {reposicaoEstoque.map((item) => (
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
                      <p className="text-[11px] text-muted-foreground">
                        {formatCurrency(item.preco_venda)} / un.
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
                              item.quantidade_disponivel + 10
                            )
                          }
                          title="Repor lote de +10 unidades"
                          className="rounded-md bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
