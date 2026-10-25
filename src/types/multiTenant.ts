export type ThemeColorOption =
  | "rosa" // Rosa Gourmet / Framboesa (Geladinhos Roze)
  | "dourado" // Dourado Caramelo / Mel (Pão de Mel, Bolos, Docerias)
  | "esmeralda" // Verde Esmeralda (Confeitaria Saudável / Artesanal)
  | "azul" // Azul Royal (Empórios e Cafés)
  | "roxo"; // Roxo Açaí & Sobremesas

export interface CompanyThemeConfig {
  key: ThemeColorOption;
  label: string;
  primaryColor: string;
  hoverColor: string;
  hslPrimary: string;
  bgLight: string;
  accentBadge: string;
}

export const THEME_COLOR_PALETTES: Record<ThemeColorOption, CompanyThemeConfig> = {
  rosa: {
    key: "rosa",
    label: "Rosa Gourmet (Framboesa / Geladinhos)",
    primaryColor: "#e11d48",
    hoverColor: "#be123c",
    hslPrimary: "346 77% 46%",
    bgLight: "#fff1f2",
    accentBadge: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  },
  dourado: {
    key: "dourado",
    label: "Dourado Mel (Caramelo / Pão de Mel & Bolos)",
    primaryColor: "#d97706",
    hoverColor: "#b45309",
    hslPrimary: "38 92% 44%",
    bgLight: "#fffbeb",
    accentBadge: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  esmeralda: {
    key: "esmeralda",
    label: "Verde Esmeralda (Confeitaria Artesanal / Natural)",
    primaryColor: "#059669",
    hoverColor: "#047857",
    hslPrimary: "160 84% 39%",
    bgLight: "#ecfdf5",
    accentBadge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  azul: {
    key: "azul",
    label: "Azul Royal (Empório / Bistrô)",
    primaryColor: "#2563eb",
    hoverColor: "#1d4ed8",
    hslPrimary: "217 91% 60%",
    bgLight: "#eff6ff",
    accentBadge: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  roxo: {
    key: "roxo",
    label: "Roxo Açaí (Gelados & Sobremesas Modernas)",
    primaryColor: "#7c3aed",
    hoverColor: "#6d28d9",
    hslPrimary: "262 83% 58%",
    bgLight: "#f5f3ff",
    accentBadge: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  },
};

export type SubscriptionStatus = "ativo" | "bloqueado" | "cortesia";
export type CompanyLifecycleStatus = "ativa" | "suspensa" | "excluida";

export interface Company {
  id: string;
  nome: string;
  slug: string;
  nicho: string;
  corTema: ThemeColorOption;
  chavePix: string;
  chavePixTipo: "telefone" | "email" | "cpf_cnpj" | "aleatoria";
  whatsapp: string;
  cidade: string;
  responsavel: string;
  adminEmail: string;
  adminSenha: string;
  cashierPin: string;
  statusAssinatura: SubscriptionStatus;
  statusLifecycle?: CompanyLifecycleStatus; // "ativa" | "suspensa" | "excluida"
  cortesiaValidadeAte?: string; // ISO date string
  valorMensalidade: number;
  criadoEm: string;
  ultimoPagamentoEm?: string;
  observacoes?: string;
  permitirEstoqueNegativo?: boolean; // Permite vender produtos mesmo se o estoque for <= 0
}
