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
  unidade: "g" | "ml" | "un" | "colher";
  custo_receita: number; // R$ total deste insumo na receita/batelada
}

export interface FichaTecnicaProduto {
  produto_id: string;
  rendimento_unidades: number; // Quantos geladinhos rende 1 receita
  volume_unitario_ml: number; // Ex: 130 ml por geladinho
  tempo_preparo_min: number; // Ex: 35 min
  custo_embalagem_un: number; // Saquinho gourmet + adesivo/fita por unidade
  custo_operacional_un: number; // Energia/congelamento estimado por unidade
  modo_preparo: string;
  ingredientes: IngredienteFicha[];
}

export interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  custo_estimado: number;
  ativo: boolean;
  created_at: string;
}

export interface Venda {
  id: string;
  data_venda: string;
  forma_pagamento: PaymentMethod;
  valor_total: number;
  status: SaleStatus;
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
  unidades_vendidas: number;
  // Valores Unitários (por 1 geladinho)
  custo_insumos_un: number;
  custo_embalagem_un: number;
  custo_operacional_un: number;
  custo_total_un: number;
  lucro_bruto_un: number;
  markup_multiplicador: number;
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
