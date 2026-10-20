import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  BarChart3,
  LineChart as LineChartIcon,
  Award,
  CreditCard,
  Package,
  Sparkles,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui/primitives";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  DailySalesPoint,
  DreProdutoItem,
  EstoquePorProduto,
  PaymentMethodPoint,
  TopFlavorPoint,
} from "@/types/dashboard";

interface ChartsSectionProps {
  dailySales: DailySalesPoint[];
  topFlavors: TopFlavorPoint[];
  paymentDistribution: PaymentMethodPoint[];
  inventoryByFlavor: EstoquePorProduto[];
  drePorProduto?: DreProdutoItem[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  dailySales,
  topFlavors,
  paymentDistribution,
  inventoryByFlavor,
  drePorProduto,
}) => {
  const [dailyChartType, setDailyChartType] = useState<"area" | "bar">("area");
  const [marginViewMode, setMarginViewMode] = useState<"grafico" | "lista">("grafico");

  // Margin data for Chart 5 (Margem de Lucro % por Sabor)
  const marginChartData = React.useMemo(() => {
    return inventoryByFlavor
      .map((prod) => {
        const dre = drePorProduto?.find((d) => d.produto_id === prod.produto_id);
        const lucroUnit = prod.preco_venda - prod.custo_estimado;
        const margemPct =
          prod.preco_venda > 0
            ? Math.round((lucroUnit / prod.preco_venda) * 100)
            : 0;
        return {
          produto_id: prod.produto_id,
          nome: prod.nome,
          margemPct,
          lucroUnit: Number(lucroUnit.toFixed(2)),
          preco_venda: prod.preco_venda,
          custo_estimado: prod.custo_estimado,
          markup:
            prod.custo_estimado > 0
              ? Number((prod.preco_venda / prod.custo_estimado).toFixed(2))
              : 0,
        };
      })
      .sort((a, b) => b.margemPct - a.margemPct);
  }, [inventoryByFlavor, drePorProduto]);

  // Compute summary metrics for the profitability companion card alongside Chart 4
  const totalUnidadesEstoque = inventoryByFlavor.reduce(
    (acc, item) => acc + item.quantidade_disponivel,
    0
  );
  const valorPotencialEstoque = inventoryByFlavor.reduce(
    (acc, item) => acc + item.quantidade_disponivel * item.preco_venda,
    0
  );
  const lucroPotencialEstoque = inventoryByFlavor.reduce(
    (acc, item) =>
      acc +
      item.quantidade_disponivel * (item.preco_venda - item.custo_estimado),
    0
  );

  return (
    <div className="space-y-6">
      {/* CHART 1 (100% WIDTH): Evolução Diária de Vendas (Faturamento vs Custo Estimado) */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-rose-500" />
              Evolução Diária de Vendas
            </CardTitle>
            <CardDescription>
              Comparativo diário entre Faturamento (R$) e Custo Estimado de
              Produção (R$) no período selecionado
            </CardDescription>
          </div>

          {/* Toggle between Line/Area and Bar chart */}
          <div className="inline-flex items-center rounded-lg border border-border bg-secondary/50 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDailyChartType("area")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                dailyChartType === "area"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LineChartIcon className="h-3.5 w-3.5" />
              Linha
            </button>
            <button
              type="button"
              onClick={() => setDailyChartType("bar")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                dailyChartType === "bar"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Barras
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {dailyChartType === "area" ? (
                <AreaChart
                  data={dailySales}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradFaturamento"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={BRAND_CONFIG.chartColors.revenue}
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="95%"
                        stopColor={BRAND_CONFIG.chartColors.revenue}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gradCusto"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={BRAND_CONFIG.chartColors.cost}
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="95%"
                        stopColor={BRAND_CONFIG.chartColors.cost}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `R$${val}`}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    name="Faturamento"
                    stroke={BRAND_CONFIG.chartColors.revenue}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gradFaturamento)"
                  />
                  <Area
                    type="monotone"
                    dataKey="custoEstimado"
                    name="Custo Estimado"
                    stroke={BRAND_CONFIG.chartColors.cost}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradCusto)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={dailySales}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `R$${val}`}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar
                    dataKey="faturamento"
                    name="Faturamento"
                    fill={BRAND_CONFIG.chartColors.revenue}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="custoEstimado"
                    name="Custo Estimado"
                    fill={BRAND_CONFIG.chartColors.cost}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* CHARTS 2 & 3: 2-COLUMN GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 2 (Column 1 of 2): Top 5 Sabores Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              {BRAND_CONFIG.labels.topProductsChartTitle}
            </CardTitle>
            <CardDescription>
              Ranking dos 5 sabores líderes em unidades vendidas no período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topFlavors.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Nenhuma venda registrada neste período.
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topFlavors}
                    layout="vertical"
                    margin={{ top: 4, right: 28, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      type="number"
                      tick={{
                        fontSize: 12,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={145}
                      tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, _name, props) => [
                        `${formatNumber(value)} un. (${formatCurrency(
                          props.payload.faturamento
                        )})`,
                        "Quantidade Vendida",
                      ]}
                    />
                    <Bar
                      dataKey="quantidade"
                      name="Unidades Vendidas"
                      fill={BRAND_CONFIG.chartColors.primaryBar}
                      radius={[0, 8, 8, 0]}
                      barSize={26}
                    >
                      {topFlavors.map((entry, index) => (
                        <Cell
                          key={entry.produto_id}
                          fill={
                            index === 0
                              ? "#e11d48"
                              : index === 1
                                ? "#f43f5e"
                                : index === 2
                                  ? "#fb7185"
                                  : "#fda4af"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CHART 3 (Column 2 of 2): Divisão por Forma de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-rose-500" />
              Divisão por Forma de Pagamento
            </CardTitle>
            <CardDescription>
              Participação no faturamento por Pix, Cartão de Crédito, Débito e
              Dinheiro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
              <div className="h-[250px] sm:col-span-7">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentDistribution}
                      dataKey="valor"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {paymentDistribution.map((entry) => (
                        <Cell key={entry.metodo} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(Number(value)),
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Payment method legend & breakdown */}
              <div className="space-y-2.5 sm:col-span-5">
                {paymentDistribution.map((item) => (
                  <div
                    key={item.metodo}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.quantidadeVendas} vendas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {formatCurrency(item.valor)}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {item.percentual}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHART 4: 2-COLUMN GRID (Nível de Estoque por Sabor + Resumo Financeiro do Estoque) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CHART 4 (Column 1 of 2): Nível de Estoque por Sabor */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-rose-500" />
                  {BRAND_CONFIG.labels.stockChartTitle}
                </CardTitle>
                <CardDescription>
                  Disponibilidade imediata por sabor (Alerta âmbar abaixo de{" "}
                  {BRAND_CONFIG.lowStockThreshold} un.)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />{" "}
                  Normal
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{" "}
                  Baixo (&lt;{BRAND_CONFIG.lowStockThreshold})
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={inventoryByFlavor}
                  margin={{ top: 10, right: 16, left: 0, bottom: 36 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="nome"
                    interval={0}
                    angle={-22}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [
                      `${formatNumber(value)} unidades`,
                      "Estoque Disponível",
                    ]}
                  />
                  <ReferenceLine
                    y={BRAND_CONFIG.lowStockThreshold}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    label={{
                      value: `Mín (${BRAND_CONFIG.lowStockThreshold})`,
                      position: "insideTopRight",
                      fill: "#d97706",
                      fontSize: 11,
                    }}
                  />
                  <Bar
                    dataKey="quantidade_disponivel"
                    name="Unidades Disponíveis"
                    radius={[6, 6, 0, 0]}
                  >
                    {inventoryByFlavor.map((item) => (
                      <Cell
                        key={item.produto_id}
                        fill={
                          item.abaixo_do_minimo
                            ? BRAND_CONFIG.chartColors.stockLow
                            : BRAND_CONFIG.chartColors.stockNormal
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CHART 5 (2 COLS): Margem de Lucro % por Sabor (com switch para Lista) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Margem de Lucro % por Sabor
              </CardTitle>
              <CardDescription>
                Lucratividade percentual sobre a venda e rentabilidade do estoque
              </CardDescription>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMarginViewMode("grafico")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  marginViewMode === "grafico"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Gráfico
              </button>
              <button
                type="button"
                onClick={() => setMarginViewMode("lista")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  marginViewMode === "lista"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Métricas
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {marginViewMode === "grafico" ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={marginChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      type="number"
                      domain={[0, 80]}
                      unit="%"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="nome"
                      type="category"
                      width={125}
                      tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: "12px",
                      }}
                      formatter={(val: number, name: string, props: any) => [
                        `${val}% (Lucro: ${formatCurrency(props.payload.lucroUnit)}/un | Markup: ${props.payload.markup}x)`,
                        "Margem sobre Venda",
                      ]}
                    />
                    <Bar
                      dataKey="margemPct"
                      name="Margem de Lucro %"
                      radius={[0, 6, 6, 0]}
                    >
                      {marginChartData.map((entry) => (
                        <Cell
                          key={entry.produto_id}
                          fill={entry.margemPct >= 65 ? "#059669" : "#10b981"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <>
                {/* Summary mini-cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Total em Freezer
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-foreground">
                      {formatNumber(totalUnidadesEstoque)} un.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Venda Potencial
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-rose-600 dark:text-rose-400">
                      {formatCurrency(valorPotencialEstoque)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Lucro Potencial
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(lucroPotencialEstoque)}
                    </p>
                  </div>
                </div>

                {/* Flavor unit margin breakdown */}
                <div className="max-h-[195px] space-y-2 overflow-y-auto pr-1">
                  {marginChartData.map((prod) => (
                    <div
                      key={prod.produto_id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {prod.nome}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Venda: {formatCurrency(prod.preco_venda)} • Custo:{" "}
                          {formatCurrency(prod.custo_estimado)} • Markup: {prod.markup}x
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success" className="text-[11px]">
                          +{formatCurrency(prod.lucroUnit)} ({prod.margemPct}%)
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
