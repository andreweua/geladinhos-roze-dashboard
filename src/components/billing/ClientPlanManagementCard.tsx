import React, { useState, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  ArrowDownCircle,
  Calendar,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Check,
  Clock,
  Shield,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  Zap,
} from "lucide-react";
import {
  Plano,
  EmpresaFaturamento,
  CalculoTransicaoPlanoResultado,
} from "@/types/billing";
import {
  getPlanos,
  getEmpresasFaturamento,
  calcularTransicaoPlano,
  aplicarTransicaoPlano,
  cancelarTransicaoPlano,
  obterDataProximoCiclo,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ClientPlanManagementCardProps {
  empresaId: string;
  onPlanChanged?: () => void;
  className?: string;
}

export const ClientPlanManagementCard: React.FC<ClientPlanManagementCardProps> = ({
  empresaId,
  onPlanChanged,
  className = "",
}) => {
  const planos = useMemo(() => getPlanos(), []);
  const [empresas, setEmpresas] = useState<EmpresaFaturamento[]>(() => getEmpresasFaturamento());

  const empresa = useMemo(() => {
    return empresas.find((e) => e.id === empresaId) || empresas[0];
  }, [empresas, empresaId]);

  const planoAtual = useMemo(() => {
    return planos.find((p) => p.id === empresa?.planoId) || planos[0];
  }, [planos, empresa?.planoId]);

  const planoAgendado = useMemo(() => {
    if (!empresa?.planoAgendadoId) return null;
    return planos.find((p) => p.id === empresa.planoAgendadoId) || null;
  }, [planos, empresa?.planoAgendadoId]);

  // Modais de Transição
  const [selectedTargetPlano, setSelectedTargetPlano] = useState<Plano | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isDowngradeModalOpen, setIsDowngradeModalOpen] = useState<boolean>(false);

  // Upgrade States
  const [upgradeMode, setUpgradeMode] = useState<"imediato" | "agendado">("imediato");
  const [dataFuturaUpgrade, setDataFuturaUpgrade] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Próximo Ciclo de faturamento
  const proximoCiclo = useMemo(() => {
    return obterDataProximoCiclo(empresa?.diaVencimento || 10);
  }, [empresa?.diaVencimento]);

  // Simulação dinâmica em tempo real para o modal de Upgrade
  const calculoUpgrade = useMemo<CalculoTransicaoPlanoResultado | null>(() => {
    if (!empresa || !selectedTargetPlano) return null;
    const dataEscolhida = upgradeMode === "agendado" ? dataFuturaUpgrade : undefined;
    return calcularTransicaoPlano(empresa, selectedTargetPlano.id, dataEscolhida);
  }, [empresa, selectedTargetPlano, upgradeMode, dataFuturaUpgrade]);

  // Simulação dinâmica para o modal de Downgrade
  const calculoDowngrade = useMemo<CalculoTransicaoPlanoResultado | null>(() => {
    if (!empresa || !selectedTargetPlano) return null;
    return calcularTransicaoPlano(empresa, selectedTargetPlano.id);
  }, [empresa, selectedTargetPlano]);

  const reloadData = () => {
    const fresh = getEmpresasFaturamento();
    setEmpresas(fresh);
    if (onPlanChanged) onPlanChanged();
  };

  // Abrir Modal correto baseado se é Upgrade ou Downgrade
  const handleOpenTransitionModal = (targetPlano: Plano) => {
    if (targetPlano.id === planoAtual.id) return;

    setSelectedTargetPlano(targetPlano);

    if (targetPlano.valorMensal > planoAtual.valorMensal) {
      setUpgradeMode("imediato");
      setIsUpgradeModalOpen(true);
    } else {
      setIsDowngradeModalOpen(true);
    }
  };

  // Confirmar Upgrade
  const handleConfirmUpgrade = () => {
    if (!empresa || !selectedTargetPlano) return;
    const dataEscolhida = upgradeMode === "agendado" ? dataFuturaUpgrade : undefined;

    const res = aplicarTransicaoPlano(empresa.id, selectedTargetPlano.id, dataEscolhida);
    reloadData();
    setIsUpgradeModalOpen(false);
    setFeedbackMsg(res.mensagem);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Confirmar Downgrade
  const handleConfirmDowngrade = () => {
    if (!empresa || !selectedTargetPlano) return;

    const res = aplicarTransicaoPlano(empresa.id, selectedTargetPlano.id);
    reloadData();
    setIsDowngradeModalOpen(false);
    setFeedbackMsg(res.mensagem);
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // Cancelar Transição Agendada
  const handleCancelScheduledTransition = () => {
    if (!empresa) return;
    cancelarTransicaoPlano(empresa.id);
    reloadData();
    setFeedbackMsg("✓ Transição agendada cancelada com sucesso. Seu plano atual foi mantido.");
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* BANNER 1: ALERTA DE DOWNGRADE AGENDADO */}
      {empresa?.tipoTransicao === "downgrade" && planoAgendado && (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-card p-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  Mudança de Plano (Downgrade) Agendada
                </h4>
                <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                  Seu plano atual (<strong>{planoAtual.nome}</strong>) continuará ativo com todos os recursos até{" "}
                  <strong>{empresa.dataTransicaoPlano ? new Date(empresa.dataTransicaoPlano).toLocaleDateString("pt-BR") : proximoCiclo.dataFormatada}</strong>.
                  A partir desta data, sua mensalidade passará para{" "}
                  <strong>{planoAgendado.nome} ({formatCurrency(planoAgendado.valorMensal)}/mês)</strong>.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelScheduledTransition}
              className="text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 self-start sm:self-center"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Manter Plano Atual
            </Button>
          </div>
        </div>
      )}

      {/* BANNER 2: ALERTA DE UPGRADE AGENDADO COM DATA FUTURA */}
      {empresa?.tipoTransicao === "upgrade" && planoAgendado && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/20 p-2 text-primary shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                  Upgrade Futuro Agendado
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Seu upgrade para <strong>{planoAgendado.nome}</strong> entrará em vigor em{" "}
                  <strong>{empresa.dataTransicaoPlano ? new Date(empresa.dataTransicaoPlano).toLocaleDateString("pt-BR") : ""}</strong>.
                  {empresa.valorTransicaoProRata && empresa.valorTransicaoProRata > 0 && (
                    <span> Pró-rata calculado: <strong>{formatCurrency(empresa.valorTransicaoProRata)}</strong>.</span>
                  )}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelScheduledTransition}
              className="text-xs font-bold text-muted-foreground hover:text-foreground shrink-0 self-start sm:self-center"
            >
              Cancelar Agendamento
            </Button>
          </div>
        </div>
      )}

      {/* CARD PRINCIPAL DO PLANO ATUAL */}
      <Card className="rounded-3xl border-border bg-gradient-to-br from-card via-card to-secondary/20 shadow-sm">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Assinatura & Faturamento da Empresa
              </span>
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {planoAtual.nome}
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 font-bold text-xs">
                ● Plano Ativo
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Vencimento: Dia {empresa?.diaVencimento || 10} de cada mês
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/60 p-4">
            <div>
              <span className="text-[11px] text-muted-foreground block">Valor da Mensalidade Atual:</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-2xl font-black font-mono text-foreground">
                  {formatCurrency(planoAtual.valorMensal)}
                </strong>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-muted-foreground">
              <span className="block">Próxima Renovação:</span>
              <strong className="text-foreground font-mono">{proximoCiclo.dataFormatada}</strong>
            </div>
          </div>

          {/* GRID DE PLANOS PARA TROCA (UPGRADE / DOWNGRADE) */}
          <div>
            <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Escolha seu Novo Plano (Autonomia do Cliente):
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {planos.map((p) => {
                const isCurrent = p.id === planoAtual.id;
                const isHigher = p.valorMensal > planoAtual.valorMensal;
                const isLower = p.valorMensal < planoAtual.valorMensal;

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                      isCurrent
                        ? "border-emerald-500/50 bg-emerald-500/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-extrabold text-sm text-foreground">{p.nome}</h5>
                        {isCurrent && (
                          <Badge variant="success" className="text-[10px] font-bold">
                            Atual
                          </Badge>
                        )}
                        {!isCurrent && p.destaque && (
                          <Badge variant="default" className="text-[10px] font-bold">
                            Recomendado
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground mb-3 min-h-[32px]">
                        {p.descricao}
                      </p>

                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-xl font-black font-mono text-foreground">
                          {formatCurrency(p.valorMensal)}
                        </span>
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        className="w-full text-xs font-bold border-emerald-500/40 text-emerald-600 opacity-90"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Plano em Uso
                      </Button>
                    ) : isHigher ? (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenTransitionModal(p)}
                        className="w-full text-xs font-bold bg-primary text-primary-foreground shadow-sm gap-1 hover:bg-primary/90"
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-300" />
                        Fazer Upgrade
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTransitionModal(p)}
                        className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground border-border hover:bg-secondary"
                      >
                        <ArrowDownCircle className="h-3.5 w-3.5 mr-1" />
                        Downgrade (Próx. Ciclo)
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: UPGRADE COM ESCOLHA DE DATA OU IMEDIATO E PRÓ-RATA */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent onClose={() => setIsUpgradeModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
              Fazer Upgrade para {selectedTargetPlano?.nome}
            </DialogTitle>
            <DialogDescription>
              Aumente a capacidade do seu negócio com novos recursos liberados imediatamente ou agendados.
            </DialogDescription>
          </DialogHeader>

          {calculoUpgrade && selectedTargetPlano && (
            <div className="space-y-4 text-xs">
              {/* Comparativo de Planos */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-secondary/30 p-3.5">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Plano Atual:</span>
                  <strong className="text-foreground block">{planoAtual.nome}</strong>
                  <span className="font-mono text-muted-foreground font-bold">
                    {formatCurrency(planoAtual.valorMensal)}/mês
                  </span>
                </div>
                <div className="border-l border-border pl-3">
                  <span className="text-primary font-bold block text-[11px]">Novo Plano:</span>
                  <strong className="text-foreground block">{selectedTargetPlano.nome}</strong>
                  <span className="font-mono text-primary font-extrabold">
                    {formatCurrency(selectedTargetPlano.valorMensal)}/mês
                  </span>
                </div>
              </div>

              {/* REQUISITO 1: Escolha da Data de Mudança */}
              <div>
                <label className="font-bold text-foreground block mb-2">
                  Quando você deseja que o Upgrade entre em vigor?
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {/* Opção 1: Imediato */}
                  <div
                    onClick={() => setUpgradeMode("imediato")}
                    className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                      upgradeMode === "imediato"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs font-bold text-foreground">Imediato (Hoje)</strong>
                      <span className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                        upgradeMode === "imediato" ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {upgradeMode === "imediato" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Libera todos os recursos hoje mesmo calculando o pró-rata restante.
                    </p>
                  </div>

                  {/* Opção 2: Escolher Data Futura */}
                  <div
                    onClick={() => setUpgradeMode("agendado")}
                    className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                      upgradeMode === "agendado"
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs font-bold text-foreground">Data Futura</strong>
                      <span className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                        upgradeMode === "agendado" ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {upgradeMode === "agendado" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Escolha um dia específico para início do novo plano.
                    </p>
                  </div>
                </div>

                {/* Seletor de data futura */}
                {upgradeMode === "agendado" && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[11px] font-bold text-foreground block mb-1">
                      Data de Efetivação do Upgrade:
                    </label>
                    <input
                      type="date"
                      value={dataFuturaUpgrade}
                      min={new Date().toISOString().split("T")[0]}
                      max={calculoUpgrade.dataProximoCiclo}
                      onChange={(e) => setDataFuturaUpgrade(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* CARD DE CÁLCULO PRÓ-RATA */}
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Período Proporcional Apurado:</span>
                  <Badge variant="outline" className="border-primary/40 text-primary font-mono font-bold">
                    {calculoUpgrade.diasRestantesCiclo} dias até o vencimento regular
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Próximo Vencimento Regular:</span>
                  <span className="font-mono font-medium text-foreground">
                    {calculoUpgrade.dataProximoCicloFormatada}
                  </span>
                </div>

                <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                  <div>
                    <strong className="text-foreground font-black text-xs block">
                      Valor Proporcional (Pró-Rata):
                    </strong>
                    <span className="text-[10px] text-muted-foreground">Cobrado na fatura do upgrade</span>
                  </div>
                  <strong className="text-xl font-black font-mono text-primary">
                    {formatCurrency(calculoUpgrade.valorProRataAdicional)}
                  </strong>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUpgradeModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmUpgrade}
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Confirmar Upgrade
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: DOWNGRADE COM AVISO CLARO DO PRÓXIMO CICLO */}
      <Dialog open={isDowngradeModalOpen} onOpenChange={setIsDowngradeModalOpen}>
        <DialogContent onClose={() => setIsDowngradeModalOpen(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ArrowDownCircle className="h-5 w-5" />
              Solicitar Mudança para {selectedTargetPlano?.nome}
            </DialogTitle>
            <DialogDescription>
              Mudanças para planos com valor menor entram em vigor no início do próximo ciclo.
            </DialogDescription>
          </DialogHeader>

          {calculoDowngrade && selectedTargetPlano && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Regra de Vigência no Próximo Ciclo:</span>
                </div>

                <p className="text-foreground leading-relaxed text-[11px]">
                  Como você já efetuou o pagamento do seu ciclo mensal atual, seu plano{" "}
                  <strong>{planoAtual.nome}</strong> continuará ativo com <strong>100% dos recursos</strong> até o encerramento do ciclo em:
                </p>

                <div className="rounded-xl border border-amber-500/30 bg-background/80 p-2.5 text-center">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                    Data de Início do Novo Ciclo
                  </span>
                  <strong className="text-base font-extrabold text-foreground font-mono">
                    {calculoDowngrade.dataProximoCicloFormatada}
                  </strong>
                </div>

                <p className="text-muted-foreground text-[11px]">
                  A partir desta data, sua mensalidade passará automaticamente para{" "}
                  <strong className="text-foreground">
                    {formatCurrency(selectedTargetPlano.valorMensal)}/mês
                  </strong>
                  . Nenhuma cobrança adicional será realizada agora.
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDowngradeModalOpen(false)}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmDowngrade}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Confirmar Agendamento de Downgrade
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
