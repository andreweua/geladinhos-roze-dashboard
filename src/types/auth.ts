export type UserRole = "admin" | "customer" | "operador_caixa" | "cozinha" | "consultoria";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  empresaId: string;
  empresaNome: string;
  avatarInitials: string;
  isCustomAuth?: boolean;
}

export interface AuthSession {
  user: UserProfile;
  token?: string;
  expiresAt?: number;
}

export type Permission =
  | "view_financials"
  | "view_dre"
  | "manage_recipes"
  | "audit_stock"
  | "manage_settings"
  | "pos_operations";
