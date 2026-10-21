export type PaymentMethod =
  | "Pix"
  | "Dinheiro"
  | "Cartao_Credito"
  | "Cartao_Debito";

export type SaleStatus = "concluida" | "pendente" | "cancelada";

export interface IngredienteFicha {
  id: string;
  nome: string;
  quantidade_receita: number;
  unidade: "g" | "ml" | "un" | "caixa" | "medida";
  custo_receita: number; // R$ efetivo consumido na receita
  observacao?: string;
}

export interface FichaTecnicaProduto {
  produto_id: string;
  subtitulo_receita: string;
  rendimento_unidades: number; // Ex: 8, 9, 10, 12, 14 saquinhos de 150ml
  volume_unitario_ml: number; // 150 ml
  tempo_preparo_min: number;
  custo_embalagem_un: number; // R$ 0,05 por saquinho de 150ml
  custo_operacional_un: number; // Proporcional de Gás/Energia/Água (15%)
  preco_ifood_sugerido: number; // Preço sugerido no iFood (com taxa de 26,2%)
  lucro_ifood_estimado: number; // Lucro líquido no iFood
  modo_preparo: string;
  ingredientes: IngredienteFicha[];
}

export interface CotacaoInsumo {
  id: string;
  categoria: "Laticínios" | "Chocolates & Recheios" | "Frutas & Mercearia";
  produto: string;
  preco_varejo: string;
  preco_atacado: string;
  preco_por_grama: string;
}

export interface SobraEstoqueInsumo {
  insumo: string;
  embalagem_padrao: string;
  consumo_por_receita: string;
  sobra_estoque: string;
}

export interface Insumo {
  id: string;
  nome: string;
  tipo: "ingrediente" | "embalagem" | "outro";
  unidade_medida: string;
  custo_unitario: number;
  created_at?: string;
}

export interface FichaTecnicaRelational {
  id: string;
  produto_id: string;
  insumo_id: string;
  quantidade: number;
  created_at?: string;
}

export interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  preco_ifood?: number;
  custo_estimado: number;
  rendimento_receita?: number;
  ativo: boolean;
  created_at: string;
}

export interface Venda {
  id: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  data_venda: string;
  forma_pagamento: PaymentMethod;
  valor_total: number;
  status: SaleStatus;
  pix_txid?: string;
  pix_qrcode?: string;
  pix_copia_cola?: string;
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

export interface EstoqueLote {
  id: string;
  produto_id: string;
  quantidade_disponivel: number;
  updated_at: string;
}

export interface VendaDetalhada extends Venda {
  itens: Array<{
    id: string;
    produto_id: string;
    produto_nome: string;
    quantidade: number;
    preco_unitario: number;
    custo_unitario: number;
  }>;
}

export interface EstoquePorProduto {
  produto_id: string;
  nome: string;
  preco_venda: number;
  custo_estimado: number;
  ativo: boolean;
  quantidade_disponivel: number;
  updated_at: string;
  abaixo_do_minimo: boolean;
}

export interface DreProdutoItem {
  produto_id: string;
  nome: string;
  preco_venda: number;
  preco_ifood: number;
  lucro_liquido_ifood: number;
  rendimento_lote: number;
  unidades_vendidas: number;
  // Valores Unitários (por 1 geladinho de 150ml)
  custo_insumos_un: number;
  custo_embalagem_un: number;
  custo_operacional_un: number;
  custo_total_un: number;
  lucro_bruto_un: number;
  markup_multiplicador: number;
  margem_sobre_custo_pct: number;
  // DRE do Período Selecionado (R$)
  receita_bruta: number;
  taxas_pagamento: number;
  receita_liquida: number;
  cmv_insumos: number;
  custo_embalagens_total: number;
  custo_operacional_total: number;
  cpv_total: number;
  lucro_liquido: number;
  margem_contribuicao_pct: number;
}

export type DatePreset =
  | "hoje"
  | "ontem"
  | "7dias"
  | "este_mes"
  | "mes_passado"
  | "3meses"
  | "personalizado";

export interface DateFilterRange {
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
}

export interface DailySalesPoint {
  dateKey: string;
  label: string;
  faturamento: number;
  custoEstimado: number;
  lucroBruto: number;
  unidades: number;
}

export interface TopFlavorPoint {
  produto_id: string;
  nome: string;
  quantidade: number;
  faturamento: number;
}

export interface PaymentMethodPoint {
  metodo: PaymentMethod;
  label: string;
  valor: number;
  quantidadeVendas: number;
  percentual: number;
  fill: string;
}

export interface DashboardDataSnapshot {
  produtos: Produto[];
  vendas: Venda[];
  itensVenda: ItemVenda[];
  estoqueLotes: EstoqueLote[];
  fichasTecnicas: FichaTecnicaProduto[];
  source: "supabase" | "demo_local";
  lastSyncedAt: string;
}

/**
 * Cadastro de Estabelecimentos Comerciais Locais (Mercados, Atacados, Distribuidoras)
 */
export interface EstabelecimentoLocal {
  id: string;
  nome: string;
  tipo: "Atacado" | "Atacado e Varejo" | "Supermercado" | "Distribuidora" | "Empório" | "Internet" | "Outro";
  cidade?: string; // ex: "Jaú - SP" | "Três Pontas - MG"
  endereco_fisico: string; // Rua, número, bairro, cidade, CEP
  endereco_eletronico: string; // Site, e-commerce, Google Maps, WhatsApp ou Instagram
  telefone?: string;
  contato_responsavel?: string;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Pesquisa de Preço em Mercados Locais (Cotações de Insumos)
 */
export interface PesquisaPrecoLocal {
  id: string;
  estabelecimento_id: string;
  estabelecimento_nome: string;
  cidade?: string; // ex: "Jaú - SP" | "Três Pontas - MG"
  insumo_nome: string; // ex: Leite Condensado, Creme de Leite, Nutella, etc.
  marca: string; // ex: Moça, Italac, Piracanjuba, Ferrero
  quantidade_embalagem: number; // ex: 395, 1000, 200, 650
  unidade_medida: "g" | "kg" | "ml" | "l" | "un";
  preco_pesquisado: number; // R$
  preco_por_kg_ou_l: number; // Preço normalizado em R$/kg ou R$/L para comparação
  data_pesquisa: string; // YYYY-MM-DD (data da consulta)
  data_validade?: string; // YYYY-MM-DD (data de expiração da oferta/cotação)
  em_promocao: boolean;
  observacoes?: string;
}

/**
 * Preços Efetivamente Pagos (Histórico de Compras Reais via Cupom ou Nota Fiscal)
 */
export interface CompraItemReal {
  id: string;
  descricao: string;
  insumo_correspondente?: string;
  quantidade: number;
  unidade: string;
  preco_unitario_pago: number;
  preco_total: number;
  aplicado_ficha_tecnica?: boolean;
}

export interface CompraNotaFiscalReal {
  id: string;
  estabelecimento_id?: string;
  estabelecimento_nome: string;
  data_compra: string;
  numero_cupom_ou_nfe: string;
  chave_acesso?: string;
  valor_total: number;
  itens: CompraItemReal[];
  origem: "nfc_chave" | "xml" | "cupom_foto" | "manual";
  created_at: string;
}
