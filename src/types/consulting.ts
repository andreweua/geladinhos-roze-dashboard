export type TipoConsultoria =
  | "precificacao_lucro"
  | "engenharia_cardapio"
  | "reducao_perdas_estoque"
  | "estrategia_ifood_delivery"
  | "fechamento_caixa_financeiro";

export interface ConsultingRequest {
  id: string;
  empresaId: string;
  empresaNome: string;
  solicitanteNome: string;
  solicitanteTelefone: string;
  tipoConsultoria: TipoConsultoria;
  status: "solicitada" | "em_analise" | "concluida";
  dataSolicitacao: string;
  mensagemCliente?: string;
  parecerConsultor?: string;
}

export interface ConsultingActivityLog {
  id: string;
  empresaId: string;
  consultorNome: string;
  consultorEmail: string;
  acao: string; // Ex: "Visualizou DRE & Demonstrativo de Lucro", "Analisou Ficha Técnica de Pão de Mel"
  categoria: "dre" | "vendas" | "estoque" | "fichas_tecnicas" | "caixa" | "inteligencia_ia";
  dataHora: string;
  detalhes?: string;
}

export interface ConsultingDiagnosticNote {
  id: string;
  empresaId: string;
  consultorNome: string;
  titulo: string;
  parecerTecnico: string;
  planoDeAcao: string[];
  dataEmissao: string;
}

export interface ConsultorAutorizado {
  id: string;
  empresaId: string;
  nome: string;
  email: string;
  telefone?: string;
  especialidade: string;
  tipo: "oficial_pereiralabs" | "externo_cadastrado";
  statusAprovacao: "aprovado" | "pendente_aprovacao" | "rejeitado";
  dataCadastro: string;
  solicitadoPor?: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  observacoes?: string;
}
