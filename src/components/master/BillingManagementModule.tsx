import React, { useState, useMemo } from "react";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Plus,
  Percent,
  Search,
  Sliders,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  Plano,
  EmpresaFaturamento,
  TransacaoHistorico,
  StatusEmpresaFaturamento,
} from "@/types/billing";
import {
  getPlanos,
  savePlanos,
  atualizarValorPlano,
  getEmpresasFaturamento,
  updateEmpresaFaturamento,
  getTransacoesHistorico,
  registrarEstorno,
  registrarNovoPagamento,
  calcularProRata,
  calcularFaturamentoConsolidado,
  obterValorMensalidadeEfetiva,
  calcularResumoFaturamento,
} from "@/services/billingService";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "@/components/ui/primitives";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

export const BillingManagementModule: React.FC = () => {
  // 1. Estados Principais
  const [planos, setPlanos] = useState<Plano[]>(() => getPlanos());
  const [empresas, setEmpresas] = useState<EmpresaFaturamento[]>(() => getEmpresasFaturamento());
  const [transacoes, setTransacoes] = useState<TransacaoHistorico[]>(() => getTransacoesHistorico());

  // Filtros e Seleção
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(() => empresas[0]?.id || "");

  // Feedback Toast
  const [feedback, setFeedback] = useState<string | null>(null);

  // 2. Modais e Ações
  // Modal de Estorno
  const [isEstornoModalOpen, setIsEstornoModalOpen] = useState(false);
  const [selectedTransacao, setSelectedTransacao] = useState<TransacaoHistorico | null>(null);
  const [valorEstornoInput, setValorEstornoInput] = useState<string>("");
  const [motivoEstornoInput, setMotivoEstornoInput] = useState<string>("");
  const [estornoError, setEstornoError] = useState<string | null>(null);

  // Modal de Edição de Valor Customizado da Empresa
  const [isCustomValorModalOpen, setIsCustomValorModalOpen] = useState(false);
  const [customValorEmpresa, setCustomValorEmpresa] = useState<EmpresaFaturamento | null>(null);
  const [customValorInput, setCustomValorInput] = useState<string>("");

  // Modal de Reajuste Global de Plano
  const [isEditPlanoModalOpen, setIsEditPlanoModalOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [novoValorPlanoInput, setNovoValorPlanoInput] = useState<string>("");

  // Modal de Novo Pagamento
  const [isNovoPagamentoModalOpen, setIsNovoPagamentoModalOpen] = useState(false);
  const [novoPagamentoValor, setNovoPagamentoValor] = useState<string>("");
  const [novoPagamentoMes, setNovoPagamentoMes] = useState<string>(
    `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`
  );

  // 3. Calculadora de Pró-Rata State
  const [proRataInicio, setProRataInicio] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [proRataVencimento, setProRataVencimento] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [proRataValorPlano, setProRataValorPlano] = useState<number>(89.9);

  // 4. Métricas Consolidadas Dinâmicas (Regra de Negócio)
  const resumo = useMemo(() => {
    return calcularResumoFaturamento(empresas, planos, transacoes);
  }, [empresas, planos, transacoes]);

  // Resultado do Cálculo Pró-Rata
  const resultadoProRata = useMemo(() => {
    return calcularProRata(proRataInicio, proRataVencimento, proRataValorPlano);
  }, [proRataInicio, proRataVencimento, proRataValorPlano]);

  // Empresas filtradas para a tabela
  const empresasFiltradas = useMemo(() => {
    return empresas.filter((emp) => {
      const matchSearch =
        emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.responsavel && emp.responsavel.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === "todos" || emp.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [empresas, searchTerm, statusFilter]);

  // Transações da empresa atualmente selecionada (ou todas)
  const transacoesEmpresaSelecionada = useMemo(() => {
    if (!selectedEmpresaId) return transacoes;
    return transacoes.filter((t) => t.empresaId === selectedEmpresaId);
  }, [transacoes, selectedEmpresaId]);

  const empresaSelecionadaObj = useMemo(() => {
    return empresas.find((e) => e.id === selectedEmpresaId) || empresas[0] || null;
  }, [empresas, selectedEmpresaId]);

  // Handlers de Negócio
  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Alterar Plano de uma Empresa diretamente via Select
  const handlePlanoChange = (empresaId: string, novoPlanoId: string) => {
    const updated = updateEmpresaFaturamento(empresaId, { planoId: novoPlanoId });
    setEmpresas(updated);
    const plano = planos.find((p) => p.id === novoPlanoId);
    showFeedback(`✓ Plano da empresa alterado para "${plano?.nome || novoPlanoId}". Faturamento recalculado!`);
  };

  // Alterar Status da Empresa diretamente
  const handleStatusChange = (empresaId: string, novoStatus: StatusEmpresaFaturamento) => {
    const updated = updateEmpresaFaturamento(empresaId, { status: novoStatus });
    setEmpresas(updated);
    showFeedback(`✓ Status alterado para "${novoStatus.toUpperCase()}".`);
  };

  // Abrir Modal de Edição de Valor Customizado
  const handleOpenCustomValor = (empresa: EmpresaFaturamento) => {
    setCustomValorEmpresa(empresa);
    setCustomValorInput(empresa.valorCustomizado ? String(empresa.valorCustomizado) : "");
    setIsCustomValorModalOpen(true);
  };

  // Salvar Valor Customizado
  const handleSaveCustomValor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customValorEmpresa) return;

    const val = parseFloat(customValorInput);
    const updates: Partial<EmpresaFaturamento> = {
      valorCustomizado: isNaN(val) || val <= 0 ? undefined : val,
    };

    const updated = updateEmpresaFaturamento(customValorEmpresa.id, updates);
    setEmpresas(updated);
    setIsCustomValorModalOpen(false);
    showFeedback(
      val > 0
        ? `✓ Valor customizado de R$ ${val.toFixed(2)} definido para "${customValorEmpresa.nome}".`
        : `✓ Valor customizado removido. "${customValorEmpresa.nome}" voltou a seguir a tabela do plano.`
    );
  };

  // Salvar Reajuste Global de Plano
  const handleSaveReajustePlano = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlano) return;

    const novoVal = parseFloat(novoValorPlanoInput);
    if (isNaN(novoVal) || novoVal < 0) {
      alert("Por favor informe um valor válido para a mensalidade.");
      return;
    }

    const updatedPlanos = atualizarValorPlano(editingPlano.id, novoVal);
    setPlanos(updatedPlanos);
    setIsEditPlanoModalOpen(false);
    showFeedback(
      `✓ Reajuste aplicado! "${editingPlano.nome}" agora custa R$ ${novoVal.toFixed(
        2
      )}/mês. Todas as empresas vinculadas foram recalculadas!`
    );
  };

  // Abrir Modal de Estorno
  const handleOpenEstornoModal = (tx: TransacaoHistorico) => {
    setSelectedTransacao(tx);
    const saldo = tx.valorPago - (tx.valorEstornado || 0);
    setValorEstornoInput(saldo.toFixed(2));
    setMotivoEstornoInput("");
    setEstornoError(null);
    setIsEstornoModalOpen(true);
  };

  // Executar Estorno com Validação
  const handleConfirmEstorno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransacao) return;

    const valor = parseFloat(valorEstornoInput.replace(",", "."));
    const saldoDisponivel = Number(
      (selectedTransacao.valorPago - (selectedTransacao.valorEstornado || 0)).toFixed(2)
    );

    if (isNaN(valor) || valor <= 0) {
      setEstornoError("Informe um valor maior que R$ 0,00.");
      return;
    }

    if (valor > saldoDisponivel) {
      setEstornoError(`O valor excede o saldo disponível de R$ ${saldoDisponivel.toFixed(2)}.`);
      return;
    }

    const res = registrarEstorno(selectedTransacao.id, valor, motivoEstornoInput.trim());
    if (res.success) {
      setTransacoes(res.transacoes);
      setIsEstornoModalOpen(false);
      showFeedback(res.message);
    } else {
      setEstornoError(res.message);
    }
  };

  // Registrar Novo Pagamento Manual
  const handleConfirmNovoPagamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresaId) return;

    const valor = parseFloat(novoPagamentoValor.replace(",", "."));
    if (isNaN(valor) || valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    const updated = registrarNovoPagamento(selectedEmpresaId, valor, novoPagamentoMes.trim());
    setTransacoes(updated);
    setIsNovoPagamentoModalOpen(false);
    showFeedback(`✓ Pagamento de R$ ${valor.toFixed(2)} registrado com sucesso!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. CARDS DE MÉTRICAS CONSOLIDADAS (FATURAMENTO DINÂMICO) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Faturamento Mensal Consolidado (SEM HARDCODE) */}
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-card p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              Faturamento Consolidado
            </span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-mono font-bold">
              Dinâmico
            </Badge>
          </div>
          <p className="text-2xl font-black text-foreground font-mono mt-1">
            {formatCurrency(resumo.faturamentoMensalConsolidado)}
            <span className="text-xs font-semibold text-muted-foreground">/mês</span>
          </p>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Projeção Anual: {formatCurrency(resumo.faturamentoProjetadoAnual)}
          </span>
        </div>

        {/* Card 2: Empresas Ativas */}
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              Empresas Ativas
            </span>
            <Badge variant="success" className="text-[10px] font-bold">
              {resumo.totalEmpresas > 0
                ? `${Math.round((resumo.empresasAtivas / resumo.totalEmpresas) * 100)}%`
                : "0%"}
            </Badge>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {resumo.empresasAtivas}
            <span className="text-xs font-normal text-muted-foreground"> / {resumo.totalEmpresas}</span>
          </p>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Gerando mensalidade recorrente
          </span>
        </div>

        {/* Card 3: Degustação / Cortesia */}
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Degustação / Cortesia
            </span>
            <Badge variant="warning" className="text-[10px] font-bold">
              Trial
            </Badge>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {resumo.empresasDegustacao}
          </p>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Potencial de conversão futura
          </span>
        </div>

        {/* Card 4: Recebido no Mês & Estornos */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              Recebido no Mês
            </span>
            {resumo.totalEstornadoMes > 0 && (
              <Badge variant="destructive" className="text-[9px]">
                Estornos R$ {resumo.totalEstornadoMes.toFixed(2)}
              </Badge>
            )}
          </div>
          <p className="text-2xl font-black text-foreground font-mono mt-1">
            {formatCurrency(resumo.totalRecebidoMes)}
          </p>
          <span className="text-[10px] text-muted-foreground block mt-1">
            Compensações liquidadas
          </span>
        </div>
      </div>

      {/* 2. GESTÃO DOS PLANOS E REAJUSTE EM CASCATA */}
      <Card className="rounded-3xl border-border">
        <CardHeader className="p-4 sm:p-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Planos de Assinatura & Reajustes Globais
              </CardTitle>
              <CardDescription className="text-xs">
                Qualquer reajuste no valor mensal do plano atualiza automaticamente o faturamento de todas as empresas vinculadas.
              </CardDescription>
            </div>
            <span className="text-[11px] text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full font-medium">
              3 Planos Comerciais Ativos
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {planos.map((plano) => {
              const empresasNoPlano = empresas.filter((e) => e.planoId === plano.id && e.status === "ativa");
              return (
                <div
                  key={plano.id}
                  className={`rounded-2xl border p-4 transition-all relative flex flex-col justify-between ${
                    plano.destaque
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-extrabold text-sm text-foreground">{plano.nome}</h4>
                      {plano.destaque && (
                        <Badge variant="default" className="text-[10px] font-bold">
                          Mais Vendido
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{plano.descricao}</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-black font-mono text-foreground">
                        {formatCurrency(plano.valorMensal)}
                      </span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                    <span className="text-[11px] text-primary font-bold block mb-3">
                      👥 {empresasNoPlano.length} empresa(s) ativa(s) vinculada(s)
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPlano(plano);
                      setNovoValorPlanoInput(String(plano.valorMensal));
                      setIsEditPlanoModalOpen(true);
                    }}
                    className="w-full text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Sliders className="h-3 w-3" />
                    <span>Reajustar Valor do Plano</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. ÁREA DE GESTÃO POR EMPRESA (TABELA COM SHADCN UI) */}
      <Card className="rounded-3xl border-border">
        <CardHeader className="p-4 sm:p-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Gestão de Faturamento por Empresa
              </CardTitle>
              <CardDescription className="text-xs">
                Tabela interativa com alteração de plano em tempo real, vencimentos e valores personalizados.
              </CardDescription>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar empresa ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 sm:w-60 rounded-xl border border-input bg-background px-3 py-1.5 pl-8 text-xs focus:border-primary focus:outline-none"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativa">Ativas</option>
                <option value="degustação">Degustação</option>
                <option value="inativa">Inativas</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa / Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-52">Plano Atual</TableHead>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-right">Mensalidade</TableHead>
                <TableHead className="text-center w-36">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma empresa encontrada com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                empresasFiltradas.map((emp) => {
                  const efetivo = obterValorMensalidadeEfetiva(emp, planos);
                  const isSelected = selectedEmpresaId === emp.id;

                  return (
                    <TableRow
                      key={emp.id}
                      className={isSelected ? "bg-primary/5 border-l-4 border-l-primary" : ""}
                    >
                      {/* Empresa */}
                      <TableCell>
                        <strong className="block text-foreground font-bold text-xs">{emp.nome}</strong>
                        <span className="text-[11px] text-muted-foreground block">
                          {emp.responsavel || "Responsável não informado"} {emp.cidade ? `• ${emp.cidade}` : ""}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <select
                          value={emp.status}
                          onChange={(e) =>
                            handleStatusChange(emp.id, e.target.value as StatusEmpresaFaturamento)
                          }
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-colors cursor-pointer ${
                            emp.status === "ativa"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : emp.status === "degustação"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          <option value="ativa">Ativa</option>
                          <option value="degustação">Degustação</option>
                          <option value="inativa">Inativa</option>
                        </select>
                      </TableCell>

                      {/* Plano com Select Dinâmico */}
                      <TableCell>
                        <Select
                          value={emp.planoId}
                          onChange={(e) => handlePlanoChange(emp.id, e.target.value)}
                        >
                          {planos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({formatCurrency(p.valorMensal)}/mês)
                            </option>
                          ))}
                        </Select>
                      </TableCell>

                      {/* Vencimento */}
                      <TableCell className="text-center font-mono font-medium">
                        Dia {emp.diaVencimento || 10}
                      </TableCell>

                      {/* Mensalidade */}
                      <TableCell className="text-right">
                        <span className="font-mono font-extrabold text-foreground text-xs block">
                          {formatCurrency(efetivo.valor)}
                        </span>
                        {efetivo.isCustomizado ? (
                          <Badge variant="warning" className="text-[9px] mt-0.5">
                            Exceção / Desconto
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground block">Tabela do Plano</span>
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ver Histórico */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEmpresaId(emp.id)}
                            className={`h-7 px-2 text-[11px] font-bold ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "text-foreground"
                            }`}
                            title="Ver Histórico de Pagamentos"
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            Histórico
                          </Button>

                          {/* Ajustar Preço Customizado */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCustomValor(emp)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Definir Valor Customizado / Desconto Especial"
                          >
                            <Percent className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 4. SEÇÃO DUPLA: HISTÓRICO DE PAGAMENTOS + CALCULADORA PRÓ-RATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histórico de Pagamentos (2 Colunas) */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="rounded-3xl border-border">
            <CardHeader className="p-4 sm:p-5 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    Histórico de Pagamentos & Estornos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {empresaSelecionadaObj
                      ? `Exibindo recibos da empresa "${empresaSelecionadaObj.nome}"`
                      : "Selecione uma empresa na tabela acima"}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEmpresaId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEmpresaId("")}
                      className="text-xs h-8 text-muted-foreground"
                    >
                      Ver de Todas
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const emp = empresaSelecionadaObj || empresas[0];
                      if (emp) {
                        const ef = obterValorMensalidadeEfetiva(emp, planos);
                        setNovoPagamentoValor(String(ef.valor));
                      }
                      setIsNovoPagamentoModalOpen(true);
                    }}
                    className="bg-primary text-primary-foreground font-bold text-xs h-8 gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Pagamento
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recibo / Mês</TableHead>
                    <TableHead>Data Compensação</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Status & Estorno</TableHead>
                    <TableHead className="text-center w-28">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesEmpresaSelecionada.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhum pagamento registrado para esta empresa ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoesEmpresaSelecionada.map((tx) => {
                      const saldoDisponivel = tx.valorPago - (tx.valorEstornado || 0);
                      const isTotalmenteEstornado = saldoDisponivel <= 0;

                      return (
                        <TableRow key={tx.id}>
                          {/* Recibo e Mês */}
                          <TableCell>
                            <span className="font-mono font-bold text-foreground text-xs block">
                              {tx.numeroRecibo}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Ref: {tx.mesReferencia}
                            </span>
                          </TableCell>

                          {/* Data Compensação */}
                          <TableCell className="font-mono text-xs">
                            {new Date(tx.dataCompensacao).toLocaleDateString("pt-BR")}
                          </TableCell>

                          {/* Valor Pago */}
                          <TableCell>
                            <span className="font-mono font-extrabold text-foreground text-xs block">
                              {formatCurrency(tx.valorPago)}
                            </span>
                            {tx.valorEstornado > 0 && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-mono">
                                Estornado: -{formatCurrency(tx.valorEstornado)}
                              </span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <Badge
                                variant={tx.statusPagamento === "pago" ? "success" : "warning"}
                                className="text-[10px] font-bold"
                              >
                                {tx.statusPagamento === "pago" ? "Compensado" : "Pendente"}
                              </Badge>

                              {tx.estornado && (
                                <Badge variant="destructive" className="text-[9px]">
                                  {isTotalmenteEstornado ? "Estornado Total" : "Estorno Parcial"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Botão de Estorno */}
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isTotalmenteEstornado}
                              onClick={() => handleOpenEstornoModal(tx)}
                              className="h-7 px-2 text-[11px] font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-40"
                              title="Solicitar Cancelamento ou Estorno Total/Parcial"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Estornar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* 5. CALCULADORA PRÓ-RATA (1 Coluna) */}
        <div>
          <Card className="rounded-3xl border-border bg-gradient-to-b from-card to-secondary/20">
            <CardHeader className="p-4 sm:p-5 border-b border-border">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                Calculadora de Pró-Rata
              </CardTitle>
              <CardDescription className="text-xs">
                Cálculo automático proporcional de dias restantes até o primeiro vencimento.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  Data de Início / Ativação:
                </label>
                <input
                  type="date"
                  value={proRataInicio}
                  onChange={(e) => setProRataInicio(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  Primeiro Vencimento Escolhido:
                </label>
                <input
                  type="date"
                  value={proRataVencimento}
                  onChange={(e) => setProRataVencimento(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  Valor Cheio do Plano (Mensalidade):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={proRataValorPlano}
                    onChange={(e) => setProRataValorPlano(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                  />
                  <select
                    onChange={(e) => setProRataValorPlano(parseFloat(e.target.value))}
                    className="rounded-xl border border-input bg-background px-2 text-xs font-bold"
                  >
                    <option value="">Atalhos</option>
                    {planos.map((p) => (
                      <option key={p.id} value={p.valorMensal}>
                        {p.nome} ({formatCurrency(p.valorMensal)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resultado do Pró-Rata */}
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Dias Calculados:</span>
                  <Badge variant="outline" className="border-primary/40 text-primary font-mono font-bold">
                    {resultadoProRata.diasRestantes} dias
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Custo Diário Proporcional:</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(resultadoProRata.valorDiario)}/dia
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                  <strong className="text-foreground font-black text-xs">Valor Pró-Rata:</strong>
                  <strong className="text-xl font-black font-mono text-primary">
                    {formatCurrency(resultadoProRata.valorProRata)}
                  </strong>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                * Base padrão comercial de 30 dias. Utilize este valor na primeira fatura do cliente antes de entrar no ciclo regular.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. MODAIS (SHADCN UI DIALOGS) */}

      {/* MODAL 1: ESTORNO TOTAL / PARCIAL */}
      <Dialog open={isEstornoModalOpen} onOpenChange={setIsEstornoModalOpen}>
        <DialogContent onClose={() => setIsEstornoModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <RotateCcw className="h-5 w-5" />
              Solicitar Estorno / Cancelamento
            </DialogTitle>
            <DialogDescription>
              Valide se o estorno é total ou parcial. O sistema bloqueia valores superiores ao saldo pago.
            </DialogDescription>
          </DialogHeader>

          {selectedTransacao && (
            <form onSubmit={handleConfirmEstorno} className="space-y-4 text-xs">
              <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recibo:</span>
                  <strong className="font-mono text-foreground">{selectedTransacao.numeroRecibo}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Original Pago:</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(selectedTransacao.valorPago)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border/80 pt-1.5">
                  <span className="font-bold text-foreground">Saldo Restante Disponível:</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(
                      selectedTransacao.valorPago - (selectedTransacao.valorEstornado || 0)
                    )}
                  </strong>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-foreground">Valor a Estornar (R$) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const saldo =
                        selectedTransacao.valorPago - (selectedTransacao.valorEstornado || 0);
                      setValorEstornoInput(saldo.toFixed(2));
                      setEstornoError(null);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Estorno Total (100%)
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={valorEstornoInput}
                  onChange={(e) => {
                    setValorEstornoInput(e.target.value);
                    setEstornoError(null);
                  }}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm font-bold text-foreground focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  Motivo do Estorno / Observações
                </label>
                <textarea
                  rows={2}
                  value={motivoEstornoInput}
                  onChange={(e) => setMotivoEstornoInput(e.target.value)}
                  placeholder="Ex: Cancelamento em período de teste, reajuste pró-rata..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              {estornoError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{estornoError}</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEstornoModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirmar Estorno
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: VALOR CUSTOMIZADO POR EMPRESA */}
      <Dialog open={isCustomValorModalOpen} onOpenChange={setIsCustomValorModalOpen}>
        <DialogContent onClose={() => setIsCustomValorModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Valor Customizado / Desconto Especial
            </DialogTitle>
            <DialogDescription>
              {customValorEmpresa?.nome} — Defina uma exceção comercial para esta empresa ou deixe em branco para seguir o plano.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomValor} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">
                Valor Especial da Mensalidade (R$):
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 69.90 (deixe em branco para voltar ao plano)"
                value={customValorInput}
                onChange={(e) => setCustomValorInput(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm font-bold text-foreground focus:border-primary focus:outline-none"
              />
              <span className="text-[11px] text-muted-foreground block mt-1">
                Deixar vazio remove a exceção e volta a aplicar a tabela padrão do plano vinculado.
              </span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomValorModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-bold">
                Salvar Valor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: REAJUSTE GLOBAL DO PLANO */}
      <Dialog open={isEditPlanoModalOpen} onOpenChange={setIsEditPlanoModalOpen}>
        <DialogContent onClose={() => setIsEditPlanoModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              Reajustar Valor do {editingPlano?.nome}
            </DialogTitle>
            <DialogDescription>
              Este novo valor se refletirá imediatamente em todas as empresas vinculadas a este plano.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveReajustePlano} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">
                Novo Valor Mensal (R$) *:
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={novoValorPlanoInput}
                onChange={(e) => setNovoValorPlanoInput(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm font-bold text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-700 dark:text-amber-300">
              ⚠️ <strong>Impacto em Cascata:</strong> O faturamento consolidado de todas as empresas com status Ativa neste plano será recalculado em tempo real.
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditPlanoModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-bold">
                Aplicar Reajuste
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: REGISTRAR NOVO PAGAMENTO */}
      <Dialog open={isNovoPagamentoModalOpen} onOpenChange={setIsNovoPagamentoModalOpen}>
        <DialogContent onClose={() => setIsNovoPagamentoModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Registrar Recebimento de Mensalidade
            </DialogTitle>
            <DialogDescription>
              Dê baixa em uma mensalidade recebida via Pix, TED ou cartão.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmNovoPagamento} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">Empresa *:</label>
              <select
                value={selectedEmpresaId}
                onChange={(e) => {
                  setSelectedEmpresaId(e.target.value);
                  const target = empresas.find((x) => x.id === e.target.value);
                  if (target) {
                    const ef = obterValorMensalidadeEfetiva(target, planos);
                    setNovoPagamentoValor(String(ef.valor));
                  }
                }}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none"
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} ({e.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-foreground mb-1">Valor Pago (R$) *:</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={novoPagamentoValor}
                  onChange={(e) => setNovoPagamentoValor(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs font-bold focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">Mês de Referência *:</label>
                <input
                  type="text"
                  required
                  placeholder="10/2026"
                  value={novoPagamentoMes}
                  onChange={(e) => setNovoPagamentoMes(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNovoPagamentoModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-bold">
                Salvar Recibo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
