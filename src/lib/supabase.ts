import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { BRAND_CONFIG } from "@/config/brand.config";

export function getSupabaseCredentials(): { url: string; key: string } | null {
  // 1. Check custom brand config in localStorage
  try {
    const raw = localStorage.getItem(`${BRAND_CONFIG.storagePrefix}_company_settings_v1`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const customUrl = parsed?.supabaseConfig?.supabaseUrl?.trim();
      const customKey = parsed?.supabaseConfig?.supabaseAnonKey?.trim();
      if (
        customUrl &&
        customKey &&
        customUrl.startsWith("http") &&
        !customUrl.includes("seu-projeto.supabase.co")
      ) {
        return { url: customUrl, key: customKey };
      }
    }
  } catch {
    // ignore
  }

  // 2. Check environment variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (
    envUrl &&
    envKey &&
    envUrl.startsWith("http") &&
    !envUrl.includes("seu-projeto.supabase.co")
  ) {
    return { url: envUrl.trim(), key: envKey.trim() };
  }

  return null;
}

let _cachedClient: SupabaseClient | null = null;
let _cachedUrl = "";
let _cachedKey = "";

export function getActiveSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds) {
    _cachedClient = null;
    return null;
  }
  if (_cachedClient && _cachedUrl === creds.url && _cachedKey === creds.key) {
    return _cachedClient;
  }
  _cachedUrl = creds.url;
  _cachedKey = creds.key;
  _cachedClient = createClient(creds.url, creds.key);
  return _cachedClient;
}

export const isSupabaseConfigured = Boolean(getSupabaseCredentials());

export const checkIsSupabaseConfigured = (): boolean =>
  Boolean(getSupabaseCredentials());

// Dynamic proxy so existing code importing `supabase` works seamlessly
export const supabase: SupabaseClient | null = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getActiveSupabaseClient();
    if (!client) return undefined;
    const val = (client as unknown as Record<string, unknown>)[prop as string];
    return typeof val === "function" ? val.bind(client) : val;
  },
});
