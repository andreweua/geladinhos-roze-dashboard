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
  Lock,
  Unlock,
  Award,
  CreditCard,
  Banknote,
  Coins,
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
import { ChangelogModal } from "@/components/ChangelogModal";
import { PereiraLabsMasterModal } from "@/components/master/PereiraLabsMasterModal";
import { ConsultingSection } from "@/components/ConsultingSection";
import { logConsultingActivity } from "@/services/consultingService";
import {
  getActiveCompany,
  getActiveCompanyId,
  setActiveCompanyId,
  subscribeCompanyChange,
} from "@/services/companyService";
import { THEME_COLOR_PALETTES } from "@/types/multiTenant";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CashShiftModal } from "@/components/cash/CashShiftModal";
import { CashShift, getCurrentShift } from "@/services/cashShiftService";
import { CustomerReceiptView } from "@/components/CustomerReceiptView";
import { parsePermanentReceiptFromUrl } from "@/lib/receiptExporter";
import { AuthScreen } from "@/components/auth/AuthScreen";
import {
  getCurrentUser,
  logout as performLogout,
  subscribeAuthChange,
} from "@/services/authService";
import { UserProfile } from "@/types/auth";
import { formatCurrency } from "@/lib/utils";
import { saveCustomBrandConfig } from "@/config/brand.config";
import { Button } from "@/components/ui/primitives";
import {
  computeDashboardAnalytics,
  getDateRangeForPreset,
} from "@/lib/analytics";
import { checkIsSupabaseConfigured, supabase } from "@/lib/supabase";
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
  VendaDetalhada,
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

  // Active App Section: "inicio" (default) | "fichas" | "cotacoes" | "gestao" | "completo" | "consultoria"
  const [activeSection, setActiveSection] = useState<
    "inicio" | "fichas" | "cotacoes" | "gestao" | "completo" | "consultoria"
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

  // Função equivalente à tecla "F5" do notebook: recarrega a página e atualiza o Service Worker
  const handleHardReload = useCallback(() => {
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.update();
          }
        });
      }
    } catch {
      // ignore
    }
    window.location.reload();
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

  // Sincronização em Tempo Real (Supabase Realtime) e atualização ao voltar ao app
  useEffect(() => {
    if (!checkIsSupabaseConfigured() || !supabase) return;

    // 1. Escuta alterações em tempo real na nuvem (vendas e estoque)
    const channel = supabase
      .channel("live-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        () => {
          loadData(false);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estoque_lotes" },
        () => {
          loadData(false);
        }
      )
      .subscribe();

    // 2. Atualiza ao alternar de aplicativo ou desbloquear a tela do celular
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadData(false);
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // 3. Polling de sincronização a cada 20 segundos enquanto a tela estiver aberta
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData(false);
      }
    }, 20000);

    return () => {
      supabase?.removeChannel(channel);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [loadData]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"venda" | "estoque">("venda");
  const [posModalOpen, setPosModalOpen] = useState<boolean>(false);
  const [installModalOpen, setInstallModalOpen] = useState<boolean>(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [cashShiftModalOpen, setCashShiftModalOpen] = useState<boolean>(false);
  const [changelogModalOpen, setChangelogModalOpen] = useState<boolean>(false);
  const [masterModalOpen, setMasterModalOpen] = useState<boolean>(false);
  const [activeCompany, setActiveCompany] = useState(() => getActiveCompany());
  const activeCompanyId = activeCompany.id;

  // Sincronização reativa instantânea quando a empresa ativa mudar de nome, dados ou tema
  useEffect(() => {
    return subscribeCompanyChange((comp) => {
      setActiveCompany(comp);
    });
  }, []);

  // Aplica dinamicamente o tema de cores da empresa ativa e atualiza a aba do navegador
  useEffect(() => {
    const themeMeta =
      THEME_COLOR_PALETTES[activeCompany.corTema] || THEME_COLOR_PALETTES.dourado;
    if (themeMeta?.hslPrimary) {
      document.documentElement.style.setProperty("--primary", themeMeta.hslPrimary);
      document.documentElement.style.setProperty("--ring", themeMeta.hslPrimary);
    }
    document.title = `${activeCompany.nome} | PereiraLabs PDV - Foods`;
  }, [activeCompany]);

  const [currentShift, setCurrentShift] = useState<CashShift | null>(() =>
    getCurrentShift()
  );

  // Authenticated User & Session State (Admin vs Operador de Caixa)
  const [customerReceipt, setCustomerReceipt] = useState<VendaDetalhada | null>(() =>
    parsePermanentReceiptFromUrl()
  );
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    getCurrentUser()
  );
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(
    () => !getCurrentUser() && !parsePermanentReceiptFromUrl()
  );

  // Se o usuário logado for Consultor PereiraLabs, registra log transparente de visualização
  useEffect(() => {
    if (currentUser?.role === "consultoria") {
      const sectionMap: Record<string, { acao: string; categoria: any }> = {
        inicio: {
          acao: "Visualizou Painel Geral & Indicadores de Faturamento",
          categoria: "vendas",
        },
        fichas: {
          acao: "Analisou Fichas Técnicas & Demonstrativo DRE",
          categoria: "fichas_tecnicas",
        },
        cotacoes: {
          acao: "Inspecionou Cotações de Insumos & Mercados Locais",
          categoria: "estoque",
        },
        gestao: {
          acao: "Acessou Auditoria Física & Previsões de IA",
          categoria: "inteligencia_ia",
        },
        consultoria: {
          acao: "Acessou Painel de Consultoria & Diagnósticos",
          categoria: "dre",
        },
        completo: {
          acao: "Inspecionou Visão Panorâmica Completa do Estabelecimento",
          categoria: "vendas",
        },
      };
      const info = sectionMap[activeSection] || {
        acao: `Visualizou seção ${activeSection}`,
        categoria: "vendas",
      };
      logConsultingActivity({
        empresaId: activeCompany.id,
        consultorNome: currentUser.name || "Consultor PereiraLabs",
        consultorEmail: currentUser.email || "consultoria@pereiralabs.com.br",
        acao: info.acao,
        categoria: info.categoria,
      });
    }
  }, [activeSection, currentUser, activeCompany.id]);

  useEffect(() => {
    return subscribeAuthChange((updatedUser) => {
      setCurrentUser(updatedUser);
      if (!updatedUser) {
        setAuthModalOpen(true);
      }
    });
  }, []);

  const handleLogout = async () => {
    await performLogout();
    setCurrentUser(null);
    setAuthModalOpen(true);
  };

  // Se o usuário logado for Operador de Caixa, restringe a navegação apenas para Início/Vendas
  useEffect(() => {
    if (currentUser?.role === "operador_caixa" && activeSection !== "inicio") {
      setActiveSection("inicio");
    }
  }, [currentUser, activeSection]);

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
      const activeShift = getCurrentShift();
      if (!activeShift) {
        setCashShiftModalOpen(true);
      } else {
        setPosModalOpen(true);
      }
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

  const handleOpenPos = useCallback(() => {
    if (currentUser?.role === "consultoria") {
      alert("Acesso Somente Leitura: Usuários do perfil Consultoria possuem permissão estritamente analítica e não podem operar vendas.");
      return;
    }
    // Validação estrita: nem o administrador nem o operador podem vender sem antes abrir o caixa
    const activeShift = getCurrentShift();
    if (!activeShift) {
      setCurrentShift(null);
      setCashShiftModalOpen(true);
      return;
    }
    setPosModalOpen(true);
  }, [currentUser]);

  const handleSubmitSale = async (payload: NewSalePayload) => {
    if (currentUser?.role === "consultoria") {
      throw new Error("Acesso Somente Leitura: O perfil de Consultoria não pode registrar vendas.");
    }
    // Validação estrita: trava caso o caixa esteja fechado
    const activeShift = getCurrentShift();
    if (!activeShift) {
      setCurrentShift(null);
      setPosModalOpen(false);
      setCashShiftModalOpen(true);
      throw new Error("O caixa está fechado! Abra o caixa informando o fundo de troco antes de registrar vendas.");
    }
    const updated = await createNewSale(payload);
    setSnapshot(updated);
  };

  const handleCancelSale = async (
    vendaId: string,
    motivo: string,
    devolverAoEstoque: boolean
  ) => {
    if (currentUser?.role === "consultoria") {
      alert("Acesso Somente Leitura: Consultores não podem cancelar ou estornar vendas.");
      return;
    }
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
    if (currentUser?.role === "consultoria") {
      alert("Acesso Somente Leitura: O perfil de Consultoria não tem permissão para alterar saldos de estoque.");
      return;
    }
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

  // Se o link aberto for um Comprovante Digital do Cliente (?recibo_d=...)
  if (customerReceipt) {
    return (
      <CustomerReceiptView
        venda={customerReceipt}
        onClose={() => {
          setCustomerReceipt(null);
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }}
        isStandalone={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* 1. Desktop & Tablet Sidebar */}
      <AppSidebar
        activeTab={activeSection}
        onSelectTab={(tab) => {
          if (currentUser?.role === "operador_caixa") {
            setActiveSection("inicio");
            return;
          }
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
        onOpenPos={handleOpenPos}
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
        onRefresh={handleHardReload}
        isRefreshing={isRefreshing}
        dataSource={snapshot?.source || "demo_local"}
        currentUser={currentUser}
        companyName={activeCompany.nome}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Main Body Container (Adaptive to Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (Sticky at top on phones) */}
        <div className="md:hidden">
          <Header
            isDark={isDark}
            companyName={activeCompany.nome}
            onToggleTheme={() => setIsDark((prev) => !prev)}
            onOpenNewSale={handleOpenPos}
            onOpenStockModal={() => {
              setModalTab("estoque");
              setModalOpen(true);
            }}
            onOpenInstallModal={() => setInstallModalOpen(true)}
            onOpenInvoiceModal={() => setInvoiceModalOpen(true)}
            onOpenSettingsModal={() => setSettingsModalOpen(true)}
            isPwaInstalled={isPwaInstalled}
            onRefresh={handleHardReload}
            isRefreshing={isRefreshing}
            dataSource={snapshot?.source || "demo_local"}
            currentUser={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLogout={handleLogout}
            onOpenMasterPanel={() => setMasterModalOpen(true)}
          />
        </div>

        {/* Desktop Top Header Bar (Breadcrumb & Fast Actions) */}
        <header className="hidden md:flex items-center justify-between border-b border-border/80 bg-card/75 backdrop-blur-md px-6 py-3.5 sticky top-0 z-20">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {currentUser?.role === "operador_caixa"
                ? "Frente de Caixa & Pedidos do Turno"
                : activeSection === "inicio"
                ? "Visão Geral & Faturamento"
                : activeSection === "fichas"
                ? "Fichas Técnicas & DRE por Produto"
                : activeSection === "cotacoes"
                ? "Cotações de Preços & Mercados Locais"
                : activeSection === "gestao"
                ? gestaoSubTab === "ia"
                  ? "PereiraLabs IA (Previsão & Lucro)"
                  : "Auditoria Física de Estoque"
                : "Painel Completo Unificado"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {currentUser?.role === "operador_caixa"
                ? "Lançamento ágil de vendas, recebimento via Pix Stone e impressão térmica"
                : activeSection === "inicio"
                ? "Indicadores do dia, gráficos de vendas e reposição de estoque"
                : activeSection === "fichas"
                ? "Custos dos ingredientes, margem iFood vs Balcão e engenharia de receitas"
                : activeSection === "cotacoes"
                ? "Pesquisa de preços com scanner GTIN, listas de compras e NF-e"
                : activeSection === "gestao"
                ? "Consultoria de inteligência artificial e controle de perdas no estoque"
                : "Visão panorâmica de todos os módulos"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Indicador de Status do Caixa / Abertura & Fechamento */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCashShiftModalOpen(true)}
              className="gap-2 text-xs font-semibold"
            >
              {currentShift ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Caixa Aberto ({currentShift.operadorNome})
                  </span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-muted-foreground">Caixa Fechado</span>
                </>
              )}
            </Button>

            {currentUser?.role !== "operador_caixa" && (
              <>
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
              </>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={handleOpenPos}
              className="bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 gap-1.5 text-xs"
            >
              <QrCode className="h-4 w-4" />
              <span>Novo Pedido / PDV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMasterModalOpen(true)}
              title="Painel Master PereiraLabs (Gestão Multi-Empresa SaaS)"
              className="gap-1.5 text-xs font-bold border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Painel Master</span>
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
                  {/* Turno de Caixa Bar (Abertura / Fechamento de Caixa) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          currentShift
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
                        }`}
                      >
                        {currentShift ? (
                          <Unlock className="h-6 w-6" />
                        ) : (
                          <Lock className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              currentShift
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {currentShift ? "Caixa Aberto" : "Caixa Fechado"}
                          </span>
                          {currentShift && (
                            <span className="text-xs text-muted-foreground">
                              Turno de <strong>{currentShift.operadorNome}</strong> • Aberto às{" "}
                              {new Date(currentShift.dataAbertura).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {currentShift
                            ? `Fundo de troco inicial: ${formatCurrency(
                                currentShift.abertura.totalFundoTroco
                              )} (Cédulas: ${formatCurrency(
                                currentShift.abertura.dinheiroCedulas
                              )} | Moedas: ${formatCurrency(
                                currentShift.abertura.moedas
                              )}${
                                currentShift.abertura.maquininhaCartaoInicial > 0
                                  ? ` | Maquininha: ${formatCurrency(
                                      currentShift.abertura.maquininhaCartaoInicial
                                    )}`
                                  : ""
                              })`
                            : "Nenhum turno de vendas ativo no momento. Faça a conferência de troco para abrir."}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={currentShift ? "outline" : "default"}
                      size="sm"
                      onClick={() => setCashShiftModalOpen(true)}
                      className={
                        currentShift
                          ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 font-bold gap-1.5 self-start sm:self-auto"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 font-bold gap-1.5 shadow-sm self-start sm:self-auto"
                      }
                    >
                      {currentShift ? (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>Encerrar / Fechar Caixa</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-4 w-4" />
                          <span>Abrir Caixa (Contagem de Troco)</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {currentUser?.role === "operador_caixa" ? (
                    <>
                      {/* Cashier Welcome & Fast Action Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-primary/30 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/5 p-6 shadow-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">
                              Frente de Caixa Ativo
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-foreground">
                            Olá, {currentUser.name}!
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Registre novos pedidos de geladinhos com cálculo automático, Pix Stone e comprovante.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenPos}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          <QrCode className="h-5 w-5" />
                          <span>Abrir Novo Pedido / PDV</span>
                        </button>
                      </div>

                      {/* Cashier Operational Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Pedidos Concluídos
                          </p>
                          <p className="text-3xl font-black text-foreground mt-2">
                            {analytics.kpis.totalPedidosConcluidos}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Total de vendas registradas no período
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Faturamento do Caixa
                          </p>
                          <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                            {formatCurrency(analytics.kpis.faturamentoTotal)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Recebido em Pix, Dinheiro e Cartão
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:col-span-2 lg:col-span-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Ticket Médio
                          </p>
                          <p className="text-3xl font-black text-foreground mt-2">
                            {formatCurrency(analytics.kpis.ticketMedio)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Média por pedido atendido
                          </p>
                        </div>
                      </div>

                      {/* Cashier Dual Assistance: Top 5 Sabores Mais Vendidos & Divisão por Forma de Pagamento */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 1. Top 5 Sabores Mais Vendidos (Sugestões para o Cliente) */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border/60">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                                  <Award className="h-4 w-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">
                                    Top 5 Sabores Mais Vendidos
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    Sugira estes campeões de venda para clientes indecisos
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">
                                Sugestões
                              </span>
                            </div>

                            <div className="divide-y divide-border/50 mt-2">
                              {analytics.topFlavors.slice(0, 5).map((flavor, index) => {
                                const medals = ["🥇", "🥈", "🥉", "4º", "5º"];
                                return (
                                  <div
                                    key={flavor.produto_id}
                                    className="flex items-center justify-between py-2.5 hover:bg-secondary/20 rounded-lg px-2 -mx-2 transition-colors cursor-pointer group"
                                    onClick={handleOpenPos}
                                    title="Clique para abrir venda deste sabor no PDV"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-base font-extrabold w-6 text-center">
                                        {medals[index] || `${index + 1}º`}
                                      </span>
                                      <div>
                                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                          {flavor.nome}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                          {flavor.quantidade} vendidos • {formatCurrency(flavor.faturamento)}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-primary group-hover:underline">
                                      + Vender
                                    </span>
                                  </div>
                                );
                              })}
                              {analytics.topFlavors.length === 0 && (
                                <p className="text-xs text-muted-foreground py-4 text-center italic">
                                  Nenhum sabor vendido ainda no período.
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground italic flex items-center justify-between">
                            <span>💡 Dica: Geladinhos artesanais de 150ml da Roze encantam pelo sabor!</span>
                          </div>
                        </div>

                        {/* 2. Divisão por Forma de Pagamento */}
                        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between pb-3 border-b border-border/60">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                  <CreditCard className="h-4 w-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">
                                    Divisão por Forma de Pagamento
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    Resumo das entradas do caixa por meio de recebimento
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                                Resumo
                              </span>
                            </div>

                            <div className="space-y-3 mt-3">
                              {analytics.paymentDistribution.map((pay) => {
                                const icons: Record<string, string> = {
                                  Pix: "📱",
                                  Dinheiro: "💵",
                                  Cartao_Credito: "💳",
                                  Cartao_Debito: "💳",
                                };
                                return (
                                  <div key={pay.metodo} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        <span>{icons[pay.metodo] || "💰"}</span>
                                        <span>{pay.label}</span>
                                        <span className="text-[11px] text-muted-foreground font-normal">
                                          ({pay.quantidadeVendas} {pay.quantidadeVendas === 1 ? "venda" : "vendas"})
                                        </span>
                                      </span>
                                      <span className="font-extrabold text-foreground">
                                        {formatCurrency(pay.valor)} ({pay.percentual}%)
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                                      <div
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${Math.min(100, Math.max(0, pay.percentual))}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                              {analytics.paymentDistribution.length === 0 && (
                                <p className="text-xs text-muted-foreground py-4 text-center italic">
                                  Nenhum pagamento registrado no período.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-bold text-foreground">
                            <span>Total Geral em Caixa:</span>
                            <span className="text-rose-600 dark:text-rose-400 text-sm font-black">
                              {formatCurrency(analytics.kpis.faturamentoTotal)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cashier Recent Sales & Stock Availability Table */}
                      <TablesSection
                        ultimasVendas={analytics.ultimasVendas}
                        reposicaoEstoque={analytics.reposicaoEstoque}
                        fichasTecnicas={snapshot?.fichasTecnicas || []}
                        userRole={currentUser?.role}
                        onQuickStockChange={handleUpdateStock}
                        onOpenStockModal={() => {
                          setModalTab("estoque");
                          setModalOpen(true);
                        }}
                        onCancelSale={handleCancelSale}
                      />
                    </>
                  ) : (
                    <>
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
                            onClick={handleOpenPos}
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
                        channelDistribution={analytics.channelDistribution}
                        inventoryByFlavor={analytics.inventoryByFlavor}
                        drePorProduto={analytics.drePorProduto}
                      />

                      {/* 2 Operational Tables */}
                      <TablesSection
                        ultimasVendas={analytics.ultimasVendas}
                        reposicaoEstoque={analytics.reposicaoEstoque}
                        fichasTecnicas={snapshot?.fichasTecnicas || []}
                        userRole={currentUser?.role}
                        onQuickStockChange={handleUpdateStock}
                        onOpenStockModal={() => {
                          setModalTab("estoque");
                          setModalOpen(true);
                        }}
                        onCancelSale={handleCancelSale}
                      />
                    </>
                  )}
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

              {/* TELA 6: CONSULTORIA PEREIRALABS */}
              {activeSection === "consultoria" && (
                <ConsultingSection
                  empresaId={activeCompany.id}
                  empresaNome={activeCompany.nome}
                  currentUser={currentUser}
                />
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
              <button
                type="button"
                onClick={() => setChangelogModalOpen(true)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-xs"
                title="Clique para ver o que há de novo na versão 3.1.0"
              >
                <span>v{BRAND_CONFIG.appVersion}</span>
                <span className="text-[9px] font-normal opacity-85 group-hover:opacity-100">
                  • Ver Novidades ✨
                </span>
              </button>
            </div>
            <div className="flex flex-col items-center gap-0.5 text-center mt-1">
              <p className="text-[11px] font-medium text-muted-foreground">
                Desenvolvido por:
              </p>
              <p className="text-xs font-bold text-primary">
                {BRAND_CONFIG.developerCredit.studio}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {BRAND_CONFIG.developerCredit.division}
              </p>
              <p className="text-[11px] font-semibold text-foreground/85">
                {BRAND_CONFIG.developerCredit.company}
              </p>
            </div>
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
        onSelectTab={(tab) => {
          if (currentUser?.role === "operador_caixa" && tab !== "inicio") {
            return;
          }
          setActiveSection(tab);
        }}
        onOpenPos={handleOpenPos}
        userRole={currentUser?.role || "admin"}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {analytics && (
        <PointOfSaleModal
          isOpen={posModalOpen}
          onClose={() => setPosModalOpen(false)}
          inventoryByFlavor={analytics.inventoryByFlavor}
          onSubmitSale={handleSubmitSale}
          currentShift={currentShift}
          onOpenCashShift={() => setCashShiftModalOpen(true)}
        />
      )}

      {analytics && (
        <QuickOperationsModal
          isOpen={modalOpen}
          initialTab={modalTab}
          onClose={() => setModalOpen(false)}
          inventoryByFlavor={analytics.inventoryByFlavor}
          fichasTecnicas={snapshot?.fichasTecnicas || []}
          onSubmitSale={handleSubmitSale}
          onUpdateStock={handleUpdateStock}
          onCreateProduct={handleCreateProduct}
          onResetDemoData={handleResetDemo}
          dataSource={snapshot?.source || "demo_local"}
          currentShift={currentShift}
          onOpenCashShift={() => setCashShiftModalOpen(true)}
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

      <ErrorBoundary
        fallbackTitle="Falha ao abrir Configurações"
        onReset={() => setSettingsModalOpen(false)}
      >
        <CompanySettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          onConfigSaved={loadData}
        />
      </ErrorBoundary>

      <AuthScreen
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setAuthModalOpen(false);
          if (user.role === "operador_caixa") {
            setActiveSection("inicio");
            handleOpenPos();
          }
        }}
        canDismiss={Boolean(currentUser)}
      />

      <CashShiftModal
        isOpen={cashShiftModalOpen}
        onClose={() => setCashShiftModalOpen(false)}
        currentShift={currentShift}
        operadorNome={currentUser?.name || "Operador"}
        vendas={analytics?.ultimasVendas || []}
        onShiftUpdated={(shift) => {
          setCurrentShift(shift);
          if (shift && shift.status === "aberto") {
            setPosModalOpen(true);
          }
        }}
      />

      <ChangelogModal
        isOpen={changelogModalOpen}
        onClose={() => setChangelogModalOpen(false)}
        onForceReload={handleHardReload}
      />

      <PereiraLabsMasterModal
        isOpen={masterModalOpen}
        onClose={() => setMasterModalOpen(false)}
        activeCompanyId={activeCompanyId}
        onSelectCompany={(id) => {
          setActiveCompanyId(id);
          loadData(true);
        }}
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
