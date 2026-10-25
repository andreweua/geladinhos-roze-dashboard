import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  QrCode,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Store,
  HelpCircle,
  MessageCircle,
  Building2,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import {
  loginWithSupabase,
  loginWithPin,
  loginWithMasterDirect,
} from "@/services/authService";
import { UserProfile } from "@/types/auth";
import { Button } from "@/components/ui/primitives";
import {
  getActiveCompany,
  getLocalCompanies,
  saveLocalCompanies,
  setActiveCompanyId,
  updateCompany,
} from "@/services/companyService";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [cashierName, setCashierName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [isMasterPrefilled, setIsMasterPrefilled] = useState(false);

  const activeComp = getActiveCompany();

  // Verifica se há Link Mágico de 1 clique na URL (?magic_auth=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const magicAuthParam = params.get("magic_auth");
      if (magicAuthParam) {
        let jsonStr = decodeURIComponent(magicAuthParam);
        try {
          jsonStr = decodeURIComponent(escape(atob(jsonStr)));
        } catch {
          jsonStr = atob(jsonStr);
        }
        const decoded = JSON.parse(jsonStr);
        if (decoded?.empresaId) {
          const companies = getLocalCompanies();
          let target = companies.find((c) => c.id === decoded.empresaId);

          // Se a empresa veio completa no link mágico e não está neste celular, cadastra imediatamente!
          if (!target && decoded.company) {
            companies.push(decoded.company);
            saveLocalCompanies(companies);
            target = decoded.company;
          } else if (target && decoded.company) {
            updateCompany(target.id, decoded.company);
            target = { ...target, ...decoded.company };
          }

          if (target) {
            setActiveCompanyId(target.id);
            const user: UserProfile = {
              id: `usr-${target.id}`,
              name: target.responsavel || target.nome,
              email: target.adminEmail,
              role: "admin",
              empresaId: target.id,
              empresaNome: target.nome,
              avatarInitials: target.nome.substring(0, 2).toUpperCase(),
            };
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            onSuccess(user);
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao processar magic_auth no AuthScreen:", err);
    }
  }, [onSuccess]);

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
      setErrorMsg("Erro ao autenticar. Verifique sua conexão e tente novamente.");
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

  const handleWhatsAppSupport = () => {
    const zapText = `Olá, equipe PereiraLabs! Preciso de ajuda para recuperar a senha de acesso da minha empresa no sistema. (E-mail: ${email || "não informado"})`;
    const zapUrl = `https://wa.me/5514988183327?text=${encodeURIComponent(zapText)}`;
    window.open(zapUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-600 text-white shadow-lg">
              <Store className="h-7 w-7" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow">
              <Sparkles className="h-3 w-3" />
            </span>
          </div>

          <h3 className="text-xl font-black tracking-tight text-foreground">
            PereiraLabs PDV - Foods
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeComp?.nome || "Sistema Integrado de Gestão Comercial"}
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
            <ShieldCheck className="h-4 w-4 text-primary" />
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
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@confeitaria.com.br"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isMasterPrefilled && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 animate-in fade-in space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Credenciais Master PereiraLabs carregadas!</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Clique no botão <strong>"Entrar no Sistema"</strong> abaixo para acessar com super poderes do Administrador Master (Painel Master e gestão multi-empresa).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const user = loginWithMasterDirect();
                    onSuccess(user);
                  }}
                  className="w-full mt-1 py-1.5 px-3 rounded-lg bg-amber-500 text-white font-black text-[11px] hover:bg-amber-600 transition-all shadow-sm"
                >
                  ⚡ Entrar Agora com 1 Toque como Master
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Validando credenciais..." : "Entrar no Sistema"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setTab("admin");
                  setEmail("admin@pereiralabs.com.br");
                  setPassword("admin");
                  setIsMasterPrefilled(true);
                  setErrorMsg(null);
                }}
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-500/10 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Entrar como Administrador Master PereiraLabs</span>
              </button>
            </div>
          </form>
        )}

        {/* Form 2: Cashier Fast PIN Login */}
        {tab === "pin" && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Identificação do Atendente / Caixa
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="Ex: Balcão da Tarde"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                PIN de Segurança
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-center tracking-[0.5em] text-lg font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
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

        {/* Rodapé institucional PereiraLabs */}
        <div className="mt-6 pt-4 border-t border-border/70 text-center">
          <p className="text-[11px] font-semibold text-foreground">
            Desenvolvido por PereiraLabs
          </p>
          <p className="text-[10px] text-muted-foreground">
            Divisão de Tecnologia e IA • Louzada & Pereira - Soluções Digitais
          </p>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-foreground">
                Recuperação de Acesso
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Para total segurança contábil e fiscal da sua empresa, a redefinição de senhas é feita com verificação de identidade pela equipe oficial da PereiraLabs.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="button"
                onClick={handleWhatsAppSupport}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Solicitar Nova Senha no WhatsApp</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotModalOpen(false)}
                className="w-full text-xs py-2 rounded-xl"
              >
                Voltar ao Login
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
