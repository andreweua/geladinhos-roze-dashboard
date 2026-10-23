import React, { useState, useEffect } from "react";
import {
  IceCreamCone,
  Moon,
  Sun,
  PackagePlus,
  RefreshCw,
  Database,
  Sparkles,
  Smartphone,
  Receipt,
  QrCode,
  Settings,
  Check,
  User,
  LogOut,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Badge, Button } from "@/components/ui/primitives";
import { UserProfile } from "@/types/auth";

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenNewSale: () => void;
  onOpenStockModal: () => void;
  onOpenInstallModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenSettingsModal?: () => void;
  isPwaInstalled: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  dataSource: "supabase" | "demo_local";
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  onOpenNewSale,
  onOpenStockModal,
  onOpenInstallModal,
  onOpenInvoiceModal,
  onOpenSettingsModal,
  isPwaInstalled,
  onRefresh,
  isRefreshing,
  dataSource,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [justRefreshed, setJustRefreshed] = useState(false);
  const isCashier = currentUser?.role === "operador_caixa";

  useEffect(() => {
    if (isRefreshing) {
      setJustRefreshed(true);
    } else if (justRefreshed) {
      const timer = setTimeout(() => setJustRefreshed(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [isRefreshing]);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <IceCreamCone className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white shadow">
              <Sparkles className="h-2 w-2" />
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                {currentUser?.empresaNome || BRAND_CONFIG.companyName}
              </h1>
              <Badge
                variant={dataSource === "supabase" ? "success" : "secondary"}
                className="hidden sm:inline-flex gap-1 text-[10px] items-center cursor-pointer transition-opacity hover:opacity-85"
                onClick={onOpenSettingsModal}
                title={
                  dataSource === "supabase"
                    ? "Conectado ao banco PostgreSQL no Supabase (Tempo Real Ativo). Clique para gerenciar sincronização."
                    : "Modo Local Offline. Clique para conectar à Nuvem Supabase."
                }
              >
                {dataSource === "supabase" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <Database className="h-2.5 w-2.5" />
                {dataSource === "supabase" ? "Nuvem Ativa" : "Local"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-none">
              {BRAND_CONFIG.tagline}
            </p>
          </div>
        </div>

        {/* Right: Quick Actions, PWA Install, Theme Toggle & Logged User */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onOpenNewSale}
            className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 flex items-center gap-1.5 font-bold text-xs"
          >
            <QrCode className="h-4 w-4" />
            <span>Novo Pedido / PDV</span>
          </Button>

          {!isCashier && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenStockModal}
              className="hidden sm:inline-flex text-xs"
            >
              <PackagePlus className="h-4 w-4 text-primary" />
              <span>Repor Estoque</span>
            </Button>
          )}

          {!isCashier && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenInvoiceModal}
              title="Importar Nota Fiscal ou Cupom"
              className="hidden md:inline-flex items-center gap-1.5 text-xs"
            >
              <Receipt className="h-4 w-4 text-primary" />
              <span>NF-e</span>
            </Button>
          )}

          {!isPwaInstalled && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenInstallModal}
              title="Instalar aplicativo"
              className="border border-rose-500/25 hidden sm:inline-flex text-xs"
            >
              <Smartphone className="h-4 w-4 text-rose-500" />
              <span>Instalar</span>
            </Button>
          )}

          {!isCashier && onOpenSettingsModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettingsModal}
              title="Configurar Dados da Empresa & Pix"
              className="hidden lg:inline-flex items-center gap-1.5 border-border text-xs"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Dados & Pix</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            title={justRefreshed && !isRefreshing ? "Atualizado com sucesso!" : "Recarregar tela e sincronizar dados (F5)"}
            aria-label="Recarregar tela e sincronizar dados (F5)"
            className="relative h-8 w-8"
          >
            {isRefreshing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : justRefreshed ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
            aria-label="Alternar tema claro/escuro"
            className="h-8 w-8"
          >
            {isDark ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-rose-700" />
            )}
          </Button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenAuth}
              title="Clique para alternar de usuário ou fazer login"
              className="flex items-center gap-2 rounded-full border border-border/80 bg-secondary/60 py-1 pl-1 pr-2.5 hover:bg-secondary transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-[10px] font-bold text-white shadow-sm">
                {currentUser?.avatarInitials || BRAND_CONFIG.userProfile.avatarInitials}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-[11px] font-bold text-foreground">
                  {currentUser?.name || BRAND_CONFIG.userProfile.name}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {isCashier ? "🛍️ Caixa" : "👑 Admin"}
                </p>
              </div>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sair do Usuário"
                className="p-1 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors hidden sm:inline-flex"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
