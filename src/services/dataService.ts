import { BRAND_CONFIG } from "@/config/brand.config";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  DashboardDataSnapshot,
  EstoqueLote,
  FichaTecnicaProduto,
  ItemVenda,
  PaymentMethod,
  Produto,
  Venda,
} from "@/types/dashboard";

const STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_dashboard_data_v1`;

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
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

function getDefaultFichasTecnicas(): FichaTecnicaProduto[] {
  return [
    {
      produto_id: "prod-ninho-nutella",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 35,
      custo_embalagem_un: 0.35,
      custo_operacional_un: 0.15,
      modo_preparo:
        "Bater a base cremosa (leite integral, leite condensado, creme de leite, leite Ninho e liga neutra) por 3 minutos. Espalhar 15g de Nutella na parede interna de cada saquinho gourmet antes de envasar 130ml da calda.",
      ingredientes: [
        {
          id: "ing-nn-1",
          nome: "Leite Condensado Integral (2 cx)",
          quantidade_receita: 790,
          unidade: "g",
          custo_receita: 13.8,
        },
        {
          id: "ing-nn-2",
          nome: "Creme de Leite 20% Gordura (2 cx)",
          quantidade_receita: 400,
          unidade: "g",
          custo_receita: 7.6,
        },
        {
          id: "ing-nn-3",
          nome: "Leite Integral Tipo A",
          quantidade_receita: 1000,
          unidade: "ml",
          custo_receita: 5.4,
        },
        {
          id: "ing-nn-4",
          nome: "Leite em Pó Ninho Integral",
          quantidade_receita: 180,
          unidade: "g",
          custo_receita: 9.2,
        },
        {
          id: "ing-nn-5",
          nome: "Nutella Original (recheio lateral 15g/un)",
          quantidade_receita: 300,
          unidade: "g",
          custo_receita: 17.2,
        },
        {
          id: "ing-nn-6",
          nome: "Liga Neutra Confeitaria",
          quantidade_receita: 15,
          unidade: "g",
          custo_receita: 0.8,
        },
      ],
    },
    {
      produto_id: "prod-morango-calda",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 40,
      custo_embalagem_un: 0.35,
      custo_operacional_un: 0.15,
      modo_preparo:
        "Reduzir morangos frescos com açúcar cristal até formar geleia artesanal brilhante. Bater a base cremosa com polpa natural e envasar nos saquinhos decorados com a calda.",
      ingredientes: [
        {
          id: "ing-mc-1",
          nome: "Leite Condensado Integral (2 cx)",
          quantidade_receita: 790,
          unidade: "g",
          custo_receita: 13.8,
        },
        {
          id: "ing-mc-2",
          nome: "Creme de Leite (2 cx)",
          quantidade_receita: 400,
          unidade: "g",
          custo_receita: 7.6,
        },
        {
          id: "ing-mc-3",
          nome: "Leite Integral",
          quantidade_receita: 1000,
          unidade: "ml",
          custo_receita: 5.4,
        },
        {
          id: "ing-mc-4",
          nome: "Morangos Frescos Selecionados (Calda + Base)",
          quantidade_receita: 600,
          unidade: "g",
          custo_receita: 18.0,
        },
        {
          id: "ing-mc-5",
          nome: "Açúcar Cristal + Liga Neutra",
          quantidade_receita: 165,
          unidade: "g",
          custo_receita: 3.2,
        },
      ],
    },
    {
      produto_id: "prod-maracuja-trufado",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 35,
      custo_embalagem_un: 0.35,
      custo_operacional_un: 0.15,
      modo_preparo:
        "Preparar ganache meio amargo (chocolate nobre + creme de leite) para trufar o saquinho. Bater a mousse cremosa com redução concentrada de maracujá natural.",
      ingredientes: [
        {
          id: "ing-mt-1",
          nome: "Leite Condensado + Creme de Leite",
          quantidade_receita: 1190,
          unidade: "g",
          custo_receita: 21.4,
        },
        {
          id: "ing-mt-2",
          nome: "Polpa Natural de Maracujá (In Natura)",
          quantidade_receita: 450,
          unidade: "ml",
          custo_receita: 12.6,
        },
        {
          id: "ing-mt-3",
          nome: "Chocolate Nobre Meio Amargo (Ganache)",
          quantidade_receita: 280,
          unidade: "g",
          custo_receita: 14.0,
        },
        {
          id: "ing-mt-4",
          nome: "Leite Integral + Liga Neutra",
          quantidade_receita: 800,
          unidade: "ml",
          custo_receita: 4.0,
        },
      ],
    },
    {
      produto_id: "prod-pistache-real",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 45,
      custo_embalagem_un: 0.4,
      custo_operacional_un: 0.2,
      modo_preparo:
        "Homogeneizar a pasta pura de pistache italiano na base láctea premium. Decorar os saquinhos com ganache branca de pistache e xerém de pistache torrado.",
      ingredientes: [
        {
          id: "ing-pr-1",
          nome: "Base Láctea Premium (Condensado + Creme + Leite)",
          quantidade_receita: 2100,
          unidade: "ml",
          custo_receita: 26.8,
        },
        {
          id: "ing-pr-2",
          nome: "Pasta Pura de Pistache Importada",
          quantidade_receita: 220,
          unidade: "g",
          custo_receita: 34.0,
        },
        {
          id: "ing-pr-3",
          nome: "Chocolate Branco Nobre + Xerém de Pistache",
          quantidade_receita: 250,
          unidade: "g",
          custo_receita: 17.2,
        },
      ],
    },
    {
      produto_id: "prod-oreo-creme",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 30,
      custo_embalagem_un: 0.35,
      custo_operacional_un: 0.15,
      modo_preparo:
        "Bater a base de baunilha com chocolate branco derretido. Adicionar pedaços crocantes de biscoito Oreo diretamente em cada saquinho antes de selar.",
      ingredientes: [
        {
          id: "ing-oc-1",
          nome: "Base Láctea (Leite Condensado + Creme + Leite)",
          quantidade_receita: 2100,
          unidade: "ml",
          custo_receita: 26.8,
        },
        {
          id: "ing-oc-2",
          nome: "Biscoito Oreo Original (4 pacotes)",
          quantidade_receita: 360,
          unidade: "g",
          custo_receita: 15.2,
        },
        {
          id: "ing-oc-3",
          nome: "Chocolate Branco + Essência Baunilha",
          quantidade_receita: 150,
          unidade: "g",
          custo_receita: 8.0,
        },
      ],
    },
    {
      produto_id: "prod-coco-queimado",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 35,
      custo_embalagem_un: 0.35,
      custo_operacional_un: 0.15,
      modo_preparo:
        "Dourar o coco ralado em flocos com açúcar caramelizado na panela. Bater metade na base com leite de coco e deixar flocos caramelizados na lateral do saquinho.",
      ingredientes: [
        {
          id: "ing-cq-1",
          nome: "Base Láctea + Leite de Coco (400ml)",
          quantidade_receita: 2200,
          unidade: "ml",
          custo_receita: 25.0,
        },
        {
          id: "ing-cq-2",
          nome: "Coco em Flocos Integral Queimado",
          quantidade_receita: 300,
          unidade: "g",
          custo_receita: 11.0,
        },
        {
          id: "ing-cq-3",
          nome: "Caramelo Artesanal + Liga Neutra",
          quantidade_receita: 150,
          unidade: "g",
          custo_receita: 2.0,
        },
      ],
    },
    {
      produto_id: "prod-ferrero-gourmet",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 40,
      custo_embalagem_un: 0.4,
      custo_operacional_un: 0.2,
      modo_preparo:
        "Base de chocolate belga 50% cacau com pasta de avelã. Casquinha interna de ganache com castanha/avelã triturada torrada.",
      ingredientes: [
        {
          id: "ing-fr-1",
          nome: "Base Láctea + Cacau 50% Alcalino",
          quantidade_receita: 2200,
          unidade: "ml",
          custo_receita: 31.0,
        },
        {
          id: "ing-fr-2",
          nome: "Creme de Avelã + Chocolate Meio Amargo",
          quantidade_receita: 350,
          unidade: "g",
          custo_receita: 26.0,
        },
        {
          id: "ing-fr-3",
          nome: "Avelãs e Castanhas Torradas Granuladas",
          quantidade_receita: 200,
          unidade: "g",
          custo_receita: 17.0,
        },
      ],
    },
    {
      produto_id: "prod-limao-suspiro",
      rendimento_unidades: 20,
      volume_unitario_ml: 130,
      tempo_preparo_min: 30,
      custo_embalagem_un: 0.35,
      custo_operacional_un: 0.15,
      modo_preparo:
        "Bater a mousse cítrica com suco e raspas finas de limão siciliano fresco. Finalizar com creme de suspiro artesanal.",
      ingredientes: [
        {
          id: "ing-ls-1",
          nome: "Base Láctea (Leite Condensado + Creme + Leite)",
          quantidade_receita: 2000,
          unidade: "ml",
          custo_receita: 26.8,
        },
        {
          id: "ing-ls-2",
          nome: "Limão Siciliano Fresco (Suco + Raspas)",
          quantidade_receita: 500,
          unidade: "g",
          custo_receita: 10.2,
        },
        {
          id: "ing-ls-3",
          nome: "Merengue / Suspiro Artesanal",
          quantidade_receita: 200,
          unidade: "g",
          custo_receita: 8.0,
        },
      ],
    },
  ];
}

function generateInitialDemoData(): DashboardDataSnapshot {
  const now = new Date();
  const rand = seededRandom(20261019);
  const fichasTecnicas = getDefaultFichasTecnicas();

  const produtos: Produto[] = [
    {
      id: "prod-ninho-nutella",
      nome: "Ninho com Nutella",
      preco_venda: 8.5,
      custo_estimado: 3.2,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-morango-calda",
      nome: "Morango com Calda Artesanal",
      preco_venda: 8.0,
      custo_estimado: 2.9,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-maracuja-trufado",
      nome: "Maracujá Trufado",
      preco_venda: 8.5,
      custo_estimado: 3.1,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-pistache-real",
      nome: "Pistache Real",
      preco_venda: 10.0,
      custo_estimado: 4.5,
      ativo: true,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: "prod-oreo-creme",
      nome: "Oreo com Creme Branco",
      preco_venda: 8.5,
      custo_estimado: 3.0,
      ativo: true,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: "prod-coco-queimado",
      nome: "Coco Queimado Cremoso",
      preco_venda: 7.5,
      custo_estimado: 2.4,
      ativo: true,
      created_at: new Date(now.getTime() - 85 * 86400000).toISOString(),
    },
    {
      id: "prod-ferrero-gourmet",
      nome: "Ferrero Rocher Gourmet",
      preco_venda: 10.0,
      custo_estimado: 4.3,
      ativo: true,
      created_at: new Date(now.getTime() - 80 * 86400000).toISOString(),
    },
    {
      id: "prod-limao-suspiro",
      nome: "Limão Siciliano com Suspiro",
      preco_venda: 8.0,
      custo_estimado: 2.75,
      ativo: true,
      created_at: new Date(now.getTime() - 75 * 86400000).toISOString(),
    },
  ];

  const estoqueLotes: EstoqueLote[] = [
    {
      id: "est-1",
      produto_id: "prod-ninho-nutella",
      quantidade_disponivel: 6,
      updated_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
    },
    {
      id: "est-2",
      produto_id: "prod-morango-calda",
      quantidade_disponivel: 8,
      updated_at: new Date(now.getTime() - 4 * 3600000).toISOString(),
    },
    {
      id: "est-3",
      produto_id: "prod-maracuja-trufado",
      quantidade_disponivel: 24,
      updated_at: new Date(now.getTime() - 12 * 3600000).toISOString(),
    },
    {
      id: "est-4",
      produto_id: "prod-pistache-real",
      quantidade_disponivel: 4,
      updated_at: new Date(now.getTime() - 1 * 3600000).toISOString(),
    },
    {
      id: "est-5",
      produto_id: "prod-oreo-creme",
      quantidade_disponivel: 19,
      updated_at: new Date(now.getTime() - 16 * 3600000).toISOString(),
    },
    {
      id: "est-6",
      produto_id: "prod-coco-queimado",
      quantidade_disponivel: 31,
      updated_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
    },
    {
      id: "est-7",
      produto_id: "prod-ferrero-gourmet",
      quantidade_disponivel: 9,
      updated_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
    },
    {
      id: "est-8",
      produto_id: "prod-limao-suspiro",
      quantidade_disponivel: 16,
      updated_at: new Date(now.getTime() - 18 * 3600000).toISOString(),
    },
  ];

  const productWeights = [0.24, 0.18, 0.15, 0.14, 0.1, 0.07, 0.07, 0.05];
  const paymentMethods: PaymentMethod[] = [
    "Pix",
    "Pix",
    "Pix",
    "Pix",
    "Cartao_Credito",
    "Cartao_Credito",
    "Cartao_Debito",
    "Cartao_Debito",
    "Dinheiro",
  ];

  const vendas: Venda[] = [];
  const itensVenda: ItemVenda[] = [];

  const pickWeightedProduct = (): Produto => {
    const r = rand();
    let acc = 0;
    for (let i = 0; i < produtos.length; i++) {
      acc += productWeights[i];
      if (r <= acc) return produtos[i];
    }
    return produtos[0];
  };

  let saleCounter = 1;
  let itemCounter = 1;

  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const dayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysAgo
    );
    const dayOfWeek = dayDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;

    const numOrders =
      daysAgo === 0
        ? 5
        : daysAgo === 1
          ? 6
          : isWeekend
            ? Math.floor(rand() * 4) + 4
            : Math.floor(rand() * 3) + 2;

    for (let o = 0; o < numOrders; o++) {
      const hour =
        daysAgo === 0
          ? Math.max(9, Math.min(now.getHours(), 10 + o * 2))
          : 11 + Math.floor(rand() * 9);
      const minute = Math.floor(rand() * 55);
      const saleTimestamp = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        hour,
        minute
      );

      if (daysAgo === 0 && saleTimestamp.getTime() > now.getTime()) {
        saleTimestamp.setTime(now.getTime() - (numOrders - o) * 18 * 60000);
      }

      const vendaId = `venda-${saleCounter++}`;
      const numDistinctFlavors = Math.floor(rand() * 3) + 1;
      const chosenIds = new Set<string>();
      let valorTotal = 0;

      for (let f = 0; f < numDistinctFlavors; f++) {
        const prod = pickWeightedProduct();
        if (chosenIds.has(prod.id)) continue;
        chosenIds.add(prod.id);

        const qtd = Math.floor(rand() * 4) + 1;
        const subtotal = Number((qtd * prod.preco_venda).toFixed(2));
        valorTotal = Number((valorTotal + subtotal).toFixed(2));

        itensVenda.push({
          id: `item-${itemCounter++}`,
          venda_id: vendaId,
          produto_id: prod.id,
          quantidade: qtd,
          preco_unitario: prod.preco_venda,
        });
      }

      const metodo =
        paymentMethods[Math.floor(rand() * paymentMethods.length)];

      vendas.push({
        id: vendaId,
        data_venda: saleTimestamp.toISOString(),
        forma_pagamento: metodo,
        valor_total: valorTotal,
        status: "concluida",
      });
    }
  }

  return {
    produtos,
    vendas: vendas.sort(
      (a, b) =>
        new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()
    ),
    itensVenda,
    estoqueLotes,
    fichasTecnicas,
    source: "demo_local",
    lastSyncedAt: new Date().toISOString(),
  };
}

function ensureFichasForProducts(
  produtos: Produto[],
  existingFichas?: FichaTecnicaProduto[]
): FichaTecnicaProduto[] {
  const defaults = getDefaultFichasTecnicas();
  const map = new Map<string, FichaTecnicaProduto>();

  for (const d of defaults) {
    map.set(d.produto_id, d);
  }
  if (Array.isArray(existingFichas)) {
    for (const f of existingFichas) {
      map.set(f.produto_id, f);
    }
  }

  // Ensure every product has a technical sheet
  for (const prod of produtos) {
    if (!map.has(prod.id)) {
      const custoInsumo = Math.max(0.5, prod.custo_estimado - 0.5);
      map.set(prod.id, {
        produto_id: prod.id,
        rendimento_unidades: 20,
        volume_unitario_ml: 130,
        tempo_preparo_min: 35,
        custo_embalagem_un: 0.35,
        custo_operacional_un: 0.15,
        modo_preparo:
          "Bater os ingredientes da base láctea no liquidificador por 3 minutos, envasar 130ml por saquinho gourmet e levar ao congelador.",
        ingredientes: [
          {
            id: `ing-${prod.id}-1`,
            nome: "Base Láctea Gourmet (Condensado + Creme + Leite)",
            quantidade_receita: 2000,
            unidade: "ml",
            custo_receita: Number((custoInsumo * 20 * 0.65).toFixed(2)),
          },
          {
            id: `ing-${prod.id}-2`,
            nome: `Insumo Principal (${prod.nome})`,
            quantidade_receita: 350,
            unidade: "g",
            custo_receita: Number((custoInsumo * 20 * 0.35).toFixed(2)),
          },
        ],
      });
    }
  }

  return Array.from(map.values());
}

function getLocalSnapshot(): DashboardDataSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardDataSnapshot;
      if (
        parsed &&
        Array.isArray(parsed.produtos) &&
        Array.isArray(parsed.vendas)
      ) {
        const fichas = ensureFichasForProducts(
          parsed.produtos,
          parsed.fichasTecnicas
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
    console.warn("Erro ao ler dados locais, recriando seed demo:", err);
  }
  const initial = generateInitialDemoData();
  saveLocalSnapshot(initial);
  return initial;
}

function saveLocalSnapshot(snapshot: DashboardDataSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("Não foi possível salvar no LocalStorage:", err);
  }
}

export function resetLocalDemoData(): DashboardDataSnapshot {
  const fresh = generateInitialDemoData();
  saveLocalSnapshot(fresh);
  return fresh;
}

export async function fetchDashboardData(): Promise<DashboardDataSnapshot> {
  if (isSupabaseConfigured && supabase) {
    try {
      const [produtosRes, vendasRes, itensRes, estoqueRes] = await Promise.all([
        supabase.from("produtos").select("*").order("nome"),
        supabase
          .from("vendas")
          .select("*")
          .order("data_venda", { ascending: false }),
        supabase.from("itens_venda").select("*"),
        supabase.from("estoque_lotes").select("*"),
      ]);

      if (
        !produtosRes.error &&
        !vendasRes.error &&
        !itensRes.error &&
        !estoqueRes.error
      ) {
        const prods = (produtosRes.data || []).map((p) => ({
          ...p,
          preco_venda: Number(p.preco_venda),
          custo_estimado: Number(p.custo_estimado),
        }));
        const localSnap = getLocalSnapshot();
        return {
          produtos: prods,
          vendas: (vendasRes.data || []).map((v) => ({
            ...v,
            valor_total: Number(v.valor_total),
          })),
          itensVenda: (itensRes.data || []).map((i) => ({
            ...i,
            quantidade: Number(i.quantidade),
            preco_unitario: Number(i.preco_unitario),
          })),
          estoqueLotes: (estoqueRes.data || []).map((e) => ({
            ...e,
            quantidade_disponivel: Number(e.quantidade_disponivel),
          })),
          fichasTecnicas: ensureFichasForProducts(
            prods,
            localSnap.fichasTecnicas
          ),
          source: "supabase",
          lastSyncedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn("Erro de conexão Supabase, ativando modo local:", err);
    }
  }

  return getLocalSnapshot();
}

export interface NewSalePayload {
  forma_pagamento: PaymentMethod;
  itens: Array<{
    produto_id: string;
    quantidade: number;
  }>;
}

export async function createNewSale(
  payload: NewSalePayload
): Promise<DashboardDataSnapshot> {
  const current = await fetchDashboardData();
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
    return current;
  }

  if (current.source === "supabase" && supabase) {
    const { data: vendaInserida, error: vendaErr } = await supabase
      .from("vendas")
      .insert({
        forma_pagamento: payload.forma_pagamento,
        valor_total: valorTotal,
        status: "concluida",
      })
      .select()
      .single();

    if (!vendaErr && vendaInserida) {
      const itemsToInsert = preparedItems.map((i) => ({
        venda_id: vendaInserida.id,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
      }));
      await supabase.from("itens_venda").insert(itemsToInsert);

      for (const item of preparedItems) {
        const lote = current.estoqueLotes.find(
          (e) => e.produto_id === item.produto_id
        );
        if (lote) {
          const novaQtd = Math.max(
            0,
            lote.quantidade_disponivel - item.quantidade
          );
          await supabase
            .from("estoque_lotes")
            .update({
              quantidade_disponivel: novaQtd,
              updated_at: new Date().toISOString(),
            })
            .eq("id", lote.id);
        }
      }

      return fetchDashboardData();
    }
  }

  const newVendaId = `venda-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const novaVenda: Venda = {
    id: newVendaId,
    data_venda: nowIso,
    forma_pagamento: payload.forma_pagamento,
    valor_total: valorTotal,
    status: "concluida",
  };

  const novosItens: ItemVenda[] = preparedItems.map((i, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    venda_id: newVendaId,
    produto_id: i.produto_id,
    quantidade: i.quantidade,
    preco_unitario: i.preco_unitario,
  }));

  const estoqueAtualizado = current.estoqueLotes.map((lote) => {
    const soldItem = preparedItems.find(
      (i) => i.produto_id === lote.produto_id
    );
    if (!soldItem) return lote;
    return {
      ...lote,
      quantidade_disponivel: Math.max(
        0,
        lote.quantidade_disponivel - soldItem.quantidade
      ),
      updated_at: nowIso,
    };
  });

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    vendas: [novaVenda, ...current.vendas],
    itensVenda: [...novosItens, ...current.itensVenda],
    estoqueLotes: estoqueAtualizado,
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}

export async function updateProductStock(
  produtoId: string,
  novaQuantidade: number
): Promise<DashboardDataSnapshot> {
  const qtdSegura = Math.max(0, Math.round(novaQuantidade));
  const current = await fetchDashboardData();
  const nowIso = new Date().toISOString();

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

  const novoProdId = `prod-${Date.now()}`;
  const novoProduto: Produto = {
    id: novoProdId,
    nome: payload.nome.trim(),
    preco_venda: Number(payload.preco_venda),
    custo_estimado: Number(payload.custo_estimado),
    ativo: true,
    created_at: nowIso,
  };

  const novoLote: EstoqueLote = {
    id: `est-${Date.now()}`,
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
