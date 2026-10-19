export type PaymentMethod =
  | "Pix"
  | "Dinheiro"
  | "Cartao_Credito"
  | "Cartao_Debito";

export type SaleStatus = "concluida" | "pendente" | "cancelada";

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
  source: "supabase" | "demo_local";
  lastSyncedAt: string;
}
