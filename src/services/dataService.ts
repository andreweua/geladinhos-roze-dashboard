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

// Updated storage key to v3_clean_real to eliminate all fictitious/generated sales
// Retaining strictly the real products, real recipes/technical sheets and user quotations.
const STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_dashboard_data_v3_clean_real`;

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
      nome: "Doce de Leite (Itambé)",
      preco_venda: 6.5,
      preco_ifood: 8.9,
      custo_estimado: 3.1,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-ninho-nutella",
      nome: "Ninho com Nutella",
      preco_venda: 7.0,
      preco_ifood: 9.5,
      custo_estimado: 3.15,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-ninho-brigadeiro",
      nome: "Ninho com Brigadeiro 50%",
      preco_venda: 7.9,
      preco_ifood: 9.9,
      custo_estimado: 2.15,
      ativo: true,
      created_at: new Date(now.getTime() - 95 * 86400000).toISOString(),
    },
    {
      id: "prod-mousse-maracuja",
      nome: "Mousse de Maracujá c/ Geleia",
      preco_venda: 7.5,
      preco_ifood: 9.9,
      custo_estimado: 3.6,
      ativo: true,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: "prod-delicia-ovomaltine",
      nome: "Delícia de Ovomaltine",
      preco_venda: 6.0,
      preco_ifood: 8.5,
      custo_estimado: 2.6,
      ativo: true,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: "prod-romeu-julieta",
      nome: "Romeu e Julieta",
      preco_venda: 7.9,
      preco_ifood: 9.9,
      custo_estimado: 2.67,
      ativo: true,
      created_at: new Date(now.getTime() - 85 * 86400000).toISOString(),
    },
    {
      id: "prod-cheesecake-frutas-vermelhas",
      nome: "Cheesecake Frutas Vermelhas",
      preco_venda: 9.9,
      preco_ifood: 11.9,
      custo_estimado: 3.77,
      ativo: true,
      created_at: new Date(now.getTime() - 80 * 86400000).toISOString(),
    },
    {
      id: "prod-ninho-morango",
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

  for (const prod of produtos) {
    if (!map.has(prod.id)) {
      const custoInsumo = Math.max(0.5, prod.custo_estimado - 0.35);
      const precoIfood = prod.preco_ifood || Number((prod.preco_venda * 1.35).toFixed(2));
      map.set(prod.id, {
        produto_id: prod.id,
        subtitulo_receita: "Receita Artesanal no Saquinho de 150ml",
        rendimento_unidades: 10,
        volume_unitario_ml: 150,
        tempo_preparo_min: 30,
        custo_embalagem_un: 0.05,
        custo_operacional_un: 0.3,
        preco_ifood_sugerido: precoIfood,
        lucro_ifood_estimado: Number(
          (precoIfood * (1 - 0.262) - prod.custo_estimado).toFixed(2)
        ),
        modo_preparo:
          "Bater a base láctea no liquidificador, aplicar calda/recheio no saquinho de 150ml com saco de confeitar, dosar 150ml e congelar deitado.",
        ingredientes: [
          {
            id: `ing-${prod.id}-1`,
            nome: "Base Láctea (Leite Condensado + Creme de Leite + Leite)",
            quantidade_receita: 1000,
            unidade: "ml",
            custo_receita: Number((custoInsumo * 10 * 0.65).toFixed(2)),
          },
          {
            id: `ing-${prod.id}-2`,
            nome: `Saborizante / Recheio (${prod.nome})`,
            quantidade_receita: 200,
            unidade: "g",
            custo_receita: Number((custoInsumo * 10 * 0.35).toFixed(2)),
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

  const saleStatus = payload.status || "concluida";

  if (current.source === "supabase" && supabase) {
    const saleInsertData: Record<string, unknown> = {
      forma_pagamento: payload.forma_pagamento,
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

    const { data: vendaInserida, error: vendaErr } = await supabase
      .from("vendas")
      .insert(saleInsertData)
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

      // Apenas baixa estoque se a venda estiver concluída imediatamente
      if (saleStatus === "concluida") {
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
      }

      return fetchDashboardData();
    }
  }

  const newVendaId = payload.venda_id || `venda-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const novaVenda: Venda = {
    id: newVendaId,
    cliente_nome: payload.cliente_nome?.trim() || undefined,
    cliente_telefone: payload.cliente_telefone?.trim() || undefined,
    data_venda: nowIso,
    forma_pagamento: payload.forma_pagamento,
    valor_total: valorTotal,
    status: saleStatus,
    pix_txid: payload.pix_txid,
    pix_qrcode: payload.pix_qrcode,
    pix_copia_cola: payload.pix_copia_cola,
  };

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
          return {
            ...lote,
            quantidade_disponivel: Math.max(
              0,
              lote.quantidade_disponivel - soldItem.quantidade
            ),
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

  saveLocalSnapshot(updatedSnapshot);
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
    preco_ifood: Number((payload.preco_venda * 1.35).toFixed(2)),
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
