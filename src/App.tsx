import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Header } from "@/components/Header";
import { DateFilterBar } from "@/components/DateFilterBar";
import { KpiCards } from "@/components/KpiCards";
import { ChartsSection } from "@/components/ChartsSection";
import { TablesSection } from "@/components/TablesSection";
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
  updateProductStock,
} from "@/services/dataService";
import {
  DashboardDataSnapshot,
  DateFilterRange,
  DatePreset,
} from "@/types/dashboard";

const THEME_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_theme`;

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

  // Global Date Filter state
  const [dateFilter, setDateFilter] = useState<DateFilterRange>(() =>
    getDateRangeForPreset("7dias")
  );

  // Dashboard Data Snapshot
  const [snapshot, setSnapshot] = useState<DashboardDataSnapshot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"venda" | "estoque">("venda");
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);

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

    // Check URL shortcuts (?action=nova-venda or ?action=estoque) from PWA home screen icon
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

  const handleResetDemo = () => {
    const fresh = resetLocalDemoData();
    setSnapshot(fresh);
  };

  const analytics = useMemo(() => {
    if (!snapshot) return null;
    return computeDashboardAnalytics(snapshot, dateFilter);
  }, [snapshot, dateFilter]);

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

        {!analytics ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            Carregando indicadores de {BRAND_CONFIG.companyName}...
          </div>
        ) : (
          <>
            {/* 5 KPIs */}
            <KpiCards
              kpis={analytics.kpis}
              onClickLowStock={() => {
                const el = document.getElementById("tabelas-operacionais");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            />

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
