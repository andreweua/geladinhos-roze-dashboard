import { BRAND_CONFIG } from "@/config/brand.config";
import { formatShortDate, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { calculateUnitCostFromFicha } from "@/services/dataService";
import {
  DailySalesPoint,
  DashboardDataSnapshot,
  DateFilterRange,
  DatePreset,
  DreProdutoItem,
  EstoquePorProduto,
  PaymentMethod,
  PaymentMethodPoint,
  TopFlavorPoint,
  VendaDetalhada,
} from "@/types/dashboard";

/**
 * Calcula dinamicamente o Preço de Venda no iFood com base na taxa cadastrada (%)
 * Fórmula: Preço iFood = Preço Local / (1 - Taxa/100)
 * Garante que o Repasse Líquido seja exatamente igual ao Preço Local,
 * preservando 100% do Lucro Líquido unitário!
 */
export function calculateDynamicIfoodPrice(
  precoLocal: number,
  custoUnitario: number,
  taxaIfoodPct: number
): {
  fatorDivisor: number;
  precoIfood: number;
  taxaValor: number;
  repasseLiquido: number;
  lucroLiquidoIfood: number;
} {
  const taxaSegura = Math.min(95, Math.max(0, Number(taxaIfoodPct) || 0));
  const fatorDivisor = Number(((100 - taxaSegura) / 100).toFixed(4));
  const precoIfood =
    fatorDivisor > 0 ? Number((precoLocal / fatorDivisor).toFixed(2)) : precoLocal;
  const taxaValor = Number((precoIfood * (taxaSegura / 100)).toFixed(2));
  const repasseLiquido = Number((precoIfood - taxaValor).toFixed(2));
  const lucroLiquidoIfood = Number((repasseLiquido - custoUnitario).toFixed(2));

  return {
    fatorDivisor,
    precoIfood,
    taxaValor,
    repasseLiquido,
    lucroLiquidoIfood,
  };
}

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
      const startMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0
      );
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
  drePorProduto: DreProdutoItem[];
  dreConsolidada: DreProdutoItem;
}

export function computeDashboardAnalytics(
  snapshot: DashboardDataSnapshot,
  dateFilter: DateFilterRange,
  ifoodFeePct: number = BRAND_CONFIG.defaultIfoodFeePct
): ComputedDashboardAnalytics {
  const { produtos, vendas, itensVenda, estoqueLotes, fichasTecnicas } =
    snapshot;
  const startMs = dateFilter.startDate.getTime();
  const endMs = dateFilter.endDate.getTime();

  const productMap = new Map(produtos.map((p) => [p.id, p]));
  const fichaMap = new Map((fichasTecnicas || []).map((f) => [f.produto_id, f]));

  const itemsBySale = new Map<string, typeof itensVenda>();
  for (const item of itensVenda) {
    const arr = itemsBySale.get(item.venda_id) || [];
    arr.push(item);
    itemsBySale.set(item.venda_id, arr);
  }

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

  const dailyMap = new Map<
    string,
    {
      dateObj: Date;
      faturamento: number;
      custoEstimado: number;
      unidades: number;
    }
  >();

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

  const flavorStats = new Map<
    string,
    {
      nome: string;
      quantidade: number;
      faturamento: number;
      taxasPagamento: number;
    }
  >();

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
    const feeRatePct =
      BRAND_CONFIG.paymentFeeRates[venda.forma_pagamento] || 0;
    let vendaCusto = 0;
    let vendaUnidades = 0;

    for (const item of items) {
      const prod = productMap.get(item.produto_id);
      const custoUnit = prod ? prod.custo_estimado : 0;
      const itemCusto = custoUnit * item.quantidade;
      const itemReceita = item.preco_unitario * item.quantidade;
      const itemTaxa = itemReceita * (feeRatePct / 100);

      vendaCusto += itemCusto;
      vendaUnidades += item.quantidade;

      const currentFlavor = flavorStats.get(item.produto_id) || {
        nome: prod ? prod.nome : "Sabor Removido",
        quantidade: 0,
        faturamento: 0,
        taxasPagamento: 0,
      };
      currentFlavor.quantidade += item.quantidade;
      currentFlavor.faturamento += itemReceita;
      currentFlavor.taxasPagamento += itemTaxa;
      flavorStats.set(item.produto_id, currentFlavor);
    }

    faturamentoTotal += venda.valor_total;
    custoEstimadoTotal += vendaCusto;
    totalGeladinhosVendidos += vendaUnidades;

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

  const topFlavors: TopFlavorPoint[] = Array.from(flavorStats.entries())
    .map(([produto_id, st]) => ({
      produto_id,
      nome: st.nome,
      quantidade: st.quantidade,
      faturamento: Number(st.faturamento.toFixed(2)),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || b.faturamento - a.faturamento)
    .slice(0, 5);

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

  const reposicaoEstoque = [...inventoryByFlavor].sort(
    (a, b) => a.quantidade_disponivel - b.quantidade_disponivel
  );

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

  // Compute DRE por Produto (Product Income Statement) with dynamic iFood fee rate
  const drePorProduto: DreProdutoItem[] = activeProducts.map((prod) => {
    const ficha = fichaMap.get(prod.id);
    let custoInsumosUn = Number((prod.custo_estimado - 0.35).toFixed(2));
    let custoEmbalagemUn = 0.05; // R$ 0,05 saquinho 150ml
    let custoOperacionalUn = 0.3;
    let custoTotalUn = prod.custo_estimado;
    let rendimentoLote = 8;

    if (ficha) {
      const calc = calculateUnitCostFromFicha(ficha);
      custoInsumosUn = calc.custoInsumosUn;
      custoEmbalagemUn = Number(ficha.custo_embalagem_un.toFixed(2));
      custoOperacionalUn = Number(ficha.custo_operacional_un.toFixed(2));
      custoTotalUn = calc.custoTotalUn;
      rendimentoLote = ficha.rendimento_unidades;
    }

    // Dynamic calculation: Preço iFood = Preço Venda / (1 - Taxa/100)
    const ifoodCalc = calculateDynamicIfoodPrice(
      prod.preco_venda,
      custoTotalUn,
      ifoodFeePct
    );

    const st = flavorStats.get(prod.id) || {
      nome: prod.nome,
      quantidade: 0,
      faturamento: 0,
      taxasPagamento: 0,
    };

    const unidadesVendidas = st.quantidade;
    const receitaBruta = Number(st.faturamento.toFixed(2));
    const taxasPagamento = Number(st.taxasPagamento.toFixed(2));
    const receitaLiquida = Number((receitaBruta - taxasPagamento).toFixed(2));

    const cmvInsumos = Number((unidadesVendidas * custoInsumosUn).toFixed(2));
    const custoEmbalagensTotal = Number(
      (unidadesVendidas * custoEmbalagemUn).toFixed(2)
    );
    const custoOperacionalTotal = Number(
      (unidadesVendidas * custoOperacionalUn).toFixed(2)
    );
    const cpvTotal = Number(
      (cmvInsumos + custoEmbalagensTotal + custoOperacionalTotal).toFixed(2)
    );
    const lucroLiquido = Number((receitaLiquida - cpvTotal).toFixed(2));

    const lucroBrutoUn = Number((prod.preco_venda - custoTotalUn).toFixed(2));
    const markupMultiplicador =
      custoTotalUn > 0
        ? Number((prod.preco_venda / custoTotalUn).toFixed(2))
        : 0;
    const margemSobreCustoPct =
      custoTotalUn > 0 ? Math.round((lucroBrutoUn / custoTotalUn) * 100) : 0;

    const margemContribuicaoPct =
      receitaBruta > 0
        ? Number(((lucroLiquido / receitaBruta) * 100).toFixed(1))
        : prod.preco_venda > 0
          ? Number(((lucroBrutoUn / prod.preco_venda) * 100).toFixed(1))
          : 0;

    return {
      produto_id: prod.id,
      nome: prod.nome,
      preco_venda: prod.preco_venda,
      preco_ifood: ifoodCalc.precoIfood,
      lucro_liquido_ifood: ifoodCalc.lucroLiquidoIfood,
      rendimento_lote: rendimentoLote,
      unidades_vendidas: unidadesVendidas,
      custo_insumos_un: custoInsumosUn,
      custo_embalagem_un: custoEmbalagemUn,
      custo_operacional_un: custoOperacionalUn,
      custo_total_un: custoTotalUn,
      lucro_bruto_un: lucroBrutoUn,
      markup_multiplicador: markupMultiplicador,
      margem_sobre_custo_pct: margemSobreCustoPct,
      receita_bruta: receitaBruta,
      taxas_pagamento: taxasPagamento,
      receita_liquida: receitaLiquida,
      cmv_insumos: cmvInsumos,
      custo_embalagens_total: custoEmbalagensTotal,
      custo_operacional_total: custoOperacionalTotal,
      cpv_total: cpvTotal,
      lucro_liquido: lucroLiquido,
      margem_contribuicao_pct: margemContribuicaoPct,
    };
  });

  drePorProduto.sort((a, b) => b.lucro_liquido - a.lucro_liquido);

  const totalUnidades = drePorProduto.reduce(
    (acc, d) => acc + d.unidades_vendidas,
    0
  );
  const totalReceitaBruta = Number(
    drePorProduto.reduce((acc, d) => acc + d.receita_bruta, 0).toFixed(2)
  );
  const totalTaxas = Number(
    drePorProduto.reduce((acc, d) => acc + d.taxas_pagamento, 0).toFixed(2)
  );
  const totalReceitaLiquida = Number(
    (totalReceitaBruta - totalTaxas).toFixed(2)
  );
  const totalCmvInsumos = Number(
    drePorProduto.reduce((acc, d) => acc + d.cmv_insumos, 0).toFixed(2)
  );
  const totalEmbalagens = Number(
    drePorProduto
      .reduce((acc, d) => acc + d.custo_embalagens_total, 0)
      .toFixed(2)
  );
  const totalOperacional = Number(
    drePorProduto
      .reduce((acc, d) => acc + d.custo_operacional_total, 0)
      .toFixed(2)
  );
  const totalCpv = Number(
    (totalCmvInsumos + totalEmbalagens + totalOperacional).toFixed(2)
  );
  const totalLucroLiquido = Number(
    (totalReceitaLiquida - totalCpv).toFixed(2)
  );

  const precoMedioConsolidado =
    totalUnidades > 0
      ? Number((totalReceitaBruta / totalUnidades).toFixed(2))
      : 0;
  const custoMedioConsolidado =
    totalUnidades > 0 ? Number((totalCpv / totalUnidades).toFixed(2)) : 0;
  const ifoodConsolidado = calculateDynamicIfoodPrice(
    precoMedioConsolidado,
    custoMedioConsolidado,
    ifoodFeePct
  );

  const dreConsolidada: DreProdutoItem = {
    produto_id: "consolidado",
    nome: "Consolidado Geral (Todos os Sabores)",
    preco_venda: precoMedioConsolidado,
    preco_ifood: ifoodConsolidado.precoIfood,
    lucro_liquido_ifood: ifoodConsolidado.lucroLiquidoIfood,
    rendimento_lote: 69,
    unidades_vendidas: totalUnidades,
    custo_insumos_un:
      totalUnidades > 0
        ? Number((totalCmvInsumos / totalUnidades).toFixed(2))
        : 0,
    custo_embalagem_un:
      totalUnidades > 0
        ? Number((totalEmbalagens / totalUnidades).toFixed(2))
        : 0,
    custo_operacional_un:
      totalUnidades > 0
        ? Number((totalOperacional / totalUnidades).toFixed(2))
        : 0,
    custo_total_un: custoMedioConsolidado,
    lucro_bruto_un:
      totalUnidades > 0
        ? Number(((totalReceitaBruta - totalCpv) / totalUnidades).toFixed(2))
        : 0,
    markup_multiplicador:
      totalCpv > 0 ? Number((totalReceitaBruta / totalCpv).toFixed(2)) : 0,
    margem_sobre_custo_pct:
      totalCpv > 0 ? Math.round((totalLucroLiquido / totalCpv) * 100) : 0,
    receita_bruta: totalReceitaBruta,
    taxas_pagamento: totalTaxas,
    receita_liquida: totalReceitaLiquida,
    cmv_insumos: totalCmvInsumos,
    custo_embalagens_total: totalEmbalagens,
    custo_operacional_total: totalOperacional,
    cpv_total: totalCpv,
    lucro_liquido: totalLucroLiquido,
    margem_contribuicao_pct:
      totalReceitaBruta > 0
        ? Number(((totalLucroLiquido / totalReceitaBruta) * 100).toFixed(1))
        : 0,
  };

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
    drePorProduto,
    dreConsolidada,
  };
}
