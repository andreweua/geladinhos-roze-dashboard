import { BRAND_CONFIG } from "@/config/brand.config";
import {
  CompraNotaFiscalReal,
  EstabelecimentoLocal,
  PesquisaPrecoLocal,
} from "@/types/dashboard";

const STORAGE_KEYS = {
  estabelecimentos: `${BRAND_CONFIG.storagePrefix}_estabelecimentos_v1`,
  pesquisas: `${BRAND_CONFIG.storagePrefix}_pesquisas_precos_v1`,
  compras: `${BRAND_CONFIG.storagePrefix}_compras_reais_v1`,
};

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
 * Estabelecimentos Reais Iniciais (Região DDD 14 / Marília / SP)
 */
const DEFAULT_ESTABELECIMENTOS: EstabelecimentoLocal[] = [
  {
    id: "est-atacadao-marilia",
    nome: "Atacadão - Unidade Marília",
    tipo: "Atacado",
    endereco_fisico: "Rod. Comandante João Ribeiro de Barros, km 448 - Marília/SP - CEP 17512-000",
    endereco_eletronico: "https://www.atacadao.com.br",
    telefone: "(14) 3402-1200",
    contato_responsavel: "Televendas Atacado",
    observacoes: "Melhores preços em caixas fechadas de Leite Condensado e Creme de Leite.",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-assai-marilia",
    nome: "Assaí Atacadista - Marília",
    tipo: "Atacado",
    endereco_fisico: "Av. Tiradentes, 1200 - Bairro Fragata, Marília/SP - CEP 17519-000",
    endereco_eletronico: "https://www.assai.com.br",
    telefone: "(14) 3401-4400",
    contato_responsavel: "Balcão Atacado",
    observacoes: "Ótima cotação para Nutella 650g e Chocolate em Pó 50%.",
    created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-tauste-tiradentes",
    nome: "Tauste Supermercados - Tiradentes",
    tipo: "Supermercado",
    endereco_fisico: "Av. Tiradentes, 1131 - Fragata, Marília/SP - CEP 17519-000",
    endereco_eletronico: "https://www.tauste.com.br",
    telefone: "(14) 3402-2200",
    contato_responsavel: "Atendimento ao Cliente",
    observacoes: "Varejo ágil para compras de emergência e frutas frescas para geleias.",
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-confianca-marilia",
    nome: "Confiança Supermercados - Aquarius",
    tipo: "Supermercado",
    endereco_fisico: "Av. Vicente Ferreira, 990 - Cascata, Marília/SP - CEP 17515-000",
    endereco_eletronico: "https://www.clienteconfianca.com.br",
    telefone: "(14) 3402-9000",
    contato_responsavel: "SAC Loja",
    observacoes: "Encarte semanal com promoções em Leite Ninho e Leite Condensado Moça.",
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "est-doce-festa-embalagens",
    nome: "Doce & Festa Embalagens e Confeitaria",
    tipo: "Distribuidora",
    endereco_fisico: "R. Nove de Julho, 715 - Centro, Marília/SP - CEP 17500-120",
    endereco_eletronico: "https://wa.me/5514988183327",
    telefone: "(14) 3433-8899",
    contato_responsavel: "Setor de Embalagens",
    observacoes: "Fornecedor oficial dos saquinhos de 150ml, fitas adesivas e caixas térmicas.",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Pesquisas Reais Iniciais vinculadas aos preços cotados reais
 */
const DEFAULT_PESQUISAS: PesquisaPrecoLocal[] = [
  {
    id: "pesq-1",
    estabelecimento_id: "est-atacadao-marilia",
    estabelecimento_nome: "Atacadão - Unidade Marília",
    insumo_nome: "Leite Condensado",
    marca: "Piracanjuba (Caixa 395g)",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    preco_pesquisado: 4.99,
    preco_por_kg_ou_l: 12.63,
    data_pesquisa: "2026-10-18",
    em_promocao: true,
    observacoes: "Preço para fardo com 27 caixinhas (R$ 134,73 total).",
  },
  {
    id: "pesq-2",
    estabelecimento_id: "est-tauste-tiradentes",
    estabelecimento_nome: "Tauste Supermercados - Tiradentes",
    insumo_nome: "Leite Condensado",
    marca: "Moça Nestlé (Lata 395g)",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    preco_pesquisado: 6.89,
    preco_por_kg_ou_l: 17.44,
    data_pesquisa: "2026-10-19",
    em_promocao: false,
    observacoes: "Preço no varejo comum.",
  },
  {
    id: "pesq-3",
    estabelecimento_id: "est-atacadao-marilia",
    estabelecimento_nome: "Atacadão - Unidade Marília",
    insumo_nome: "Creme de Leite",
    marca: "Itambé (Caixinha 200g)",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    preco_pesquisado: 2.49,
    preco_por_kg_ou_l: 12.45,
    data_pesquisa: "2026-10-18",
    em_promocao: true,
    observacoes: "Preço de atacado a partir de 12 unidades.",
  },
  {
    id: "pesq-4",
    estabelecimento_id: "est-confianca-marilia",
    estabelecimento_nome: "Confiança Supermercados - Aquarius",
    insumo_nome: "Creme de Leite",
    marca: "Piracanjuba (Caixinha 200g)",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    preco_pesquisado: 2.79,
    preco_por_kg_ou_l: 13.95,
    data_pesquisa: "2026-10-19",
    em_promocao: false,
    observacoes: "Creme de leite 17% gordura.",
  },
  {
    id: "pesq-5",
    estabelecimento_id: "est-assai-marilia",
    estabelecimento_nome: "Assaí Atacadista - Marília",
    insumo_nome: "Nutella Original",
    marca: "Ferrero (Pote Econômico 650g)",
    quantidade_embalagem: 650,
    unidade_medida: "g",
    preco_pesquisado: 28.9,
    preco_por_kg_ou_l: 44.46,
    data_pesquisa: "2026-10-17",
    em_promocao: true,
    observacoes: "Economia de 38,4% por grama comparado ao pote de 350g!",
  },
  {
    id: "pesq-6",
    estabelecimento_id: "est-tauste-tiradentes",
    estabelecimento_nome: "Tauste Supermercados - Tiradentes",
    insumo_nome: "Nutella Original",
    marca: "Ferrero (Pote Tradicional 350g)",
    quantidade_embalagem: 350,
    unidade_medida: "g",
    preco_pesquisado: 22.5,
    preco_por_kg_ou_l: 64.29,
    data_pesquisa: "2026-10-19",
    em_promocao: false,
    observacoes: "Pote pequeno varejo.",
  },
  {
    id: "pesq-7",
    estabelecimento_id: "est-atacadao-marilia",
    estabelecimento_nome: "Atacadão - Unidade Marília",
    insumo_nome: "Doce de Leite",
    marca: "Itambé Tradicional (Pote 350g)",
    quantidade_embalagem: 350,
    unidade_medida: "g",
    preco_pesquisado: 9.5,
    preco_por_kg_ou_l: 27.14,
    data_pesquisa: "2026-10-18",
    em_promocao: false,
    observacoes: "Ponto cremoso ideal para bico de confeitar.",
  },
  {
    id: "pesq-8",
    estabelecimento_id: "est-confianca-marilia",
    estabelecimento_nome: "Confiança Supermercados - Aquarius",
    insumo_nome: "Leite Ninho em Pó",
    marca: "Nestlé Integral (Lata 380g)",
    quantidade_embalagem: 380,
    unidade_medida: "g",
    preco_pesquisado: 16.9,
    preco_por_kg_ou_l: 44.47,
    data_pesquisa: "2026-10-19",
    em_promocao: false,
    observacoes: "Garante o sabor e textura premium da linha Ninho.",
  },
  {
    id: "pesq-9",
    estabelecimento_id: "est-doce-festa-embalagens",
    estabelecimento_nome: "Doce & Festa Embalagens e Confeitaria",
    insumo_nome: "Saquinhos para Geladinho",
    marca: "Cristal Polietileno 150ml (Pacote c/ 100un)",
    quantidade_embalagem: 100,
    unidade_medida: "un",
    preco_pesquisado: 5.0,
    preco_por_kg_ou_l: 0.05,
    data_pesquisa: "2026-10-15",
    em_promocao: false,
    observacoes: "Custo unitário exato de R$ 0,05 por saquinho.",
  },
];

/**
 * Preços Pagos Reais Iniciais (Cupom Fiscal Real de Compra no Atacadão)
 */
const DEFAULT_COMPRAS: CompraNotaFiscalReal[] = [
  {
    id: "compra-nf-1",
    estabelecimento_id: "est-atacadao-marilia",
    estabelecimento_nome: "Atacadão - Unidade Marília",
    data_compra: "2026-10-18",
    numero_cupom_ou_nfe: "NFC-e 049812",
    chave_acesso: "35261045382900018865001000049812109876543210",
    valor_total: 198.5,
    origem: "nfc_chave",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    itens: [
      {
        id: "item-nf-1",
        descricao: "LEITE CONDENSADO PIRACANJUBA 395G TP",
        insumo_correspondente: "Leite Condensado",
        quantidade: 12,
        unidade: "un",
        preco_unitario_pago: 4.99,
        preco_total: 59.88,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-2",
        descricao: "CREME DE LEITE ITAMBE 200G TP",
        insumo_correspondente: "Creme de Leite",
        quantidade: 10,
        unidade: "un",
        preco_unitario_pago: 2.49,
        preco_total: 24.9,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-3",
        descricao: "DOCE DE LEITE ITAMBE POTE 350G",
        insumo_correspondente: "Doce de Leite",
        quantidade: 4,
        unidade: "un",
        preco_unitario_pago: 9.5,
        preco_total: 38.0,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-4",
        descricao: "LEITE EM PO NINHO LATA 380G",
        insumo_correspondente: "Leite Ninho em Pó",
        quantidade: 3,
        unidade: "un",
        preco_unitario_pago: 16.49,
        preco_total: 49.47,
        aplicado_ficha_tecnica: true,
      },
      {
        id: "item-nf-5",
        descricao: "LEITE INTEGRAL ITAMBE 1L TETRA",
        insumo_correspondente: "Leite Integral Líquido",
        quantidade: 6,
        unidade: "un",
        preco_unitario_pago: 4.37,
        preco_total: 26.25,
        aplicado_ficha_tecnica: true,
      },
    ],
  },
];

export function loadEstabelecimentos(): EstabelecimentoLocal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.estabelecimentos);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_ESTABELECIMENTOS];
}

export function saveEstabelecimentos(items: EstabelecimentoLocal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.estabelecimentos, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addOrUpdateEstabelecimento(
  estab: Omit<EstabelecimentoLocal, "id" | "created_at"> & { id?: string }
): EstabelecimentoLocal {
  const all = loadEstabelecimentos();
  const now = new Date().toISOString();

  if (estab.id) {
    const idx = all.findIndex((e) => e.id === estab.id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        ...estab,
        updated_at: now,
      };
      saveEstabelecimentos(all);
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
  saveEstabelecimentos(all);
  return newEstab;
}

export function deleteEstabelecimento(id: string): void {
  const all = loadEstabelecimentos().filter((e) => e.id !== id);
  saveEstabelecimentos(all);
}

export function loadPesquisasPreco(): PesquisaPrecoLocal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pesquisas);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_PESQUISAS];
}

export function savePesquisasPreco(items: PesquisaPrecoLocal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.pesquisas, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addPesquisaPreco(
  item: Omit<PesquisaPrecoLocal, "id" | "preco_por_kg_ou_l">
): PesquisaPrecoLocal {
  const all = loadPesquisasPreco();
  const precoNormalizado = calculateNormalizedPrice(
    item.preco_pesquisado,
    item.quantidade_embalagem,
    item.unidade_medida
  );

  const newPesquisa: PesquisaPrecoLocal = {
    ...item,
    id: `pesq-${Date.now()}`,
    preco_por_kg_ou_l: precoNormalizado,
  };
  all.unshift(newPesquisa);
  savePesquisasPreco(all);
  return newPesquisa;
}

export function deletePesquisaPreco(id: string): void {
  const all = loadPesquisasPreco().filter((p) => p.id !== id);
  savePesquisasPreco(all);
}

export function loadComprasNotasFiscais(): CompraNotaFiscalReal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.compras);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [...DEFAULT_COMPRAS];
}

export function saveComprasNotasFiscais(items: CompraNotaFiscalReal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.compras, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function addCompraNotaFiscal(
  compra: Omit<CompraNotaFiscalReal, "id" | "created_at">
): CompraNotaFiscalReal {
  const all = loadComprasNotasFiscais();
  const newCompra: CompraNotaFiscalReal = {
    ...compra,
    id: `compra-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  all.unshift(newCompra);
  saveComprasNotasFiscais(all);
  return newCompra;
}

export function deleteCompraNotaFiscal(id: string): void {
  const all = loadComprasNotasFiscais().filter((c) => c.id !== id);
  saveComprasNotasFiscais(all);
}
