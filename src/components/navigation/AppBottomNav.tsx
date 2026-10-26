import React from "react";
import {
  LayoutDashboard,
  ChefHat,
  QrCode,
  Store,
  Sparkles,
  User,
  LogOut,
} from "lucide-react";
import { UserRole } from "@/types/auth";

export type NavTab = "inicio" | "fichas" | "cotacoes" | "gestao" | "consultoria";

interface AppBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPos: () => void;
  userRole?: UserRole;
  onOpenAuth?: () => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenPos,
  userRole = "admin",
  onOpenAuth,
}) => {
  const isCashier = userRole === "operador_caixa";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-full overflow-hidden border-t border-border/80 bg-card/95 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      aria-label="Navegação móvel principal"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {/* 1. Início / Vendas */}
        <button
          type="button"
          onClick={() => onSelectTab("inicio")}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all ${
            activeTab === "inicio"
              ? "text-primary font-bold scale-105"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
              activeTab === "inicio"
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-[10px] tracking-tight">
            {isCashier ? "Vendas" : "Início"}
          </span>
        </button>

        {/* 2. Produção (Apenas Admin) */}
        {!isCashier && (
          <button
            type="button"
            onClick={() => onSelectTab("fichas")}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all ${
              activeTab === "fichas"
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                activeTab === "fichas"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <ChefHat className="h-4 w-4" />
            </div>
            <span className="text-[10px] tracking-tight">Produção</span>
          </button>
        )}

        {/* 3. Botão Central em Destaque: PDV / Caixa */}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onOpenPos}
            className="group relative -top-3 flex h-13 w-13 flex-col items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/30 transition-all hover:scale-110 active:scale-95"
            title="Abrir Frente de Caixa / Novo Pedido"
          >
            <QrCode className="h-6 w-6 transition-transform group-hover:rotate-6" />
            <span className="sr-only">PDV / Vender</span>
            <span className="absolute -bottom-4 text-[9px] font-black tracking-wider uppercase text-foreground">
              PDV
            </span>
          </button>
        </div>

        {/* 4. Cotações & Mercados (Apenas Admin) */}
        {!isCashier && (
          <button
            type="button"
            onClick={() => onSelectTab("cotacoes")}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all ${
              activeTab === "cotacoes"
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                activeTab === "cotacoes"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Store className="h-4 w-4" />
            </div>
            <span className="text-[10px] tracking-tight">Compras</span>
          </button>
        )}

        {/* 5. Gestão & IA (Admin) OU Botão de Trocar Usuário (Caixa) */}
        {!isCashier ? (
          <button
            type="button"
            onClick={() => onSelectTab("gestao")}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all ${
              activeTab === "gestao"
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                activeTab === "gestao"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-[10px] tracking-tight">Gestão</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-muted-foreground hover:text-foreground transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <span className="text-[10px] tracking-tight">Trocar</span>
          </button>
        )}
      </div>
    </nav>
  );
};
