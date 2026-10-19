import {
  RESUMO_LOTES_PRODUCAO,
  SOBRAS_ESTOQUE_INSUMOS,
  TABELA_COTACAO_INSUMOS,
} from "@/data/insumosCatalog";
import { ComputedDashboardAnalytics, calculateDynamicIfoodPrice } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { loadCurrentQuotations } from "@/services/quotationService";
import { DashboardDataSnapshot } from "@/types/dashboard";

export interface ProductionRecommendationItem {
  produto_id: string;
  nome: string;
  estoque_atual: number;
  giro_diario_7d: number;
  autonomia_dias: number;
  urgencia: "critica" | "alta" | "moderada" | "confortavel";
  rendimento_lote: number;
  lotes_recomendados: number;
  unidades_produzir: number;
  custo_lote_unitario: number;
  custo_total_producao: number;
  faturamento_potencial_local: number;
  lucro_liquido_esperado: number;
  motivo: string;
}

export interface SmartShoppingItem {
  id: string;
  insumo: string;
  quantidade_necessaria_label: string;
  sabores_atendidos: string[];
  custo_estimado_receitas: number;
  sobra_estoque_detectada: string | null;
  status_compra: "em_estoque_sobra" | "compra_parcial" | "comprar_agora";
  economia_estimada: number;
  recomendacao_embalagem: string;
}

export interface CostOptimizationOpportunity {
  id: string;
  insumo_alvo: string;
  sabores_impactados: string[];
  cenario_atual: string;
  cenario_otimizado: string;
  reducao_grama_pct: number;
  economia_por_lote: number;
  economia_mensal_estimada: number;
  impacto_qualidade: string;
}

export type BcgQuadrant =
  | "estrela"
  | "vaca_leiteira"
  | "joia_oculta"
  | "em_observacao";

export interface BcgProductItem {
  produto_id: string;
  nome: string;
  quadrante: BcgQuadrant;
  quadrante_label: string;
  unidades_vendidas: number;
  preco_venda: number;
  custo_total_un: number;
  lucro_bruto_un: number;
  margem_contribuicao_pct: number;
  lucro_liquido_periodo: number;
  acao_tatica: string;
}

export interface ProfitGoalSimulation {
  meta_lucro_mensal: number;
  dias_trabalhados_mes: number;
  lucro_medio_por_unidade: number;
  preco_medio_local: number;
  preco_medio_ifood: number;
  unidades_mes_necessarias: number;
  unidades_semana_necessarias: number;
  unidades_dia_necessarias: number;
  lotes_69_mes: number;
  lotes_69_semana: number;
  faturamento_bruto_local_necessario: number;
  faturamento_bruto_ifood_necessario: number;
  custo_producao_mensal_estimado: number;
}

export interface SmartComboOffer {
  id: string;
  titulo: string;
  subtitulo: string;
  sabores_inclusos: Array<{ nome: string; quantidade: number }>;
  total_unidades: number;
  preco_avulso_total: number;
  preco_combo_sugerido: number;
  preco_combo_ifood: number;
  desconto_cliente_pct: number;
  custo_total_combo: number;
  lucro_liquido_combo: number;
  margem_sobre_custo_pct: number;
  objetivo_estrategico: string;
  mensagem_whatsapp: string;
}

export interface AiIntelligenceReport {
  healthScore: number;
  executiveHeadline: string;
  executiveSummaryBullets: string[];
  productionPlan: {
    items: ProductionRecommendationItem[];
    totalLotesHoje: number;
    totalUnidadesProduzir: number;
    custoTotalProducaoHoje: number;
    faturamentoPotencialHoje: number;
    lucroLiquidoEsperadoHoje: number;
  };
  shoppingList: {
    items: SmartShoppingItem[];
    custoBrutoReceitas: number;
    economiaComSobras: number;
    desembolsoLiquidoEstimado: number;
  };
  costOptimizations: {
    opportunities: CostOptimizationOpportunity[];
    economiaMensalPotencial: number;
  };
  bcgMatrix: {
    items: BcgProductItem[];
    mediaUnidadesVendidas: number;
    mediaLucroUnitario: number;
  };
  profitSimulation: ProfitGoalSimulation;
  smartCombos: SmartComboOffer[];
}

/**
 * Computes the complete AI Intelligence & Production Report from live dashboard data
 */
export function computeAiIntelligenceReport(
  snapshot: DashboardDataSnapshot,
  analytics: ComputedDashboardAnalytics,
  ifoodFeePct: number,
  metaLucroMensal: number = 3500,
  diasTrabalhadosMes: number = 26
): AiIntelligenceReport {
  const { produtos, vendas, itensVenda, fichasTecnicas } = snapshot;
  const fichaMap = new Map((fichasTecnicas || []).map((f) => [f.produto_id, f]));
  const dreMap = new Map(analytics.drePorProduto.map((d) => [d.produto_id, d]));

  // 1. Calculate 7-day sales velocity per flavor
  const now = new Date();
  const sevenDaysAgoMs = now.getTime() - 7 * 86400000;
  const recentSaleIds = new Set(
    vendas
      .filter(
        (v) =>
          v.status === "concluida" &&
          new Date(v.data_venda).getTime() >= sevenDaysAgoMs
      )
      .map((v) => v.id)
  );

  const soldLast7DaysByProduct = new Map<string, number>();
  for (const item of itensVenda) {
    if (recentSaleIds.has(item.venda_id)) {
      soldLast7DaysByProduct.set(
        item.produto_id,
        (soldLast7DaysByProduct.get(item.produto_id) || 0) + item.quantidade
      );
    }
  }

  // Build Production Plan
  const productionItems: ProductionRecommendationItem[] =
    analytics.inventoryByFlavor.map((inv) => {
      const ficha = fichaMap.get(inv.produto_id);
      const dre = dreMap.get(inv.produto_id);
      const rendimentoLote = ficha ? ficha.rendimento_unidades : 8;
      const custoUnit = dre ? dre.custo_total_un : inv.custo_estimado;
      const precoVenda = inv.preco_venda;

      const vendidos7d = soldLast7DaysByProduct.get(inv.produto_id) || 0;
      const giroDiario = Number(
        Math.max(1.2, vendidos7d / 7).toFixed(1)
      );
      const autonomiaDias = Number(
        (inv.quantidade_disponivel / giroDiario).toFixed(1)
      );

      let urgencia: ProductionRecommendationItem["urgencia"] = "confortavel";
      if (inv.quantidade_disponivel <= 6 || autonomiaDias < 1.5) {
        urgencia = "critica";
      } else if (inv.quantidade_disponivel < 15 || autonomiaDias < 3.0) {
        urgencia = "alta";
      } else if (autonomiaDias < 4.5) {
        urgencia = "moderada";
      }

      // Target stock for 5 days of comfortable operation (or minimum 16 units)
      const estoqueAlvo5Dias = Math.max(16, Math.ceil(giroDiario * 5));
      const deficitUnidades = Math.max(
        0,
        estoqueAlvo5Dias - inv.quantidade_disponivel
      );

      let lotesRecomendados = 0;
      if (urgencia === "critica" || urgencia === "alta") {
        lotesRecomendados = Math.max(
          1,
          Math.ceil(deficitUnidades / rendimentoLote)
        );
      } else if (urgencia === "moderada" && deficitUnidades >= rendimentoLote * 0.6) {
        lotesRecomendados = 1;
      }

      const unidadesProduzir = lotesRecomendados * rendimentoLote;
      const custoLoteUnitario = Number((rendimentoLote * custoUnit).toFixed(2));
      const custoTotalProducao = Number(
        (unidadesProduzir * custoUnit).toFixed(2)
      );
      const faturamentoPotencialLocal = Number(
        (unidadesProduzir * precoVenda).toFixed(2)
      );
      const lucroLiquidoEsperado = Number(
        (faturamentoPotencialLocal - custoTotalProducao).toFixed(2)
      );

      let motivo = `Estoque confortável para ~${autonomiaDias} dias de vendas.`;
      if (urgencia === "critica") {
        motivo = `Risco iminente de ruptura! Restam apenas ${inv.quantidade_disponivel} un. (autonomia de ${autonomiaDias}d com giro de ${giroDiario} un./dia).`;
      } else if (urgencia === "alta") {
        motivo = `Abaixo do estoque mínimo de segurança (${inv.quantidade_disponivel} un.). Produzir ${lotesRecomendados} receita(s) hoje garante 5 dias de giro.`;
      } else if (urgencia === "moderada") {
        motivo = `Giro constante (${giroDiario} un./dia). Programar 1 lote preventivo evita falta no fim de semana.`;
      }

      return {
        produto_id: inv.produto_id,
        nome: inv.nome,
        estoque_atual: inv.quantidade_disponivel,
        giro_diario_7d: giroDiario,
        autonomia_dias: autonomiaDias,
        urgencia,
        rendimento_lote: rendimentoLote,
        lotes_recomendados: lotesRecomendados,
        unidades_produzir: unidadesProduzir,
        custo_lote_unitario: custoLoteUnitario,
        custo_total_producao: custoTotalProducao,
        faturamento_potencial_local: faturamentoPotencialLocal,
        lucro_liquido_esperado: lucroLiquidoEsperado,
        motivo,
      };
    });

  const urgencyOrder: Record<ProductionRecommendationItem["urgencia"], number> = {
    critica: 0,
    alta: 1,
    moderada: 2,
    confortavel: 3,
  };

  productionItems.sort(
    (a, b) =>
      urgencyOrder[a.urgencia] - urgencyOrder[b.urgencia] ||
      a.autonomia_dias - b.autonomia_dias
  );

  const totalLotesHoje = productionItems.reduce(
    (acc, item) => acc + item.lotes_recomendados,
    0
  );
  const totalUnidadesProduzir = productionItems.reduce(
    (acc, item) => acc + item.unidades_produzir,
    0
  );
  const custoTotalProducaoHoje = Number(
    productionItems
      .reduce((acc, item) => acc + item.custo_total_producao, 0)
      .toFixed(2)
  );
  const faturamentoPotencialHoje = Number(
    productionItems
      .reduce((acc, item) => acc + item.faturamento_potencial_local, 0)
      .toFixed(2)
  );
  const lucroLiquidoEsperadoHoje = Number(
    (faturamentoPotencialHoje - custoTotalProducaoHoje).toFixed(2)
  );

  // 2. Build Smart Shopping List crossing recommended batches with technical sheets + SOBRAS_ESTOQUE_INSUMOS
  const activeProductionPlans =
    totalLotesHoje > 0
      ? productionItems.filter((p) => p.lotes_recomendados > 0)
      : productionItems.slice(0, 3).map((p) => ({
          ...p,
          lotes_recomendados: 1,
        }));

  const ingredientAggregation = new Map<
    string,
    {
      nome: string;
      quantidadeTotal: number;
      unidade: string;
      custoTotal: number;
      sabores: Set<string>;
    }
  >();

  for (const plan of activeProductionPlans) {
    const ficha = fichaMap.get(plan.produto_id);
    if (!ficha) continue;
    for (const ing of ficha.ingredientes) {
      const normalizedKey = ing.nome.toLowerCase().trim();
      const existing = ingredientAggregation.get(normalizedKey);
      const qtd = ing.quantidade_receita * plan.lotes_recomendados;
      const custo = ing.custo_receita * plan.lotes_recomendados;

      if (!existing) {
        ingredientAggregation.set(normalizedKey, {
          nome: ing.nome,
          quantidadeTotal: qtd,
          unidade: ing.unidade,
          custoTotal: custo,
          sabores: new Set([plan.nome]),
        });
      } else {
        existing.quantidadeTotal += qtd;
        existing.custoTotal += custo;
        existing.sabores.add(plan.nome);
      }
    }
  }

  const shoppingItems: SmartShoppingItem[] = Array.from(
    ingredientAggregation.entries()
  ).map(([key, agg], idx) => {
    let sobraDetectada: string | null = null;
    let statusCompra: SmartShoppingItem["status_compra"] = "comprar_agora";
    let economiaEstimada = 0;
    let recomendacaoEmbalagem =
      "Comprar no Atacado para garantir menor custo por grama";

    if (key.includes("ninho") || key.includes("leite em pó")) {
      sobraDetectada = `${SOBRAS_ESTOQUE_INSUMOS[0].sobra_estoque} da ${SOBRAS_ESTOQUE_INSUMOS[0].embalagem_padrao}`;
      statusCompra = "em_estoque_sobra";
      economiaEstimada = Number(agg.custoTotal.toFixed(2));
      recomendacaoEmbalagem =
        "Usar lata já aberta na despensa (não precisa comprar hoje)";
    } else if (key.includes("ovomaltine")) {
      sobraDetectada = `${SOBRAS_ESTOQUE_INSUMOS[1].sobra_estoque} do ${SOBRAS_ESTOQUE_INSUMOS[1].embalagem_padrao}`;
      statusCompra = "em_estoque_sobra";
      economiaEstimada = Number(agg.custoTotal.toFixed(2));
      recomendacaoEmbalagem =
        "Usar pacote 600g em estoque (rende mais 9 lotes completos)";
    } else if (key.includes("50%") || key.includes("cacau") || key.includes("brigadeiro")) {
      sobraDetectada = `${SOBRAS_ESTOQUE_INSUMOS[2].sobra_estoque} da ${SOBRAS_ESTOQUE_INSUMOS[2].embalagem_padrao}`;
      statusCompra = "em_estoque_sobra";
      economiaEstimada = Number(agg.custoTotal.toFixed(2));
      recomendacaoEmbalagem =
        "Usar barra/pó 50% cacau em estoque (960g disponíveis)";
    } else if (key.includes("nutella")) {
      sobraDetectada = `${SOBRAS_ESTOQUE_INSUMOS[3].sobra_estoque} do ${SOBRAS_ESTOQUE_INSUMOS[3].embalagem_padrao}`;
      if (agg.quantidadeTotal <= 120) {
        statusCompra = "em_estoque_sobra";
        economiaEstimada = Number(agg.custoTotal.toFixed(2));
        recomendacaoEmbalagem = "Sobra de 120g cobre 100% da produção de hoje";
      } else {
        statusCompra = "compra_parcial";
        economiaEstimada = Number((agg.custoTotal * 0.55).toFixed(2));
        recomendacaoEmbalagem =
          "Aproveitar 120g em estoque + comprar Pote 650g no Atacado (R$ 39,90)";
      }
    } else if (key.includes("morango")) {
      sobraDetectada = `${SOBRAS_ESTOQUE_INSUMOS[5].sobra_estoque} (${SOBRAS_ESTOQUE_INSUMOS[5].embalagem_padrao})`;
      statusCompra = "em_estoque_sobra";
      economiaEstimada = Number(agg.custoTotal.toFixed(2));
      recomendacaoEmbalagem =
        "Usar 520g de morango congelado em estoque + 100g de açúcar da despensa";
    } else if (key.includes("condensado")) {
      recomendacaoEmbalagem = `Comprar ${Math.ceil(
        agg.quantidadeTotal / 395
      )} cx(s) de 395g no Atacado (R$ 4,79 a R$ 6,89/cx)`;
    } else if (key.includes("creme de leite")) {
      recomendacaoEmbalagem = `Comprar ${Math.ceil(
        agg.quantidadeTotal / 200
      )} cx(s) de 200g no Atacado (R$ 2,75 a R$ 3,49/cx)`;
    } else if (key.includes("leite integral")) {
      recomendacaoEmbalagem = `Comprar ${Math.ceil(
        agg.quantidadeTotal / 1000
      )} Litro(s) UHT no Atacado (R$ 4,39 a R$ 4,69/L)`;
    }

    return {
      id: `shop-${idx}`,
      insumo: agg.nome,
      quantidade_necessaria_label: `${agg.quantidadeTotal} ${agg.unidade}`,
      sabores_atendidos: Array.from(agg.sabores),
      custo_estimado_receitas: Number(agg.custoTotal.toFixed(2)),
      sobra_estoque_detectada: sobraDetectada,
      status_compra: statusCompra,
      economia_estimada: economiaEstimada,
      recomendacao_embalagem: recomendacaoEmbalagem,
    };
  });

  const custoBrutoReceitas = Number(
    shoppingItems
      .reduce((acc, i) => acc + i.custo_estimado_receitas, 0)
      .toFixed(2)
  );
  const economiaComSobras = Number(
    shoppingItems.reduce((acc, i) => acc + i.economia_estimada, 0).toFixed(2)
  );
  const desembolsoLiquidoEstimado = Number(
    Math.max(0, custoBrutoReceitas - economiaComSobras).toFixed(2)
  );

  // 3. Build Cost & Brand Optimization Radar from the 54 quotations in TABELA_COTACAO_INSUMOS
  const costOpportunities: CostOptimizationOpportunity[] = [
    {
      id: "opt-nutella-650",
      insumo_alvo: "Nutella Original (Pote 140g vs. Pote 650g Atacado)",
      sabores_impactados: ["Ninho com Nutella"],
      cenario_atual: "Pote 140g Varejo (R$ 13,90 = R$ 0,099/g)",
      cenario_otimizado: "Pote 650g Atacado (R$ 39,90 = R$ 0,061/g)",
      reducao_grama_pct: 38.4,
      economia_por_lote: 6.84,
      economia_mensal_estimada: 82.08,
      impacto_qualidade:
        "Zero alteração de sabor! Mantém 100% Nutella Original Ferrero reduzindo R$ 0,76 no custo de cada saquinho.",
    },
    {
      id: "opt-creme-leite",
      insumo_alvo: "Creme de Leite Base (Lata 300g vs. TP 200g Atacado)",
      sabores_impactados: [
        "Todos os 8 sabores (Base Cremosa)",
      ],
      cenario_atual: "Creme de Leite Lata/Varejo (R$ 0,023/g)",
      cenario_otimizado: "Piracanjuba ou Italac Leve Atacado (R$ 2,75 = R$ 0,014/g)",
      reducao_grama_pct: 39.1,
      economia_por_lote: 14.4,
      economia_mensal_estimada: 115.2,
      impacto_qualidade:
        "Com Liga Neutra (10g/lote), o Creme de Leite TP 17% gordura entrega a mesma cremosidade sem cristais de gelo.",
    },
    {
      id: "opt-leite-condensado",
      insumo_alvo: "Leite Condensado 395g (Compra Varejo vs. Caixa Fechada Atacado)",
      sabores_impactados: [
        "Todos os 8 sabores (1 lata por receita)",
      ],
      cenario_atual: "Leite Condensado Moça Varejo (R$ 7,99 = R$ 0,020/g)",
      cenario_otimizado:
        "Moça Atacado (R$ 6,89) ou Italac Integral Atacado (R$ 4,79 = R$ 0,012/g)",
      reducao_grama_pct: 32.5,
      economia_por_lote: 19.8,
      economia_mensal_estimada: 158.4,
      impacto_qualidade:
        "Para sabores de fruta intensa (Maracujá) ou Chocolate 50%, marcas intermediárias no atacado mantêm o padrão gourmet com alta margem.",
    },
    {
      id: "opt-ovomaltine-750",
      insumo_alvo: "Ovomaltine Flocos Crocantes (300g vs. 750g Atacado)",
      sabores_impactados: ["Delícia de Ovomaltine"],
      cenario_atual: "Pacote 300g Varejo (R$ 17,90 = R$ 0,059/g)",
      cenario_otimizado: "Pacote 750g Atacado (R$ 30,90 = R$ 0,041/g)",
      reducao_grama_pct: 30.5,
      economia_por_lote: 1.98,
      economia_mensal_estimada: 23.76,
      impacto_qualidade:
        "Mesmo produto original Ovomaltine com economia direta de 30,5% por grama.",
    },
    {
      id: "opt-doce-leite-itambe",
      insumo_alvo: "Doce de Leite Itambé (De Colher vs. Tradicional Pote 350g)",
      sabores_impactados: ["Doce de Leite (Itambé)"],
      cenario_atual: "Doce de Leite De Colher Itambé Varejo (R$ 10,98 = R$ 0,031/g)",
      cenario_otimizado: "Doce de Leite Tradicional Itambé Atacado (R$ 9,98 = R$ 0,028/g)",
      reducao_grama_pct: 9.7,
      economia_por_lote: 1.2,
      economia_mensal_estimada: 19.2,
      impacto_qualidade:
        "Preserva a assinatura 'Itambé' no rótulo e no paladar com menor custo por pote.",
    },
  ];

  const economiaMensalPotencial = Number(
    costOpportunities
      .reduce((acc, o) => acc + o.economia_mensal_estimada, 0)
      .toFixed(2)
  );

  // 4. Build BCG Menu Engineering Matrix
  const dreItems = analytics.drePorProduto;
  const mediaUnidadesVendidas =
    dreItems.length > 0
      ? Number(
          (
            dreItems.reduce((acc, d) => acc + d.unidades_vendidas, 0) /
            dreItems.length
          ).toFixed(1)
        )
      : 10;
  const mediaLucroUnitario =
    dreItems.length > 0
      ? Number(
          (
            dreItems.reduce((acc, d) => acc + d.lucro_bruto_un, 0) /
            dreItems.length
          ).toFixed(2)
        )
      : 4.5;

  const bcgItems: BcgProductItem[] = dreItems.map((d) => {
    const altaVenda = d.unidades_vendidas >= mediaUnidadesVendidas;
    const altaMargem = d.lucro_bruto_un >= mediaLucroUnitario;

    let quadrante: BcgQuadrant = "em_observacao";
    let quadranteLabel = "🔍 Em Observação";
    let acaoTatica =
      "Incluir em combos degustação para aumentar experimentação e diluir custo fixo.";

    if (altaVenda && altaMargem) {
      quadrante = "estrela";
      quadranteLabel = "⭐ Estrela do Cardápio";
      acaoTatica =
        "Campeão de vendas e lucro! Nunca deixar faltar em estoque e destacar no topo do cardápio e do iFood.";
    } else if (altaVenda && !altaMargem) {
      quadrante = "vaca_leiteira";
      quadranteLabel = "🐄 Gerador de Caixa";
      acaoTatica =
        "Alto giro diário! Excelente para atrair clientes recorrentes; otimizar compra de insumos no atacado para subir a margem em +R$ 0,40/un.";
    } else if (!altaVenda && altaMargem) {
      quadrante = "joia_oculta";
      quadranteLabel = "💎 Joia Oculta (Alta Margem)";
      acaoTatica =
        "Altíssimo lucro por unidade (R$ " +
        d.lucro_bruto_un.toFixed(2).replace(".", ",") +
        "/un)! Destacar em fotos no WhatsApp/Instagram e oferecer como upgrade em combos.";
    }

    return {
      produto_id: d.produto_id,
      nome: d.nome,
      quadrante,
      quadrante_label: quadranteLabel,
      unidades_vendidas: d.unidades_vendidas,
      preco_venda: d.preco_venda,
      custo_total_un: d.custo_total_un,
      lucro_bruto_un: d.lucro_bruto_un,
      margem_contribuicao_pct: d.margem_contribuicao_pct,
      lucro_liquido_periodo: d.lucro_liquido,
      acao_tatica: acaoTatica,
    };
  });

  // 5. Build Financial Profit Target Simulator
  const lucroMedioUn =
    analytics.dreConsolidada.lucro_bruto_un > 0
      ? analytics.dreConsolidada.lucro_bruto_un
      : 4.54;
  const precoMedioLocal =
    analytics.dreConsolidada.preco_venda > 0
      ? analytics.dreConsolidada.preco_venda
      : 7.47;
  const custoMedioUn =
    analytics.dreConsolidada.custo_total_un > 0
      ? analytics.dreConsolidada.custo_total_un
      : 2.93;

  const ifoodMedioCalc = calculateDynamicIfoodPrice(
    precoMedioLocal,
    custoMedioUn,
    ifoodFeePct
  );

  const diasSeguros = Math.max(1, Math.min(31, diasTrabalhadosMes));
  const metaSegura = Math.max(100, metaLucroMensal);

  const unidadesMesNecessarias = Math.ceil(metaSegura / lucroMedioUn);
  const unidadesDiaNecessarias = Math.ceil(unidadesMesNecessarias / diasSeguros);
  const unidadesSemanaNecessarias = Math.ceil(unidadesMesNecessarias / 4.33);
  const lotes69Mes = Number((unidadesMesNecessarias / 69).toFixed(1));
  const lotes69Semana = Number((lotes69Mes / 4.33).toFixed(1));

  const profitSimulation: ProfitGoalSimulation = {
    meta_lucro_mensal: metaSegura,
    dias_trabalhados_mes: diasSeguros,
    lucro_medio_por_unidade: lucroMedioUn,
    preco_medio_local: precoMedioLocal,
    preco_medio_ifood: ifoodMedioCalc.precoIfood,
    unidades_mes_necessarias: unidadesMesNecessarias,
    unidades_semana_necessarias: unidadesSemanaNecessarias,
    unidades_dia_necessarias: unidadesDiaNecessarias,
    lotes_69_mes: lotes69Mes,
    lotes_69_semana: lotes69Semana,
    faturamento_bruto_local_necessario: Number(
      (unidadesMesNecessarias * precoMedioLocal).toFixed(2)
    ),
    faturamento_bruto_ifood_necessario: Number(
      (unidadesMesNecessarias * ifoodMedioCalc.precoIfood).toFixed(2)
    ),
    custo_producao_mensal_estimado: Number(
      (unidadesMesNecessarias * custoMedioUn).toFixed(2)
    ),
  };

  // 6. Build Smart Combos & WhatsApp Copy Generator
  const sortedByHighStock = [...analytics.inventoryByFlavor].sort(
    (a, b) => b.quantidade_disponivel - a.quantidade_disponivel
  );
  const topStock1 = sortedByHighStock[0] || {
    produto_id: "prod-ninho-brigadeiro",
    nome: "Ninho com Brigadeiro 50%",
    preco_venda: 7.0,
    custo_estimado: 2.38,
    quantidade_disponivel: 24,
  };
  const topStock2 = sortedByHighStock[1] || {
    produto_id: "prod-maracuja-geleia",
    nome: "Mousse de Maracujá c/ Geleia",
    preco_venda: 7.5,
    custo_estimado: 2.66,
    quantidade_disponivel: 20,
  };

  const starFlavor =
    bcgItems.find((b) => b.quadrante === "estrela") || bcgItems[0];
  const gemFlavor =
    bcgItems.find((b) => b.quadrante === "joia_oculta") || bcgItems[1] || starFlavor;

  // Combo 1: Giro de Estoque (4 unidades)
  const c1Avulso = Number(
    (topStock1.preco_venda * 2 + topStock2.preco_venda * 2).toFixed(2)
  );
  const c1Custo = Number(
    (topStock1.custo_estimado * 2 + topStock2.custo_estimado * 2).toFixed(2)
  );
  const c1PrecoCombo = Number((Math.floor(c1Avulso * 0.92 * 2) / 2).toFixed(2));
  const c1Lucro = Number((c1PrecoCombo - c1Custo).toFixed(2));
  const c1Ifood = calculateDynamicIfoodPrice(
    c1PrecoCombo,
    c1Custo,
    ifoodFeePct
  ).precoIfood;

  // Combo 2: Estrela + Joia Oculta (Kit Degustação Gourmet 4 un)
  const sProd =
    produtos.find((p) => p.id === starFlavor?.produto_id) || produtos[0];
  const gProd =
    produtos.find((p) => p.id === gemFlavor?.produto_id) || produtos[1];
  const c2Avulso = Number(
    ((sProd?.preco_venda || 8) * 2 + (gProd?.preco_venda || 8) * 2).toFixed(2)
  );
  const c2Custo = Number(
    (
      (sProd?.custo_estimado || 3.1) * 2 +
      (gProd?.custo_estimado || 3.1) * 2
    ).toFixed(2)
  );
  const c2PrecoCombo = Number((c2Avulso - 2.0).toFixed(2));
  const c2Lucro = Number((c2PrecoCombo - c2Custo).toFixed(2));
  const c2Ifood = calculateDynamicIfoodPrice(
    c2PrecoCombo,
    c2Custo,
    ifoodFeePct
  ).precoIfood;

  // Combo 3: Caixa Família 6 Sabores
  const c3Avulso = Number((precoMedioLocal * 6).toFixed(2));
  const c3Custo = Number((custoMedioUn * 6).toFixed(2));
  const c3PrecoCombo = Number((c3Avulso - 3.5).toFixed(2));
  const c3Lucro = Number((c3PrecoCombo - c3Custo).toFixed(2));
  const c3Ifood = calculateDynamicIfoodPrice(
    c3PrecoCombo,
    c3Custo,
    ifoodFeePct
  ).precoIfood;

  const smartCombos: SmartComboOffer[] = [
    {
      id: "combo-giro-estoque",
      titulo: "Combo Giro Rápido (4 Unidades 150ml)",
      subtitulo: `Focado nos sabores com maior estoque pronta-entrega (${topStock1.quantidade_disponivel} e ${topStock2.quantidade_disponivel} un.)`,
      sabores_inclusos: [
        { nome: topStock1.nome, quantidade: 2 },
        { nome: topStock2.nome, quantidade: 2 },
      ],
      total_unidades: 4,
      preco_avulso_total: c1Avulso,
      preco_combo_sugerido: c1PrecoCombo,
      preco_combo_ifood: c1Ifood,
      desconto_cliente_pct: Number(
        (((c1Avulso - c1PrecoCombo) / c1Avulso) * 100).toFixed(1)
      ),
      custo_total_combo: c1Custo,
      lucro_liquido_combo: c1Lucro,
      margem_sobre_custo_pct: Math.round((c1Lucro / c1Custo) * 100),
      objetivo_estrategico:
        "Converter estoque congelado abundante em caixa imediato via Pix sem sacrificar a margem.",
      mensagem_whatsapp: `🍧 *COMBO ESPECIAL DO DIA — GELADINHOS GOURMET DA ROZE (150ml)* 🍧\n\nHoje preparamos o *Combo Queridinhos Pronta-Entrega* com desconto especial no Pix:\n✅ 2x *${topStock1.nome}*\n✅ 2x *${topStock2.nome}*\n\nDe ~${formatCurrency(c1Avulso)}~ por apenas *${formatCurrency(c1PrecoCombo)}* os 4 geladinhos gigantes de 150ml! 🤤✨\n\n📲 Responda *EU QUERO* aqui no WhatsApp para separar o seu antes que acabe!`,
    },
    {
      id: "combo-estrela-joia",
      titulo: "Dupla Gourmet Premium (Estrela + Joia Oculta)",
      subtitulo:
        "Usa o sabor mais pedido como âncora para apresentar um sabor de altíssima margem",
      sabores_inclusos: [
        { nome: sProd?.nome || "Ninho com Nutella", quantidade: 2 },
        { nome: gProd?.nome || "Cheesecake Frutas Vermelhas", quantidade: 2 },
      ],
      total_unidades: 4,
      preco_avulso_total: c2Avulso,
      preco_combo_sugerido: c2PrecoCombo,
      preco_combo_ifood: c2Ifood,
      desconto_cliente_pct: Number(
        (((c2Avulso - c2PrecoCombo) / c2Avulso) * 100).toFixed(1)
      ),
      custo_total_combo: c2Custo,
      lucro_liquido_combo: c2Lucro,
      margem_sobre_custo_pct: Math.round((c2Lucro / c2Custo) * 100),
      objetivo_estrategico:
        "Aumentar o Ticket Médio para acima de R$ 28,00 e fidelizar clientes nos sabores mais lucrativos.",
      mensagem_whatsapp: `✨ *KIT EXPERIÊNCIA PREMIUM — GELADINHOS DA ROZE (150ml)* ✨\n\nQue tal adoçar a tarde com os nossos sabores mais nobres?\n🍫 2x *${sProd?.nome || "Ninho com Nutella"}*\n🍓 2x *${gProd?.nome || "Cheesecake Frutas Vermelhas"}*\n\n🔥 De ~${formatCurrency(c2Avulso)}~ por *${formatCurrency(c2PrecoCombo)}* no pedido direto!\nPeça agora pelo nosso WhatsApp! 🛵💨`,
    },
    {
      id: "combo-familia-6un",
      titulo: "Box Família & Fim de Semana (6 Unidades 150ml)",
      subtitulo: "Mix completo para elevar o ticket médio por entrega em +65%",
      sabores_inclusos: [
        { nome: "Ninho com Nutella", quantidade: 2 },
        { nome: "Doce de Leite (Itambé)", quantidade: 2 },
        { nome: "Mousse de Maracujá c/ Geleia", quantidade: 1 },
        { nome: "Ninho c/ Geleia de Morango", quantidade: 1 },
      ],
      total_unidades: 6,
      preco_avulso_total: c3Avulso,
      preco_combo_sugerido: c3PrecoCombo,
      preco_combo_ifood: c3Ifood,
      desconto_cliente_pct: Number(
        (((c3Avulso - c3PrecoCombo) / c3Avulso) * 100).toFixed(1)
      ),
      custo_total_combo: c3Custo,
      lucro_liquido_combo: c3Lucro,
      margem_sobre_custo_pct: Math.round((c3Lucro / c3Custo) * 100),
      objetivo_estrategico:
        "Garantir mais de R$ 23,00 de lucro líquido em uma única entrega.",
      mensagem_whatsapp: `🎉 *BOX FAMÍLIA 6 SABORES — GELADINHOS GOURMET DA ROZE* 🎉\n\nGaranta a sobremesa da família inteira com 6 geladinhos artesanais ultra cremosos de 150ml:\n⭐ 2x Ninho com Nutella Original\n⭐ 2x Doce de Leite Puro Itambé\n⭐ 1x Mousse de Maracujá c/ Geleia Artesanal\n⭐ 1x Ninho c/ Geleia de Morango\n\n💰 De ~${formatCurrency(c3Avulso)}~ por *${formatCurrency(c3PrecoCombo)}*!\nChame aqui e escolha os seus! 🍨💖`,
    },
  ];

  // Overall Health Score & Executive Summary
  const criticalCount = productionItems.filter(
    (p) => p.urgencia === "critica" || p.urgencia === "alta"
  ).length;
  const healthScore = Math.max(
    68,
    Math.min(
      98,
      Math.round(
        85 +
          (analytics.dreConsolidada.margem_contribuicao_pct >= 58 ? 8 : 0) -
          criticalCount * 4
      )
    )
  );

  const topStar = bcgItems.find((b) => b.quadrante === "estrela") || bcgItems[0];

  const executiveHeadline =
    criticalCount > 0
      ? `Atenção Operacional: ${criticalCount} sabor(es) precisam de reposição imediata hoje (${totalUnidadesProduzir} un. em ${totalLotesHoje} lotes) para proteger ${formatCurrency(faturamentoPotencialHoje)} em vendas.`
      : `Operação Saudável (Score ${healthScore}/100): Estoque equilibrado e margem líquida consolidada de ${analytics.dreConsolidada.margem_contribuicao_pct}% no período.`;

  const executiveSummaryBullets = [
    `Produção Recomendada Hoje: Bater ${totalLotesHoje} lote(s) (${totalUnidadesProduzir} saquinhos de 150ml) com investimento em insumos de ${formatCurrency(custoTotalProducaoHoje)} e lucro líquido projetado de ${formatCurrency(lucroLiquidoEsperadoHoje)}.`,
    `Aproveitamento de Despensa: Você já possui sobras mapeadas (Leite Ninho, Ovomaltine, Cacau 50%, Morango) que economizam ${formatCurrency(economiaComSobras)} na lista de compras de hoje.`,
    `Engenharia de Insumos (54 Cotações): Migrar Nutella p/ Pote 650g e laticínios base p/ Atacado gera economia potencial de ${formatCurrency(economiaMensalPotencial)}/mês sem mudar nenhuma receita.`,
    `Destaque do Cardápio: "${topStar?.nome}" lidera com ${topStar?.unidades_vendidas} un. vendidas e lucro unitário de ${formatCurrency(topStar?.lucro_bruto_un || 0)} (Preço iFood calibrado em ${formatCurrency(
      calculateDynamicIfoodPrice(
        topStar?.preco_venda || 8,
        topStar?.custo_total_un || 3,
        ifoodFeePct
      ).precoIfood
    )} p/ taxa de ${ifoodFeePct.toFixed(1)}%).`,
  ];

  return {
    healthScore,
    executiveHeadline,
    executiveSummaryBullets,
    productionPlan: {
      items: productionItems,
      totalLotesHoje,
      totalUnidadesProduzir,
      custoTotalProducaoHoje,
      faturamentoPotencialHoje,
      lucroLiquidoEsperadoHoje,
    },
    shoppingList: {
      items: shoppingItems,
      custoBrutoReceitas,
      economiaComSobras,
      desembolsoLiquidoEstimado,
    },
    costOptimizations: {
      opportunities: costOpportunities,
      economiaMensalPotencial,
    },
    bcgMatrix: {
      items: bcgItems,
      mediaUnidadesVendidas,
      mediaLucroUnitario,
    },
    profitSimulation,
    smartCombos,
  };
}

/**
 * Hybrid AI Consultant ("Consultor PereiraLabs IA")
 * Uses Google Gemini API (`gemini-2.5-flash`) if an API key is provided,
 * or falls back seamlessly to the deterministic Context-Aware Local Engine.
 */
export async function askPereiraLabsAI(
  question: string,
  report: AiIntelligenceReport,
  analytics: ComputedDashboardAnalytics,
  ifoodFeePct: number,
  apiKey?: string
): Promise<{ answer: string; mode: "gemini_cloud" | "pereiralabs_local" }> {
  const cleanKey = (
    apiKey ||
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    ""
  ).trim();

  if (cleanKey) {
    try {
      const systemContext = `Você é o Consultor Financeiro e de Produção da PereiraLabs IA, especialista em confeitaria artesanal e gestão da marca "Geladinhos Gourmet da Roze" (saquinhos padrão 150ml).
Responda sempre em Português do Brasil (pt-BR), de forma executiva, acolhedora, prática e direta, usando formatação Markdown com números reais extraídos do painel abaixo:

DADOS REAIS DO PAINEL NO PERÍODO SELECIONADO:
- Faturamento Bruto: ${formatCurrency(analytics.kpis.faturamentoTotal)} (${analytics.kpis.totalGeladinhosVendidos} unidades vendidas em ${analytics.kpis.totalPedidosConcluidos} pedidos)
- Lucro Líquido Real (DRE Consolidada): ${formatCurrency(analytics.dreConsolidada.lucro_liquido)} (Margem de Contribuição: ${analytics.dreConsolidada.margem_contribuicao_pct}%)
- Ticket Médio: ${formatCurrency(analytics.kpis.ticketMedio)}
- Taxa iFood Cadastrada: ${ifoodFeePct.toFixed(1)}% (Fator divisor: ${(1 - ifoodFeePct / 100).toFixed(4)})
- Plano de Produção de Hoje: Produzir ${report.productionPlan.totalLotesHoje} lotes (${report.productionPlan.totalUnidadesProduzir} unidades), Custo: ${formatCurrency(report.productionPlan.custoTotalProducaoHoje)}, Lucro Esperado: ${formatCurrency(report.productionPlan.lucroLiquidoEsperadoHoje)}.
- Sabores Críticos/Urgentes para Produzir: ${report.productionPlan.items
        .filter((i) => i.lotes_recomendados > 0)
        .map(
          (i) =>
            `${i.nome} (Estoque: ${i.estoque_atual} un, Produzir: ${i.lotes_recomendados} lote(s) = ${i.unidades_produzir} un)`
        )
        .join("; ")}
- Economia com Sobras na Despensa Hoje: ${formatCurrency(report.shoppingList.economiaComSobras)}
- DRE por Sabor: ${analytics.drePorProduto
        .map(
          (d) =>
            `${d.nome}: Venda Local ${formatCurrency(d.preco_venda)} | iFood ${formatCurrency(d.preco_ifood)} | Custo ${formatCurrency(d.custo_total_un)} | Lucro/un ${formatCurrency(d.lucro_bruto_un)} | Vendidos: ${d.unidades_vendidas} un`
        )
        .join(" || ")}
- Resumo Lote 69 Unidades (9 Receitas): Custo R$ ${RESUMO_LOTES_PRODUCAO.loteCardapioExpandido9Receitas.custoTotalProducao.toFixed(2)}, Faturamento Local R$ ${RESUMO_LOTES_PRODUCAO.loteCardapioExpandido9Receitas.faturamentoBrutoLocal.toFixed(2)}, Lucro Líquido R$ ${RESUMO_LOTES_PRODUCAO.loteCardapioExpandido9Receitas.lucroLiquidoEstimadoLocal.toFixed(2)}.
- Cotações no Catálogo: ${TABELA_COTACAO_INSUMOS.length} itens monitorados (Varejo vs Atacado).`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemContext }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: question }],
              },
            ],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 900,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text.trim()) {
          return { answer: text.trim(), mode: "gemini_cloud" };
        }
      }
    } catch {
      // Fallback to local engine if network or key fails
    }
  }

  // Deterministic Context-Aware Local Analytical Engine
  const q = question.toLowerCase();

  if (
    q.includes("produzir") ||
    q.includes("produção") ||
    q.includes("hoje") ||
    q.includes("estoque") ||
    q.includes("falta")
  ) {
    const urgentes = report.productionPlan.items.filter(
      (i) => i.lotes_recomendados > 0
    );
    const lista = urgentes
      .map(
        (i) =>
          `- **${i.nome}**: Estoque atual de **${i.estoque_atual} un.** (autonomia de ${i.autonomia_dias} dias) $\\rightarrow$ Bater **${i.lotes_recomendados} receita(s)** (**+${i.unidades_produzir} un.** | Custo: ${formatCurrency(i.custo_total_producao)} | Lucro esperado: **${formatCurrency(i.lucro_liquido_esperado)}**)`
      )
      .join("\n");

    return {
      mode: "pereiralabs_local",
      answer: `### 👩‍🍳 Plano de Produção Recomendado para Hoje\n\nCruzando o seu giro dos últimos 7 dias com o estoque atual da **Geladinhos Gourmet da Roze**, a recomendação é produzir **${report.productionPlan.totalLotesHoje} lote(s)** hoje (**${report.productionPlan.totalUnidadesProduzir} saquinhos de 150ml**):\n\n${
        lista ||
        "- Todos os sabores estão com estoque confortável acima de 4,5 dias de autonomia!"
      }\n\n💰 **Resumo Financeiro da Fornada de Hoje:**\n- **Custo Total de Produção:** ${formatCurrency(report.productionPlan.custoTotalProducaoHoje)} *(mas você economiza **${formatCurrency(report.shoppingList.economiaComSobras)}** usando as sobras de Leite Ninho, Ovomaltine, Cacau 50% e Morango já em estoque!)*\n- **Faturamento Bruto Estimado:** ${formatCurrency(report.productionPlan.faturamentoPotencialHoje)}\n- **Lucro Líquido no Bolso:** **${formatCurrency(report.productionPlan.lucroLiquidoEsperadoHoje)}**`,
    };
  }

  if (
    q.includes("ifood") ||
    q.includes("taxa") ||
    q.includes("preço") ||
    q.includes("precificar") ||
    q.includes("738")
  ) {
    const fator = (1 - ifoodFeePct / 100).toFixed(4).replace(".", ",");
    const tabela = analytics.drePorProduto
      .map(
        (d) =>
          `- **${d.nome}**: Local **${formatCurrency(d.preco_venda)}** $\\rightarrow$ iFood **${formatCurrency(d.preco_ifood)}** *(Lucro Líquido preservado: **${formatCurrency(d.lucro_liquido_ifood)}/un.**)*`
      )
      .join("\n");

    return {
      mode: "pereiralabs_local",
      answer: `### 🛵 Precificação Dinâmica iFood (Taxa ativa: ${ifoodFeePct.toFixed(1)}%)\n\nPara ganhar exatamente o **mesmo lucro líquido em reais** da venda local, aplicamos o fator divisor exato de **${fator}** ($\\text{Preço iFood} = \\text{Preço Local} \\div ${fator}$):\n\n${tabela}\n\n✅ **Por que isso protege seu caixa?** Quando o iFood desconta os **${ifoodFeePct.toFixed(1)}%** sobre o preço do app, o repasse líquido que cai na sua conta é **100% idêntico ao seu Preço Local**, garantindo margem integral em todos os 8 sabores!`,
    };
  }

  if (
    q.includes("lucro") ||
    q.includes("margem") ||
    q.includes("rentável") ||
    q.includes("campeão") ||
    q.includes("melhor") ||
    q.includes("dre")
  ) {
    const sortedByUnitProfit = [...analytics.drePorProduto].sort(
      (a, b) => b.lucro_bruto_un - a.lucro_bruto_un
    );
    const top3Unit = sortedByUnitProfit
      .slice(0, 3)
      .map(
        (d, i) =>
          `${i + 1}. **${d.nome}** — Lucro Líquido de **${formatCurrency(d.lucro_bruto_un)}/un.** (Venda: ${formatCurrency(d.preco_venda)} | Custo: ${formatCurrency(d.custo_total_un)} | Markup: **${d.markup_multiplicador}x**)`
      )
      .join("\n");

    return {
      mode: "pereiralabs_local",
      answer: `### 📊 Análise de Rentabilidade & DRE por Sabor\n\nNo período filtrado, sua operação acumulou **${formatCurrency(analytics.dreConsolidada.receita_bruta)}** de receita bruta e **${formatCurrency(analytics.dreConsolidada.lucro_liquido)}** de **Lucro Líquido Real** (já descontando taxas de pagamento, insumos, saquinhos de 150ml e 15% de gás/energia/água).\n\n🏆 **Top 3 Sabores que Mais Deixam Dinheiro por Unidade:**\n${top3Unit}\n\n💡 **Dica Estratégica PereiraLabs IA:** O sabor **${sortedByUnitProfit[0]?.nome}** entrega a maior margem unitária do cardápio. Combine-o em kits de 4 unidades com o **Ninho com Nutella** para elevar o ticket médio acima de R$ 29,00!`,
    };
  }

  if (
    q.includes("insumo") ||
    q.includes("barato") ||
    q.includes("economizar") ||
    q.includes("cotação") ||
    q.includes("atacado") ||
    q.includes("compra")
  ) {
    const ops = report.costOptimizations.opportunities
      .slice(0, 4)
      .map(
        (o) =>
          `- **${o.insumo_alvo}**: Redução de **-${o.reducao_grama_pct}% por grama** (${o.cenario_otimizado}) $\\rightarrow$ Economia de **${formatCurrency(o.economia_mensal_estimada)}/mês**`
      )
      .join("\n");

    return {
      mode: "pereiralabs_local",
      answer: `### 🛒 Engenharia de Insumos & Oportunidades no Atacado\n\nAnalisando as **54 cotações reais** cadastradas no seu painel, você pode aumentar seu lucro líquido em **${formatCurrency(report.costOptimizations.economiaMensalPotencial)} por mês** sem alterar a qualidade das receitas:\n\n${ops}\n\n📦 **Sobras Inteligentes na Despensa:** Antes de ir ao mercado hoje, lembre-se que você já possui sobras de **Leite Ninho (330g)**, **Ovomaltine (540g)**, **Chocolate 50% (960g)** e **Morango Congelado (520g)**, o que reduz seu desembolso imediato em **${formatCurrency(report.shoppingList.economiaComSobras)}**!`,
    };
  }

  if (
    q.includes("meta") ||
    q.includes("3000") ||
    q.includes("4000") ||
    q.includes("5000") ||
    q.includes("mês") ||
    q.includes("vender")
  ) {
    const sim = report.profitSimulation;
    return {
      mode: "pereiralabs_local",
      answer: `### 🎯 Plano Prático para Bater ${formatCurrency(sim.meta_lucro_mensal)} de Lucro Líquido/Mês\n\nCom o seu lucro líquido médio atual de **${formatCurrency(sim.lucro_medio_por_unidade)} por geladinho (150ml)** e trabalhando **${sim.dias_trabalhados_mes} dias no mês**, você precisa de:\n\n- **Meta Diária:** Vender **${sim.unidades_dia_necessarias} geladinhos por dia** (aprox. ${Math.ceil(sim.unidades_dia_necessarias / 4)} combos de 4 unidades)\n- **Meta Semanal:** **${sim.unidades_semana_necessarias} unidades/semana** (~**${sim.lotes_69_semana} lotes** completos do cardápio de 69 unidades)\n- **Volume Mensal Total:** **${sim.unidades_mes_necessarias} unidades** (Faturamento Bruto Local de **${formatCurrency(sim.faturamento_bruto_local_necessario)}** ou **${formatCurrency(sim.faturamento_bruto_ifood_necessario)}** no iFood)`,
    };
  }

  if (
    q.includes("promo") ||
    q.includes("combo") ||
    q.includes("whatsapp") ||
    q.includes("divulgar") ||
    q.includes("vender mais")
  ) {
    const combo = report.smartCombos[0];
    return {
      mode: "pereiralabs_local",
      answer: `### 📲 Sugestão de Combo & Mensagem Pronta para WhatsApp\n\nPara girar rápido os sabores que estão com maior estoque hoje (**${combo.sabores_inclusos.map((s) => s.nome).join(" + ")}**), lance o **${combo.titulo}** por **${formatCurrency(combo.preco_combo_sugerido)}** (seu lucro líquido no combo é de **${formatCurrency(combo.lucro_liquido_combo)}**, margem de **${combo.margem_sobre_custo_pct}% sobre o custo**):\n\n\`\`\`text\n${combo.mensagem_whatsapp}\n\`\`\``,
    };
  }

  // Default comprehensive overview answer
  return {
    mode: "pereiralabs_local",
    answer: `### 🤖 Diagnóstico Executivo PereiraLabs IA — Geladinhos Gourmet da Roze\n\nAqui está a leitura em tempo real da sua operação (Score de Saúde: **${report.healthScore}/100**):\n\n1. **Resultado no Período:** Receita Bruta de **${formatCurrency(analytics.dreConsolidada.receita_bruta)}** e Lucro Líquido Real de **${formatCurrency(analytics.dreConsolidada.lucro_liquido)}** (${analytics.dreConsolidada.unidades_vendidas} un. vendidas, margem líquida de **${analytics.dreConsolidada.margem_contribuicao_pct}%**).\n2. **O que produzir hoje:** **${report.productionPlan.totalLotesHoje} lote(s)** (**${report.productionPlan.totalUnidadesProduzir} unidades**) com foco nos sabores de menor autonomia para gerar **${formatCurrency(report.productionPlan.lucroLiquidoEsperadoHoje)}** de lucro líquido.\n3. **Economia de Compras:** Aproveitando as sobras da despensa, você economiza **${formatCurrency(report.shoppingList.economiaComSobras)}** hoje, e comprando insumos-chave no atacado (Nutella 650g, Creme de Leite e Leite Condensado) economiza mais **${formatCurrency(report.costOptimizations.economiaMensalPotencial)}/mês**.\n\n*Pergunte sobre **"O que produzir hoje?"**, **"Como precificar no iFood?"**, **"Qual sabor dá mais lucro?"** ou **"Crie uma promoção para WhatsApp"**!*`,
  };
}
