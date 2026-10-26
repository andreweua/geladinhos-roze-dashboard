import React from "react";
import {
  LayoutDashboard,
  ChefHat,
  Store,
  Sparkles,
  ShieldCheck,
  QrCode,
  Layers,
  Receipt,
  PackagePlus,
  Settings,
  Moon,
  Sun,
  RefreshCw,
  IceCreamCone,
  Smartphone,
  LogOut,
  User,
  Award,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Badge } from "@/components/ui/primitives";
import { NavTab } from "./AppBottomNav";
import { UserProfile } from "@/types/auth";
import { isPereiraLabsMaster } from "@/services/companyService";

export type SidebarTab = NavTab | "completo" | "auditoria" | "ia" | "consultoria";

interface AppSidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  onOpenPos: () => void;
  onOpenStockModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenInstallModal: () => void;
  isPwaInstalled: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  dataSource: "supabase" | "demo_local";
  currentUser: UserProfile | null;
  companyName?: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenMasterPanel?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPos,
  onOpenStockModal,
  onOpenInvoiceModal,
  onOpenSettingsModal,
  onOpenInstallModal,
  isPwaInstalled,
  isDark,
  onToggleTheme,
  onRefresh,
  isRefreshing,
  dataSource,
  currentUser,
  companyName,
  onOpenAuth,
  onLogout,
  onOpenMasterPanel,
}) => {
  const isCashier = currentUser?.role === "operador_caixa";
  const displayCompanyName = companyName || currentUser?.empresaNome || BRAND_CONFIG.companyName;
  const isMaster = isPereiraLabsMaster(currentUser);

  return (
    <aside className="hidden lg:flex w-64 lg:w-72 shrink-0 flex-col border-r border-border/80 bg-card/90 backdrop-blur-md h-screen sticky top-0 overflow-hidden">
      {/* Brand Header */}
      <div className="p-3.5 lg:p-4 border-b border-border/70 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <IceCreamCone className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white shadow">
              <Sparkles className="h-2 w-2" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs lg:text-sm font-bold tracking-tight text-foreground truncate">
              {displayCompanyName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] text-muted-foreground truncate">
                {dataSource === "supabase" ? "Nuvem Ativa" : "Modo Local"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          title="Recarregar tela e sincronizar dados (F5)"
          className="shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border/60 hover:border-border"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`}
          />
        </button>
      </div>

      {/* Main Action: Novo Pedido / PDV */}
      <div className="p-4 lg:px-5 lg:pt-4 lg:pb-2">
        <button
          type="button"
          onClick={onOpenPos}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 p-3 text-sm font-bold text-white shadow-md shadow-rose-500/20 hover:opacity-95 hover:scale-[1.02] active:scale-[0.99] transition-all"
        >
          <QrCode className="h-4 w-4" />
          <span>Frente de Caixa (PDV)</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 lg:px-4 py-2 space-y-5 text-xs">
        {/* Operação */}
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
            {isCashier ? "Frente de Caixa" : "Operação"}
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectTab("inicio")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === "inicio"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-foreground/80 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>{isCashier ? "Vendas do Turno" : "Visão Geral & Vendas"}</span>
            </button>

            <button
              type="button"
              onClick={onOpenPos}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-foreground/80 hover:bg-secondary hover:text-foreground transition-all"
            >
              <div className="flex items-center gap-3">
                <QrCode className="h-4 w-4 shrink-0 text-primary" />
                <span>Novo Pedido / PDV</span>
              </div>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                Pix
              </Badge>
            </button>
          </div>
        </div>

        {/* Módulos do Administrador (Protegidos) */}
        {!isCashier ? (
          <>
            {/* Suprimentos & Mercados */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
                Suprimentos & Compras
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectTab("cotacoes")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                    activeTab === "cotacoes"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Store className="h-4 w-4 shrink-0" />
                  <span>Cotações & Scanner GTIN</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenInvoiceModal}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-foreground/80 hover:bg-secondary hover:text-foreground transition-all"
                >
                  <Receipt className="h-4 w-4 shrink-0 text-primary" />
                  <span>Importar Nota Fiscal (NF-e)</span>
                </button>
              </div>
            </div>

            {/* Produção & Fichas */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
                Produção & Fichas
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectTab("fichas")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                    activeTab === "fichas"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <ChefHat className="h-4 w-4 shrink-0" />
                  <span>Fichas Técnicas & DRE</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenStockModal}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-foreground/80 hover:bg-secondary hover:text-foreground transition-all"
                >
                  <PackagePlus className="h-4 w-4 shrink-0 text-primary" />
                  <span>Repor Estoque de Sabores</span>
                </button>
              </div>
            </div>

            {/* Inteligência & Auditoria */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
                Inteligência & Auditoria
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectTab("gestao")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                    activeTab === "gestao" || activeTab === "ia" || activeTab === "auditoria"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>PereiraLabs IA & Auditoria</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab("completo")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                    activeTab === "completo"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>Visão Completa (Tudo)</span>
                </button>
              </div>
            </div>

            {/* Consultoria PereiraLabs */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5 flex items-center justify-between">
                <span>Consultoria Especializada</span>
                <span className="text-[9px] text-amber-500 font-bold">Oficial</span>
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectTab("consultoria")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                    activeTab === "consultoria"
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Award className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Consultoria PereiraLabs</span>
                </button>
              </div>
            </div>

            {/* Painel Master (Exclusivo PereiraLabs) */}
            {isMaster && onOpenMasterPanel && (
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5 flex items-center justify-between">
                  <span>Gestão Master</span>
                  <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded font-black">Admin SaaS</span>
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={onOpenMasterPanel}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-all shadow-sm"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Painel Master PereiraLabs</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-400">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>Modo Caixa Operacional</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Acesso exclusivo à frente de caixa e registro de pedidos para segurança financeira da empresa.
            </p>
          </div>
        )}
      </div>

      {/* Footer / User Profile & Settings */}
      <div className="p-3 lg:p-4 border-t border-border/70 space-y-2.5 bg-card/60">
        {!isPwaInstalled && (
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-full flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-all"
          >
            <Smartphone className="h-4 w-4" />
            <span>Instalar App no PC</span>
          </button>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onOpenAuth}
            title="Clique para alternar de usuário ou fazer login"
            className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-85 transition-opacity"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-xs font-bold text-white shadow-sm">
              {currentUser?.avatarInitials || BRAND_CONFIG.userProfile.avatarInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">
                {currentUser?.name || BRAND_CONFIG.userProfile.name}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground truncate">
                  {currentUser?.role === "operador_caixa" ? "🛍️ Caixa" : "👑 Admin"}
                </span>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1">
            {!isCashier && (
              <button
                type="button"
                onClick={onOpenSettingsModal}
                title="Configurações da Empresa & Pix"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? "Modo Claro" : "Modo Escuro"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-rose-600" />
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              title="Trocar de Usuário / Sair"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
