import { BRAND_CONFIG } from "@/config/brand.config";
import { getActiveCompanyId } from "@/services/companyService";
import {
  CompraNotaFiscalReal,
  EstabelecimentoLocal,
  PesquisaPrecoLocal,
} from "@/types/dashboard";

function getSurveyStorageKey(
  type: "estabelecimentos" | "pesquisas" | "compras",
  companyId?: string
): string {
  const currentId = companyId || getActiveCompanyId();
  if (currentId === "emp-roze-gourmet") {
    return {
      estabelecimentos: `${BRAND_CONFIG.storagePrefix}_estabelecimentos_v3_simao_jau_trespontas`,
      pesquisas: `${BRAND_CONFIG.storagePrefix}_pesquisas_precos_v3_validade`,
      compras: `${BRAND_CONFIG.storagePrefix}_compras_reais_v3`,
    }[type];
  }
  return `${BRAND_CONFIG.storagePrefix}_${type}_${currentId}_v1`;
}

/**
 * Normaliza o preço para uma base comparativa padrão:
 * - Para "g" -> calcula o preço por Kg
 * - Para "ml" -> calcula o preço por Litro
 * - Para "kg", "l", "un" -> retorna o preço unitário direto
 */
export function calculateNormalizedPrice(
  preco: number,
  quantidade: number,
  unidade: "g" | "kg" | "ml" | "l" | "un"
): number {
  if (quantidade <= 0 || preco <= 0) return 0;
  if (unidade === "g" || unidade === "ml") {
    // 1000g = 1kg / 1000ml = 1L
    return Number(((preco / quantidade) * 1000).toFixed(2));
  }
  if (unidade === "kg" || unidade === "l") {
    return Number((preco / quantidade).toFixed(2));
  }
  // "un"
  return Number((preco / quantidade).toFixed(2));
}

/**
 * Verifica se a cotação/oferta ainda é válida na data atual
 * Se a data de validade já passou, ela NÃO é considerada o preço ativo vigente de hoje!
 */
export function isQuotationValid(
  quotation: PesquisaPrecoLocal,
  referenceDate: Date = new Date()
): boolean {
  if (!quotation.data_validade) {
    // Se não tiver validade cadastrada, considera válida por 7 dias a partir da data da pesquisa
    const searchDate = new Date(quotation.data_pesquisa);
    const maxDate = new Date(searchDate.getTime() + 7 * 86400000);
    return referenceDate.getTime() <= maxDate.getTime();
  }

  const validUntil = new Date(`${quotation.data_validade}T23:59:59`);
  return referenceDate.getTime() <= validUntil.getTime();
}

/**
 * Análise Histórica de Preços & Tendência de Inflação por Insumo
 */
export interface HistoricalPriceAnalysis {
  insumo_nome: string;
  totalCotacoes: number;
  cotacoesVigentes: number;
  cotacoesExpiradas: number;
  menorPrecoVigente: number | null;
  estabelecimentoMenorPreco: string | null;
  mediaHistorica: number;
  menorHistorico: number;
  maiorHistorico: number;
  inflacaoAcumuladaPct: number;
  sugestaoEstocar: boolean;
  motivoEstoque: string | null;
}

export function analyzeHistoricalPrices(
  allQuotations: PesquisaPrecoLocal[],
  insumoNome: string
): HistoricalPriceAnalysis {
  const normTarget = insumoNome.toLowerCase().trim();
  const related = allQuotations.filter((q) => {
    const qName = q.insumo_nome.toLowerCase().trim();
    return qName.includes(normTarget) || normTarget.includes(qName);
  });

  if (related.length === 0) {
    return {
      insumo_nome: insumoNome,
      totalCotacoes: 0,
      cotacoesVigentes: 0,
      cotacoesExpiradas: 0,
      menorPrecoVigente: null,
      estabelecimentoMenorPreco: null,
      mediaHistorica: 0,
      menorHistorico: 0,
      maiorHistorico: 0,
      inflacaoAcumuladaPct: 0,
      sugestaoEstocar: false,
      motivoEstoque: null,
    };
  }

  const validQuotes = related.filter((q) => isQuotationValid(q));
  const expiredQuotes = related.filter((q) => !isQuotationValid(q));

  const allNormalizedPrices = related.map((q) => q.preco_por_kg_ou_l);
  const mediaHistorica = Number(
    (
      allNormalizedPrices.reduce((a, b) => a + b, 0) /
      allNormalizedPrices.length
    ).toFixed(2)
  );
  const menorHistorico = Math.min(...allNormalizedPrices);
  const maiorHistorico = Math.max(...allNormalizedPrices);

  // Menor preço entre as ofertas VIGENTES (que não expiraram)
  let menorPrecoVigente: number | null = null;
  let estabelecimentoMenorPreco: string | null = null;

  if (validQuotes.length > 0) {
    validQuotes.sort((a, b) => a.preco_por_kg_ou_l - b.preco_por_kg_ou_l);
    menorPrecoVigente = validQuotes[0].preco_por_kg_ou_l;
    estabelecimentoMenorPreco = `${validQuotes[0].estabelecimento_nome} (${validQuotes[0].marca})`;
  }

  // Variação percentual entre a primeira cotação histórica e a mais recente
  const sortedByDate = [...related].sort(
    (a, b) =>
      new Date(a.data_pesquisa).getTime() - new Date(b.data_pesquisa).getTime()
  );
  const precoAntigo = sortedByDate[0].preco_por_kg_ou_l;
  const precoRecente =
    sortedByDate[sortedByDate.length - 1].preco_por_kg_ou_l;
  const inflacaoAcumuladaPct =
    precoAntigo > 0
      ? Number((((precoRecente - precoAntigo) / precoAntigo) * 100).toFixed(1))
      : 0;

  // Sugestão de Estoque inteligente:
  // Se o menor preço vigente estiver pelo menos 12% abaixo da média histórica, vale muito a pena estocar!
  let sugestaoEstocar = false;
  let motivoEstoque: string | null = null;

  if (menorPrecoVigente !== null && mediaHistorica > 0) {
    const descontoEmRelacaoAMedia =
      ((mediaHistorica - menorPrecoVigente) / mediaHistorica) * 100;
    if (descontoEmRelacaoAMedia >= 12) {
      sugestaoEstocar = true;
      motivoEstoque = `Preço vigente está ${descontoEmRelacaoAMedia.toFixed(
        0
      )}% abaixo da média histórica (${BRAND_CONFIG.currency} ${mediaHistorica.toFixed(
        2
      )}). Excelente oportunidade para abastecer o estoque e proteger a margem!`;
    }
  }

  return {
    insumo_nome: insumoNome,
    totalCotacoes: related.length,
    cotacoesVigentes: validQuotes.length,
    cotacoesExpiradas: expiredQuotes.length,
    menorPrecoVigente,
    estabelecimentoMenorPreco,
    mediaHistorica,
    menorHistorico,
    maiorHistorico,
    inflacaoAcumuladaPct,
    sugestaoEstocar,
    motivoEstoque,
  };
}

/**
 * Cálculo de Custo Médio Ponderado (CMP) para Insumos de Estoque
 * Fórmula: ((Estoque Atual * Custo Médio Atual) + (Qtd Nova * Custo Novo)) / (Estoque Atual + Qtd Nova)
 */
export function calculateWeightedAverageCost(
  estoqueAtual: number,
  custoAtual: number,
  qtdNova: number,
  custoNovo: number
): {
  custoMedioPonderado: number;
  quantidadeTotal: number;
  diferencaPercentual: number;
} {
  const qtdTotal = Math.max(0, estoqueAtual) + Math.max(0, qtdNova);
  if (qtdTotal <= 0) {
    return {
      custoMedioPonderado: custoNovo || custoAtual,
      quantidadeTotal: 0,
      diferencaPercentual: 0,
    };
  }

  const valorTotal =
    Math.max(0, estoqueAtual) * Math.max(0, custoAtual) +
    Math.max(0, qtdNova) * Math.max(0, custoNovo);
  const cmp = Number((valorTotal / qtdTotal).toFixed(2));
  const diffPct =
    custoAtual > 0
      ? Number((((cmp - custoAtual) / custoAtual) * 100).toFixed(1))
      : 0;

  return {
    custoMedioPonderado: cmp,
    quantidadeTotal: qtdTotal,
    diferencaPercentual: diffPct,
  };
}

/**
 * Estabelecimentos Reais Iniciais — Jaú (SP) e Três Pontas (MG)
 * Inclui "Atacado e Varejo" (Atacarejos como Mart Minas, Atacadão, Tenda)
 */
const DEFAULT_ESTABELECIMENTOS: EstabelecimentoLocal[] = [
  // --- JAÚ - SP (Polo de Produção & Confeitaria da Rozana - CEP 17205-210) ---
  {
    id: "est-simao-doces-matriz",
    nome: "Simão Doces & Embalagens (Loja Matriz)",
    tipo: "Distribuidora",
    cidade: "Jaú - SP",
    endereco_fisico: "Rua Rui Barbosa, 1477 - Jardim Ferreira Dias, Jaú/SP - CEP 17205-000",
    endereco_eletronico: "https://www.simaodoces.com.br",
    telefone: "(14) 99676-0014 / (14) 3621-7733",
    contato_responsavel: "Televendas Simão Doces",
    observacoes: "Referência máxima em Jaú para doces, saquinhos 150ml, coberturas, Nutella, Ovomaltine, chocolates e confeitos para confeitaria artesanal.",
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-simao-doces-centro",
    nome: "Simão Doces (Loja Centro)",
    tipo: "Distribuidora",
    cidade: "Jaú - SP",
    endereco_fisico: "Rua Dr. João Leite, 894 - Centro, Jaú/SP - CEP 17201-440",
    endereco_eletronico: "https://www.simaodoces.com.br",
    telefone: "(14) 3622-7106",
    contato_responsavel: "Atendimento Balcão Centro",
    observacoes: "Loja no centro de Jaú com variedade completa de descartáveis, formas e embalagens.",
    created_at: new Date(Date.now() - 32 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-jau-serve-matriz",
    nome: "Jaú Serve Supermercados - Loja Centro",
    tipo: "Supermercado",
    cidade: "Jaú - SP",
    endereco_fisico: "Rua Floriano Peixoto, 575 - Centro, Jaú/SP - CEP 17201-100",
    endereco_eletronico: "https://www.jauserve.com.br",
    telefone: "(14) 3602-1500",
    contato_responsavel: "Gerência Loja Centro",
    observacoes: "Rede tradicional de Jaú. Ofertas fortes em laticínios nas terças e quartas-feiras.",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-tenda-jau",
    nome: "Tenda Atacado - Jaú",
    tipo: "Atacado e Varejo",
    cidade: "Jaú - SP",
    endereco_fisico: "Av. Antônio Paschoal, 850 - Jaú/SP - CEP 17208-000",
    endereco_eletronico: "https://www.tendaatacado.com.br",
    telefone: "(14) 3602-3000",
    contato_responsavel: "Balcão Atacado e Varejo",
    observacoes: "Atacado e Varejo oficial de Jaú. Ótimos preços escalonados para fardos de leite condensado e creme de leite.",
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },

  // --- TRÊS PONTAS - MG (Polo de Gestão do Andrew - CEP 37187-016) ---
  {
    id: "est-mart-minas-trespontas",
    nome: "Mart Minas Atacado & Varejo",
    tipo: "Atacado e Varejo",
    cidade: "Três Pontas - MG",
    endereco_fisico: "Av. Prefeito Nilson Vilela, 350 - Bairro Esperança, Três Pontas/MG - CEP 37187-000",
    endereco_eletronico: "https://www.martminas.com.br",
    telefone: "(35) 3266-9000",
    contato_responsavel: "Televendas Atacado e Varejo Mart Minas",
    observacoes: "Maior atacarejo de Três Pontas (Atacado e Varejo). Preços imbatíveis em fardos de Leite Moça, Piracanjuba, Itambé e Nutella 650g.",
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-abc-trespontas",
    nome: "Supermercados ABC - Três Pontas",
    tipo: "Atacado e Varejo",
    cidade: "Três Pontas - MG",
    endereco_fisico: "Av. Prefeito Nilson Vilela, 1008 - Bairro Esperança, Três Pontas/MG - CEP 37187-000",
    endereco_eletronico: "https://www.superabc.com.br",
    telefone: "(35) 3265-8000",
    contato_responsavel: "Atendimento ao Cliente ABC",
    observacoes: "Grande rede de Atacado e Varejo na Av. Nilson Vilela com ofertas semanais no app e televendas.",
    created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-moacyr-trespontas",
    nome: "Supermercado Moacyr (Centro)",
    tipo: "Supermercado",
    cidade: "Três Pontas - MG",
    endereco_fisico: "Praça Cônego Victor, 150 - Centro, Três Pontas/MG - CEP 37190-000",
    endereco_eletronico: "https://www.supermercadomoacyr.com.br",
    telefone: "(35) 3265-1020",
    contato_responsavel: "SAC Loja Centro",
    observacoes: "Supermercado tradicional no centro de Três Pontas para compras de urgência e reposições de frutas frescas.",
    created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Pesquisas Reais Iniciais (Jaú - SP e Três Pontas - MG)
 * Contendo cotações vigentes (com validade no futuro) e cotações históricas/expiradas (para histórico de inflação)
 */
const DEFAULT_PESQUISAS: PesquisaPrecoLocal[] = [
  // Cotação 1: Vigente (Mart Minas Atacado e Varejo - Três Pontas)
  {
    id: "pesq-mm-1",
    estabelecimento_id: "est-mart-minas-trespontas",
    estabelecimento_nome: "Mart Minas Atacado & Varejo",
    cidade: "Três Pontas - MG",
    insumo_nome: "Leite Condensado",
    marca: "Piracanjuba TP 395g",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    preco_pesquisado: 4.89,
    preco_varejo: 5.49,
    preco_atacado: 4.89,
    qtd_minima_atacado: 12,
    preco_por_kg_ou_l: 13.90,
    preco_atacado_por_kg_ou_l: 12.38,
    data_pesquisa: "2026-10-18",
    data_validade: "2026-10-31", // Vigente!
    em_promocao: true,
    observacoes: "Preço de Atacado a partir de 12 caixas no Mart Minas Três Pontas (Varejo: R$ 5,49).",
  },

  // Cotação 2: Vigente (Tenda Atacado - Jaú)
  {
    id: "pesq-tenda-jau-1",
    estabelecimento_id: "est-tenda-jau",
    estabelecimento_nome: "Tenda Atacado - Jaú",
    cidade: "Jaú - SP",
    insumo_nome: "Leite Condensado",
    marca: "Piracanjuba TP 395g",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    preco_pesquisado: 4.95,
    preco_varejo: 5.59,
    preco_atacado: 4.95,
    qtd_minima_atacado: 27,
    preco_por_kg_ou_l: 14.15,
    preco_atacado_por_kg_ou_l: 12.53,
    data_pesquisa: "2026-10-19",
    data_validade: "2026-10-26", // Vigente!
    em_promocao: true,
    observacoes: "Fardo fechado com 27 caixas no Tenda Atacado em Jaú (Varejo: R$ 5,59).",
  },

  // Cotação 3: Histórica / Expirada de 2 meses atrás (para cálculo de inflação)
  {
    id: "pesq-hist-cond-1",
    estabelecimento_id: "est-jau-serve-matriz",
    estabelecimento_nome: "Jaú Serve Supermercados - Loja Centro",
    cidade: "Jaú - SP",
    insumo_nome: "Leite Condensado",
    marca: "Moça Nestlé Lata 395g",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    preco_pesquisado: 5.99,
    preco_por_kg_ou_l: 15.16,
    data_pesquisa: "2026-08-10",
    data_validade: "2026-08-18", // Expirada! Guarda histórico
    em_promocao: false,
    observacoes: "Registro histórico de agosto/2026 para acompanhar a inflação.",
  },

  // Cotação 4: Vigente (Jaú Serve Supermercados - Jaú)
  {
    id: "pesq-js-1",
    estabelecimento_id: "est-jau-serve-matriz",
    estabelecimento_nome: "Jaú Serve Supermercados - Loja Centro",
    cidade: "Jaú - SP",
    insumo_nome: "Leite Condensado",
    marca: "Moça Nestlé Lata 395g",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    preco_pesquisado: 6.79,
    preco_por_kg_ou_l: 17.19,
    data_pesquisa: "2026-10-19",
    data_validade: "2026-10-25", // Vigente!
    em_promocao: false,
    observacoes: "Preço no varejo de Jaú. Subiu em relação a agosto (+13,4% de inflação).",
  },

  // Cotação 5: Vigente (Simão Doces Matriz - Jaú)
  {
    id: "pesq-simao-saquinhos",
    estabelecimento_id: "est-simao-doces-matriz",
    estabelecimento_nome: "Simão Doces & Embalagens (Loja Matriz)",
    cidade: "Jaú - SP",
    insumo_nome: "Saquinhos para Geladinho",
    marca: "Cristal 150ml (Cento c/ 100un)",
    quantidade_embalagem: 100,
    unidade_medida: "un",
    preco_pesquisado: 4.8,
    preco_por_kg_ou_l: 0.048,
    data_pesquisa: "2026-10-18",
    data_validade: "2026-11-30", // Vigente!
    em_promocao: true,
    observacoes: "Preço especial de atacado na Simão Doces (R$ 0,048 por saquinho na Rua Rui Barbosa).",
  },

  // Cotação 6: Vigente (Simão Doces Matriz - Nutella 650g)
  {
    id: "pesq-simao-nutella",
    estabelecimento_id: "est-simao-doces-matriz",
    estabelecimento_nome: "Simão Doces & Embalagens (Loja Matriz)",
    cidade: "Jaú - SP",
    insumo_nome: "Nutella Original",
    marca: "Ferrero Pote Econômico 650g",
    quantidade_embalagem: 650,
    unidade_medida: "g",
    preco_pesquisado: 28.5,
    preco_por_kg_ou_l: 43.85,
    data_pesquisa: "2026-10-18",
    data_validade: "2026-11-15", // Vigente!
    em_promocao: true,
    observacoes: "Excelente cotação para confeitaria na Simão Doces em Jaú.",
  },

  // Cotação 7: Vigente (Mart Minas Três Pontas - Nutella 650g) - Oportunidade de Estocar
  {
    id: "pesq-mm-nutella",
    estabelecimento_id: "est-mart-minas-trespontas",
    estabelecimento_nome: "Mart Minas Atacado & Varejo",
    cidade: "Três Pontas - MG",
    insumo_nome: "Nutella Original",
    marca: "Ferrero Pote 650g",
    quantidade_embalagem: 650,
    unidade_medida: "g",
    preco_pesquisado: 27.9,
    preco_por_kg_ou_l: 42.92,
    data_pesquisa: "2026-10-17",
    data_validade: "2026-10-28", // Vigente!
    em_promocao: true,
    observacoes: "Preço excelente de atacado e varejo no Mart Minas Três Pontas!",
  },

  // Cotação 8: Expirada (Moacyr Três Pontas - Nutella 350g)
  {
    id: "pesq-hist-nutella",
    estabelecimento_id: "est-moacyr-trespontas",
    estabelecimento_nome: "Supermercado Moacyr (Centro)",
    cidade: "Três Pontas - MG",
    insumo_nome: "Nutella Original",
    marca: "Ferrero Pote 350g",
    quantidade_embalagem: 350,
    unidade_medida: "g",
    preco_pesquisado: 22.9,
    preco_por_kg_ou_l: 65.43,
    data_pesquisa: "2026-09-05",
    data_validade: "2026-09-12", // Expirada!
    em_promocao: false,
    observacoes: "Pote pequeno no varejo central de Três Pontas.",
  },

  // Cotação 9: Vigente (Tenda Atacado Jaú - Creme de Leite)
  {
    id: "pesq-tenda-creme",
    estabelecimento_id: "est-tenda-jau",
    estabelecimento_nome: "Tenda Atacado - Jaú",
    cidade: "Jaú - SP",
    insumo_nome: "Creme de Leite",
    marca: "Itambé TP 200g",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    preco_pesquisado: 2.39,
    preco_por_kg_ou_l: 11.95,
    data_pesquisa: "2026-10-18",
    data_validade: "2026-10-26", // Vigente!
    em_promocao: true,
    observacoes: "Preço de atacarejo em Jaú.",
  },

  // Cotação 10: Vigente (Supermercados ABC - Três Pontas)
  {
    id: "pesq-abc-creme",
    estabelecimento_id: "est-abc-trespontas",
    estabelecimento_nome: "Supermercados ABC - Três Pontas",
    cidade: "Três Pontas - MG",
    insumo_nome: "Creme de Leite",
    marca: "Piracanjuba TP 200g",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    preco_pesquisado: 2.45,
    preco_por_kg_ou_l: 12.25,
    data_pesquisa: "2026-10-18",
    data_validade: "2026-10-27", // Vigente!
    em_promocao: false,
    observacoes: "Cotação no Supermercados ABC em Três Pontas.",
  },
  // Cotação 8: Vigente (Jaú Embalagens - Saquinhos 150ml)
  {
    id: "pesq-jau-saquinho",
    estabelecimento_id: "est-jau-embalagens",
    estabelecimento_nome: "Jaú Embalagens & Confeitaria",
    cidade: "Jaú - SP",
    insumo_nome: "Saquinhos para Geladinho",
    marca: "Cristal 150ml (Cento c/ 100un)",
    quantidade_embalagem: 100,
    unidade_medida: "un",
    preco_pesquisado: 5.0,
    preco_por_kg_ou_l: 0.05,
    data_pesquisa: "2026-10-15",
    data_validade: "2026-11-30", // Vigente!
    em_promocao: false,
    observacoes: "R$ 0,05 por saquinho oficial de 150ml.",
  },
];

/**
 * Preços Pagos Reais Iniciais (Cupom Fiscal Real no Mart Minas - Três Pontas / Varginha)
 */
const DEFAULT_COMPRAS: CompraNotaFiscalReal[] = [
  {
    id: "compra-nf-1",
    estabelecimento_id: "est-mart-minas-trespontas",
    estabelecimento_nome: "Mart Minas Atacado & Varejo - Sul de Minas",
    data_compra: "2026-10-18",
    numero_cupom_ou_nfe: "NFC-e 081923",
    chave_acesso: "31261045382900018865001000081923109876543210",
    valor_total: 184.2,
    origem: "nfc_chave",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    itens: [
      {
        id: "item-nf-1",
        descricao: "LEITE CONDENSADO PIRACANJUBA 395G TP",
        insumo_correspondente: "Leite Condensado",
        quantidade: 12,
        unidade: "un",
        preco_unitario_pago: 4.89,
        preco_total: 58.68,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-2",
        descricao: "CREME DE LEITE ITAMBE 200G TP",
        insumo_correspondente: "Creme de Leite",
        quantidade: 10,
        unidade: "un",
        preco_unitario_pago: 2.39,
        preco_total: 23.9,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-3",
        descricao: "DOCE DE LEITE ITAMBE POTE 350G",
        insumo_correspondente: "Doce de Leite",
        quantidade: 4,
        unidade: "un",
        preco_unitario_pago: 9.4,
        preco_total: 37.6,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-4",
        descricao: "LEITE EM PO NINHO LATA 380G",
        insumo_correspondente: "Leite Ninho em Pó",
        quantidade: 3,
        unidade: "un",
        preco_unitario_pago: 15.99,
        preco_total: 47.97,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-5",
        descricao: "LEITE INTEGRAL ITAMBE 1L TETRA",
        insumo_correspondente: "Leite Integral Líquido",
        quantidade: 4,
        unidade: "un",
        preco_unitario_pago: 4.01,
        preco_total: 16.05,
        aplicado_ficha_tecnica: true,
      },
    ],
  },
];

export function loadEstabelecimentos(companyId?: string): EstabelecimentoLocal[] {
  const currentId = companyId || getActiveCompanyId();
  try {
    const raw = localStorage.getItem(getSurveyStorageKey("estabelecimentos", currentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  if (currentId === "emp-roze-gourmet") {
    return [...DEFAULT_ESTABELECIMENTOS];
  }
  return [];
}

export function saveEstabelecimentos(items: EstabelecimentoLocal[], companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  try {
    localStorage.setItem(getSurveyStorageKey("estabelecimentos", currentId), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addOrUpdateEstabelecimento(
  estab: Omit<EstabelecimentoLocal, "id" | "created_at"> & { id?: string },
  companyId?: string
): EstabelecimentoLocal {
  const currentId = companyId || getActiveCompanyId();
  const all = loadEstabelecimentos(currentId);
  const now = new Date().toISOString();

  if (estab.id) {
    const idx = all.findIndex((e) => e.id === estab.id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        ...estab,
        updated_at: now,
      };
      saveEstabelecimentos(all, currentId);
      return all[idx];
    }
  }

  const newEstab: EstabelecimentoLocal = {
    ...estab,
    id: `est-${Date.now()}`,
    created_at: now,
    updated_at: now,
  };
  all.unshift(newEstab);
  saveEstabelecimentos(all, currentId);
  return newEstab;
}

export function deleteEstabelecimento(id: string, companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  const all = loadEstabelecimentos(currentId).filter((e) => e.id !== id);
  saveEstabelecimentos(all, currentId);
}

export function loadPesquisasPreco(companyId?: string): PesquisaPrecoLocal[] {
  const currentId = companyId || getActiveCompanyId();
  try {
    const raw = localStorage.getItem(getSurveyStorageKey("pesquisas", currentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  if (currentId === "emp-roze-gourmet") {
    return [...DEFAULT_PESQUISAS];
  }
  return [];
}

export function savePesquisasPreco(items: PesquisaPrecoLocal[], companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  try {
    localStorage.setItem(getSurveyStorageKey("pesquisas", currentId), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addPesquisaPreco(
  item: Omit<PesquisaPrecoLocal, "id" | "preco_por_kg_ou_l">,
  companyId?: string
): PesquisaPrecoLocal {
  const currentId = companyId || getActiveCompanyId();
  const all = loadPesquisasPreco(currentId);
  const precoBase = item.preco_varejo || item.preco_pesquisado;
  const precoNormalizado = calculateNormalizedPrice(
    precoBase,
    item.quantidade_embalagem,
    item.unidade_medida
  );
  const precoAtacadoNormalizado =
    item.preco_atacado && item.preco_atacado > 0
      ? calculateNormalizedPrice(
          item.preco_atacado,
          item.quantidade_embalagem,
          item.unidade_medida
        )
      : undefined;

  const newPesquisa: PesquisaPrecoLocal = {
    ...item,
    preco_pesquisado: precoBase,
    preco_varejo: item.preco_varejo || precoBase,
    preco_atacado: item.preco_atacado,
    qtd_minima_atacado: item.qtd_minima_atacado,
    id: `pesq-${Date.now()}`,
    preco_por_kg_ou_l: precoNormalizado,
    preco_atacado_por_kg_ou_l: precoAtacadoNormalizado,
  };
  all.unshift(newPesquisa);
  savePesquisasPreco(all, currentId);
  return newPesquisa;
}

export function deletePesquisaPreco(id: string, companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  const all = loadPesquisasPreco(currentId).filter((p) => p.id !== id);
  savePesquisasPreco(all, currentId);
}

export function loadComprasNotasFiscais(companyId?: string): CompraNotaFiscalReal[] {
  const currentId = companyId || getActiveCompanyId();
  try {
    const raw = localStorage.getItem(getSurveyStorageKey("compras", currentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  if (currentId === "emp-roze-gourmet") {
    return [...DEFAULT_COMPRAS];
  }
  return [];
}

export function saveComprasNotasFiscais(items: CompraNotaFiscalReal[], companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  try {
    localStorage.setItem(getSurveyStorageKey("compras", currentId), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addCompraNotaFiscal(
  compra: Omit<CompraNotaFiscalReal, "id" | "created_at">,
  companyId?: string
): CompraNotaFiscalReal {
  const currentId = companyId || getActiveCompanyId();
  const all = loadComprasNotasFiscais(currentId);
  const newCompra: CompraNotaFiscalReal = {
    ...compra,
    id: `compra-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  all.unshift(newCompra);
  saveComprasNotasFiscais(all, currentId);
  return newCompra;
}

export function deleteCompraNotaFiscal(id: string, companyId?: string): void {
  const currentId = companyId || getActiveCompanyId();
  const all = loadComprasNotasFiscais(currentId).filter((c) => c.id !== id);
  saveComprasNotasFiscais(all, currentId);
}
