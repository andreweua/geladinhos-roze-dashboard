import React from "react";
import {
  LayoutDashboard,
  ChefHat,
  QrCode,
  Store,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export type NavTab = "inicio" | "fichas" | "cotacoes" | "gestao";

interface AppBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPos: () => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenPos,
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      aria-label="Navegação móvel principal"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {/* 1. Início */}
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
          <span className="text-[10px] tracking-tight">Início</span>
        </button>

        {/* 2. Fichas & DRE */}
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

        {/* 4. Cotações & Mercados */}
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

        {/* 5. Gestão & IA */}
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
      </div>
    </nav>
  );
};
