import { BRAND_CONFIG } from "@/config/brand.config";
import { formatShortDate, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import {
  DailySalesPoint,
  DashboardDataSnapshot,
  DateFilterRange,
  DatePreset,
  EstoquePorProduto,
  PaymentMethod,
  PaymentMethodPoint,
  TopFlavorPoint,
  VendaDetalhada,
} from "@/types/dashboard";

export function getDateRangeForPreset(
  preset: DatePreset,
  customStart?: Date,
  customEnd?: Date
): DateFilterRange {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  switch (preset) {
    case "hoje":
      return { preset, startDate: startOfToday, endDate: endOfToday };

    case "ontem": {
      const startYesterday = new Date(startOfToday);
      startYesterday.setDate(startYesterday.getDate() - 1);
      const endYesterday = new Date(endOfToday);
      endYesterday.setDate(endYesterday.getDate() - 1);
      return { preset, startDate: startYesterday, endDate: endYesterday };
    }

    case "7dias": {
      const start7 = new Date(startOfToday);
      start7.setDate(start7.getDate() - 6);
      return { preset, startDate: start7, endDate: endOfToday };
    }

    case "este_mes": {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { preset, startDate: startMonth, endDate: endOfToday };
    }

    case "mes_passado": {
      const startPrevMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
        0,
        0,
        0,
        0
      );
      const endPrevMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      return { preset, startDate: startPrevMonth, endDate: endPrevMonth };
    }

    case "3meses": {
      const start3M = new Date(startOfToday);
      start3M.setDate(start3M.getDate() - 89);
      return { preset, startDate: start3M, endDate: endOfToday };
    }

    case "personalizado": {
      const s = customStart
        ? new Date(
            customStart.getFullYear(),
            customStart.getMonth(),
            customStart.getDate(),
            0,
            0,
            0,
            0
          )
        : startOfToday;
      const e = customEnd
        ? new Date(
            customEnd.getFullYear(),
            customEnd.getMonth(),
            customEnd.getDate(),
            23,
            59,
            59,
            999
          )
        : endOfToday;
      return { preset, startDate: s, endDate: e };
    }
  }
}

export interface ComputedDashboardAnalytics {
  kpis: {
    faturamentoTotal: number;
    lucroBrutoEstimado: number;
    margemBrutaPercentual: number;
    totalGeladinhosVendidos: number;
    ticketMedio: number;
    totalPedidosConcluidos: number;
    alertaEstoqueBaixo: number;
  };
  dailySales: DailySalesPoint[];
  topFlavors: TopFlavorPoint[];
  paymentDistribution: PaymentMethodPoint[];
  inventoryByFlavor: EstoquePorProduto[];
  ultimasVendas: VendaDetalhada[];
  reposicaoEstoque: EstoquePorProduto[];
}

export function computeDashboardAnalytics(
  snapshot: DashboardDataSnapshot,
  dateFilter: DateFilterRange
): ComputedDashboardAnalytics {
  const { produtos, vendas, itensVenda, estoqueLotes } = snapshot;
  const startMs = dateFilter.startDate.getTime();
  const endMs = dateFilter.endDate.getTime();

  const productMap = new Map(produtos.map((p) => [p.id, p]));

  // Group sale items by venda_id
  const itemsBySale = new Map<string, typeof itensVenda>();
  for (const item of itensVenda) {
    const arr = itemsBySale.get(item.venda_id) || [];
    arr.push(item);
    itemsBySale.set(item.venda_id, arr);
  }

  // Filter sales within date range
  const vendasNoPeriodo = vendas.filter((v) => {
    const t = new Date(v.data_venda).getTime();
    return t >= startMs && t <= endMs;
  });

  const vendasConcluidas = vendasNoPeriodo.filter(
    (v) => v.status === "concluida"
  );

  let faturamentoTotal = 0;
  let custoEstimadoTotal = 0;
  let totalGeladinhosVendidos = 0;

  // Map for daily evolution
  const dailyMap = new Map<
    string,
    {
      dateObj: Date;
      faturamento: number;
      custoEstimado: number;
      unidades: number;
    }
  >();

  // Pre-seed daily buckets so the line/bar chart has continuous dates when range <= 92 days
  const diffDays = Math.min(
    95,
    Math.max(1, Math.round((endMs - startMs) / 86400000) + 1)
  );
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(dateFilter.startDate);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    dailyMap.set(key, {
      dateObj: d,
      faturamento: 0,
      custoEstimado: 0,
      unidades: 0,
    });
  }

  // Map for flavor ranking
  const flavorStats = new Map<
    string,
    { nome: string; quantidade: number; faturamento: number }
  >();

  // Map for payment methods
  const paymentStats = new Map<
    PaymentMethod,
    { valor: number; quantidadeVendas: number }
  >([
    ["Pix", { valor: 0, quantidadeVendas: 0 }],
    ["Cartao_Credito", { valor: 0, quantidadeVendas: 0 }],
    ["Cartao_Debito", { valor: 0, quantidadeVendas: 0 }],
    ["Dinheiro", { valor: 0, quantidadeVendas: 0 }],
  ]);

  for (const venda of vendasConcluidas) {
    const items = itemsBySale.get(venda.id) || [];
    let vendaCusto = 0;
    let vendaUnidades = 0;

    for (const item of items) {
      const prod = productMap.get(item.produto_id);
      const custoUnit = prod ? prod.custo_estimado : 0;
      const itemCusto = custoUnit * item.quantidade;
      const itemReceita = item.preco_unitario * item.quantidade;

      vendaCusto += itemCusto;
      vendaUnidades += item.quantidade;

      const currentFlavor = flavorStats.get(item.produto_id) || {
        nome: prod ? prod.nome : "Sabor Removido",
        quantidade: 0,
        faturamento: 0,
      };
      currentFlavor.quantidade += item.quantidade;
      currentFlavor.faturamento += itemReceita;
      flavorStats.set(item.produto_id, currentFlavor);
    }

    faturamentoTotal += venda.valor_total;
    custoEstimadoTotal += vendaCusto;
    totalGeladinhosVendidos += vendaUnidades;

    // Aggregate daily bucket
    const d = new Date(venda.data_venda);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const bucket = dailyMap.get(dayKey) || {
      dateObj: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      faturamento: 0,
      custoEstimado: 0,
      unidades: 0,
    };
    bucket.faturamento = Number(
      (bucket.faturamento + venda.valor_total).toFixed(2)
    );
    bucket.custoEstimado = Number(
      (bucket.custoEstimado + vendaCusto).toFixed(2)
    );
    bucket.unidades += vendaUnidades;
    dailyMap.set(dayKey, bucket);

    // Aggregate payment method
    const payStat = paymentStats.get(venda.forma_pagamento) || {
      valor: 0,
      quantidadeVendas: 0,
    };
    payStat.valor = Number((payStat.valor + venda.valor_total).toFixed(2));
    payStat.quantidadeVendas += 1;
    paymentStats.set(venda.forma_pagamento, payStat);
  }

  faturamentoTotal = Number(faturamentoTotal.toFixed(2));
  custoEstimadoTotal = Number(custoEstimadoTotal.toFixed(2));
  const lucroBrutoEstimado = Number(
    (faturamentoTotal - custoEstimadoTotal).toFixed(2)
  );
  const margemBrutaPercentual =
    faturamentoTotal > 0
      ? Number(((lucroBrutoEstimado / faturamentoTotal) * 100).toFixed(1))
      : 0;
  const ticketMedio =
    vendasConcluidas.length > 0
      ? Number((faturamentoTotal / vendasConcluidas.length).toFixed(2))
      : 0;

  // Daily sales array sorted chronologically
  const dailySales: DailySalesPoint[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, val]) => ({
      dateKey,
      label: formatShortDate(val.dateObj),
      faturamento: val.faturamento,
      custoEstimado: val.custoEstimado,
      lucroBruto: Number((val.faturamento - val.custoEstimado).toFixed(2)),
      unidades: val.unidades,
    }));

  // Top 5 flavors by quantity sold
  const topFlavors: TopFlavorPoint[] = Array.from(flavorStats.entries())
    .map(([produto_id, st]) => ({
      produto_id,
      nome: st.nome,
      quantidade: st.quantidade,
      faturamento: Number(st.faturamento.toFixed(2)),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || b.faturamento - a.faturamento)
    .slice(0, 5);

  // Payment methods distribution
  const paymentDistribution: PaymentMethodPoint[] = Array.from(
    paymentStats.entries()
  )
    .map(([metodo, st]) => ({
      metodo,
      label: PAYMENT_METHOD_LABELS[metodo],
      valor: st.valor,
      quantidadeVendas: st.quantidadeVendas,
      percentual:
        faturamentoTotal > 0
          ? Number(((st.valor / faturamentoTotal) * 100).toFixed(1))
          : 0,
      fill: BRAND_CONFIG.chartColors.paymentMethods[metodo],
    }))
    .sort((a, b) => b.valor - a.valor);

  // Inventory aggregation per active flavor
  const stockByProduct = new Map<
    string,
    { quantidade: number; updated_at: string }
  >();
  for (const lote of estoqueLotes) {
    const existing = stockByProduct.get(lote.produto_id);
    if (!existing) {
      stockByProduct.set(lote.produto_id, {
        quantidade: lote.quantidade_disponivel,
        updated_at: lote.updated_at,
      });
    } else {
      existing.quantidade += lote.quantidade_disponivel;
      if (new Date(lote.updated_at) > new Date(existing.updated_at)) {
        existing.updated_at = lote.updated_at;
      }
    }
  }

  const activeProducts = produtos.filter((p) => p.ativo);
  const inventoryByFlavor: EstoquePorProduto[] = activeProducts.map((p) => {
    const st = stockByProduct.get(p.id) || {
      quantidade: 0,
      updated_at: p.created_at,
    };
    return {
      produto_id: p.id,
      nome: p.nome,
      preco_venda: p.preco_venda,
      custo_estimado: p.custo_estimado,
      ativo: p.ativo,
      quantidade_disponivel: st.quantidade,
      updated_at: st.updated_at,
      abaixo_do_minimo: st.quantidade < BRAND_CONFIG.lowStockThreshold,
    };
  });

  const alertaEstoqueBaixo = inventoryByFlavor.filter(
    (item) => item.abaixo_do_minimo
  ).length;

  // Sorted lowest stock first for the replenishment table
  const reposicaoEstoque = [...inventoryByFlavor].sort(
    (a, b) => a.quantidade_disponivel - b.quantidade_disponivel
  );

  // Detailed sales list for the filtered period
  const ultimasVendas: VendaDetalhada[] = vendasNoPeriodo
    .sort(
      (a, b) =>
        new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()
    )
    .slice(0, 15)
    .map((v) => {
      const items = itemsBySale.get(v.id) || [];
      return {
        ...v,
        itens: items.map((i) => {
          const prod = productMap.get(i.produto_id);
          return {
            id: i.id,
            produto_id: i.produto_id,
            produto_nome: prod ? prod.nome : "Sabor Gourmet",
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            custo_unitario: prod ? prod.custo_estimado : 0,
          };
        }),
      };
    });

  return {
    kpis: {
      faturamentoTotal,
      lucroBrutoEstimado,
      margemBrutaPercentual,
      totalGeladinhosVendidos,
      ticketMedio,
      totalPedidosConcluidos: vendasConcluidas.length,
      alertaEstoqueBaixo,
    },
    dailySales,
    topFlavors,
    paymentDistribution,
    inventoryByFlavor,
    ultimasVendas,
    reposicaoEstoque,
  };
}
