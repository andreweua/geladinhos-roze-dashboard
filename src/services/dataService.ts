import { BRAND_CONFIG } from "@/config/brand.config";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  DashboardDataSnapshot,
  EstoqueLote,
  ItemVenda,
  PaymentMethod,
  Produto,
  Venda,
} from "@/types/dashboard";

const STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_dashboard_data_v1`;

// Seeded pseudo-random generator so demo data is realistic and consistent
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateInitialDemoData(): DashboardDataSnapshot {
  const now = new Date();
  const rand = seededRandom(20261019);

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

  // Stock batches with deliberate low-stock items (< 10) to showcase the alert KPI and table
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

  // Weights for popularity (Ninho com Nutella, Morango, Pistache, Maracuja lead)
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

  // Generate 90 days of sales including Today (daysAgo = 0) and Yesterday (daysAgo = 1)
  let saleCounter = 1;
  let itemCounter = 1;

  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const dayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysAgo
    );
    const dayOfWeek = dayDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;

    // Ensure Today and Yesterday always have several orders
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

      // Avoid future timestamps on "Today"
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

        const qtd = Math.floor(rand() * 4) + 1; // 1 to 4 units per flavor
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
    source: "demo_local",
    lastSyncedAt: new Date().toISOString(),
  };
}

function getLocalSnapshot(): DashboardDataSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardDataSnapshot;
      // Check if today has any sales; if the stored snapshot is from an older day, refresh demo or keep
      if (
        parsed &&
        Array.isArray(parsed.produtos) &&
        Array.isArray(parsed.vendas)
      ) {
        return {
          ...parsed,
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
        return {
          produtos: (produtosRes.data || []).map((p) => ({
            ...p,
            preco_venda: Number(p.preco_venda),
            custo_estimado: Number(p.custo_estimado),
          })),
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
          source: "supabase",
          lastSyncedAt: new Date().toISOString(),
        };
      } else {
        console.warn(
          "Aviso ao consultar tabelas no Supabase, usando fallback local:",
          produtosRes.error ||
            vendasRes.error ||
            itensRes.error ||
            estoqueRes.error
        );
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

      // Update inventory batches in Supabase
      for (const item of preparedItems) {
        const lote = current.estoqueLotes.find(
          (e) => e.produto_id === item.produto_id
        );
        if (lote) {
          const novaQtd = Math.max(0, lote.quantidade_disponivel - item.quantidade);
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

  // Local mode update
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

  const updatedSnapshot: DashboardDataSnapshot = {
    ...current,
    produtos: [...current.produtos, novoProduto],
    estoqueLotes: [...current.estoqueLotes, novoLote],
    lastSyncedAt: nowIso,
  };

  saveLocalSnapshot(updatedSnapshot);
  return updatedSnapshot;
}
