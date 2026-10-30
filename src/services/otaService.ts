import { Capacitor } from "@capacitor/core";
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

/**
 * Retorna a URL oficial para download direto do APK Android mais recente
 */
export function getOfficialApkDownloadUrl(version?: string): string {
  const ver = (version || BRAND_CONFIG.appVersion).replace(/^v/i, "").trim();
  return `https://github.com/andreweua/geladinhos-roze-dashboard/releases/download/v${ver}/PereiraLabs-PDV-Foods-v${ver}.apk`;
}

/**
 * Retorna a URL universal de download do APK mais recente (sempre aponta para a última release gerada)
 */
export function getLatestUniversalApkUrl(): string {
  return "https://github.com/andreweua/geladinhos-roze-dashboard/releases/latest/download/PereiraLabs-PDV-Foods-latest.apk";
}

/**
 * Retorna a página oficial de Releases no GitHub
 */
export function getOfficialReleasePageUrl(version?: string): string {
  if (version) {
    const ver = version.replace(/^v/i, "").trim();
    return `https://github.com/andreweua/geladinhos-roze-dashboard/releases/tag/v${ver}`;
  }
  return "https://github.com/andreweua/geladinhos-roze-dashboard/releases/latest";
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
 * Inicializa o registro do Service Worker e a checagem ativa de atualizações OTA / APK
 */
export function initOtaService(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Checa versão remota imediatamente (mesmo em WebView Android sem Service Worker)
  setTimeout(() => {
    checkForOtaUpdate();
  }, 800);

  if ("serviceWorker" in navigator) {
    const registerWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register("./sw.js");
        swRegistration = reg;
        console.log("[OTA] Service Worker registrado com sucesso:", reg.scope);

        // Se já houver um worker em espera aguardando ativação (atualização pronta em background)
        if (reg.waiting) {
          console.log("[OTA] Worker waiting detectado na inicialização! Notificando atualização...");
          currentOtaState = {
            ...currentOtaState,
            hasUpdate: true,
          };
          notifyListeners();
        }

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
    };

    if (document.readyState === "complete") {
      registerWorker();
    } else {
      window.addEventListener("load", registerWorker);
    }
  }

  // Checa atualização sempre que o usuário voltar ao app no celular (desbloquear tela ou alternar app)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("[OTA] App reaberto. Verificando atualizações OTA no servidor...");
      checkForOtaUpdate();
    }
  });

  // Checagem periódica a cada 3 minutos
  setInterval(() => {
    checkForOtaUpdate();
  }, 3 * 60 * 1000);
}

/**
 * Consulta o arquivo version.json do servidor (sem custom headers para não falhar CORS no Android https://localhost)
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

    const ts = Date.now();
    // Lista de fontes remotas sem headers não-padrão (CORS Simple GET Request compatível com Android WebView)
    // Prioriza o servidor de produção (GitHub Pages) para garantir que os arquivos JS da nova versão já estejam publicados
    const remoteSources = Capacitor.isNativePlatform()
      ? [
          `https://andreweua.github.io/geladinhos-roze-dashboard/version.json?_t=${ts}`,
          `https://raw.githubusercontent.com/andreweua/geladinhos-roze-dashboard/main/public/version.json?_t=${ts}`,
        ]
      : [
          `https://andreweua.github.io/geladinhos-roze-dashboard/version.json?_t=${ts}`,
          `./version.json?_t=${ts}`,
        ];

    let data: any = null;
    for (const url of remoteSources) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const parsed = await res.json();
          if (parsed && parsed.version) {
            data = parsed;
            break;
          }
        }
      } catch {
        // tenta próxima fonte
      }
    }

    if (data && data.version) {
      const remoteVer = String(data.version).trim();
      const currentVer = String(BRAND_CONFIG.appVersion).trim();
      const isNew = remoteVer !== currentVer;

      currentOtaState = {
        ...currentOtaState,
        remoteVersion: remoteVer,
        features: Array.isArray(data.features) ? data.features : [],
        hasUpdate: isNew,
        isChecking: false,
      };
      notifyListeners();

      if (isNew) {
        console.log(`[OTA] Nova versão detectada no servidor: ${remoteVer} (atual em memória: ${currentVer})`);
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
 * Aplica a atualização imediatamente:
 * - No Android Nativo: dispara o download direto do novo APK para atualizar o app instalado
 * - No Web / PWA: ativa o Service Worker novo, limpa caches e recarrega a página
 */
export async function applyOtaUpdate(): Promise<void> {
  currentOtaState = {
    ...currentOtaState,
    isApplying: true,
  };
  notifyListeners();

  try {
    if (Capacitor.isNativePlatform()) {
      // No Android nativo, abre o link de download direto do APK atualizado no navegador do sistema
      const targetVer = currentOtaState.remoteVersion || BRAND_CONFIG.appVersion;
      const apkUrl = getOfficialApkDownloadUrl(targetVer);
      window.open(apkUrl, "_blank");
      setTimeout(() => {
        currentOtaState = {
          ...currentOtaState,
          isApplying: false,
        };
        notifyListeners();
      }, 1500);
      return;
    }

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
    await checkForOtaUpdate();
    if (Capacitor.isNativePlatform() && currentOtaState.hasUpdate) {
      window.open(getOfficialApkDownloadUrl(currentOtaState.remoteVersion), "_blank");
      return;
    }
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
