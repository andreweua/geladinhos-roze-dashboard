import { BRAND_CONFIG } from "@/config/brand.config";
import { checkIsSupabaseConfigured, supabase } from "@/lib/supabase";
import { addAuditLog } from "@/services/auditService";
import { getActiveCompanyId, getActiveCompany, getLocalCompanies } from "@/services/companyService";
import {
  CanalVenda,
  DashboardDataSnapshot,
  EstoqueLote,
  FichaTecnicaProduto,
  ItemVenda,
  PaymentMethod,
  Produto,
  Venda,
} from "@/types/dashboard";
import { saveOrUpdateCustomer } from "@/services/customerService";

// Chaves dinâmicas isoladas por empresa (Multi-Tenant)
// A Matriz Roze Gourmet preserva a chave histórica oficial com os 8 sabores
export function getCompanyStorageKey(companyId?: string): string {
  const id = companyId || getActiveCompanyId();
  if (id === "emp-roze-gourmet") {
    return `${BRAND_CONFIG.storagePrefix}_dashboard_data_v3_clean_real`;
  }
  return `${BRAND_CONFIG.storagePrefix}_data_${id}_v1`;
}

export function getCompanyChannelsKey(companyId?: string): string {
  const id = companyId || getActiveCompanyId();
  if (id === "emp-roze-gourmet") {
    return `${BRAND_CONFIG.storagePrefix}_sales_channels_map_v1`;
  }
  return `${BRAND_CONFIG.storagePrefix}_channels_${id}_v1`;
}

export function getLocalSaleChannels(companyId?: string): Record<string, CanalVenda> {
  try {
    const key = getCompanyChannelsKey(companyId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLocalSaleChannel(vendaId: string, canal: CanalVenda, companyId?: string): void {
  try {
    const key = getCompanyChannelsKey(companyId);
    const map = getLocalSaleChannels(companyId);
    map[vendaId] = canal;
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function calculateUnitCostFromFicha(ficha: FichaTecnicaProduto): {
  custoInsumosReceita: number;
  custoInsumosUn: number;
  custoTotalUn: number;
} {
  const rendimento = Math.max(1, ficha.rendimento_unidades);
  const custoInsumosReceita = ficha.ingredientes.reduce(
    (acc, ing) => acc + Number(ing.custo_receita || 0),
    0
  );
  const custoInsumosUn = custoInsumosReceita / rendimento;
  const custoTotalUn =
    custoInsumosUn +
    Number(ficha.custo_embalagem_un || 0) +
    Number(ficha.custo_operacional_un || 0);

  return {
    custoInsumosReceita: Number(custoInsumosReceita.toFixed(2)),
    custoInsumosUn: Number(custoInsumosUn.toFixed(2)),
    custoTotalUn: Number(custoTotalUn.toFixed(2)),
  };
}

/**
 * Fichas Técnicas Reais extraídas dos PDFs oficiais (Geladinhos Gourmet de 150ml)
 * Embalagem: Saquinho 150ml = R$ 0,05/un
 * Taxa operacional (Gás/Energia/Água ~15%)
 */
function getDefaultFichasTecnicas(): FichaTecnicaProduto[] {
  return [
    {
      produto_id: "prod-doce-de-leite",
      subtitulo_receita: "Massa cremosa + recheio de Doce de Leite Itambé",
      rendimento_unidades: 8,
      volume_unitario_ml: 150,
      tempo_preparo_min: 25,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.35, // ~15% gás/energia/água
      preco_ifood_sugerido: 8.9,
      lucro_ifood_estimado: 3.47,
      modo_preparo:
        "Espalhar 12g de Doce de Leite Itambé nas paredes internas de cada saquinho de 150ml com saco de confeitar. Bater no liquidificador 1 cx de leite condensado (395g), 1 cx de creme de leite (200g), 1 pote de Doce de Leite Itambé (350g/395g) e 1 medida de leite integral. Dosar exatamente 150ml por saquinho e selar.",
      ingredientes: [
        {
          id: "ing-dl-1",
          nome: "Leite Condensado (1 caixa 395g)",
          quantidade_receita: 395,
          unidade: "g",
          custo_receita: 6.19,
        },
        {
          id: "ing-dl-2",
          nome: "Creme de Leite (1 caixinha 200g)",
          quantidade_receita: 200,
          unidade: "g",
          custo_receita: 2.49,
        },
        {
          id: "ing-dl-3",
          nome: "Doce de Leite Itambé (1 pote base + 12g recheio)",
          quantidade_receita: 395,
          unidade: "g",
          custo_receita: 10.72,
        },
        {
          id: "ing-dl-4",
          nome: "Leite Integral Líquido (1 medida)",
          quantidade_receita: 395,
          unidade: "ml",
          custo_receita: 2.2,
        },
      ],
    },
    {
      produto_id: "prod-ninho-nutella",
      subtitulo_receita: "Base de Leite Ninho + 20g de Nutella no saquinho",
      rendimento_unidades: 8,
      volume_unitario_ml: 150,
      tempo_preparo_min: 30,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.35,
      preco_ifood_sugerido: 9.5,
      lucro_ifood_estimado: 3.86,
      modo_preparo:
        "Aplicar 20g de Nutella Original com saco de confeitar nas paredes internas do saquinho de 150ml. Bater a Base Ninho (2 caixas de leite condensado 395g, 1 caixinha de creme de leite 200g, 50g de Leite Ninho Integral em pó e 1 medida de leite líquido). Envasar 150ml e congelar deitado em assadeira retangular.",
      ingredientes: [
        {
          id: "ing-nn-1",
          nome: "Leite Condensado (2 caixas de 395g - fração lote)",
          quantidade_receita: 790,
          unidade: "g",
          custo_receita: 11.56,
        },
        {
          id: "ing-nn-2",
          nome: "Creme de Leite (1 caixinha 200g)",
          quantidade_receita: 200,
          unidade: "g",
          custo_receita: 2.49,
        },
        {
          id: "ing-nn-3",
          nome: "Leite Ninho Integral em Pó (Lata 380g - R$ 0,058/g)",
          quantidade_receita: 50,
          unidade: "g",
          custo_receita: 2.9,
        },
        {
          id: "ing-nn-4",
          nome: "Leite Integral Líquido (1 medida)",
          quantidade_receita: 395,
          unidade: "ml",
          custo_receita: 2.2,
        },
        {
          id: "ing-nn-5",
          nome: "Nutella Original (20g por recheio)",
          quantidade_receita: 20,
          unidade: "g",
          custo_receita: 2.85,
        },
      ],
    },
    {
      produto_id: "prod-ninho-brigadeiro",
      subtitulo_receita: "Base Leite Ninho + Brigadeiro Gourmet 50% Cacau",
      rendimento_unidades: 8,
      volume_unitario_ml: 150,
      tempo_preparo_min: 30,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.25,
      preco_ifood_sugerido: 9.9,
      lucro_ifood_estimado: 5.16,
      modo_preparo:
        "Espalhar 15g a 20g de brigadeiro cremoso (feito com Chocolate 50% Cacau) no interior do saquinho de 150ml. Completar com a Base de Leite Ninho padronizada em 150ml.",
      ingredientes: [
        {
          id: "ing-nb-1",
          nome: "Base de Leite Ninho (Condensado + Creme + Leite)",
          quantidade_receita: 1000,
          unidade: "ml",
          custo_receita: 9.4,
        },
        {
          id: "ing-nb-2",
          nome: "Leite Ninho em Pó (50g por lote)",
          quantidade_receita: 50,
          unidade: "g",
          custo_receita: 2.9,
        },
        {
          id: "ing-nb-3",
          nome: "Chocolate 50% Cacau (50g por lote - Barra/Sachê 1,01kg)",
          quantidade_receita: 50,
          unidade: "g",
          custo_receita: 2.5,
        },
      ],
    },
    {
      produto_id: "prod-mousse-maracuja",
      subtitulo_receita: "Mousse de Maracujá com Geleia Artesanal decorativa",
      rendimento_unidades: 14,
      volume_unitario_ml: 150,
      tempo_preparo_min: 40,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.45,
      preco_ifood_sugerido: 9.9,
      lucro_ifood_estimado: 3.71,
      modo_preparo:
        "Preparar a Geleia Artesanal de Maracujá (700g de polpa com sementes + 350g de açúcar + 200ml água) e aplicar nas paredes do saquinho. Bater o Mousse: 2 caixas de leite condensado (395g cada), 5 caixinhas de creme de leite (200g cada) e 600ml de suco/polpa pura de maracujá sem água (ou 6 polpas de 100g). Rende 14 a 15 saquinhos de 150ml.",
      ingredientes: [
        {
          id: "ing-mm-1",
          nome: "Leite Condensado (2 caixas de 395g)",
          quantidade_receita: 790,
          unidade: "g",
          custo_receita: 11.56,
        },
        {
          id: "ing-mm-2",
          nome: "Creme de Leite (5 caixinhas de 200g)",
          quantidade_receita: 1000,
          unidade: "g",
          custo_receita: 12.45,
        },
        {
          id: "ing-mm-3",
          nome: "Suco / Polpa Pura de Maracujá (600ml / 6 polpas 100g)",
          quantidade_receita: 600,
          unidade: "ml",
          custo_receita: 14.29,
        },
        {
          id: "ing-mm-4",
          nome: "Geleia Artesanal de Maracujá (700g polpa + 350g açúcar)",
          quantidade_receita: 1050,
          unidade: "g",
          custo_receita: 5.1,
        },
      ],
    },
    {
      produto_id: "prod-delicia-ovomaltine",
      subtitulo_receita: "Creme crocante de Ovomaltine (150ml)",
      rendimento_unidades: 9,
      volume_unitario_ml: 150,
      tempo_preparo_min: 25,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.3,
      preco_ifood_sugerido: 8.5,
      lucro_ifood_estimado: 3.67,
      modo_preparo:
        "Bater 2 caixas de leite condensado (395g cada), 1 caixinha de creme de leite (200g) e 1 medida de leite integral líquido. Incorporar 60g de Ovomaltine (achocolatado crocante) mantendo a crocância e envasar 9 saquinhos de 150ml.",
      ingredientes: [
        {
          id: "ing-ov-1",
          nome: "Leite Condensado (2 caixas de 395g)",
          quantidade_receita: 790,
          unidade: "g",
          custo_receita: 11.56,
        },
        {
          id: "ing-ov-2",
          nome: "Creme de Leite (1 caixinha 200g)",
          quantidade_receita: 200,
          unidade: "g",
          custo_receita: 2.49,
        },
        {
          id: "ing-ov-3",
          nome: "Leite Integral Líquido (1 medida)",
          quantidade_receita: 395,
          unidade: "ml",
          custo_receita: 2.72,
        },
        {
          id: "ing-ov-4",
          nome: "Achocolatado Crocante Ovomaltine (Pacote 600g - R$ 0,058/g)",
          quantidade_receita: 60,
          unidade: "g",
          custo_receita: 3.48,
        },
      ],
    },
    {
      produto_id: "prod-romeu-julieta",
      subtitulo_receita: "Creme de Queijo + Goiabada Cremosa (150ml)",
      rendimento_unidades: 10,
      volume_unitario_ml: 150,
      tempo_preparo_min: 30,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.32,
      preco_ifood_sugerido: 9.9,
      lucro_ifood_estimado: 4.64,
      modo_preparo:
        "Espalhar 15g a 20g de calda cremosa de goiabada nas paredes internas do saquinho de 150ml. Bater a base cremosa de queijo e envasar 10 unidades de 150ml.",
      ingredientes: [
        {
          id: "ing-rj-1",
          nome: "Base Láctea (Leite Condensado + Creme de Leite + Leite)",
          quantidade_receita: 1100,
          unidade: "ml",
          custo_receita: 12.8,
        },
        {
          id: "ing-rj-2",
          nome: "Creme de Queijo / Requeijão Culinário",
          quantidade_receita: 250,
          unidade: "g",
          custo_receita: 6.2,
        },
        {
          id: "ing-rj-3",
          nome: "Goiabada Cremosa para Mesclar",
          quantidade_receita: 200,
          unidade: "g",
          custo_receita: 4.0,
        },
      ],
    },
    {
      produto_id: "prod-cheesecake-frutas-vermelhas",
      subtitulo_receita: "Linha Premium c/ Casquinha e Geleia Artesanal",
      rendimento_unidades: 12,
      volume_unitario_ml: 150,
      tempo_preparo_min: 40,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.42,
      preco_ifood_sugerido: 11.9,
      lucro_ifood_estimado: 5.01,
      modo_preparo:
        "Decorar o saquinho de 150ml com a Geleia Artesanal de Morango/Frutas Vermelhas e farofa crocante/casquinha. Preencher com o creme de Cheesecake batido e congelar deitado.",
      ingredientes: [
        {
          id: "ing-cf-1",
          nome: "Base Creme Cheesecake (Condensado + Creme + Cream Cheese)",
          quantidade_receita: 1400,
          unidade: "g",
          custo_receita: 24.1,
        },
        {
          id: "ing-cf-2",
          nome: "Geleia Artesanal de Morango / Frutas Vermelhas (500g fruta + 100g açúcar)",
          quantidade_receita: 300,
          unidade: "g",
          custo_receita: 9.5,
        },
        {
          id: "ing-cf-3",
          nome: "Casquinha / Biscoito Amanteigado",
          quantidade_receita: 180,
          unidade: "g",
          custo_receita: 6.0,
        },
      ],
    },
    {
      produto_id: "prod-ninho-morango",
      subtitulo_receita:
        "Base de Leite Ninho + Geleia Artesanal de Morango (Calda)",
      rendimento_unidades: 8,
      volume_unitario_ml: 150,
      tempo_preparo_min: 35,
      custo_embalagem_un: 0.05,
      custo_operacional_un: 0.35,
      preco_ifood_sugerido: 9.9,
      lucro_ifood_estimado: 4.16,
      modo_preparo:
        "Preparar a Geleia de Morango (500g de morangos frescos ou congelados Original Food + 100g de açúcar = R$ 14,45 p/ ~10 porções, custo R$ 1,45/porção). Aplicar no saquinho de 150ml e completar com a Base de Leite Ninho.",
      ingredientes: [
        {
          id: "ing-nm-1",
          nome: "Base de Leite Ninho (2 Condensado + 1 Creme + 50g Ninho + Leite)",
          quantidade_receita: 1100,
          unidade: "ml",
          custo_receita: 10.4,
        },
        {
          id: "ing-nm-2",
          nome: "Geleia Artesanal de Morango (500g morango + 100g açúcar - R$ 1,45/porção)",
          quantidade_receita: 160,
          unidade: "g",
          custo_receita: 11.6,
        },
      ],
    },
  ];
}

function generateInitialDemoData(): DashboardDataSnapshot {
  const now = new Date();
  const fichasTecnicas = getDefaultFichasTecnicas();

  // Exact products from PDF 1 & PDF 2 (Saquinhos de 150ml)
  const produtos: Produto[] = [
    {
      id: "prod-doce-de-leite",
      empresaId: "emp-roze-gourmet",
      nome: "Doce de Leite (Itambé)",
      preco_venda: 6.5,
      preco_ifood: 8.9,
      custo_estimado: 3.1,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-ninho-nutella",
      empresaId: "emp-roze-gourmet",
      nome: "Ninho com Nutella",
      preco_venda: 7.0,
      preco_ifood: 9.5,
      custo_estimado: 3.15,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-ninho-brigadeiro",
      empresaId: "emp-roze-gourmet",
      nome: "Ninho com Brigadeiro 50%",
      preco_venda: 7.9,
      preco_ifood: 9.9,
      custo_estimado: 2.15,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-mousse-maracuja",
      empresaId: "emp-roze-gourmet",
      nome: "Mousse de Maracujá c/ Geleia",
      preco_venda: 7.5,
      preco_ifood: 9.9,
      custo_estimado: 3.6,
      ativo: true,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: "prod-delicia-ovomaltine",
      empresaId: "emp-roze-gourmet",
      nome: "Delícia de Ovomaltine",
      preco_venda: 6.0,
      preco_ifood: 8.5,
      custo_estimado: 2.6,
      ativo: true,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: "prod-romeu-julieta",
      empresaId: "emp-roze-gourmet",
      nome: "Romeu e Julieta",
      preco_venda: 7.9,
      preco_ifood: 9.9,
      custo_estimado: 2.67,
      ativo: true,
      created_at: new Date(now.getTime() - 85 * 86400000).toISOString(),
    },
    {
      id: "prod-cheesecake-frutas-vermelhas",
      empresaId: "emp-roze-gourmet",
      nome: "Cheesecake Frutas Vermelhas",
      preco_venda: 9.9,
      preco_ifood: 11.9,
      custo_estimado: 3.77,
      ativo: true,
      created_at: new Date(now.getTime() - 80 * 86400000).toISOString(),
    },
    {
      id: "prod-ninho-morango",
      empresaId: "emp-roze-gourmet",
      nome: "Ninho c/ Geleia de Morango",
      preco_venda: 7.5,
      preco_ifood: 9.9,
      custo_estimado: 3.15,
      ativo: true,
      created_at: new Date(now.getTime() - 75 * 86400000).toISOString(),
    },
  ];

  // Estoque inicial limpo dos 8 sabores reais das fichas técnicas (iniciando em 0 para controle real)
  const estoqueLotes: EstoqueLote[] = produtos.map((prod, idx) => ({
    id: `est-${idx + 1}`,
    empresaId: "emp-roze-gourmet",
    produto_id: prod.id,
    quantidade_disponivel: 0,
    updated_at: now.toISOString(),
  }));

  // Sem vendas fictícias: a Rozana e o lojista cadastram as vendas reais no Frente de Caixa (PDV)
  const vendas: Venda[] = [];
  const itensVenda: ItemVenda[] = [];

  return {
    produtos,
    vendas,
    itensVenda,
    estoqueLotes,
    fichasTecnicas,
    source: "demo_local",
    lastSyncedAt: new Date().toISOString(),
  };
}

function ensureFichasForProducts(
  produtos: Produto[],
  existingFichas?: FichaTecnicaProduto[],
  companyId?: string
): FichaTecnicaProduto[] {
  const currentId = companyId || getActiveCompanyId();
  const map = new Map<string, FichaTecnicaProduto>();

  // Apenas a empresa Matriz Roze herda as receitas oficiais de geladinhos
  if (currentId === "emp-roze-gourmet") {
    const defaults = getDefaultFichasTecnicas();
    for (const d of defaults) {
      map.set(d.produto_id, d);
    }
  }

  if (Array.isArray(existingFichas)) {
    for (const f of existingFichas) {
      map.set(f.produto_id, f);
    }
  }

  for (const prod of produtos) {
    if (!map.has(prod.id)) {
      const custoInsumo = Math.max(0.5, prod.custo_estimado - 0.35);
      const precoIfood = prod.preco_ifood || Number((prod.preco_venda * 1.35).toFixed(2));
      map.set(prod.id, {
        produto_id: prod.id,
        subtitulo_receita: `Receita Artesanal • ${prod.nome}`,
        rendimento_unidades: 10,
        volume_unitario_ml: 150,
        tempo_preparo_min: 30,
        custo_embalagem_un: 0.05,
        custo_operacional_un: 0.3,
        preco_ifood_sugerido: precoIfood,
        lucro_ifood_estimado: Number(
          (precoIfood * (1 - 0.262) - prod.custo_estimado).toFixed(2)
        ),
        modo_preparo: `Preparo artesanal e dosagem padronizada de ${prod.nome}.`,
        ingredientes: [
          {
            id: `ing-${prod.id}-1`,
            nome: `Ingrediente Principal / Base (${prod.nome})`,
            quantidade_receita: 1000,
            unidade: "g",
            custo_receita: Number((custoInsumo * 10 * 0.65).toFixed(2)),
          },
          {
            id: `ing-${prod.id}-2`,
            nome: `Embalagem / Complemento`,
            quantidade_receita: 10,
            unidade: "un",
            custo_receita: Number((custoInsumo * 10 * 0.35).toFixed(2)),
          },
        ],
      });
    }
  }

  return Array.from(map.values());
}

export function getLocalSnapshot(companyId?: string): DashboardDataSnapshot {
  const currentId = companyId || getActiveCompanyId();
  const key = getCompanyStorageKey(currentId);

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardDataSnapshot;
      if (
        parsed &&
        Array.isArray(parsed.produtos) &&
        Array.isArray(parsed.vendas)
      ) {
        const fichas = ensureFichasForProducts(
          parsed.produtos,
          parsed.fichasTecnicas,
          currentId
        );
        return {
          ...parsed,
          fichasTecnicas: fichas,
          source: "demo_local",
          lastSyncedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn("Erro ao ler dados locais:", err);
  }

  // Matriz Roze Gourmet: Gera o seed oficial dos 8 sabores e fichas técnicas reais
  if (currentId === "emp-roze-gourmet") {
    const initial = generateInitialDemoData();
    saveLocalSnapshot(initial, currentId);
    return initial;
  }

  // Para qualquer NOVA EMPRESA cadastrada (Multi-Empresa SaaS):
  // Inicia 100% LIMPA: 0 vendas, 0 produtos da Roze, 0 estoque, 0 fichas antigas!
  const cleanSnapshot: DashboardDataSnapshot = {
    produtos: [],
    vendas: [],
    itensVenda: [],
    estoqueLotes: [],
    fichasTecnicas: [],
    source: "demo_local",
    lastSyncedAt: new Date().toISOString(),
  };
  saveLocalSnapshot(cleanSnapshot, currentId);
  return cleanSnapshot;
}

export function saveLocalSnapshot(snapshot: DashboardDataSnapshot, companyId?: string): void {
  const key = getCompanyStorageKey(companyId);
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("Não foi possível salvar no LocalStorage:", err);
  }
}

export function resetLocalDemoData(companyId?: string): DashboardDataSnapshot {
  const currentId = companyId || getActiveCompanyId();
  if (currentId === "emp-roze-gourmet") {
    const fresh = generateInitialDemoData();
    saveLocalSnapshot(fresh, currentId);
    return fresh;
  }
  const clean: DashboardDataSnapshot = {
    produtos: [],
    vendas: [],
    itensVenda: [],
    estoqueLotes: [],
    fichasTecnicas: [],
    source: "demo_local",
    lastSyncedAt: new Date().toISOString(),
  };
  saveLocalSnapshot(clean, currentId);
  return clean;
}

/**
 * Remove qualquer venda ou item local órfão mantendo apenas a base oficial da nuvem.
 */
export function clearOrphanLocalSales(companyId?: string): void {
  try {
    const currentId = companyId || getActiveCompanyId();
    const localSnap = getLocalSnapshot(currentId);
    const cleanSnap: DashboardDataSnapshot = {
      ...localSnap,
      vendas: [],
      itensVenda: [],
      lastSyncedAt: new Date().toISOString(),
    };
    saveLocalSnapshot(cleanSnap, currentId);
  } catch (err) {
    console.warn("Erro ao limpar vendas órfãs locais:", err);
  }
}

export interface InitialProductSeed {
  nome: string;
  preco_venda: number;
  custo_estimado?: number;
  estoque_inicial?: number;
}

/**
 * Cria os produtos e receitas iniciais informados pelo cliente no questionário de onboarding,
 * garantindo que a nova empresa comece limpa e já com seus itens no PDV.
 */
export function seedCompanyInitialProducts(
  companyId: string,
  products: InitialProductSeed[],
  nicho = "Confeitaria"
): DashboardDataSnapshot {
  const currentSnap = getLocalSnapshot(companyId);
  const nowIso = new Date().toISOString();

  const newProdutos: Produto[] = [];
  const newLotes: EstoqueLote[] = [];
  const newFichas: FichaTecnicaProduto[] = [];

  products.forEach((p, idx) => {
    const nome = p.nome.trim();
    if (!nome) return;
    const prodId = `prod-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
    const precoVenda = Number(p.preco_venda) || 0;
    const custoEst = Number(p.custo_estimado) || Number((precoVenda * 0.35).toFixed(2));
    const precoIfood = Number((precoVenda * 1.35).toFixed(2));

    const prod: Produto = {
      id: prodId,
      empresaId: currentId,
      nome,
      preco_venda: precoVenda,
      preco_ifood: precoIfood,
      custo_estimado: custoEst,
      ativo: true,
      created_at: nowIso,
    };
    newProdutos.push(prod);

    newLotes.push({
      id: `est-${prodId}`,
      empresaId: currentId,
      produto_id: prodId,
      quantidade_disponivel: Number(p.estoque_inicial) || 0,
      updated_at: nowIso,
    });

    newFichas.push({
      produto_id: prodId,
      subtitulo_receita: `${nicho} • ${nome}`,
      rendimento_unidades: 1,
      volume_unitario_ml: 150,
      tempo_preparo_min: 25,
      custo_embalagem_un: 0.1,
      custo_operacional_un: 0.4,
      preco_ifood_sugerido: precoIfood,
      lucro_ifood_estimado: Number((precoIfood * (1 - 0.262) - custoEst).toFixed(2)),
      modo_preparo: `Preparo artesanal e montagem padronizada de ${nome}.`,
      ingredientes: [
        {
          id: `ing-${prodId}-1`,
          nome: `Base e Recheio Principal (${nome})`,
          quantidade_receita: 1,
          unidade: "un",
          custo_receita: Number((custoEst * 0.8).toFixed(2)),
        },
        {
          id: `ing-${prodId}-2`,
          nome: "Embalagem e Etiqueta da Marca",
          quantidade_receita: 1,
          unidade: "un",
          custo_receita: Number((custoEst * 0.2).toFixed(2)),
        },
      ],
    });
  });

  const updatedSnapshot: DashboardDataSnapshot = {
    ...currentSnap,
    produtos: [...currentSnap.produtos, ...newProdutos],
    estoqueLotes: [...currentSnap.estoqueLotes, ...newLotes],
    fichasTecnicas: [...currentSnap.fichasTecnicas, ...newFichas],
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot, companyId);
  return updatedSnapshot;
}

/**
 * Sincroniza automaticamente vendas que foram salvas offline/localmente com o Supabase.
 * Evita qualquer divergência de faturamento e vendas entre o App Web e o App Nativo Android.
 */
export async function syncPendingLocalSalesToSupabase(companyId?: string): Promise<{
  syncedCount: number;
  discardedDuplicatesCount: number;
}> {
  if (!checkIsSupabaseConfigured() || !supabase) {
    return { syncedCount: 0, discardedDuplicatesCount: 0 };
  }

  const currentId = companyId || getActiveCompanyId();

  try {
    const raw = localStorage.getItem(getCompanyStorageKey(currentId));
    if (!raw) return { syncedCount: 0, discardedDuplicatesCount: 0 };
    const localSnap = JSON.parse(raw) as DashboardDataSnapshot;
    if (!localSnap || !Array.isArray(localSnap.vendas) || localSnap.vendas.length === 0) {
      return { syncedCount: 0, discardedDuplicatesCount: 0 };
    }

    // Busca vendas existentes no Supabase para reconciliação
    let remoteQuery = supabase
      .from("vendas")
      .select("id, data_venda, valor_total, forma_pagamento, status");

    if (currentId !== "emp-roze-gourmet") {
      remoteQuery = remoteQuery.eq("empresa_id", currentId);
    }

    const { data: remoteVendas, error: fetchErr } = await remoteQuery;

    if (fetchErr || !remoteVendas) {
      return { syncedCount: 0, discardedDuplicatesCount: 0 };
    }

    const remoteIds = new Set(remoteVendas.map((v) => v.id));
    const channelMap = getLocalSaleChannels(currentId);

    let syncedCount = 0;
    let discardedDuplicatesCount = 0;
    const remainingLocalVendas: Venda[] = [];
    const remainingLocalItens: ItemVenda[] = Array.isArray(localSnap.itensVenda)
      ? [...localSnap.itensVenda]
      : [];

    for (const localVenda of localSnap.vendas) {
      // 1. Já existe no Supabase pelo mesmo ID UUID?
      if (remoteIds.has(localVenda.id)) {
        continue;
      }

      // 2. Se for uma venda já salva no Supabase com ID diferente (duplicata de reentrada)
      const isDuplicate = remoteVendas.some((rv) => {
        if (
          Math.abs(Number(rv.valor_total) - Number(localVenda.valor_total)) < 0.01 &&
          rv.forma_pagamento === localVenda.forma_pagamento
        ) {
          const timeDiff = Math.abs(
            new Date(rv.data_venda).getTime() - new Date(localVenda.data_venda).getTime()
          );
          // Mesma venda dentro de janela de 2 minutos
          return timeDiff < 120000;
        }
        return false;
      });

      if (isDuplicate) {
        discardedDuplicatesCount++;
        continue;
      }

      // 3. Venda pendente legítima: envia ao Supabase
      try {
        const canal = localVenda.canal_venda || channelMap[localVenda.id] || "Balcao";
        const saleInsertData: Record<string, unknown> = {
          forma_pagamento: localVenda.forma_pagamento,
          canal_venda: canal,
          cliente_nome: localVenda.cliente_nome?.trim() || null,
          cliente_telefone: localVenda.cliente_telefone?.trim() || null,
          valor_total: Number(localVenda.valor_total),
          status: localVenda.status || "concluida",
          data_venda: localVenda.data_venda || new Date().toISOString(),
          pix_txid: localVenda.pix_txid || null,
          pix_qrcode: localVenda.pix_qrcode || null,
          pix_copia_cola: localVenda.pix_copia_cola || null,
          empresa_id: currentId,
        };

        // Se localVenda.id já for um UUID válido, preserva-o
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          localVenda.id
        );
        if (isUuid) {
          saleInsertData.id = localVenda.id;
        }

        let { data: vendaInserida, error: insertErr } = await supabase
          .from("vendas")
          .insert(saleInsertData)
          .select()
          .single();

        // Fallback caso canal_venda ou empresa_id não existam na base remota
        if (insertErr) {
          const safeData = { ...saleInsertData };
          delete safeData.canal_venda;
          delete safeData.empresa_id;
          const retry = await supabase
            .from("vendas")
            .insert(safeData)
            .select()
            .single();
          vendaInserida = retry.data;
          insertErr = retry.error;
        }

        if (!insertErr && vendaInserida) {
          setLocalSaleChannel(vendaInserida.id, canal, currentId);
          const localItens = remainingLocalItens.filter(
            (i) => i.venda_id === localVenda.id
          );
          if (localItens.length > 0) {
            const itemsToInsert = localItens.map((i) => ({
              venda_id: vendaInserida.id,
              produto_id: i.produto_id,
              quantidade: i.quantidade,
              preco_unitario: i.preco_unitario,
            }));
            await supabase.from("itens_venda").insert(itemsToInsert);
          }
          syncedCount++;
        } else {
          remainingLocalVendas.push(localVenda);
        }
      } catch {
        remainingLocalVendas.push(localVenda);
      }
    }

    // Atualiza LocalStorage removendo as vendas que já subiram
    const updatedSnapshot: DashboardDataSnapshot = {
      ...localSnap,
      vendas: remainingLocalVendas,
      itensVenda: remainingLocalItens.filter((i) =>
        remainingLocalVendas.some((v) => v.id === i.venda_id)
      ),
      lastSyncedAt: new Date().toISOString(),
    };
    saveLocalSnapshot(updatedSnapshot, currentId);

    return { syncedCount, discardedDuplicatesCount };
  } catch (err) {
    console.warn("Erro no processo de sincronização de vendas locais:", err);
    return { syncedCount: 0, discardedDuplicatesCount: 0 };
  }
}

export async function fetchDashboardData(companyId?: string): Promise<DashboardDataSnapshot> {
  const activeCompId = companyId || getActiveCompanyId();

  if (checkIsSupabaseConfigured() && supabase) {
    try {
      // Auto-sincroniza vendas offline antes de consultar para manter Nuvem e Aparelhos 100% idênticos
      await syncPendingLocalSalesToSupabase(activeCompId);

      // Se for Roze Gourmet, lê normal. Se for outra empresa, tenta filtrar por empresa_id
      let prodsQuery = supabase.from("produtos").select("*");
      let vendasQuery = supabase.from("vendas").select("*");
      let itensQuery = supabase.from("itens_venda").select("*");
      let estoqueQuery = supabase.from("estoque_lotes").select("*");

      if (activeCompId !== "emp-roze-gourmet") {
        prodsQuery = prodsQuery.eq("empresa_id", activeCompId);
        vendasQuery = vendasQuery.eq("empresa_id", activeCompId);
      }

      const [produtosRes, vendasRes, itensRes, estoqueRes] = await Promise.all([
        prodsQuery.order("nome"),
        vendasQuery.order("data_venda", { ascending: false }),
        itensQuery,
        estoqueQuery,
      ]);

      if (
        !produtosRes.error &&
        !vendasRes.error &&
        !itensRes.error &&
        !estoqueRes.error
      ) {
        const prods: Produto[] = (produtosRes.data || []).map((p) => ({
          ...p,
          empresaId: p.empresa_id || p.empresaId || activeCompId,
          preco_venda: Number(p.preco_venda),
          custo_estimado: Number(p.custo_estimado),
        }));
        const localSnap = getLocalSnapshot(activeCompId);
        const channelMap = getLocalSaleChannels(activeCompId);

        const allVendas: Venda[] = (vendasRes.data || []).map((v) => ({
          ...v,
          empresaId: v.empresa_id || v.empresaId || activeCompId,
          canal_venda: v.canal_venda || channelMap[v.id] || "Balcao",
          valor_total: Number(v.valor_total),
        }));

        const allItens: ItemVenda[] = (itensRes.data || []).map((i) => ({
          ...i,
          quantidade: Number(i.quantidade),
          preco_unitario: Number(i.preco_unitario),
        }));

        const freshSnapshot: DashboardDataSnapshot = {
          produtos: prods,
          vendas: allVendas,
          itensVenda: allItens,
          estoqueLotes: (estoqueRes.data || []).map((e) => ({
            ...e,
            empresaId: e.empresa_id || e.empresaId || activeCompId,
            quantidade_disponivel: Number(e.quantidade_disponivel),
          })),
          fichasTecnicas: ensureFichasForProducts(
            prods,
            localSnap.fichasTecnicas,
            activeCompId
          ),
          source: "supabase",
          lastSyncedAt: new Date().toISOString(),
        };

        // Mantém o LocalStorage espelhado com os dados oficiais da Nuvem
        saveLocalSnapshot(freshSnapshot, activeCompId);
        return freshSnapshot;
      }
    } catch (err) {
      console.warn("Erro de conexão Supabase, ativando modo local:", err);
    }
  }

  return getLocalSnapshot(activeCompId);
}

export interface NewSalePayload {
  empresaId?: string;
  forma_pagamento: PaymentMethod;
  canal_venda?: CanalVenda;
  cliente_nome?: string;
  cliente_telefone?: string;
  status?: "concluida" | "pendente" | "cancelada";
  pix_txid?: string;
  pix_qrcode?: string;
  pix_copia_cola?: string;
  venda_id?: string;
  itens: Array<{
    produto_id: string;
    quantidade: number;
  }>;
}

export async function createNewSale(
  payload: NewSalePayload,
  companyId?: string
): Promise<DashboardDataSnapshot> {
  const currentId = companyId || payload.empresaId || getActiveCompanyId();
  const current = await fetchDashboardData(currentId);
  const currentCompany = getLocalCompanies().find((c) => c.id === currentId) || getActiveCompany();
  const permitirEstoqueNegativo = currentCompany.permitirEstoqueNegativo ?? false;

  const productMap = new Map(current.produtos.map((p) => [p.id, p]));

  let valorTotal = 0;
  const preparedItems = payload.itens
    .filter((i) => i.quantidade > 0 && productMap.has(i.produto_id))
    .map((item) => {
      const prod = productMap.get(item.produto_id)!;
      const subtotal = Number((prod.preco_venda * item.quantidade).toFixed(2));
      valorTotal = Number((valorTotal + subtotal).toFixed(2));
      return {
        produto_id: prod.id,
        quantidade: item.quantidade,
        preco_unitario: prod.preco_venda,
      };
    });

  if (preparedItems.length === 0) {
    throw new Error("Não é possível finalizar venda com carrinho vazio. Selecione pelo menos 1 produto.");
  }

  // Validação Estrita de Estoque: Bloqueia se <= 0 a menos que a empresa permita estoque negativo
  if (!permitirEstoqueNegativo) {
    for (const item of preparedItems) {
      const prod = productMap.get(item.produto_id)!;
      const lote = current.estoqueLotes.find((e) => e.produto_id === item.produto_id);
      const estoqueDisponivel = lote ? lote.quantidade_disponivel : 0;

      if (estoqueDisponivel <= 0) {
        throw new Error(
          `Venda bloqueada: O produto "${prod.nome}" está ESGOTADO (0 un no estoque). Não é permitido vender sem estoque disponível.`
        );
      }
      if (item.quantidade > estoqueDisponivel) {
        throw new Error(
          `Venda bloqueada: Estoque insuficiente para "${prod.nome}". Restam apenas ${estoqueDisponivel} un no estoque, mas foi solicitada a venda de ${item.quantidade} un.`
        );
      }
    }
  }

  const saleStatus = payload.status || "concluida";

  if (current.source === "supabase" && supabase) {
    const saleInsertData: Record<string, unknown> = {
      empresa_id: currentId,
      forma_pagamento: payload.forma_pagamento,
      canal_venda: payload.canal_venda || "Balcao",
      cliente_nome: payload.cliente_nome?.trim() || null,
      cliente_telefone: payload.cliente_telefone?.trim() || null,
      valor_total: valorTotal,
      status: saleStatus,
      pix_txid: payload.pix_txid || null,
      pix_qrcode: payload.pix_qrcode || null,
      pix_copia_cola: payload.pix_copia_cola || null,
    };
    if (payload.venda_id && !payload.venda_id.startsWith("venda-temp")) {
      saleInsertData.id = payload.venda_id;
    }

    let { data: vendaInserida, error: vendaErr } = await supabase
      .from("vendas")
      .insert(saleInsertData)
      .select()
      .single();

    // Se a coluna canal_venda ou empresa_id ainda não existir no banco remoto (PGRST204), retenta sem ela
    if (
      vendaErr &&
      (vendaErr.code === "PGRST204" ||
        vendaErr.message?.toLowerCase().includes("canal_venda") ||
        vendaErr.message?.toLowerCase().includes("empresa_id"))
    ) {
      console.warn(
        "Ajustando payload de venda para compatibilidade com o schema remoto do Supabase."
      );
      const safeData = { ...saleInsertData };
      delete safeData.canal_venda;
      delete safeData.empresa_id;
      const retry = await supabase
        .from("vendas")
        .insert(safeData)
        .select()
        .single();
      vendaInserida = retry.data;
      vendaErr = retry.error;
    }

    if (!vendaErr && vendaInserida) {
      // Registra o canal de venda mapeado localmente
      if (payload.canal_venda) {
        setLocalSaleChannel(vendaInserida.id, payload.canal_venda, currentId);
      }

      const itemsToInsert = preparedItems.map((i) => ({
        venda_id: vendaInserida.id,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
      }));
      await supabase.from("itens_venda").insert(itemsToInsert);

      // Salva / atualiza histórico do cliente no CRM com escopo restrito à empresa atual
      if (saleStatus === "concluida") {
        saveOrUpdateCustomer({
          empresaId: currentId,
          nome: payload.cliente_nome,
          telefone: payload.cliente_telefone,
          valorCompra: valorTotal,
          itens: preparedItems.map((i) => ({
            produto_nome: productMap.get(i.produto_id)?.nome || "Produto",
            quantidade: i.quantidade,
          })),
        });
      }

      // Apenas baixa estoque se a venda estiver concluída imediatamente
      if (saleStatus === "concluida") {
        for (const item of preparedItems) {
          const lote = current.estoqueLotes.find(
            (e) => e.produto_id === item.produto_id
          );
          if (lote) {
            const novaQtd = permitirEstoqueNegativo
              ? lote.quantidade_disponivel - item.quantidade
              : Math.max(0, lote.quantidade_disponivel - item.quantidade);
            await supabase
              .from("estoque_lotes")
              .update({
                quantidade_disponivel: novaQtd,
                updated_at: new Date().toISOString(),
              })
              .eq("id", lote.id);
          }
        }
      }

      return fetchDashboardData(currentId);
    } else if (vendaErr) {
      console.error("Erro crítico ao gravar venda no Supabase:", vendaErr);
    }
  }

  const newVendaId = payload.venda_id || `venda-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const novaVenda: Venda = {
    id: newVendaId,
    empresaId: currentId,
    cliente_nome: payload.cliente_nome?.trim() || undefined,
    cliente_telefone: payload.cliente_telefone?.trim() || undefined,
    canal_venda: payload.canal_venda || "Balcao",
    data_venda: nowIso,
    forma_pagamento: payload.forma_pagamento,
    valor_total: valorTotal,
    status: saleStatus,
    pix_txid: payload.pix_txid,
    pix_qrcode: payload.pix_qrcode,
    pix_copia_cola: payload.pix_copia_cola,
  };

  // Salva / atualiza histórico do cliente no CRM local da empresa ativa
  if (saleStatus === "concluida") {
    saveOrUpdateCustomer({
      empresaId: currentId,
      nome: payload.cliente_nome,
      telefone: payload.cliente_telefone,
      valorCompra: valorTotal,
      itens: preparedItems.map((i) => ({
        produto_nome: productMap.get(i.produto_id)?.nome || "Produto",
        quantidade: i.quantidade,
      })),
    });
  }

  const novosItens: ItemVenda[] = preparedItems.map((i, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    venda_id: newVendaId,
    produto_id: i.produto_id,
    quantidade: i.quantidade,
    preco_unitario: i.preco_unitario,
  }));

  // Apenas baixa estoque se a venda estiver concluída
  const estoqueAtualizado =
    saleStatus === "concluida"
      ? current.estoqueLotes.map((lote) => {
          const soldItem = preparedItems.find(
            (i) => i.produto_id === lote.produto_id
          );
          if (!soldItem) return lote;
          const novaQtd = permitirEstoqueNegativo
            ? lote.quantidade_disponivel - soldItem.quantidade
            : Math.max(0, lote.quantidade_disponivel - soldItem.quantidade);
          return {
            ...lote,
            quantidade_disponivel: novaQtd,
            updated_at: nowIso,
          };
        })
      : current.estoqueLotes;

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    vendas: [novaVenda, ...current.vendas],
    itensVenda: [...novosItens, ...current.itensVenda],
    estoqueLotes: estoqueAtualizado,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot, currentId);
  return updatedSnapshot;
}

/**
 * Conclui uma venda pendente (ex: após confirmação de webhook do Pix)
 * e realiza a dedução correspondente no estoque de produtos
 */
export async function completePendingSale(
  vendaIdOrTxId: string
): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
  const nowIso = new Date().toISOString();

  if (current.source === "supabase" && supabase) {
    // Tenta primeiro via RPC seguro
    await supabase.rpc("settle_stone_pix_sale", { txid_param: vendaIdOrTxId });
    return fetchDashboardData();
  }

  // Fallback local
  const vendaIndex = current.vendas.findIndex(
    (v) => v.id === vendaIdOrTxId || v.pix_txid === vendaIdOrTxId
  );
  if (vendaIndex === -1) return current;

  const venda = current.vendas[vendaIndex];
  if (venda.status === "concluida") return current;

  const updatedVendas = [...current.vendas];
  updatedVendas[vendaIndex] = {
    ...venda,
    status: "concluida",
  };

  const itensDaVenda = current.itensVenda.filter((i) => i.venda_id === venda.id);

  const estoqueAtualizado = current.estoqueLotes.map((lote) => {
    const item = itensDaVenda.find((i) => i.produto_id === lote.produto_id);
    if (!item) return lote;
    return {
      ...lote,
      quantidade_disponivel: Math.max(0, lote.quantidade_disponivel - item.quantidade),
      updated_at: nowIso,
    };
  });

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    vendas: updatedVendas,
    estoqueLotes: estoqueAtualizado,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

/**
 * Realiza o cancelamento ou estorno de uma venda
 * 1. Remove a venda do faturamento e das receitas (status muda para 'cancelada')
 * 2. Mantém o registro histórico permanente com motivo e data
 * 3. Se solicitado, estorna a baixa de estoque, devolvendo as unidades físicas ao freezer
 */
export async function cancelOrRefundSale(
  vendaId: string,
  motivo: string,
  devolverAoEstoque: boolean
): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
  const nowIso = new Date().toISOString();

  if (current.source === "supabase" && supabase) {
    await supabase
      .from("vendas")
      .update({
        status: "cancelada",
        motivo_cancelamento: motivo,
        data_cancelamento: nowIso,
        estornou_estoque: devolverAoEstoque,
      })
      .eq("id", vendaId);

    if (devolverAoEstoque) {
      const { data: itens } = await supabase
        .from("itens_venda")
        .select("produto_id, quantidade")
        .eq("venda_id", vendaId);

      if (itens) {
        for (const item of itens) {
          const lote = current.estoqueLotes.find(
            (e) => e.produto_id === item.produto_id
          );
          if (lote) {
            await supabase
              .from("estoque_lotes")
              .update({
                quantidade_disponivel: lote.quantidade_disponivel + item.quantidade,
                updated_at: nowIso,
              })
              .eq("id", lote.id);
          }
        }
      }
    }

    return fetchDashboardData();
  }

  const vendaIndex = current.vendas.findIndex((v) => v.id === vendaId);
  if (vendaIndex === -1) return current;

  const venda = current.vendas[vendaIndex];
  const eraConcluida = venda.status === "concluida";

  const updatedVendas = [...current.vendas];
  updatedVendas[vendaIndex] = {
    ...venda,
    status: "cancelada",
    motivo_cancelamento: motivo,
    data_cancelamento: nowIso,
    estornou_estoque: devolverAoEstoque,
  };

  let estoqueAtualizado = current.estoqueLotes;
  if (devolverAoEstoque && eraConcluida) {
    const itensDaVenda = current.itensVenda.filter((i) => i.venda_id === venda.id);
    estoqueAtualizado = current.estoqueLotes.map((lote) => {
      const item = itensDaVenda.find((i) => i.produto_id === lote.produto_id);
      if (!item) return lote;
      return {
        ...lote,
        quantidade_disponivel: lote.quantidade_disponivel + item.quantidade,
        updated_at: nowIso,
      };
    });
  }

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    vendas: updatedVendas,
    estoqueLotes: estoqueAtualizado,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

export async function updateProductStock(
  produtoId: string,
  novaQuantidade: number,
  auditInfo?: {
    adminNome?: string;
    motivo?: string;
    observacoes?: string;
  }
): Promise<DashboardDataSnapshot> {
  const qtdSegura = Math.max(0, Math.round(novaQuantidade));
  const current = await fetchDashboardData();
  const nowIso = new Date().toISOString();

  // Auditoria de estoque
  const prod = current.produtos.find((p) => p.id === produtoId);
  const existingLote = current.estoqueLotes.find(
    (e) => e.produto_id === produtoId
  );
  const anterior = existingLote ? existingLote.quantidade_disponivel : 0;
  const diferenca = qtdSegura - anterior;

  if (diferenca !== 0 && prod) {
    addAuditLog({
      admin_responsavel: auditInfo?.adminNome || "Administrador",
      tipo_item: "geladinho_pronto",
      item_id: prod.id,
      item_nome: prod.nome,
      unidade_medida: "un",
      quantidade_anterior: anterior,
      quantidade_nova: qtdSegura,
      diferenca,
      motivo_ajuste:
        auditInfo?.motivo ||
        (diferenca > 0
          ? "Reposição de Lote / Produção"
          : "Ajuste / Baixa Manual"),
      observacoes: auditInfo?.observacoes,
    });
  }

  if (current.source === "supabase" && supabase) {
    const existingLote = current.estoqueLotes.find(
      (e) => e.produto_id === produtoId
    );
    if (existingLote) {
      await supabase
        .from("estoque_lotes")
        .update({
          quantidade_disponivel: qtdSegura,
          updated_at: nowIso,
        })
        .eq("id", existingLote.id);
    } else {
      await supabase.from("estoque_lotes").insert({
        produto_id: produtoId,
        quantidade_disponivel: qtdSegura,
        updated_at: nowIso,
      });
    }
    return fetchDashboardData();
  }

  let found = false;
  const novosLotes = current.estoqueLotes.map((lote) => {
    if (lote.produto_id === produtoId) {
      found = true;
      return {
        ...lote,
        quantidade_disponivel: qtdSegura,
        updated_at: nowIso,
      };
    }
    return lote;
  });

  if (!found) {
    novosLotes.push({
      id: `est-${Date.now()}`,
      produto_id: produtoId,
      quantidade_disponivel: qtdSegura,
      updated_at: nowIso,
    });
  }

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    estoqueLotes: novosLotes,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

export interface NewProductPayload {
  nome: string;
  preco_venda: number;
  custo_estimado: number;
  estoque_inicial: number;
}

export async function createNewProduct(
  payload: NewProductPayload
): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
  const nowIso = new Date().toISOString();

  if (current.source === "supabase" && supabase) {
    const { data: prodInserido, error } = await supabase
      .from("produtos")
      .insert({
        nome: payload.nome.trim(),
        preco_venda: payload.preco_venda,
        custo_estimado: payload.custo_estimado,
        ativo: true,
      })
      .select()
      .single();

    if (!error && prodInserido) {
      await supabase.from("estoque_lotes").insert({
        produto_id: prodInserido.id,
        quantidade_disponivel: Math.max(0, Math.round(payload.estoque_inicial)),
      });
      return fetchDashboardData();
    }
  }

  const currentCompId = getActiveCompanyId();
  const novoProdId = `prod-${Date.now()}`;
  const novoProduto: Produto = {
    id: novoProdId,
    empresaId: currentCompId,
    nome: payload.nome.trim(),
    preco_venda: Number(payload.preco_venda),
    preco_ifood: Number((payload.preco_venda * 1.35).toFixed(2)),
    custo_estimado: Number(payload.custo_estimado),
    ativo: true,
    created_at: nowIso,
  };

  const novoLote: EstoqueLote = {
    id: `est-${Date.now()}`,
    empresaId: currentCompId,
    produto_id: novoProdId,
    quantidade_disponivel: Math.max(0, Math.round(payload.estoque_inicial)),
    updated_at: nowIso,
  };

  const novasFichas = ensureFichasForProducts(
    [...current.produtos, novoProduto],
    current.fichasTecnicas
  );

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    produtos: [...current.produtos, novoProduto],
    estoqueLotes: [...current.estoqueLotes, novoLote],
    fichasTecnicas: novasFichas,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

export async function saveProductFichaTecnica(
  ficha: FichaTecnicaProduto,
  novoPrecoVenda?: number
): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
  const { custoTotalUn } = calculateUnitCostFromFicha(ficha);

  if (current.source === "supabase" && supabase) {
    const updateData: Record<string, number> = {
      custo_estimado: custoTotalUn,
    };
    if (typeof novoPrecoVenda === "number" && novoPrecoVenda > 0) {
      updateData.preco_venda = Number(novoPrecoVenda.toFixed(2));
    }
    await supabase
      .from("produtos")
      .update(updateData)
      .eq("id", ficha.produto_id);
  }

  const novosProdutos = current.produtos.map((p) => {
    if (p.id !== ficha.produto_id) return p;
    return {
      ...p,
      custo_estimado: custoTotalUn,
      preco_ifood: ficha.preco_ifood_sugerido,
      preco_venda:
        typeof novoPrecoVenda === "number" && novoPrecoVenda > 0
          ? Number(novoPrecoVenda.toFixed(2))
          : p.preco_venda,
    };
  });

  const existingIdx = current.fichasTecnicas.findIndex(
    (f) => f.produto_id === ficha.produto_id
  );
  const novasFichas = [...current.fichasTecnicas];
  if (existingIdx >= 0) {
    novasFichas[existingIdx] = ficha;
  } else {
    novasFichas.push(ficha);
  }

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    produtos: novosProdutos,
    fichasTecnicas: novasFichas,
    lastSyncedAt: new Date().toISOString(),
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

export async function saveBatchFichasTecnicas(
  fichas: FichaTecnicaProduto[]
): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
  const fichaMap = new Map(fichas.map((f) => [f.produto_id, f]));

  const novosProdutos = current.produtos.map((p) => {
    const ficha = fichaMap.get(p.id);
    if (!ficha) return p;
    const { custoTotalUn } = calculateUnitCostFromFicha(ficha);
    return {
      ...p,
      custo_estimado: custoTotalUn,
      preco_ifood: ficha.preco_ifood_sugerido,
    };
  });

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    produtos: novosProdutos,
    fichasTecnicas: fichas,
    lastSyncedAt: new Date().toISOString(),
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

/**
 * Zera todos os dados operacionais (vendas, itens e estoque) para início de produção real,
 * mantendo 100% preservadas as fichas técnicas de receitas e os produtos cadastrados.
 */
export async function resetToCleanSlate(): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
  const nowIso = new Date().toISOString();

  if (current.source === "supabase" && supabase) {
    await supabase
      .from("itens_venda")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("vendas")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase
      .from("estoque_lotes")
      .update({
        quantidade_disponivel: 0,
        updated_at: nowIso,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Limpa também o snapshot local para garantir que nenhuma venda órfã persista
    const localSnap = getLocalSnapshot();
    const cleanLocal: DashboardDataSnapshot = {
      ...localSnap,
      vendas: [],
      itensVenda: [],
      estoqueLotes: localSnap.estoqueLotes.map((l) => ({
        ...l,
        quantidade_disponivel: 0,
        updated_at: nowIso,
      })),
      lastSyncedAt: nowIso,
    };
    saveLocalSnapshot(cleanLocal);

    return fetchDashboardData();
  }

  // Local snapshot
  const zeroStock = current.estoqueLotes.map((lote) => ({
    ...lote,
    quantidade_disponivel: 0,
    updated_at: nowIso,
  }));

  const cleanSnapshot: DashboardDataSnapshot = {
    ...current,
    vendas: [],
    itensVenda: [],
    estoqueLotes: zeroStock,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(cleanSnapshot);
  return cleanSnapshot;
}

/**
 * Exclui permanentemente um produto do catálogo da empresa ativa,
 * removendo também seus lotes de estoque e sua respectiva ficha técnica.
 */
export async function deleteProduct(produtoId: string): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
  const nowIso = new Date().toISOString();

  if (current.source === "supabase" && supabase) {
    try {
      await supabase.from("estoque_lotes").delete().eq("produto_id", produtoId);
      await supabase.from("produtos").delete().eq("id", produtoId);
    } catch (err) {
      console.warn("Erro ao excluir produto do Supabase:", err);
    }
  }

  const updatedProdutos = current.produtos.filter((p) => p.id !== produtoId);
  const updatedLotes = current.estoqueLotes.filter((e) => e.produto_id !== produtoId);
  const updatedFichas = current.fichasTecnicas.filter((f) => f.produto_id !== produtoId);

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    produtos: updatedProdutos,
    estoqueLotes: updatedLotes,
    fichasTecnicas: updatedFichas,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

/**
 * Limpa e zera 100% dos dados da empresa especificada (ou ativa),
 * removendo qualquer vestígio de produtos anteriores, vendas ou fichas.
 */
export async function wipeCompanyData(companyId?: string): Promise<DashboardDataSnapshot> {
  const currentId = companyId || getActiveCompanyId();
  const nowIso = new Date().toISOString();

  const cleanSnapshot: DashboardDataSnapshot = {
    produtos: [],
    vendas: [],
    itensVenda: [],
    estoqueLotes: [],
    fichasTecnicas: [],
    source: "demo_local",
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(cleanSnapshot, currentId);
  return cleanSnapshot;
}
