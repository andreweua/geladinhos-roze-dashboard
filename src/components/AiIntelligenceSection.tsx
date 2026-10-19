import React, { useMemo, useState } from "react";
import {
  Sparkles,
  ChefHat,
  ShoppingCart,
  TrendingDown,
  Target,
  MessageSquare,
  Send,
  Copy,
  Check,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Flame,
  PackagePlus,
  Award,
  Layers,
  Bot,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import {
  askPereiraLabsAI,
  computeAiIntelligenceReport,
  ProductionRecommendationItem,
} from "@/lib/aiEngine";
import { ComputedDashboardAnalytics } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import { DashboardDataSnapshot } from "@/types/dashboard";

interface AiIntelligenceSectionProps {
  snapshot: DashboardDataSnapshot;
  analytics: ComputedDashboardAnalytics;
  ifoodFeePct: number;
  onUpdateStock: (produtoId: string, newQty: number) => Promise<void>;
}

const GEMINI_KEY_STORAGE = `${BRAND_CONFIG.storagePrefix}_gemini_api_key`;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "gemini_cloud" | "pereiralabs_local";
  timestamp: string;
}

const QUICK_PROMPTS = [
  "O que devo produzir hoje para não faltar estoque?",
  "Qual sabor me dá mais lucro líquido por unidade?",
  "Como ficam meus preços no iFood com a taxa atual?",
  "Como economizar na compra de insumos no atacado?",
  "Como bater minha meta de lucro líquido no mês?",
  "Crie um combo promocional com texto para WhatsApp",
];

export const AiIntelligenceSection: React.FC<AiIntelligenceSectionProps> = ({
  snapshot,
  analytics,
  ifoodFeePct,
  onUpdateStock,
}) => {
  // Interactive Profit Target Simulator State
  const [metaLucroMensal, setMetaLucroMensal] = useState<number>(3500);
  const [diasTrabalhadosMes, setDiasTrabalhadosMes] = useState<number>(26);

  // Active sub-tab inside AI Hub
  const [activeAiTab, setActiveAiTab] = useState<
    "todos" | "producao_compras" | "cardapio_insumos" | "metas_combos" | "chat"
  >("todos");

  // Copied state for WhatsApp combo messages
  const [copiedComboId, setCopiedComboId] = useState<string | null>(null);

  // Batch production execution feedback
  const [producedIds, setProducedIds] = useState<Record<string, boolean>>({});

  // Optional Gemini API Key state
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE) || "";
    } catch {
      return "";
    }
  });
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>(geminiApiKey);

  // Compute full AI Intelligence Report
  const report = useMemo(
    () =>
      computeAiIntelligenceReport(
        snapshot,
        analytics,
        ifoodFeePct,
        metaLucroMensal,
        diasTrabalhadosMes
      ),
    [snapshot, analytics, ifoodFeePct, metaLucroMensal, diasTrabalhadosMes]
  );

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-msg",
      role: "assistant",
      mode: "pereiralabs_local",
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      content: `Olá! Sou o **Consultor PereiraLabs IA** da **${BRAND_CONFIG.companyName}**.\n\nJá analisei suas **8 Fichas Técnicas de 150ml**, as **54 cotações de insumos**, seu estoque atual e a taxa iFood de **${ifoodFeePct.toFixed(1)}%**.\n\n👉 **Resumo Rápido de Hoje:** Recomendamos produzir **${report.productionPlan.totalLotesHoje} lote(s)** (**${report.productionPlan.totalUnidadesProduzir} unidades**) para garantir **${formatCurrency(report.productionPlan.lucroLiquidoEsperadoHoje)}** de lucro líquido, economizando **${formatCurrency(report.shoppingList.economiaComSobras)}** com as sobras já disponíveis na sua despensa!\n\nEscolha uma pergunta rápida abaixo ou digite sua dúvida:`,
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isAsking, setIsAsking] = useState<boolean>(false);

  const handleSendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isAsking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAsking(true);

    try {
      const response = await askPereiraLabsAI(
        trimmed,
        report,
        analytics,
        ifoodFeePct,
        geminiApiKey
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        mode: response.mode,
        timestamp: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopyWhatsApp = async (comboId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedComboId(comboId);
      setTimeout(() => setCopiedComboId(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleRegisterBatchProduction = async (
    item: ProductionRecommendationItem
  ) => {
    const newStock = item.estoque_atual + item.unidades_produzir;
    await onUpdateStock(item.produto_id, newStock);
    setProducedIds((prev) => ({ ...prev, [item.produto_id]: true }));
    setTimeout(() => {
      setProducedIds((prev) => ({ ...prev, [item.produto_id]: false }));
    }, 3000);
  };

  const handleSaveApiKey = () => {
    const cleaned = tempKeyInput.trim();
    setGeminiApiKey(cleaned);
    try {
      if (cleaned) {
        localStorage.setItem(GEMINI_KEY_STORAGE, cleaned);
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
    } catch {
      // ignore
    }
    setShowKeyModal(false);
  };

  return (
    <section
      id="pereiralabs-ia-section"
      className="space-y-6 pt-2"
      aria-label="PereiraLabs IA — Inteligência, Produção e Consultor Financeiro"
    >
      {/* Hero Banner PereiraLabs IA */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-amber-500/10 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                PereiraLabs IA v{BRAND_CONFIG.appVersion}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Score Operacional: {report.healthScore}/100
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY
                  ? "⚡ Motor Híbrido Ativo (Local + Gemini 2.5 Flash)"
                  : "🧠 Motor Analítico Local Ativo (100% Gratuito)"}
              </span>
            </div>

            <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Central de Inteligência, Planejamento de Produção & Engenharia de Cardápio
            </h2>
            <p className="text-xs sm:text-sm font-medium text-foreground/90">
              {report.executiveHeadline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={() => {
                setTempKeyInput(geminiApiKey);
                setShowKeyModal((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
              title="Configurar chave opcional do Google Gemini API"
            >
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              {geminiApiKey ? "Chave Gemini Configurada" : "Conectar Gemini API (Opcional)"}
            </button>
          </div>
        </div>

        {/* Optional Gemini API Key Drawer */}
        {showKeyModal && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-card/95 p-4 shadow-md">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-foreground">
                  Chave da API Google Gemini (`gemini-2.5-flash`) — Opcional
                </label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  O painel já funciona 100% sem chave através do Motor Analítico PereiraLabs. Se desejar respostas generativas livres via nuvem Google AI Studio, insira sua chave abaixo (salva apenas no seu navegador):
                </p>
                <input
                  type="password"
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                >
                  Salvar Chave
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4 Executive Summary Highlights */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {report.executiveSummaryBullets.map((bullet, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-card/90 p-3 text-xs leading-relaxed text-foreground shadow-sm"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        {/* Sub-navigation inside AI Hub */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={() => setActiveAiTab("todos")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeAiTab === "todos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Visão Completa IA (6 Módulos)
          </button>
          <button
            type="button"
            onClick={() => setActiveAiTab("producao_compras")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeAiTab === "producao_compras"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <ChefHat className="h-3.5 w-3.5" />
            1. Produção Hoje & Lista de Compras
          </button>
          <button
            type="button"
            onClick={() => setActiveAiTab("cardapio_insumos")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeAiTab === "cardapio_insumos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            2. Matriz BCG & Otimização de Insumos
          </button>
          <button
            type="button"
            onClick={() => setActiveAiTab("metas_combos")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeAiTab === "metas_combos"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            3. Simulador de Meta & Combos WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setActiveAiTab("chat")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeAiTab === "chat"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            4. Consultor Chat IA
          </button>
        </div>
      </div>

      {/* MODULE 1 & 2: PLANO INTELIGENTE DE PRODUÇÃO ("O QUE PRODUZIR HOJE?") + LISTA DE COMPRAS COM SOBRAS */}
      {(activeAiTab === "todos" || activeAiTab === "producao_compras") && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left 7 cols: Plano de Produção de Hoje */}
          <div className="xl:col-span-7 rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Módulo IA #1 • Previsão Anti-Ruptura (Giro 7 Dias)
                  </span>
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-primary" />
                    O Que Produzir Hoje? (Ordem de Prioridade na Cozinha)
                  </h3>
                </div>
                <div className="rounded-xl bg-primary/10 px-3 py-1.5 text-right">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Meta de Produção Hoje
                  </p>
                  <p className="text-sm font-extrabold text-primary">
                    {report.productionPlan.totalLotesHoje} Lote(s) •{" "}
                    {report.productionPlan.totalUnidadesProduzir} un. (150ml)
                  </p>
                </div>
              </div>

              {/* Production summary KPI strip */}
              <div className="mt-3 grid grid-cols-3 gap-2.5 rounded-xl bg-secondary/40 p-3 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Custo da Fornada Hoje
                  </p>
                  <p className="text-sm font-extrabold text-foreground">
                    {formatCurrency(
                      report.productionPlan.custoTotalProducaoHoje
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Venda Potencial (Local)
                  </p>
                  <p className="text-sm font-extrabold text-foreground">
                    {formatCurrency(
                      report.productionPlan.faturamentoPotencialHoje
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Lucro Líquido Projetado
                  </p>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    +
                    {formatCurrency(
                      report.productionPlan.lucroLiquidoEsperadoHoje
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {report.productionPlan.items.map((item) => {
                  const badgeStyle =
                    item.urgencia === "critica"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                      : item.urgencia === "alta"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : item.urgencia === "moderada"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

                  const badgeLabel =
                    item.urgencia === "critica"
                      ? "🚨 Urgência Crítica"
                      : item.urgencia === "alta"
                        ? "⚠️ Alta Prioridade"
                        : item.urgencia === "moderada"
                          ? "🔄 Reposição Preventiva"
                          : "✅ Estoque Confortável";

                  return (
                    <div
                      key={item.produto_id}
                      className="rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeStyle}`}
                          >
                            {badgeLabel}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {item.nome}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.lotes_recomendados > 0 ? (
                            <>
                              <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-extrabold text-primary">
                                Bater {item.lotes_recomendados} Lote(s) (+
                                {item.unidades_produzir} un.)
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRegisterBatchProduction(item)
                                }
                                disabled={producedIds[item.produto_id]}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                                title="Somar este lote produzido diretamente ao estoque disponível"
                              >
                                {producedIds[item.produto_id] ? (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    Lote Somado!
                                  </>
                                ) : (
                                  <>
                                    <PackagePlus className="h-3.5 w-3.5" />
                                    +Lote no Estoque
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-muted-foreground">
                              Não precisa bater hoje
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {item.motivo}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-foreground/80">
                        <span>
                          Estoque Atual: <strong>{item.estoque_atual} un.</strong>
                        </span>
                        <span>
                          Giro 7d: <strong>{item.giro_diario_7d} un./dia</strong>
                        </span>
                        <span>
                          Autonomia: <strong>{item.autonomia_dias} dias</strong>
                        </span>
                        <span>
                          Rendimento Receita:{" "}
                          <strong>{item.rendimento_lote} un./lote</strong>
                        </span>
                        {item.lotes_recomendados > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Custo: {formatCurrency(item.custo_total_producao)} →
                            Lucro:{" "}
                            {formatCurrency(item.lucro_liquido_esperado)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 cols: Lista de Compras Automática com Aproveitamento de Sobras */}
          <div className="xl:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="border-b border-border pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Módulo IA #2 • Cruzamento com Sobras da Despensa
                </span>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Lista de Compras Inteligente (Desconta Sobras)
                </h3>
              </div>

              {/* Savings highlight box */}
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    Custo Fracionado das Receitas de Hoje:
                  </span>
                  <span className="font-bold">
                    {formatCurrency(report.shoppingList.custoBrutoReceitas)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-bold">
                    (-) Economia com Sobras já em Estoque:
                  </span>
                  <span className="font-extrabold">
                    - {formatCurrency(report.shoppingList.economiaComSobras)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-emerald-500/20 pt-2 text-sm">
                  <span className="font-extrabold text-foreground">
                    Desembolso Líquido no Mercado Hoje:
                  </span>
                  <span className="font-extrabold text-primary">
                    {formatCurrency(
                      report.shoppingList.desembolsoLiquidoEstimado
                    )}
                  </span>
                </div>
              </div>

              {/* Ingredient list */}
              <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {report.shoppingList.items.map((ing) => (
                  <div
                    key={ing.id}
                    className="rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-foreground">
                          {ing.insumo}
                        </span>
                        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground">
                          Precisa: {ing.quantidade_necessaria_label}
                        </span>
                      </div>

                      {ing.status_compra === "em_estoque_sobra" ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          ✓ Já tem na despensa
                        </span>
                      ) : ing.status_compra === "compra_parcial" ? (
                        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          Usar Sobra + Comprar
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          Comprar ({formatCurrency(ing.custo_estimado_receitas)})
                        </span>
                      )}
                    </div>

                    {ing.sobra_estoque_detectada && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        📦 Sobra mapeada: {ing.sobra_estoque_detectada}
                      </p>
                    )}

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      💡 {ing.recomendacao_embalagem}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 3 & 4: MATRIZ BCG DE ENGENHARIA DE CARDÁPIO + RADAR DE OTIMIZAÇÃO DE CUSTOS E MARCAS */}
      {(activeAiTab === "todos" || activeAiTab === "cardapio_insumos") && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left 6 cols: Matriz BCG dos 8 Sabores */}
          <div className="xl:col-span-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="border-b border-border pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Módulo IA #3 • Engenharia de Cardápio (Matriz BCG)
              </span>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Classificação Estratégica dos 8 Sabores (Giro × Margem)
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Média de corte do período:{" "}
                <strong>{report.bcgMatrix.mediaUnidadesVendidas} un.</strong>{" "}
                vendidas e lucro bruto unitário de{" "}
                <strong>
                  {formatCurrency(report.bcgMatrix.mediaLucroUnitario)}/un.
                </strong>
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              {report.bcgMatrix.items.map((bcg) => {
                const badgeColor =
                  bcg.quadrante === "estrela"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                    : bcg.quadrante === "joia_oculta"
                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                      : bcg.quadrante === "vaca_leiteira"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-secondary text-secondary-foreground border-border";

                return (
                  <div
                    key={bcg.produto_id}
                    className="rounded-xl border border-border/70 bg-background/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${badgeColor}`}
                        >
                          {bcg.quadrante_label}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {bcg.nome}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-foreground">
                        Lucro/un:{" "}
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(bcg.lucro_bruto_un)}
                        </span>{" "}
                        • Vendidos: <span>{bcg.unidades_vendidas} un.</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      🎯 <strong>Ação Tática IA:</strong> {bcg.acao_tatica}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 6 cols: Radar de Otimização de Insumos (54 Cotações) */}
          <div className="xl:col-span-6 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Módulo IA #4 • Engenharia de Compras (54 Cotações)
                </span>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Radar de Redução de Custo (Varejo vs. Atacado)
                </h3>
              </div>
              <div className="rounded-xl bg-emerald-500/10 px-3 py-1.5 text-right">
                <p className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                  Economia Potencial Estimada
                </p>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(report.costOptimizations.economiaMensalPotencial)} / mês
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {report.costOptimizations.opportunities.map((opt) => (
                <div
                  key={opt.id}
                  className="rounded-xl border border-border/70 bg-background/60 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {opt.insumo_alvo}
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                      -{opt.reducao_grama_pct}% por grama (Economia:{" "}
                      {formatCurrency(opt.economia_mensal_estimada)}/mês)
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs">
                    <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 px-2.5 py-1.5">
                      <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 block">
                        Custo Varejo / Embalagem Menor
                      </span>
                      <span className="font-medium text-foreground">
                        {opt.cenario_atual}
                      </span>
                    </div>
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1.5">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                        Custo Otimizado Atacado
                      </span>
                      <span className="font-bold text-foreground">
                        {opt.cenario_otimizado}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    ✨ <strong>Impacto na Qualidade:</strong>{" "}
                    {opt.impacto_qualidade}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5 & 6: SIMULADOR DE META FINANCEIRA MENSAL + GERADOR DE COMBOS & WHATSAPP */}
      {(activeAiTab === "todos" || activeAiTab === "metas_combos") && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Left 5 cols: Simulador de Meta Financeira */}
          <div className="xl:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="border-b border-border pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Módulo IA #5 • Planejador de Liberdade Financeira
              </span>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Simulador: Como Bater Sua Meta de Lucro no Mês?
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <label htmlFor="meta-lucro-range">
                      Qual seu objetivo de Lucro Líquido Mensal (livre no bolso)?
                    </label>
                    <span className="text-base font-extrabold text-primary">
                      {formatCurrency(metaLucroMensal)}
                    </span>
                  </div>
                  <input
                    id="meta-lucro-range"
                    type="range"
                    min={1000}
                    max={12000}
                    step={250}
                    value={metaLucroMensal}
                    onChange={(e) =>
                      setMetaLucroMensal(Number(e.target.value))
                    }
                    className="mt-2 w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>R$ 1.000</span>
                    <span>R$ 3.500</span>
                    <span>R$ 6.000</span>
                    <span>R$ 12.000</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label
                    htmlFor="dias-trabalhados-input"
                    className="text-xs font-semibold text-foreground"
                  >
                    Dias de venda por mês:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[20, 24, 26, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiasTrabalhadosMes(d)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                          diasTrabalhadosMes === d
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculated Target Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-background/70 p-3 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Meta Diária de Vendas
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-primary">
                    {report.profitSimulation.unidades_dia_necessarias} un./dia
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    (~
                    {Math.ceil(
                      report.profitSimulation.unidades_dia_necessarias / 4
                    )}{" "}
                    combos de 4 un. por dia)
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background/70 p-3 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Produção Semanal (Lotes 69 un.)
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {report.profitSimulation.lotes_69_semana} lotes/sem
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ({report.profitSimulation.unidades_semana_necessarias}{" "}
                    geladinhos por semana)
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Volume Total no Mês:
                  </span>
                  <strong className="text-foreground">
                    {report.profitSimulation.unidades_mes_necessarias} unidades
                    ({report.profitSimulation.lotes_69_mes} lotes de 69 un.)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Lucro Líquido Médio Atual por Unidade:
                  </span>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(
                      report.profitSimulation.lucro_medio_por_unidade
                    )}{" "}
                    / saquinho 150ml
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Faturamento Bruto Necessário (Venda Local):
                  </span>
                  <strong className="text-foreground">
                    {formatCurrency(
                      report.profitSimulation.faturamento_bruto_local_necessario
                    )}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Faturamento Bruto se 100% via iFood (Taxa{" "}
                    {ifoodFeePct.toFixed(1)}%):
                  </span>
                  <strong className="text-primary">
                    {formatCurrency(
                      report.profitSimulation.faturamento_bruto_ifood_necessario
                    )}
                  </strong>
                </div>
                <p className="pt-1 text-[11px] text-muted-foreground border-t border-border/60">
                  💡 Como o seu preço iFood usa o divisor dinâmico{" "}
                  <strong>{(1 - ifoodFeePct / 100).toFixed(4)}</strong>, você
                  precisa vender exatamente a{" "}
                  <strong>mesma quantidade de geladinhos</strong> no Local ou no
                  iFood para embolsar os{" "}
                  <strong>{formatCurrency(metaLucroMensal)}</strong> líquidos!
                </p>
              </div>
            </div>
          </div>

          {/* Right 7 cols: Gerador de Combos Inteligentes & Copy para WhatsApp */}
          <div className="xl:col-span-7 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="border-b border-border pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Módulo IA #6 • Acelerador de Vendas & Giro de Estoque
              </span>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Combos Inteligentes com Margem Protegida & Copy p/ WhatsApp
              </h3>
            </div>

            <div className="mt-4 space-y-4">
              {report.smartCombos.map((combo) => (
                <div
                  key={combo.id}
                  className="rounded-xl border border-border/80 bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-foreground">
                        {combo.titulo}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {combo.subtitulo}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold line-through text-muted-foreground">
                        Avulso: {formatCurrency(combo.preco_avulso_total)}
                      </span>
                      <span className="rounded-lg bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                        Combo Local: {formatCurrency(combo.preco_combo_sugerido)}{" "}
                        (-{combo.desconto_cliente_pct}%)
                      </span>
                      <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        No iFood: {formatCurrency(combo.preco_combo_ifood)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    {combo.sabores_inclusos.map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded-full border border-border bg-card px-2.5 py-0.5 font-semibold text-foreground"
                      >
                        {s.quantidade}x {s.nome}
                      </span>
                    ))}
                    <span className="ml-auto font-bold text-emerald-600 dark:text-emerald-400">
                      Custo: {formatCurrency(combo.custo_total_combo)} → Lucro
                      Líquido: {formatCurrency(combo.lucro_liquido_combo)} (
                      +{combo.margem_sobre_custo_pct}%)
                    </span>
                  </div>

                  {/* Ready to copy WhatsApp box */}
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                    <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90 flex-1">
                      {combo.mensagem_whatsapp}
                    </pre>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyWhatsApp(combo.id, combo.mensagem_whatsapp)
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end sm:self-center rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                    >
                      {copiedComboId === combo.id ? (
                        <>
                          <Check className="h-4 w-4" />
                          Texto Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar p/ WhatsApp
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 7: CONSULTOR PEREIRALABS IA (CHAT INTERATIVO HÍBRIDO) */}
      {(activeAiTab === "todos" || activeAiTab === "chat") && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Consultor Financeiro & Operacional 24h • PereiraLabs IA
              </span>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Converse com os Dados da {BRAND_CONFIG.companyName}
              </h3>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground">
              Alimentado pelas 8 Fichas Técnicas, DRE, Estoque e 54 Cotações
            </span>
          </div>

          {/* Quick Prompt Chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSendQuestion(prompt)}
                disabled={isAsking}
                className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                ✨ {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Container */}
          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-border/70 bg-background/50 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "border border-border bg-card text-foreground shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {msg.mode === "gemini_cloud"
                          ? "PereiraLabs IA • Google Gemini 2.5 Flash"
                          : "PereiraLabs IA • Motor Analítico em Tempo Real"}
                      </span>
                      <span className="text-muted-foreground font-normal">
                        {msg.timestamp}
                      </span>
                    </div>
                  )}
                  <div className="whitespace-pre-line">{msg.content}</div>
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-spin text-primary" />
                PereiraLabs IA está cruzando suas fichas técnicas, estoque e DRE...
              </div>
            )}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion(chatInput);
            }}
            className="mt-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pergunte qualquer coisa: Ex: O que produzir hoje? Qual meu lucro no iFood? Como economizar nos insumos?"
              className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isAsking}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Perguntar à IA
            </button>
          </form>
        </div>
      )}
    </section>
  );
};
