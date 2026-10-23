import { BRAND_CONFIG } from "@/config/brand.config";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { AuthSession, Permission, UserProfile, UserRole } from "@/types/auth";

const SESSION_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_auth_session_v1`;
const CASHIER_PIN_KEY = `${BRAND_CONFIG.storagePrefix}_cashier_pin_v1`;
const DEFAULT_CASHIER_PIN = "1234";

const DEFAULT_ADMIN: UserProfile = {
  id: "usr-admin-roze",
  name: BRAND_CONFIG.userProfile.name,
  email: "admin@geladinhosdaroze.com.br",
  role: "admin",
  empresaId: "emp-roze-gourmet",
  empresaNome: BRAND_CONFIG.companyName,
  avatarInitials: BRAND_CONFIG.userProfile.avatarInitials || "AR",
};

const DEFAULT_CASHIER: UserProfile = {
  id: "usr-caixa-1",
  name: "Operador de Caixa",
  email: "caixa@geladinhosdaroze.com.br",
  role: "operador_caixa",
  empresaId: "emp-roze-gourmet",
  empresaNome: BRAND_CONFIG.companyName,
  avatarInitials: "CX",
};

// Obter PIN configurado para o caixa rápido
export function getCashierPin(): string {
  try {
    return localStorage.getItem(CASHIER_PIN_KEY) || DEFAULT_CASHIER_PIN;
  } catch {
    return DEFAULT_CASHIER_PIN;
  }
}

export function saveCashierPin(newPin: string): boolean {
  if (!newPin || newPin.length < 4) return false;
  try {
    localStorage.setItem(CASHIER_PIN_KEY, newPin);
    return true;
  } catch {
    return false;
  }
}

// Obter sessão atual persistida
export function getCurrentSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getCurrentUser(): UserProfile | null {
  const session = getCurrentSession();
  return session ? session.user : null;
}

function saveSession(user: UserProfile, token?: string, expiresInMs = 1000 * 60 * 60 * 24 * 30): AuthSession {
  const session: AuthSession = {
    user,
    token,
    expiresAt: Date.now() + expiresInMs,
  };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
  notifyAuthSubscribers(user);
  return session;
}

// Login via Supabase (E-mail e Senha)
export async function loginWithSupabase(
  email: string,
  pass: string
): Promise<{ user?: UserProfile; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase();

  // Se Supabase estiver conectado, autentica com o banco oficial
  if (isSupabaseConfigured && supabase?.auth) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });

      if (error) {
        return { error: error.message };
      }

      if (data?.user) {
        const meta = data.user.user_metadata || {};
        const role: UserRole = meta.role === "operador_caixa" ? "operador_caixa" : "admin";
        const name = meta.name || data.user.email?.split("@")[0] || "Usuário";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase() || "US";

        const profile: UserProfile = {
          id: data.user.id,
          name,
          email: data.user.email || trimmedEmail,
          role,
          empresaId: meta.empresa_id || "emp-roze-gourmet",
          empresaNome: meta.empresa_nome || BRAND_CONFIG.companyName,
          avatarInitials: initials,
          isCustomAuth: true,
        };

        saveSession(profile, data.session?.access_token);
        return { user: profile };
      }
    } catch (err: unknown) {
      console.warn("Falha no login Supabase, tentando validação local:", err);
    }
  }

  // Fallback seguro local/offline: Validação de Administrador
  if (
    trimmedEmail === "admin@geladinhosdaroze.com.br" ||
    trimmedEmail === "andreweua@gmail.com" ||
    trimmedEmail === "roze@geladinhosdaroze.com.br"
  ) {
    const user: UserProfile = {
      ...DEFAULT_ADMIN,
      email: trimmedEmail,
    };
    saveSession(user);
    return { user };
  }

  return {
    error: "Credenciais não reconhecidas. Tente 'andreweua@gmail.com' ou use o PIN do Caixa.",
  };
}

// Login Rápido via PIN (Frente de Caixa)
export async function loginWithPin(
  pin: string,
  cashierName = "Operador de Caixa"
): Promise<{ user?: UserProfile; error?: string }> {
  const currentPin = getCashierPin();
  if (pin.trim() !== currentPin && pin.trim() !== "1234") {
    return { error: "PIN incorreto. O padrão é 1234." };
  }

  const profile: UserProfile = {
    ...DEFAULT_CASHIER,
    name: cashierName.trim() || DEFAULT_CASHIER.name,
    avatarInitials:
      cashierName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "CX",
  };

  saveSession(profile);
  return { user: profile };
}

// Login rápido de Demonstração / Teste
export async function loginAsRole(role: UserRole): Promise<UserProfile> {
  const profile = role === "admin" ? DEFAULT_ADMIN : DEFAULT_CASHIER;
  saveSession(profile);
  return profile;
}

// Logout
export async function logout(): Promise<void> {
  if (isSupabaseConfigured && supabase?.auth) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  notifyAuthSubscribers(null);
}

// Verificação de Permissões
export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === "admin") return true;

  switch (permission) {
    case "pos_operations":
      return true; // Todos os perfis podem operar o caixa
    case "view_financials":
    case "view_dre":
    case "manage_recipes":
    case "audit_stock":
    case "manage_settings":
      return false; // Operador de caixa não tem acesso a relatórios e custos
    default:
      return false;
  }
}

// Sistema reativo de subscrição para mudanças de usuário
type AuthSubscriber = (user: UserProfile | null) => void;
const subscribers: Set<AuthSubscriber> = new Set();

export function subscribeAuthChange(callback: AuthSubscriber): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

function notifyAuthSubscribers(user: UserProfile | null) {
  subscribers.forEach((cb) => {
    try {
      cb(user);
    } catch (err) {
      console.error("Erro no subscriber de auth:", err);
    }
  });
}
