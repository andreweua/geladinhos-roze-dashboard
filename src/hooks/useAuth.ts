import { useState, useEffect, useCallback } from "react";
import { UserProfile, UserRole } from "@/types/auth";
import {
  getCurrentUser,
  getCurrentSession,
  loginWithSupabase,
  logout as logoutSession,
} from "@/services/authService";
import { isPereiraLabsMaster } from "@/services/companyService";

export type PostLoginDestination = "faturamento" | "dashboard" | "pos";

export interface UseAuthReturn {
  currentUser: UserProfile | null;
  role: UserRole;
  isAdminMaster: boolean; // Administrador Master PereiraLabs
  isCustomer: boolean;
  isCashier: boolean;
  canAccessMasterPanel: boolean;
  postLoginDestination: PostLoginDestination;
  determinePostLoginDestination: (user: UserProfile | null) => PostLoginDestination;
  logout: () => void;
  refreshUser: () => void;
}

/**
 * Hook de Autenticação e Controle de Acessos
 * Determina permissões de Administrador vs Cliente e roteamento pós-login.
 */
export function useAuth(): UseAuthReturn {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());

  const refreshUser = useCallback(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes("auth_session")) {
        refreshUser();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshUser]);

  // Avalia se o usuário logado é o Administrador Master PereiraLabs
  const isAdminMaster = Boolean(isPereiraLabsMaster(currentUser));
  const role: UserRole = currentUser?.role || "customer";
  const isCustomer = role === "customer" || (!isAdminMaster && role === "admin");
  const isCashier = role === "operador_caixa";

  // REQUISITO 2: O Painel Master é estritamente restrito a Administradores da PereiraLabs
  const canAccessMasterPanel = isAdminMaster;

  /**
   * REQUISITO 2: Lógica de Redirecionamento Pós-Login
   * - Administrador PereiraLabs: redirecionado direto para a Área de Gestão de Faturamento / Painel Master
   * - Operador de Caixa: tela de PDV / início
   * - Cliente Comum: dashboard da sua própria empresa
   */
  const determinePostLoginDestination = useCallback(
    (user: UserProfile | null): PostLoginDestination => {
      if (!user) return "dashboard";

      if (isPereiraLabsMaster(user)) {
        return "faturamento"; // Redirecionamento direto para Gestão de Faturamento / Painel Master
      }

      if (user.role === "operador_caixa") {
        return "pos";
      }

      return "dashboard"; // Dashboard da própria empresa do cliente
    },
    []
  );

  const postLoginDestination = determinePostLoginDestination(currentUser);

  const logout = useCallback(() => {
    logoutSession();
    setCurrentUser(null);
  }, []);

  return {
    currentUser,
    role,
    isAdminMaster,
    isCustomer,
    isCashier,
    canAccessMasterPanel,
    postLoginDestination,
    determinePostLoginDestination,
    logout,
    refreshUser,
  };
}
