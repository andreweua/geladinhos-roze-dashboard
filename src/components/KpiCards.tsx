import React from "react";
import {
  DollarSign,
  TrendingUp,
  IceCream,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Card, CardContent, Badge } from "@/components/ui/primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ComputedDashboardAnalytics } from "@/lib/analytics";

interface KpiCardsProps {
  kpis: ComputedDashboardAnalytics["kpis"];
  onClickLowStock?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  kpis,
  onClickLowStock,
}) => {
  return (
    <section
      aria-label="Indicadores Principais (KPIs)"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      {/* KPI 1: Faturamento Total */}
      <Card className="relative overflow-hidden border-l-4 border-l-rose-500">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento Total
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              {formatCurrency(kpis.faturamentoTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Em{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(kpis.totalPedidosConcluidos)}
              </span>{" "}
              vendas concluídas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI 2: Lucro Bruto Estimado */}
      <Card className="relative overflow-hidden border-l-4 border-l-emerald-500">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lucro Bruto Estimado
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(kpis.lucroBrutoEstimado)}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                {kpis.margemBrutaPercentual}% margem
              </Badge>
              <span>Receita - custos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI 3: Total de Geladinhos Vendidos */}
      <Card className="relative overflow-hidden border-l-4 border-l-pink-500">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {BRAND_CONFIG.labels.unitsSoldTitle}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <IceCream className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              {formatNumber(kpis.totalGeladinhosVendidos)}{" "}
              <span className="text-sm font-semibold text-muted-foreground">
                un.
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unidades entregues no período
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI 4: Ticket Médio */}
      <Card className="relative overflow-hidden border-l-4 border-l-amber-400">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ticket Médio
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">
              {formatCurrency(kpis.ticketMedio)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Valor médio por venda concluída
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI 5: Alerta de Estoque Baixo */}
      <Card
        onClick={onClickLowStock}
        className={`relative overflow-hidden border-l-4 transition-all ${
          kpis.alertaEstoqueBaixo > 0
            ? "cursor-pointer border-l-amber-600 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
            : "border-l-emerald-500"
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Alerta de Estoque Baixo
            </p>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                kpis.alertaEstoqueBaixo > 0
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/15 text-emerald-600"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-extrabold tracking-tight text-foreground">
                {kpis.alertaEstoqueBaixo}{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  {kpis.alertaEstoqueBaixo === 1
                    ? BRAND_CONFIG.labels.productSingular.toLowerCase()
                    : BRAND_CONFIG.labels.productPlural.toLowerCase()}
                </span>
              </p>
              {kpis.alertaEstoqueBaixo > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  Atenção
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Abaixo de {BRAND_CONFIG.lowStockThreshold} unidades ativas
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
