/**
 * Tipos e Modelagens para o Módulo de Gestão de Faturamento e Planos
 * PereiraLabs Multi-Tenant SaaS
 */

export interface Plano {
  id: string;
  nome: string;
  valorMensal: number;
  descricao?: string;
  destaque?: boolean;
  limiteUsuarios?: number;
}

export type StatusEmpresaFaturamento = "ativa" | "degustação" | "inativa";

export interface EmpresaFaturamento {
  id: string;
  nome: string;
  planoId: string;
  status: StatusEmpresaFaturamento;
  dataVencimentoMensalidade: string; // Ex: "2026-11-10" ou dia "10"
  diaVencimento?: number; // 1 a 31
  valorCustomizado?: number; // Exceção opcional à regra do plano
  responsavel?: string;
  whatsapp?: string;
  cidade?: string;
  criadoEm?: string;

  // Propriedades de Agendamento e Transição de Plano (Upgrade / Downgrade)
  planoAgendadoId?: string; // ID do plano agendado para o próximo ciclo
  dataTransicaoPlano?: string; // "YYYY-MM-DD" da efetivação
  tipoTransicao?: "upgrade" | "downgrade";
  valorTransicaoProRata?: number; // Valor proporcional apurado se for upgrade
  dataProximoCiclo?: string; // "YYYY-MM-DD" do início do próximo ciclo
}

export type TipoTransicaoPlano = "upgrade" | "downgrade";

export interface TransicaoPlanoRegistro {
  id: string;
  empresaId: string;
  planoOrigemId: string;
  planoDestinoId: string;
  tipoTransicao: TipoTransicaoPlano;
  dataSolicitacao: string;
  dataEfetivacao: string;
  valorProRata?: number;
  statusTransicao: "agendado" | "concluido" | "cancelado";
  observacao?: string;
}

export interface CalculoTransicaoPlanoResultado {
  tipo: TipoTransicaoPlano;
  planoAtual: Plano;
  novoPlano: Plano;
  dataEfetivacao: string;
  dataFormatada: string;
  dataProximoCiclo: string;
  dataProximoCicloFormatada: string;
  isAgendadoParaProximoCiclo: boolean;
  diasRestantesCiclo: number;
  valorProRataAdicional: number;
  diferencaMensal: number;
  mensagemInformativa: string;
}

export type StatusPagamento = "pago" | "pendente";

export interface TransacaoHistorico {
  id: string;
  empresaId: string;
  statusPagamento: StatusPagamento;
  dataCompensacao: string; // "YYYY-MM-DD" ou ISO
  numeroRecibo: string;
  valorPago: number;
  mesReferencia: string; // Ex: "10/2026"
  estornado: boolean;
  valorEstornado: number;
  motivoEstorno?: string;
  dataEstorno?: string;
}

export interface CalculoProRataResultado {
  valorProRata: number;
  diasRestantes: number;
  valorDiario: number;
  dataInicioFormatada: string;
  dataVencimentoFormatada: string;
}

export interface ResumoFaturamentoConsolidado {
  totalEmpresas: number;
  empresasAtivas: number;
  empresasDegustacao: number;
  empresasInativas: number;
  faturamentoMensalConsolidado: number;
  faturamentoProjetadoAnual: number;
  totalRecebidoMes: number;
  totalEstornadoMes: number;
}
