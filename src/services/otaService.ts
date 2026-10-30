import { BRAND_CONFIG } from "@/config/brand.config";

export interface OtaUpdateInfo {
  currentVersion: string;
  remoteVersion: string;
  hasUpdate: boolean;
  isChecking: boolean;
  isApplying: boolean;
  features?: string[];
  lastCheckedAt?: string;
  error?: string;
}

type OtaListener = (info: OtaUpdateInfo) => void;
const listeners = new Set<OtaListener>();

let currentOtaState: OtaUpdateInfo = {
  currentVersion: BRAND_CONFIG.appVersion,
  remoteVersion: BRAND_CONFIG.appVersion,
  hasUpdate: false,
  isChecking: false,
  isApplying: false,
};

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentOtaState });
    } catch (err) {
      console.warn("[OTA] Erro no listener:", err);
    }
  });
}

export function subscribeToOta(listener: OtaListener): () => void {
  listeners.add(listener);
  listener({ ...currentOtaState });
  return () => {
    listeners.delete(listener);
  };
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Inicializa o registro do Service Worker com detecção ativa de atualizações OTA
 */
export function initOtaService(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      swRegistration = reg;
      console.log("[OTA] Service Worker registrado com sucesso:", reg.scope);

      // 1. Escuta quando um novo Service Worker for detectado
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[OTA] Nova versão instalada e pronta para ativação!");
            currentOtaState = {
              ...currentOtaState,
              hasUpdate: true,
            };
            notifyListeners();
          }
        });
      });

      // 2. Se o Service Worker mudar de controlador, recarrega a página automaticamente
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[OTA] Controlador alterado. Recarregando com novos assets...");
          window.location.reload();
        }
      });

      // 3. Checa versão remota imediatamente
      checkForOtaUpdate();
    } catch (err) {
      console.warn("[OTA] Falha ao registrar Service Worker:", err);
    }
  });

  // Checa atualização sempre que o usuário voltar ao app no celular (desbloquear tela ou alternar app)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("[OTA] App reaberto. Verificando atualizações OTA no servidor...");
      checkForOtaUpdate();
    }
  });

  // Checagem periódica a cada 5 minutos
  setInterval(() => {
    checkForOtaUpdate();
  }, 5 * 60 * 1000);
}

/**
 * Consulta o arquivo version.json do servidor para saber se há novo deploy
 */
export async function checkForOtaUpdate(): Promise<boolean> {
  if (currentOtaState.isChecking) return currentOtaState.hasUpdate;

  currentOtaState = {
    ...currentOtaState,
    isChecking: true,
    lastCheckedAt: new Date().toISOString(),
  };
  notifyListeners();

  try {
    // Força checagem no Service Worker se disponível
    if (swRegistration) {
      try {
        await swRegistration.update();
      } catch {
        // ignore
      }
    }

    // Busca version.json direto do servidor sem nenhum cache HTTP (tenta remoto se estiver no app nativo)
    const remoteUrl = "https://andreweua.github.io/geladinhos-roze-dashboard/version.json";
    let res: Response;
    try {
      res = await fetch(`${remoteUrl}?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
    } catch {
      res = await fetch(`./version.json?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
    }

    if (res.ok) {
      const data = await res.json();
      const remoteVer = data.version || BRAND_CONFIG.appVersion;
      const isNew = remoteVer !== BRAND_CONFIG.appVersion;

      currentOtaState = {
        ...currentOtaState,
        remoteVersion: remoteVer,
        features: Array.isArray(data.features) ? data.features : [],
        hasUpdate: isNew,
        isChecking: false,
      };
      notifyListeners();

      if (isNew) {
        console.log(`[OTA] Nova versão detectada no servidor: ${remoteVer} (atual: ${BRAND_CONFIG.appVersion})`);
      }
      return isNew;
    }
  } catch (err) {
    console.debug("[OTA] Erro ao checar version.json:", err);
  } finally {
    currentOtaState = {
      ...currentOtaState,
      isChecking: false,
    };
    notifyListeners();
  }

  return false;
}

/**
 * Aplica a atualização OTA imediatamente:
 * 1. Envia comando SKIP_WAITING para o novo Service Worker
 * 2. Limpa todos os caches do navegador
 * 3. Recarrega a página de forma limpa
 */
export async function applyOtaUpdate(): Promise<void> {
  currentOtaState = {
    ...currentOtaState,
    isApplying: true,
  };
  notifyListeners();

  try {
    // 1. Ativa novo Service Worker se estiver aguardando
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    // 2. Limpa todos os caches do browser para forçar download limpo
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log("[OTA] Caches do navegador limpos com sucesso.");
    }

    // 3. Recarrega a página com parâmetro para evitar cache do provedor/webview
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.set("_v", Date.now().toString());
    window.location.href = cleanUrl.toString();
  } catch (err) {
    console.error("[OTA] Erro ao aplicar atualização:", err);
    window.location.reload();
  }
}

/**
 * Força uma limpeza total e reinstalação OTA imediata (botão de emergência / recarga forçada)
 */
export async function forceHardOtaReload(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_refresh", Date.now().toString());
  window.location.href = url.toString();
}
