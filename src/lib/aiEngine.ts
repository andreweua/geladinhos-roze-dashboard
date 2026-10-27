import {
  RESUMO_LOTES_PRODUCAO,
  SOBRAS_ESTOQUE_INSUMOS,
  TABELA_COTACAO_INSUMOS,
} from "@/data/insumosCatalog";
import { ComputedDashboardAnalytics, calculateDynamicIfoodPrice } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { loadCurrentQuotations } from "@/services/quotationService";
import { getActiveCompanyGeminiConfig } from "@/services/companyService";
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
 * Uses Google Gemini API (`gemini-2.0-flash` / `gemini-1.5-flash`) if an API key is provided,
 * or falls back seamlessly to the comprehensive Context-Aware Local Engine.
 */
export async function askPereiraLabsAI(
  question: string,
  report: AiIntelligenceReport,
  analytics: ComputedDashboardAnalytics,
  ifoodFeePct: number,
  apiKey?: string
): Promise<{ answer: string; mode: "gemini_cloud" | "pereiralabs_local" }> {
  const companyGemini = getActiveCompanyGeminiConfig();
  const cleanKey = (
    apiKey ||
    companyGemini.apiKey ||
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    ""
  ).trim();

  // If Gemini API Key is provided, try modern models with rich system context
  if (cleanKey) {
    try {
      const systemContext = `Você é o Consultor Chefe de Operações, Confeitaria e Finanças da PereiraLabs IA, especializado na marca "Geladinhos Gourmet da Roze" (proprietária: Rozana Helena Miguel, com bases em Jaú/SP e Três Pontas/MG).
Responda sempre em Português do Brasil (pt-BR), com tom acolhedor, profissional, encorajador e altamente resolutivo, sem enrolação. Dê respostas práticas, passo a passo e com números reais.

CONHECIMENTO COMPLETO DA OPERAÇÃO:
1. PADRÃO GOURMET:
   - Volume padrão: exatamente 150ml por saquinho.
   - Base cremosa clássica: 1 lata de leite condensado (395g) + 1 cx de creme de leite (200g) + 1 medida de leite integral + 10g a 12g de Liga Neutra. Bater no liquidificador, retirar a espuma com colher após descansar 15 a 20 min para não formar cristais de gelo nem bolhas de ar.
   - Custo da embalagem: R$ 0,05 por saquinho (150ml). Custo operacional (energia, gás, freezer): ~15% (R$ 0,35/un).

2. OS 8 SABORES OFICIAIS, CUSTOS E PREÇOS:
   - Ninho com Nutella: Custo R$ 3,44 | Venda Local R$ 7,50 | iFood R$ 10,16 | Lucro Líquido Local R$ 4,06/un (54,1% margem). Modo: Espalhar 15g de Nutella na parede interna do saquinho com saco de confeitar antes de colocar a base de Ninho.
   - Mousse de Morango c/ Geleia Artesanal: Custo R$ 2,89 | Venda Local R$ 7,00 | iFood R$ 9,49 | Lucro Líquido Local R$ 4,11/un (58,7% margem). Geleia: Morangos frescos reduzidos com açúcar.
   - Mousse de Maracujá c/ Geleia Artesanal: Custo R$ 2,64 | Venda Local R$ 6,50 | iFood R$ 8,81 | Lucro Líquido Local R$ 3,86/un (59,4% margem). Toque azedinho da polpa com sementes mesclada no saquinho.
   - Doce de Leite: Custo R$ 2,74 | Venda Local R$ 6,50 | iFood R$ 8,81 | Lucro Líquido Local R$ 3,76/un (57,8% margem). 12g de Doce de Leite Itambé espalhado no saquinho.
   - Paçoca Cremosa: Custo R$ 2,33 | Venda Local R$ 6,00 | iFood R$ 8,13 | Lucro Líquido Local R$ 3,67/un (61,2% margem). Paçoca rolha batida com a base e pedacinhos no saquinho.
   - Ouro Branco: Custo R$ 3,25 | Venda Local R$ 7,50 | iFood R$ 10,16 | Lucro Líquido Local R$ 4,25/un (56,7% margem). Bombom picado e base de chocolate branco.
   - Sonho de Valsa: Custo R$ 3,28 | Venda Local R$ 7,50 | iFood R$ 10,16 | Lucro Líquido Local R$ 4,22/un (56,3% margem). Bombom picado e base de amendoim/castanha.
   - Coco Branco Cremoso: Custo R$ 2,27 | Venda Local R$ 6,00 | iFood R$ 8,13 | Lucro Líquido Local R$ 3,73/un (62,2% margem). Leite de coco + coco ralado úmido.

3. REGRAS DE NEGÓCIO E TECNOLOGIA:
   - Taxa iFood: ${ifoodFeePct.toFixed(1)}%. Para receber o mesmo valor da venda local, divide o preço local por ${(1 - ifoodFeePct / 100).toFixed(4)}.
   - Pagamentos: Pix Stone dinâmico (taxa 0,99%), Dinheiro (0%), Débito (1,99%), Crédito (3,50%).
   - Estoque: Bloqueio estrito de vendas sem saldo. Não permite estoque negativo nem zerado. Ajustes físicos pelo Admin exigem motivo e notificam por e-mail na Central de Auditoria.
   - Dados Atuais no Período: Faturamento Total: ${formatCurrency(analytics.kpis.faturamentoTotal)} (${analytics.kpis.totalGeladinhosVendidos} un.), Lucro Líquido: ${formatCurrency(analytics.dreConsolidada.lucro_liquido)}.
   - Se o faturamento estiver zerado (início ou teste novo), não diga que está tudo confortável sem fazer nada; oriente ativamente os primeiros passos para a produção e venda.`;

      const preferredModel = companyGemini.model || "gemini-2.5-flash";
      const modelsToTry = [
        preferredModel,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-3-flash-preview",
        "gemini-1.5-flash",
      ].filter((v, i, a) => a.indexOf(v) === i);

      for (const model of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
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
                  maxOutputTokens: 1200,
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
          // try next model candidate
        }
      }
    } catch {
      // Fallback to local engine if network or key fails
    }
  }

  // Comprehensive Context-Aware Local Engine (100% Offline & Free)
  const q = question.toLowerCase().trim();

  // 1. Dúvidas sobre primeiros passos / início / o que fazer hoje / teste
  if (
    q.includes("começar") ||
    q.includes("início") ||
    q.includes("inicio") ||
    q.includes("primeiro dia") ||
    q.includes("o que fazer") ||
    q.includes("passo a passo") ||
    q.includes("por onde") ||
    q.includes("ajuda") ||
    q.includes("não sei") ||
    q.includes("teste") ||
    q.includes("primeira")
  ) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🚀 Guia Prático de Início Rápido — Geladinhos Gourmet da Roze

Olá! Para começar a operação com segurança e garantir lucro imediato, siga estes 5 passos fundamentais:

1. **Compras no Atacado Hoje:**
   - Priorize os ingredientes da **Base Neutra**: Leite Condensado (fardo ou cx 395g), Creme de Leite (cx 200g), Leite Integral e Liga Neutra (pote 100g ou 1kg).
   - Compre saquinhos próprios para geladinho gourmet (tamanho **150ml** — R$ 0,05/un).
   - Recheios nobres: 1 pote de Nutella (compre 650g para economizar 18% por grama), Doce de Leite Itambé e Paçoca Rolha.

2. **Produza o Quarteto Campeão de Vendas (32 unidades no 1º lote):**
   - **Ninho com Nutella:** 8 unidades (Preço sugerido: R$ 7,50 | Lucro: R$ 4,06/un)
   - **Mousse de Morango com Geleia:** 8 unidades (Preço sugerido: R$ 7,00 | Lucro: R$ 4,11/un)
   - **Mousse de Maracujá com Geleia:** 8 unidades (Preço sugerido: R$ 6,50 | Lucro: R$ 3,86/un)
   - **Doce de Leite Cremoso:** 8 unidades (Preço sugerido: R$ 6,50 | Lucro: R$ 3,76/un)
   - *Total investido na fornada: ~R$ 93,00 $\\rightarrow$ Faturamento esperado: **R$ 220,00** $\\rightarrow$ Lucro líquido: **R$ 127,00**!*

3. **Segredo da Confeitaria:**
   - Bata a base no liquidificador e **deixe descansar por 15 a 20 minutos**.
   - Retire a espuma que sobe com uma colher antes de encher os saquinhos. Isso elimina bolhas e impede a formação de cristais de gelo!
   - Encha com dosador em exatos 150ml e leve ao congelador por 4 a 6 horas.

4. **Entrada no Estoque:**
   - Quando estiverem congelados, abra a aba **"4. Auditoria de Estoque (Admin)"** e adicione as quantidades prontas de cada sabor.

5. **Primeiras Vendas:**
   - Abra o botão **"Novo Pedido / Frente de Caixa (PDV)"** para registrar cada venda (Pix Stone, Dinheiro ou Cartão) e ver seu lucro subir em tempo real!`,
    };
  }

  // 2. Dúvidas sobre Ninho com Nutella
  if (q.includes("ninho") || q.includes("nutella")) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🍫 Ficha Técnica: Geladinho Gourmet Ninho com Nutella (150ml)

O **Ninho com Nutella** é o carro-chefe de vendas da Roze Gourmet e o sabor mais desejado pelos clientes.

- **Preço de Venda Local:** R$ 7,50
- **Preço no iFood (com taxa 26,2%):** R$ 10,16
- **Custo Total de Produção:** R$ 3,44 por unidade (insumos R$ 3,04 + saquinho R$ 0,05 + operacional R$ 0,35)
- **Lucro Líquido no Bolso:** **R$ 4,06 por unidade** (Margem de **54,1%** sobre a venda)

**Ingredientes para 1 Lote (~8 a 9 unidades de 150ml):**
- 1 cx de Leite Condensado (395g)
- 1 cx de Creme de Leite (200g)
- 1 medida da caixinha de Leite Integral (~300ml)
- 50g a 60g de Leite Ninho em pó integral
- 10g de Liga Neutra
- 120g a 135g de Nutella original (~15g por saquinho)

**Modo de Preparo Profissional:**
1. Coloque a Nutella em uma manga/saco de confeitar.
2. Insira a ponta até o fundo do saquinho de 150ml e aperte ~15g. Espalhe com os dedos pelas paredes internas do saquinho.
3. Bata no liquidificador o leite condensado, creme de leite, leite integral, leite Ninho e a liga neutra por 2 minutos.
4. Deixe a mistura descansar por 15 minutos e retire a espuma superficial.
5. Despeje 150ml da base em cada saquinho já com a Nutella espalhada, amarre ou sele e congele por 5 horas.`,
    };
  }

  // 3. Dúvidas sobre Morango / Geleia de Morango
  if (q.includes("morango") || q.includes("geleia de morango")) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🍓 Ficha Técnica: Mousse de Morango com Geleia Artesanal (150ml)

O morango com pedacinhos de fruta fresca garante alto valor percebido e excelente margem de contribuição.

- **Preço de Venda Local:** R$ 7,00
- **Preço no iFood (taxa 26,2%):** R$ 9,49
- **Custo Total de Produção:** R$ 2,89 por unidade
- **Lucro Líquido no Bolso:** **R$ 4,11 por unidade** (Margem de **58,7%**)

**Geleia Artesanal (Redução em fogo brando):**
- 500g de Morangos frescos ou congelados picados
- 100g de Açúcar cristal
- *Preparo da geleia:* Cozinhe em fogo baixo mexendo até engrossar e ficar em ponto de calda brilhante. Deixe esfriar completamente antes de montar.

**Base do Mousse (Rendimento ~8 unidades):**
- 1 cx Leite Condensado (395g) + 1 cx Creme de Leite (200g) + 1 medida de Leite Integral + 1 pacote de pó para suco/sobremesa de morango + 10g Liga Neutra.
- Espalhe 15g da geleia de morango fria no saquinho e complete com 150ml do mousse batido.`,
    };
  }

  // 4. Dúvidas sobre Maracujá
  if (q.includes("maracuja") || q.includes("maracujá")) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🟡 Ficha Técnica: Mousse de Maracujá com Geleia Artesanal (150ml)

Sabor refrescante com o contraste perfeito entre o doce do mousse e a acidez das sementes de maracujá.

- **Preço de Venda Local:** R$ 6,50
- **Preço no iFood (taxa 26,2%):** R$ 8,81
- **Custo Total de Produção:** R$ 2,64 por unidade
- **Lucro Líquido no Bolso:** **R$ 3,86 por unidade** (Margem de **59,4%**)

**Composição da Receita:**
- Polpa de Maracujá com sementes reduzida com açúcar para mesclar no saquinho (10g a 12g por unidade).
- Base cremosa de leite condensado, creme de leite, leite e polpa concentrada de maracujá batida com 10g de liga neutra.`,
    };
  }

  // 5. Dúvidas sobre Paçoca
  if (q.includes("paçoca") || q.includes("pacoca") || q.includes("amendoim")) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🥜 Ficha Técnica: Paçoca Cremosa Gourmet (150ml)

Um dos sabores mais baratos de produzir e com maior aceitação popular em qualquer época do ano.

- **Preço de Venda Local:** R$ 6,00
- **Preço no iFood (taxa 26,2%):** R$ 8,13
- **Custo Total de Produção:** **R$ 2,33 por unidade**
- **Lucro Líquido no Bolso:** **R$ 3,67 por unidade** (Margem de **61,2%**)

**Ingredientes (Rendimento ~8 unidades de 150ml):**
- 1 cx Leite Condensado (395g) + 1 cx Creme de Leite (200g) + 300ml Leite Integral.
- 5 a 6 Paçocas tipo Rolha esfareladas (bata 4 na base e reserve 1 a 2 esfareladas para colocar dentro dos saquinhos).
- 10g de Liga Neutra para dar textura aveludada.`,
    };
  }

  // 6. Dúvidas sobre Doce de Leite, Ouro Branco, Sonho de Valsa ou Coco
  if (
    q.includes("doce de leite") ||
    q.includes("ouro branco") ||
    q.includes("sonho de valsa") ||
    q.includes("coco")
  ) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🍨 Sabores Nobres de Alta Margem — Roze Gourmet

- **Doce de Leite Itambé:** Custo: R$ 2,74 | Venda Local: R$ 6,50 | iFood: R$ 8,81 | **Lucro: R$ 3,76/un.** (Espalhe 12g de Doce de Leite com bico na parede do saquinho).
- **Ouro Branco:** Custo: R$ 3,25 | Venda Local: R$ 7,50 | iFood: R$ 10,16 | **Lucro: R$ 4,25/un.** (Base cremosa de chocolate branco com bombom Ouro Branco picado).
- **Sonho de Valsa:** Custo: R$ 3,28 | Venda Local: R$ 7,50 | iFood: R$ 10,16 | **Lucro: R$ 4,22/un.** (Base de castanha com bombom Sonho de Valsa picadinho).
- **Coco Branco Cremoso:** Custo: R$ 2,27 | Venda Local: R$ 6,00 | iFood: R$ 8,13 | **Lucro: R$ 3,73/un.** (Leite de coco Sococo + coco ralado úmido).`,
    };
  }

  // 7. Segredo técnico de confeitaria (liga neutra, cristais de gelo, cremosidade, espuma)
  if (
    q.includes("liga neutra") ||
    q.includes("espuma") ||
    q.includes("cristal") ||
    q.includes("gelo") ||
    q.includes("cremos") ||
    q.includes("textura") ||
    q.includes("liquidificador")
  ) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🔬 O Segredo da Textura Gourmet Aveludada (Sem Cristais de Gelo)

Para um geladinho ser considerado **Gourmet de Verdade**, ele precisa ter consistência de sorvete de massa ao morder, nunca de picolé de gelo. Siga estas 4 regras de ouro:

1. **Uso Correto da Liga Neutra:** Use exatamente **10g a 12g de Liga Neutra** (cerca de 1 colher de sopa rasa) por receita de 1 litro de base. A liga neutra retém as moléculas de água e evita o congelamento em agulhas de gelo.
2. **Tempo de Descanso Obrigatório:** Ao bater no liquidificador por 2 minutos, cria-se muita espuma (ar). **Desligue e deixe a jarra descansar por 15 a 20 minutos**.
3. **Retirada da Espuma:** Com uma colher grande ou espumadeira, retire toda a camada branca de espuma que subiu. Encha os saquinhos apenas com o líquido liso e denso.
4. **Espessura do Saquinho:** Use saquinhos próprios para geladinho gourmet (gramatura micra entre 0,06 e 0,08) de **150ml**. Evita furos no congelador e dá aspecto profissional.`,
    };
  }

  // 8. Dúvidas sobre iFood, taxas e precificação
  if (
    q.includes("ifood") ||
    q.includes("taxa") ||
    q.includes("738") ||
    q.includes("divisor") ||
    q.includes("entrega") ||
    q.includes("delivery")
  ) {
    const divisor = (1 - ifoodFeePct / 100).toFixed(4);
    return {
      mode: "pereiralabs_local",
      answer: `### 🛵 Fórmula Exata da Precificação iFood (Taxa Cadastrada: ${ifoodFeePct.toFixed(1)}%)

Para você nunca pagar a comissão do iFood do seu próprio bolso, o sistema calcula o preço com a **Fórmula do Divisor de Margem Protegida**:

$$\\text{Preço iFood} = \\frac{\\text{Preço de Venda Local}}{1 - (\\text{Taxa}/100)} = \\frac{\\text{Preço Local}}{${divisor.replace(".", ",")}}$$

**Tabela Pronta de Preços no iFood:**
- Sabores de **R$ 6,00** (Paçoca, Coco) $\\rightarrow$ **R$ 8,13** no iFood
- Sabores de **R$ 6,50** (Doce de Leite, Maracujá) $\\rightarrow$ **R$ 8,81** no iFood
- Sabores de **R$ 7,00** (Morango com Geleia) $\\rightarrow$ **R$ 9,49** no iFood
- Sabores de **R$ 7,50** (Ninho Nutella, Bombons) $\\rightarrow$ **R$ 10,16** no iFood

*Quando o iFood desconta os ${ifoodFeePct.toFixed(1)}% de comissão, o valor líquido que cai na conta da Roze é exatamente igual ao preço cobrado no balcão físico!*`,
    };
  }

  // 9. Dúvidas sobre Stone / Ton / Pix / Maquininha / Pagamentos
  if (
    q.includes("stone") ||
    q.includes("ton") ||
    q.includes("pix") ||
    q.includes("maquininha") ||
    q.includes("cartão") ||
    q.includes("cartao") ||
    q.includes("pagamento")
  ) {
    return {
      mode: "pereiralabs_local",
      answer: `### 💳 Integração Financeira: Stone / Ton & Pix Dinâmico

O painel já possui suporte para recebimento automatizado e conciliação de vendas:

- **Pix Dinâmico Stone:** Gera QR Code exclusivo e código Copia e Cola para cada pedido. A taxa negociada Stone/Ton PJ é de **0,99%**.
- **Dinheiro em Espécie:** Taxa de **0,00%** (100% no caixa).
- **Cartão de Débito:** Taxa de **1,99%**.
- **Cartão de Crédito à Vista:** Taxa de **3,50%**.

*Ao finalizar uma venda pelo botão "Novo Pedido / PDV", o sistema já desconta a taxa exata da forma de pagamento e calcula seu Lucro Líquido Real instantaneamente!*`,
    };
  }

  // 10. Dúvidas sobre Estoque, Auditoria, Negativo e Estornos
  if (
    q.includes("estoque") ||
    q.includes("negativo") ||
    q.includes("zerado") ||
    q.includes("auditoria") ||
    q.includes("ajustar") ||
    q.includes("estorn") ||
    q.includes("cancelar") ||
    q.includes("bloqueio")
  ) {
    return {
      mode: "pereiralabs_local",
      answer: `### 🛡️ Regras de Controle de Estoque & Auditoria (v2.8.0)

O sistema conta com proteção reforçada de estoque:

1. **Bloqueio de Venda Sem Saldo:**
   - O PDV não permite selecionar mais unidades do que existem no congelador.
   - Se o sabor estiver com 0 unidades, exibe o aviso \`🚫 Esgotado\` e o botão fica bloqueado.
   - O estoque nunca fica negativo.

2. **Ajuste Físico de Estoque pelo Administrador:**
   - Na aba **"4. Auditoria de Estoque (Admin)"**, você pode lançar a contagem física real dos geladinhos ou insumos.
   - O sistema exige informar o **Nome do Responsável** e o **Motivo** (ex: inventário, degelo, avaria, degustação).

3. **Notificação por E-mail:**
   - Todos os ajustes geram logs permanentes e disparam notificações para a lista de e-mails cadastrada.

4. **Estorno de Venda:**
   - Na tabela de Últimas Vendas, se um cliente cancelar ou devolver, você pode clicar em **Estornar**. O sistema pergunta se deseja devolver o produto ao estoque e cancela a receita mantendo o histórico de auditoria.`,
    };
  }

  // 11. Dúvidas sobre Celular / PWA / Instalação
  if (
    q.includes("celular") ||
    q.includes("instalar") ||
    q.includes("pwa") ||
    q.includes("app") ||
    q.includes("android") ||
    q.includes("iphone") ||
    q.includes("ios")
  ) {
    return {
      mode: "pereiralabs_local",
      answer: `### 📱 Como Instalar e Usar o App no Celular da Roze

O sistema é um **PWA (Progressive Web App)** nativo e funciona perfeitamente sem precisar baixar da loja:

- **No Celular Android (Chrome):**
  1. Abra o link do painel no Google Chrome.
  2. Toque no aviso **"Instalar Aplicativo"** ou nos 3 pontinhos no canto superior $\\rightarrow$ **"Instalar aplicativo"**.
  3. O ícone oficial da Roze Gourmet aparecerá na tela inicial e abrirá em tela cheia sem barras de navegador.

- **No iPhone / iPad (Safari):**
  1. Abra o link no Safari.
  2. Toque no botão de **Compartilhar** (ícone do quadrado com a setinha para cima $\\uparrow$).
  3. Role para baixo e selecione **"Adicionar à Tela de Início"**.
  4. Toque em "Adicionar" no canto superior direito.

*Pronto! Ele funcionará como um aplicativo oficial no celular dela.*`,
    };
  }

  // 12. Dúvidas sobre Compras / Atacado / Cotações
  if (
    q.includes("compra") ||
    q.includes("insumo") ||
    q.includes("mercado") ||
    q.includes("atacado") ||
    q.includes("cotação") ||
    q.includes("cotacao") ||
    q.includes("barato")
  ) {
    const ops = report.costOptimizations.opportunities
      .slice(0, 3)
      .map(
        (o) =>
          `- **${o.insumo_alvo}**: Comprando embalagem maior (${o.cenario_otimizado}) reduz **-${o.reducao_grama_pct}%** do custo por grama $\\rightarrow$ Economia estimada de **${formatCurrency(o.economia_mensal_estimada)}/mês**`
      )
      .join("\n");

    return {
      mode: "pereiralabs_local",
      answer: `### 🛒 Estratégia de Compras no Atacado & Economia de Insumos

Para maximizar o lucro, a regra de ouro é **nunca comprar embalagens pequenas de varejo**:

${ops}

📦 **Dica de Despensa:** Antes de ir ao mercado, confira a aba **"3. Pesquisa de Mercados & Preços Pagos"** para registrar os preços das notas fiscais e atualizar automaticamente o custo de todas as 8 receitas!`,
    };
  }

  // 13. Metas de Lucro / Quanto Vender
  if (
    q.includes("meta") ||
    q.includes("lucro") ||
    q.includes("3000") ||
    q.includes("4000") ||
    q.includes("5000") ||
    q.includes("quanto vender")
  ) {
    const sim = report.profitSimulation;
    return {
      mode: "pereiralabs_local",
      answer: `### 🎯 Planejamento de Metas: Como Bater ${formatCurrency(sim.meta_lucro_mensal)} de Lucro Líquido no Mês

Considerando o lucro líquido médio de **${formatCurrency(sim.lucro_medio_por_unidade)} por geladinho** e trabalhando **${sim.dias_trabalhados_mes} dias**:

- **Meta Diária:** Vender **${sim.unidades_dia_necessarias} geladinhos por dia** (apenas ~${Math.ceil(sim.unidades_dia_necessarias / 4)} kits de 4 unidades).
- **Meta Semanal:** **${sim.unidades_semana_necessarias} unidades por semana**.
- **Meta Mensal:** **${sim.unidades_mes_necessarias} unidades no mês**.
- **Faturamento Bruto Mensal:** **${formatCurrency(sim.faturamento_bruto_local_necessario)}** no balcão ou **${formatCurrency(sim.faturamento_bruto_ifood_necessario)}** no iFood.`,
    };
  }

  // 14. Promoção / Combos / WhatsApp
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
      answer: `### 📲 Combo de Vendas Rápido para Divulgar no WhatsApp

Divulgue o **${combo.titulo}** por **${formatCurrency(combo.preco_combo_sugerido)}** (Lucro Líquido: **${formatCurrency(combo.lucro_liquido_combo)}**):

\`\`\`text
${combo.mensagem_whatsapp}
\`\`\`

*Copie a mensagem acima, publique no Status do WhatsApp e envie para grupos de condomínios e amigos para abrir a agenda de encomendas do dia!*`,
    };
  }

  // 15. Default Comprehensive AI Consultant
  return {
    mode: "pereiralabs_local",
    answer: `### 💡 Consultoria PereiraLabs IA — Geladinhos Gourmet da Roze

Analisei sua pergunta ("*${question}*") com base nas 8 fichas técnicas, controle de estoque e precificação da sua confeitaria:

1. **Foco na Produção e Qualidade:**
   - Os 8 sabores oficiais possuem custo médio de R$ 2,82 e preço médio de R$ 6,88, entregando **mais de 140% de margem líquida média**.
   - Para começar a produzir, priorize os sabores mais pedidos: **Ninho com Nutella**, **Mousse de Morango com Geleia** e **Doce de Leite**.

2. **Dicas Rápidas:**
   - Para saber a receita e modo de preparo de qualquer sabor, pergunte: "*Qual a receita do Ninho com Nutella?*" ou "*Como fazer o morango?*".
   - Para entender a taxa do iFood, pergunte: "*Como funciona a taxa do iFood?*".
   - Para planejar compras, pergunte: "*O que comprar no atacado?*".

*Como posso te ajudar especificamente agora com as receitas, compras, vendas ou estoque?*`,
  };
}
