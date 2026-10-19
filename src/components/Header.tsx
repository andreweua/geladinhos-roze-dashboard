import React from "react";
import {
  IceCreamCone,
  Moon,
  Sun,
  PlusCircle,
  PackagePlus,
  RefreshCw,
  Database,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Badge, Button } from "@/components/ui/primitives";

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenNewSale: () => void;
  onOpenStockModal: () => void;
  onOpenInstallModal: () => void;
  isPwaInstalled: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  dataSource: "supabase" | "demo_local";
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  onOpenNewSale,
  onOpenStockModal,
  onOpenInstallModal,
  isPwaInstalled,
  onRefresh,
  isRefreshing,
  dataSource,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 via-rose-500 to-amber-400 text-white shadow-md shadow-rose-500/20">
            <IceCreamCone className="h-6 w-6" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] text-rose-950 shadow">
              <Sparkles className="h-2.5 w-2.5" />
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {BRAND_CONFIG.companyName}
              </h1>
              <Badge
                variant={dataSource === "supabase" ? "success" : "secondary"}
                className="hidden sm:inline-flex gap-1 text-[11px]"
                title={
                  dataSource === "supabase"
                    ? "Conectado ao banco PostgreSQL no Supabase"
                    : "Modo Demonstração Interativo (dados salvos no navegador)"
                }
              >
                <Database className="h-3 w-3" />
                {dataSource === "supabase" ? "Supabase Online" : "Modo Demo Ativo"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {BRAND_CONFIG.tagline}
            </p>
          </div>
        </div>

        {/* Right: Quick Actions, PWA Install, Theme Toggle & Logged User */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Button
            variant="default"
            size="sm"
            onClick={onOpenNewSale}
            className="bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-sm hover:from-rose-700 hover:to-rose-600"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova Venda</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenStockModal}
            className="hidden sm:inline-flex"
          >
            <PackagePlus className="h-4 w-4 text-rose-500" />
            <span>Repor Estoque</span>
          </Button>

          {!isPwaInstalled && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenInstallModal}
              title="Instalar aplicativo no Android, iOS ou Desktop"
              className="border border-rose-500/25"
            >
              <Smartphone className="h-4 w-4 text-rose-500" />
              <span className="hidden md:inline">Instalar App</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            title="Atualizar dados"
            aria-label="Atualizar dados"
          >
            <RefreshCw
              className={`h-4 w-4 text-muted-foreground ${
                isRefreshing ? "animate-spin text-primary" : ""
              }`}
            />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
            aria-label="Alternar tema claro/escuro"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-rose-700" />
            )}
          </Button>

          <div className="hidden h-6 w-px bg-border md:block" />

          {/* Logged User Info */}
          <div className="flex items-center gap-2.5 rounded-full border border-border/70 bg-secondary/50 py-1 pl-1.5 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-xs font-bold text-white">
              {BRAND_CONFIG.userProfile.avatarInitials}
            </div>
            <div className="hidden text-left leading-tight md:block">
              <p className="text-xs font-semibold text-foreground">
                {BRAND_CONFIG.userProfile.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {BRAND_CONFIG.userProfile.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
