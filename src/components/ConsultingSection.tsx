import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  Eye,
  Send,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import {
  ConsultingActivityLog,
  ConsultingDiagnosticNote,
  ConsultingRequest,
  TipoConsultoria,
} from "@/types/consulting";
import {
  getConsultingDiagnostics,
  getConsultingLogs,
  getConsultingRequests,
  submitConsultingRequest,
  addConsultingDiagnostic,
} from "@/services/consultingService";
import { UserProfile } from "@/types/auth";
import { formatDateTime } from "@/lib/utils";

interface ConsultingSectionProps {
  empresaId: string;
  empresaNome: string;
  currentUser: UserProfile | null;
}

export const ConsultingSection: React.FC<ConsultingSectionProps> = ({
  empresaId,
  empresaNome,
  currentUser,
}) => {
  const [logs, setLogs] = useState<ConsultingActivityLog[]>(() =>
    getConsultingLogs(empresaId)
  );
  const [requests, setRequests] = useState<ConsultingRequest[]>(() =>
    getConsultingRequests(empresaId)
  );
  const [diagnostics, setDiagnostics] = useState<ConsultingDiagnosticNote[]>(() =>
    getConsultingDiagnostics(empresaId)
  );

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isNewDiagModalOpen, setIsNewDiagModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form de solicitação de consultoria
  const [tipoConsultoria, setTipoConsultoria] = useState<TipoConsultoria>(
    "precificacao_lucro"
  );
  const [nomeSolicitante, setNomeSolicitante] = useState(
    currentUser?.name || "Proprietário"
  );
  const [telefoneSolicitante, setTelefoneSolicitante] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Form de novo diagnóstico (para o consultor emitir)
  const [diagTitulo, setDiagTitulo] = useState("");
  const [diagParecer, setDiagParecer] = useState("");
  const [diagAcoes, setDiagAcoes] = useState("");

  const isConsultant = currentUser?.role === "consultoria";
  const isAdmin = currentUser?.role === "admin";

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTel = telefoneSolicitante.replace(/\D/g, "");

    const newReq = submitConsultingRequest({
      empresaId,
      empresaNome,
      solicitanteNome: nomeSolicitante,
      solicitanteTelefone: cleanTel,
      tipoConsultoria,
      mensagemCliente: mensagem,
    });

    setRequests(getConsultingRequests(empresaId));
    setIsRequestModalOpen(false);
    setFeedback("✓ Solicitação enviada com sucesso para a equipe PereiraLabs!");
    setTimeout(() => setFeedback(null), 4000);

    // Envia no WhatsApp da PereiraLabs
    const tiposLabels: Record<TipoConsultoria, string> = {
      precificacao_lucro: "Precificação Inteligente & Lucro Líquido",
      engenharia_cardapio: "Engenharia de Cardápio & Custos de Receita",
      reducao_perdas_estoque: "Redução de Desperdício & Auditoria de Estoque",
      estrategia_ifood_delivery: "Estratégia de Margem no iFood & Delivery",
      fechamento_caixa_financeiro: "Balanço & Fechamento de Caixa Cego",
    };

    const zapText = `👔 *Solicitação de Consultoria PereiraLabs*\n\n🏪 *Empresa:* ${empresaNome}\n👤 *Solicitante:* ${nomeSolicitante}\n📱 *WhatsApp:* ${cleanTel || "Não informado"}\n🎯 *Área Desejada:* ${tiposLabels[tipoConsultoria]}\n\n💬 *Mensagem/Dúvida:* ${mensagem || "Gostaria de uma análise estratégica dos números da minha loja."}`;
    const zapUrl = `https://wa.me/5514988183327?text=${encodeURIComponent(zapText)}`;
    window.open(zapUrl, "_blank");
  };

  const handleAddDiagnosticSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagTitulo.trim() || !diagParecer.trim()) return;

    const acoesList = diagAcoes
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    addConsultingDiagnostic({
      empresaId,
      consultorNome: currentUser?.name || "Consultor PereiraLabs",
      titulo: diagTitulo.trim(),
      parecerTecnico: diagParecer.trim(),
      planoDeAcao: acoesList.length > 0 ? acoesList : ["Acompanhar DRE nas próximas duas semanas."],
    });

    setDiagnostics(getConsultingDiagnostics(empresaId));
    setIsNewDiagModalOpen(false);
    setDiagTitulo("");
    setDiagParecer("");
    setDiagAcoes("");
    setFeedback("✓ Novo parecer técnico emitido com sucesso para o cliente!");
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Banner Principal de Consultoria */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-card via-primary/5 to-secondary/30 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                PereiraLabs Consultoria Estratégica & IA
              </Badge>
              <span className="text-xs text-muted-foreground">• Louzada & Pereira</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Aceleração de Lucro, Custos & Gestão Comercial
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              O sistema conecta o seu estabelecimento à equipe de inteligência da <strong>PereiraLabs</strong>. Nós analisamos as fichas técnicas, o fluxo de caixa, as perdas no freezer e as taxas do iFood para blindar a sua margem de lucro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsRequestModalOpen(true)}
              className="bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 text-xs py-3 px-5 rounded-2xl gap-2"
            >
              <Send className="h-4 w-4" />
              <span>Solicitar Consultoria PereiraLabs</span>
            </Button>

            {(isConsultant || isAdmin) && (
              <Button
                variant="outline"
                onClick={() => setIsNewDiagModalOpen(true)}
                className="text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1.5 rounded-2xl py-3"
              >
                <Plus className="h-4 w-4" />
                <span>Emitir Parecer Técnico</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl px-5 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in slide-in-from-top-1">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid com 2 Colunas: Diagnósticos Emitidos + Log Transparente de Acesso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Pareceres & Diagnósticos Técnicos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">
                Pareceres Técnicos & Planos de Ação ({diagnostics.length})
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Diretrizes estratégicas para a sua loja
            </span>
          </div>

          <div className="space-y-3.5">
            {diagnostics.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
                Nenhum parecer técnico emitido ainda. Solicite uma consultoria acima para receber a primeira análise.
              </div>
            ) : (
              diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {diag.titulo}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Emitido por <strong>{diag.consultorNome}</strong> • {formatDateTime(diag.dataEmissao)}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
                      Recomendação Oficial
                    </Badge>
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed bg-secondary/30 p-3.5 rounded-xl border border-border/60">
                    {diag.parecerTecnico}
                  </p>

                  {diag.planoDeAcao && diag.planoDeAcao.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Plano de Ação Recomendado:
                      </span>
                      <ul className="space-y-1">
                        {diag.planoDeAcao.map((acao, i) => (
                          <li
                            key={i}
                            className="text-xs text-foreground flex items-start gap-2"
                          >
                            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{acao}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna 2: Log de Auditoria & Visualizações do Consultor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Auditoria de Acesso do Consultor ({logs.length})
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Transparência total do que foi consultado
            </span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para a sua segurança, o perfil de <strong>Consultoria PereiraLabs</strong> possui acesso estritamente de <strong>visualização (somente leitura)</strong>. Toda vez que um relatório ou tela for inspecionado pelo consultor, o registro fica gravado abaixo:
            </p>

            <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum registro de visualização recente do consultor.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{log.acao}</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                          {log.categoria}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Por: <strong>{log.consultorNome}</strong> ({log.consultorEmail})
                      </p>
                      {log.detalhes && (
                        <p className="text-[11px] text-foreground/80 italic">
                          "{log.detalhes}"
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatDateTime(log.dataHora)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Solicitar Consultoria PereiraLabs */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Solicitar Consultoria PereiraLabs
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Atendimento estratégico direto com especialistas em gastronomia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Qual área você gostaria de apoio? *
                </label>
                <select
                  value={tipoConsultoria}
                  onChange={(e) => setTipoConsultoria(e.target.value as TipoConsultoria)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="precificacao_lucro">
                    📈 Precificação Inteligente & Margem Real de Lucro
                  </option>
                  <option value="engenharia_cardapio">
                    🍰 Engenharia de Cardápio & Custos de Ingredientes
                  </option>
                  <option value="estrategia_ifood_delivery">
                    🛵 Estratégia de Repasse no iFood & Delivery
                  </option>
                  <option value="reducao_perdas_estoque">
                    🛡️ Redução de Perdas & Auditoria no Estoque/Freezer
                  </option>
                  <option value="fechamento_caixa_financeiro">
                    💰 Fechamento de Caixa Cego & Balanço Financeiro
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Seu Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeSolicitante}
                    onChange={(e) => setNomeSolicitante(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    WhatsApp para Retorno *
                  </label>
                  <input
                    type="text"
                    required
                    value={telefoneSolicitante}
                    onChange={(e) => setTelefoneSolicitante(e.target.value)}
                    placeholder="Ex: (14) 99888-7766"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Descreva sua principal dúvida ou desafio atual:
                </label>
                <textarea
                  rows={3}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Ex: Sinto que vendo bastante pão de mel pelo iFood mas não sei quanto sobra limpo após a comissão e embalagem..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground font-bold text-xs gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Enviar Solicitação no WhatsApp</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Emitir Novo Parecer Técnico (Para o Consultor PereiraLabs) */}
      {isNewDiagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">
                  Emitir Parecer Técnico Oficial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDiagModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDiagnosticSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Título do Parecer *
                </label>
                <input
                  type="text"
                  required
                  value={diagTitulo}
                  onChange={(e) => setDiagTitulo(e.target.value)}
                  placeholder="Ex: Análise de Custos de Chocolate & Embalagem"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Parecer Técnico / Análise do Consultor *
                </label>
                <textarea
                  rows={4}
                  required
                  value={diagParecer}
                  onChange={(e) => setDiagParecer(e.target.value)}
                  placeholder="Descreva a avaliação detalhada dos números da empresa..."
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Plano de Ação Recomendado (1 ação por linha):
                </label>
                <textarea
                  rows={3}
                  value={diagAcoes}
                  onChange={(e) => setDiagAcoes(e.target.value)}
                  placeholder={`Ex:\nReajustar preço do Pão de Mel Brigadeiro para R$ 9,00 no iFood\nComprar fardo fechado de leite condensado no Tenda Atacado`}
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewDiagModalOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground font-bold text-xs"
                >
                  Publicar Parecer no App do Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
