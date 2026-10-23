import React, { useState } from "react";
import {
  IceCreamCone,
  Sparkles,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  QrCode,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import {
  loginWithSupabase,
  loginWithPin,
  loginAsRole,
  getCashierPin,
} from "@/services/authService";
import { UserProfile, UserRole } from "@/types/auth";
import { Badge, Button } from "@/components/ui/primitives";

interface AuthScreenProps {
  onSuccess: (user: UserProfile) => void;
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  isOpen,
  onClose,
  canDismiss = false,
}) => {
  const [tab, setTab] = useState<"admin" | "pin">("admin");
  const [email, setEmail] = useState("andreweua@gmail.com");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await loginWithSupabase(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.user) {
        onSuccess(res.user);
      }
    } catch {
      setErrorMsg("Erro inesperado ao autenticar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await loginWithPin(pin, cashierName);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.user) {
        onSuccess(res.user);
      }
    } catch {
      setErrorMsg("Erro ao validar PIN do caixa.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const user = await loginAsRole(role);
      onSuccess(user);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {canDismiss && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-xs font-semibold text-muted-foreground hover:text-foreground p-1"
          >
            Fechar ✕
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex relative mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-500/25">
              <IceCreamCone className="h-7 w-7" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow">
              <Sparkles className="h-3 w-3" />
            </span>
          </div>

          <h3 className="text-xl font-black tracking-tight text-foreground">
            {BRAND_CONFIG.companyName}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sistema Gerencial e Ponto de Venda Seguro
          </p>
        </div>

        {/* Tab Switcher: Admin vs Caixa PIN */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl border border-border/80 bg-secondary/50 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab("admin");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
              tab === "admin"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-rose-500" />
            <span>Administrador</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("pin");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
              tab === "pin"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="h-4 w-4 text-amber-500" />
            <span>PIN do Caixa</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form 1: Admin Login */}
        {tab === "admin" && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                E-mail do Administrador
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@geladinhosdaroze.com.br"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Validando..." : "Entrar como Administrador"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        {/* Form 2: Cashier Fast PIN Login */}
        {tab === "pin" && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Nome do Operador de Caixa
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="Ex: Operador(a) da Tarde"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                PIN de 4 Dígitos do Caixa
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-center tracking-[0.5em] text-lg font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                PIN padrão: <span className="font-bold text-foreground">1234</span>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-rose-600 text-white font-bold shadow-md hover:opacity-90 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Acessando..." : "Abrir Frente de Caixa (PDV)"}</span>
              <QrCode className="h-4 w-4" />
            </Button>
          </form>
        )}

        {/* Quick Demo Switcher */}
        <div className="mt-6 pt-5 border-t border-border/70 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2.5">
            Acesso Rápido de Demonstração (1 Clique):
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("admin")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Entrar como Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo("operador_caixa")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Entrar como Caixa</span>
            </button>
          </div>
        </div>

        {/* SaaS / Multi-tenant notice */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80">
          <Building2 className="h-3 w-3" />
          <span>Isolamento Seguro Multi-Empresa com Supabase PostgreSQL</span>
        </div>
      </div>
    </div>
  );
};
