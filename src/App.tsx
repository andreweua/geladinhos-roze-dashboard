import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ChefHat,
  Layers,
  Sparkles,
  QrCode,
  Store,
  ShieldCheck,
  CheckCircle2,
  PackagePlus,
  Receipt,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Header } from "@/components/Header";
import { AppSidebar, SidebarTab } from "@/components/navigation/AppSidebar";
import { AppBottomNav, NavTab } from "@/components/navigation/AppBottomNav";
import { DateFilterBar } from "@/components/DateFilterBar";
import { KpiCards } from "@/components/KpiCards";
import { ChartsSection } from "@/components/ChartsSection";
import { TablesSection } from "@/components/TablesSection";
import { TechnicalSheetAndDreSection } from "@/components/TechnicalSheetAndDreSection";
import { AiIntelligenceSection } from "@/components/AiIntelligenceSection";
import { LocalMarketAndInvoicesSection } from "@/components/LocalMarketAndInvoicesSection";
import { StockAuditSection } from "@/components/StockAuditSection";
import { InvoicePriceUpdaterModal } from "@/components/InvoicePriceUpdaterModal";
import { PointOfSaleModal } from "@/components/PointOfSaleModal";
import { QuickOperationsModal } from "@/components/QuickOperationsModal";
import { InstallPwaModal } from "@/components/InstallPwaModal";
import { CompanySettingsModal } from "@/components/CompanySettingsModal";
import { saveCustomBrandConfig } from "@/config/brand.config";
import { Button } from "@/components/ui/primitives";
import {
  computeDashboardAnalytics,
  getDateRangeForPreset,
} from "@/lib/analytics";
import {
  cancelOrRefundSale,
  createNewProduct,
  createNewSale,
  fetchDashboardData,
  NewProductPayload,
  NewSalePayload,
  resetLocalDemoData,
  saveBatchFichasTecnicas,
  saveProductFichaTecnica,
  updateProductStock,
} from "@/services/dataService";
import {
  DashboardDataSnapshot,
  DateFilterRange,
  DatePreset,
  FichaTecnicaProduto,
} from "@/types/dashboard";

const THEME_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_theme`;
const IFOOD_FEE_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_ifood_fee_pct`;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function App() {
  // Theme state (Light / Dark)
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark") return true;
      if (saved === "light") return false;
    } catch {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      // ignore
    }
  }, [isDark]);

  // Registered iFood Fee % state (persisted in localStorage, defaults to BRAND_CONFIG.defaultIfoodFeePct = 26.2%)
  const [ifoodFeePct, setIfoodFeePct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(IFOOD_FEE_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 80) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return BRAND_CONFIG.defaultIfoodFeePct;
  });

  const handleChangeIfoodFeePct = (newRate: number) => {
    setIfoodFeePct(newRate);
    try {
      localStorage.setItem(IFOOD_FEE_STORAGE_KEY, String(newRate));
    } catch {
      // ignore
    }
  };

  // Global Date Filter state
  const [dateFilter, setDateFilter] = useState<DateFilterRange>(() =>
    getDateRangeForPreset("7dias")
  );

  // Active App Section: "inicio" (default) | "fichas" | "cotacoes" | "gestao" | "completo"
  const [activeSection, setActiveSection] = useState<
    "inicio" | "fichas" | "cotacoes" | "gestao" | "completo"
  >("inicio");

  // Sub-aba de Gestão & Inteligência ("ia" | "auditoria")
  const [gestaoSubTab, setGestaoSubTab] = useState<"ia" | "auditoria">("ia");
  const [selectedProductId, setSelectedProductId] = useState<string>(
    "prod-doce-de-leite"
  );

  // Dashboard Data Snapshot
  const [snapshot, setSnapshot] = useState<DashboardDataSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showRefreshToast, setShowRefreshToast] = useState<boolean>(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  const loadData = useCallback(async (isManualTrigger = false) => {
    setIsRefreshing(true);
    const start = Date.now();
    try {
      const data = await fetchDashboardData();
      setSnapshot(data);
      const elapsed = Date.now() - start;
      if (elapsed < 650) {
        await new Promise((r) => setTimeout(r, 650 - elapsed));
      }
      if (isManualTrigger) {
        setShowRefreshToast(true);
        setTimeout(() => setShowRefreshToast(false), 2500);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Check magic sync config on URL query param
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const syncConfigParam = params.get("sync_config");
      if (syncConfigParam) {
        const jsonStr = decodeURIComponent(escape(atob(syncConfigParam)));
        const parsed = JSON.parse(jsonStr);
        saveCustomBrandConfig(parsed);
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        setSyncSuccessToast(
          "✓ Painel Sincronizado com Sucesso pelo Administrador! Conexão com a Nuvem e Chaves ativadas neste celular."
        );
        setTimeout(() => setSyncSuccessToast(null), 5000);
        loadData(true);
      }
    } catch (err) {
      console.warn("Erro ao ler sync_config da URL:", err);
    }
  }, [loadData]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"venda" | "estoque">("venda");
  const [posModalOpen, setPosModalOpen] = useState<boolean>(false);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  // PWA Install Prompt state (Android / Chrome / Edge)
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(() => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true
    );
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      setInstallModalOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (action === "nova-venda" || action === "pdv") {
      setPosModalOpen(true);
    } else if (action === "estoque") {
      setModalTab("estoque");
      setModalOpen(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleTriggerNativeInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setInstallModalOpen(false);
    }
  };

  const handleSelectPreset = (preset: DatePreset) => {
    setDateFilter(
      getDateRangeForPreset(preset, dateFilter.startDate, dateFilter.endDate)
    );
  };

  const handleCustomDateChange = (start: Date, end: Date) => {
    setDateFilter(getDateRangeForPreset("personalizado", start, end));
  };

  const handleSubmitSale = async (payload: NewSalePayload) => {
    const updated = await createNewSale(payload);
    setSnapshot(updated);
  };

  const handleCancelSale = async (
    vendaId: string,
    motivo: string,
    devolverAoEstoque: boolean
  ) => {
    const updated = await cancelOrRefundSale(vendaId, motivo, devolverAoEstoque);
    setSnapshot(updated);
  };

  const handleUpdateStock = async (
    produtoId: string,
    newQty: number,
    auditInfo?: {
      adminNome?: string;
      motivo?: string;
      observacoes?: string;
    }
  ) => {
    const updated = await updateProductStock(produtoId, newQty, auditInfo);
    setSnapshot(updated);
  };

  const handleCreateProduct = async (payload: NewProductPayload) => {
    const updated = await createNewProduct(payload);
    setSnapshot(updated);
  };

  const handleSaveFicha = async (
    ficha: FichaTecnicaProduto,
    novoPrecoVenda?: number
  ) => {
    const updated = await saveProductFichaTecnica(ficha, novoPrecoVenda);
    setSnapshot(updated);
  };

  const handleSaveBatchFichas = async (
    updatedFichas: FichaTecnicaProduto[]
  ) => {
    const updated = await saveBatchFichasTecnicas(updatedFichas);
    setSnapshot(updated);
  };

  const handleApplyPaidPriceToRecipes = async (
    insumoNome: string,
    novoPrecoUnit: number
  ) => {
    if (!snapshot) return;
    const normTarget = insumoNome.toLowerCase().trim();

    const updatedFichas = snapshot.fichasTecnicas.map((ficha) => {
      let changed = false;
      const updatedIngredientes = ficha.ingredientes.map((ing) => {
        const normIng = ing.nome.toLowerCase().trim();
        if (normIng.includes(normTarget) || normTarget.includes(normIng)) {
          changed = true;
          return {
            ...ing,
            custo_receita: Number(novoPrecoUnit.toFixed(2)),
          };
        }
        return ing;
      });

      if (!changed) return ficha;
      return {
        ...ficha,
        ingredientes: updatedIngredientes,
      };
    });

    const fresh = await saveBatchFichasTecnicas(updatedFichas);
    setSnapshot(fresh);
  };

  const handleResetDemo = () => {
    const fresh = resetLocalDemoData();
    setSnapshot(fresh);
  };

  const analytics = useMemo(() => {
    if (!snapshot) return null;
    return computeDashboardAnalytics(snapshot, dateFilter, ifoodFeePct);
  }, [snapshot, dateFilter, ifoodFeePct]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* 1. Desktop & Tablet Sidebar */}
      <AppSidebar
        activeTab={activeSection}
        onSelectTab={(tab) => {
          if (tab === "ia") {
            setActiveSection("gestao");
            setGestaoSubTab("ia");
          } else if (tab === "auditoria") {
            setActiveSection("gestao");
            setGestaoSubTab("auditoria");
          } else {
            setActiveSection(tab as any);
          }
        }}
        onOpenPos={() => setPosModalOpen(true)}
        onOpenStockModal={() => {
          setModalTab("estoque");
          setModalOpen(true);
        }}
        onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
        onOpenInstallModal={() => setInstallModalOpen(true)}
        isPwaInstalled={isPwaInstalled}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        dataSource={snapshot?.source || "demo_local"}
      />

      {/* 2. Main Body Container (Adaptive to Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (Sticky at top on phones) */}
        <div className="md:hidden">
          <Header
            isDark={isDark}
            onToggleTheme={() => setIsDark((prev) => !prev)}
            onOpenNewSale={() => setPosModalOpen(true)}
            onOpenStockModal={() => {
              setModalTab("estoque");
              setModalOpen(true);
            }}
            onOpenInstallModal={() => setInstallModalOpen(true)}
            onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
            onOpenSettingsModal={() => setSettingsModalOpen(true)}
            isPwaInstalled={isPwaInstalled}
            onRefresh={() => loadData(true)}
            isRefreshing={isRefreshing}
            dataSource={snapshot?.source || "demo_local"}
          />
        </div>

        {/* Desktop Top Header Bar (Breadcrumb & Fast Actions) */}
        <header className="hidden md:flex items-center justify-between border-b border-border/80 bg-card/75 backdrop-blur-md px-6 py-3.5 sticky top-0 z-20">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {activeSection === "inicio" && "Visão Geral & Faturamento"}
              {activeSection === "fichas" && "Fichas Técnicas & DRE por Produto"}
              {activeSection === "cotacoes" && "Cotações de Preços & Mercados Locais"}
              {activeSection === "gestao" &&
                (gestaoSubTab === "ia"
                  ? "PereiraLabs IA (Previsão & Lucro)"
                  : "Auditoria Física de Estoque")}
              {activeSection === "completo" && "Painel Completo Unificado"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeSection === "inicio" &&
                "Indicadores do dia, gráficos de vendas e reposição de estoque"}
              {activeSection === "fichas" &&
                "Custos dos ingredientes, margem iFood vs Balcão e engenharia de receitas"}
              {activeSection === "cotacoes" &&
                "Pesquisa de preços com scanner GTIN, listas de compras e NF-e"}
              {activeSection === "gestao" &&
                "Consultoria de inteligência artificial e controle de perdas no estoque"}
              {activeSection === "completo" && "Visão panorâmica de todos os módulos"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModalTab("estoque");
                setModalOpen(true);
              }}
              className="gap-1.5 text-xs font-semibold"
            >
              <PackagePlus className="h-4 w-4 text-primary" />
              <span>Repor Estoque</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setInvoiceModalOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Receipt className="h-4 w-4 text-primary" />
              <span>Importar NF-e</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setPosModalOpen(true)}
              className="bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 gap-1.5 text-xs"
            >
              <QrCode className="h-4 w-4" />
              <span>Novo Pedido / PDV</span>
            </Button>
          </div>
        </header>

        {/* Dynamic Screen View Content */}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8 pb-28 md:pb-12">
          {!analytics || !snapshot ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
              Carregando indicadores de {BRAND_CONFIG.companyName}...
            </div>
          ) : (
            <>
              {/* TELA 1: INÍCIO (Overview) */}
              {(activeSection === "inicio" || activeSection === "completo") && (
                <div className="space-y-6">
                  {/* Global Date Filter Bar */}
                  <DateFilterBar
                    dateFilter={dateFilter}
                    onSelectPreset={handleSelectPreset}
                    onCustomDateChange={handleCustomDateChange}
                    onOpenStockModal={() => {
                      setModalTab("estoque");
                      setModalOpen(true);
                    }}
                  />

                  {/* Real Data Clean Slate Banner */}
                  {analytics.kpis.totalPedidosConcluidos === 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">
                            Modo 100% Dados Reais Ativado
                          </h4>
                          <p className="text-muted-foreground">
                            Todos os dados fictícios foram excluídos. Lance vendas reais no botão <strong>"Novo Pedido / Frente de Caixa (PDV)"</strong> para movimentar seus gráficos e relatórios!
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPosModalOpen(true)}
                        className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-primary px-3.5 py-1.5 font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Novo Pedido / PDV</span>
                      </button>
                    </div>
                  )}

                  {/* 5 KPIs */}
                  <KpiCards
                    kpis={analytics.kpis}
                    onClickLowStock={() => {
                      setTimeout(() => {
                        const el = document.getElementById("tabelas-operacionais");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }}
                  />

                  {/* 5 Charts */}
                  <ChartsSection
                    dailySales={analytics.dailySales}
                    topFlavors={analytics.topFlavors}
                    paymentDistribution={analytics.paymentDistribution}
                    inventoryByFlavor={analytics.inventoryByFlavor}
                    drePorProduto={analytics.drePorProduto}
                  />

                  {/* 2 Operational Tables */}
                  <TablesSection
                    ultimasVendas={analytics.ultimasVendas}
                    reposicaoEstoque={analytics.reposicaoEstoque}
                    onQuickStockChange={handleUpdateStock}
                    onOpenStockModal={() => {
                      setModalTab("estoque");
                      setModalOpen(true);
                    }}
                    onCancelSale={handleCancelSale}
                  />
                </div>
              )}

              {/* TELA 2: PRODUÇÃO & FICHAS */}
              {(activeSection === "fichas" || activeSection === "completo") && (
                <div className="space-y-6">
                  <TechnicalSheetAndDreSection
                    produtos={snapshot.produtos}
                    fichasTecnicas={snapshot.fichasTecnicas}
                    drePorProduto={analytics.drePorProduto}
                    dreConsolidada={analytics.dreConsolidada}
                    selectedProductId={selectedProductId}
                    onSelectProductId={setSelectedProductId}
                    onSaveFicha={handleSaveFicha}
                    ifoodFeePct={ifoodFeePct}
                    onChangeIfoodFeePct={handleChangeIfoodFeePct}
                    onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
                  />
                </div>
              )}

              {/* TELA 3: COTAÇÕES & COMPRAS */}
              {(activeSection === "cotacoes" || activeSection === "completo") && (
                <div className="space-y-6">
                  <LocalMarketAndInvoicesSection
                    onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
                    fichasTecnicas={snapshot.fichasTecnicas}
                    onApplyPaidPriceToRecipes={handleApplyPaidPriceToRecipes}
                  />
                </div>
              )}

              {/* TELA 4: GESTÃO & IA */}
              {(activeSection === "gestao" || activeSection === "completo") && (
                <div className="space-y-6">
                  {/* Segment Switcher inside Gestão */}
                  {activeSection === "gestao" && (
                    <div className="flex items-center justify-center sm:justify-start">
                      <div className="inline-flex rounded-xl border border-border/80 bg-card p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setGestaoSubTab("ia")}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                            gestaoSubTab === "ia"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <Sparkles className="h-4 w-4 text-amber-400" />
                          <span>PereiraLabs IA (Previsão & Lucro)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGestaoSubTab("auditoria")}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                            gestaoSubTab === "auditoria"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Auditoria de Estoque (Física & Lotes)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {(activeSection === "completo" || gestaoSubTab === "ia") && (
                    <AiIntelligenceSection
                      snapshot={snapshot}
                      analytics={analytics}
                      ifoodFeePct={ifoodFeePct}
                      onUpdateStock={handleUpdateStock}
                      onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
                    />
                  )}

                  {(activeSection === "completo" || gestaoSubTab === "auditoria") && (
                    <StockAuditSection
                      inventoryByFlavor={analytics.inventoryByFlavor}
                      onUpdateFlavorStock={handleUpdateStock}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </main>

        <footer className="mt-auto border-t border-border/60 bg-card/60 py-5 text-center text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <p>
                <strong className="text-foreground">
                  {BRAND_CONFIG.companyName}
                </strong>{" "}
                — {BRAND_CONFIG.tagline}
              </p>
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                v{BRAND_CONFIG.appVersion}
              </span>
            </div>
            <p className="font-medium text-foreground/90">
              Desenvolvido por{" "}
              <span className="font-bold text-primary">
                {BRAND_CONFIG.developerCredit.studio}
              </span>{" "}
              <span className="mx-1 text-muted-foreground">|</span>{" "}
              <span className="font-semibold">
                {BRAND_CONFIG.developerCredit.company}
              </span>
            </p>
          </div>
        </footer>
      </div>

      {/* 3. Mobile Bottom Navigation Bar */}
      <AppBottomNav
        activeTab={
          activeSection === "fichas"
            ? "fichas"
            : activeSection === "cotacoes"
            ? "cotacoes"
            : activeSection === "gestao"
            ? "gestao"
            : "inicio"
        }
        onSelectTab={(tab) => setActiveSection(tab)}
        onOpenPos={() => setPosModalOpen(true)}
      />

      {analytics && (
        <PointOfSaleModal
          isOpen={posModalOpen}
          onClose={() => setPosModalOpen(false)}
          inventoryByFlavor={analytics.inventoryByFlavor}
          onSubmitSale={handleSubmitSale}
        />
      )}

      {analytics && (
        <QuickOperationsModal
          isOpen={modalOpen}
          initialTab={modalTab}
          onClose={() => setModalOpen(false)}
          inventoryByFlavor={analytics.inventoryByFlavor}
          onSubmitSale={handleSubmitSale}
          onUpdateStock={handleUpdateStock}
          onCreateProduct={handleCreateProduct}
          onResetDemoData={handleResetDemo}
          dataSource={snapshot?.source || "demo_local"}
        />
      )}

      {snapshot && (
        <InvoicePriceUpdaterModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          fichasTecnicas={snapshot.fichasTecnicas}
          onSaveBatchFichas={handleSaveBatchFichas}
        />
      )}

      <InstallPwaModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        canTriggerNativeInstall={Boolean(deferredPrompt)}
        onTriggerNativeInstall={handleTriggerNativeInstall}
        isInstalled={isPwaInstalled}
      />

      <CompanySettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onConfigSaved={loadData}
      />

      {/* Floating Refresh Success Toast */}
      {showRefreshToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              Painel Sincronizado com Sucesso!
            </p>
            <p className="text-[11px] text-muted-foreground">
              Estoque, DRE e indicadores atualizados em tempo real.
            </p>
          </div>
        </div>
      )}

      {/* Floating Admin Magic Sync Success Toast */}
      {syncSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-primary/50 bg-card/95 px-5 py-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 max-w-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              Sincronização com o Administrador Ativa!
            </p>
            <p className="text-[11px] text-muted-foreground">
              {syncSuccessToast}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
