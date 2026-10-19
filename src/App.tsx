import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, ChefHat, Layers, Sparkles } from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Header } from "@/components/Header";
import { DateFilterBar } from "@/components/DateFilterBar";
import { KpiCards } from "@/components/KpiCards";
import { ChartsSection } from "@/components/ChartsSection";
import { TablesSection } from "@/components/TablesSection";
import { TechnicalSheetAndDreSection } from "@/components/TechnicalSheetAndDreSection";
import { AiIntelligenceSection } from "@/components/AiIntelligenceSection";
import { InvoicePriceUpdaterModal } from "@/components/InvoicePriceUpdaterModal";
import { QuickOperationsModal } from "@/components/QuickOperationsModal";
import { InstallPwaModal } from "@/components/InstallPwaModal";
import {
  computeDashboardAnalytics,
  getDateRangeForPreset,
} from "@/lib/analytics";
import {
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

  // Active View Tab ("completo" | "visao_geral" | "ficha_dre" | "pereiralabs_ia")
  const [activeSection, setActiveSection] = useState<
    "completo" | "visao_geral" | "ficha_dre" | "pereiralabs_ia"
  >("completo");
  const [selectedProductId, setSelectedProductId] = useState<string>(
    "prod-doce-de-leite"
  );

  // Dashboard Data Snapshot
  const [snapshot, setSnapshot] = useState<DashboardDataSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"venda" | "estoque">("venda");
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false);

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
    if (action === "nova-venda") {
      setModalTab("venda");
      setModalOpen(true);
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

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchDashboardData();
      setSnapshot(data);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleUpdateStock = async (produtoId: string, newQty: number) => {
    const updated = await updateProductStock(produtoId, newQty);
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

  const handleResetDemo = () => {
    const fresh = resetLocalDemoData();
    setSnapshot(fresh);
  };

  const analytics = useMemo(() => {
    if (!snapshot) return null;
    return computeDashboardAnalytics(snapshot, dateFilter, ifoodFeePct);
  }, [snapshot, dateFilter, ifoodFeePct]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onOpenNewSale={() => {
          setModalTab("venda");
          setModalOpen(true);
        }}
        onOpenStockModal={() => {
          setModalTab("estoque");
          setModalOpen(true);
        }}
        onOpenInstallModal={() => setInstallModalOpen(true)}
        onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
        isPwaInstalled={isPwaInstalled}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        dataSource={snapshot?.source || "demo_local"}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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

        {/* Navigation Switcher: Visão Completa | PereiraLabs IA | Vendas & Estoque | Ficha Técnica & DRE */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-card p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveSection("completo")}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeSection === "completo"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" />
              Painel Completo
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("pereiralabs_ia")}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeSection === "pereiralabs_ia"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-primary bg-primary/10 hover:bg-primary/20"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              PereiraLabs IA (Produção & Lucro)
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("visao_geral")}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeSection === "visao_geral"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Vendas & Estoque
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("ficha_dre")}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeSection === "ficha_dre"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <ChefHat className="h-4 w-4" />
              Ficha Técnica & DRE por Produto
            </button>
          </div>
        </div>

        {!analytics || !snapshot ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            Carregando indicadores de {BRAND_CONFIG.companyName}...
          </div>
        ) : (
          <>
            {/* 5 KPIs always visible at top */}
            <KpiCards
              kpis={analytics.kpis}
              onClickLowStock={() => {
                setActiveSection("completo");
                setTimeout(() => {
                  const el = document.getElementById("tabelas-operacionais");
                  el?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
            />

            {(activeSection === "completo" ||
              activeSection === "pereiralabs_ia") && (
              <AiIntelligenceSection
                snapshot={snapshot}
                analytics={analytics}
                ifoodFeePct={ifoodFeePct}
                onUpdateStock={handleUpdateStock}
                onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
              />
            )}

            {(activeSection === "completo" ||
              activeSection === "visao_geral") && (
              <>
                {/* 4 Charts */}
                <ChartsSection
                  dailySales={analytics.dailySales}
                  topFlavors={analytics.topFlavors}
                  paymentDistribution={analytics.paymentDistribution}
                  inventoryByFlavor={analytics.inventoryByFlavor}
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
                />
              </>
            )}

            {(activeSection === "completo" ||
              activeSection === "ficha_dre") && (
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
            )}
          </>
        )}
      </main>

      <footer className="mt-10 border-t border-border/60 bg-card/60 py-6 text-center text-xs text-muted-foreground">
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
    </div>
  );
}

export default App;
