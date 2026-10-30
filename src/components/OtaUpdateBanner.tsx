import React, { useEffect, useState, useRef } from "react";
import { Sparkles, RefreshCw, ArrowRight, X, Download, BellRing, Volume2, VolumeX, ListChecks } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  subscribeToOta,
  applyOtaUpdate,
  getOfficialApkDownloadUrl,
  getOfficialReleasePageUrl,
  OtaUpdateInfo,
} from "@/services/otaService";
import { soundNotificationService } from "@/services/soundNotificationService";

export const OtaUpdateBanner: React.FC = () => {
  const [otaState, setOtaState] = useState<OtaUpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const hasNotifiedRef = useRef<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    return subscribeToOta((info) => {
      setOtaState(info);
      if (info.hasUpdate) {
        setDismissed(false);

        // Dispara notificação sonora e vibração apenas uma vez por versão nova
        if (hasNotifiedRef.current !== info.remoteVersion) {
          hasNotifiedRef.current = info.remoteVersion;
          if (soundEnabled) {
            soundNotificationService.playUpdateChime();
          }

          // Se tiver suporte à Web Notification API do sistema operacional (PWA/Browser), solicita e emite
          if (typeof window !== "undefined" && "Notification" in window) {
            try {
              if (Notification.permission === "granted") {
                new Notification(`PereiraLabs: Nova Versão v${info.remoteVersion} Disponível!`, {
                  body: "Toque para atualizar e conferir os novos recursos e melhorias.",
                  icon: "./icon.svg",
                  badge: "./icon.svg",
                });
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then((perm) => {
                  if (perm === "granted") {
                    new Notification(`PereiraLabs: Nova Versão v${info.remoteVersion} Disponível!`, {
                      body: "Toque para atualizar e conferir os novos recursos e melhorias.",
                      icon: "./icon.svg",
                      badge: "./icon.svg",
                    });
                  }
                });
              }
            } catch {
              // ignore
            }
          }
        }
      }
    });
  }, [soundEnabled]);

  if (!otaState || !otaState.hasUpdate || dismissed) {
    return null;
  }

  const handleTestSound = () => {
    soundNotificationService.playUpdateChime();
  };

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in slide-in-from-top duration-300">
      <div className="rounded-2xl border-2 border-primary bg-card/95 p-4 shadow-2xl backdrop-blur-md ring-4 ring-primary/20 text-foreground transition-all">
        <div className="flex items-start justify-between gap-3">
          {/* Ícone Animado com Efeito de Pulso Sonoro */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-rose-500 to-amber-500 text-white shadow-md">
            <BellRing className="h-5 w-5 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white font-black shadow ring-2 ring-card animate-pulse">
              !
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-primary">
                  {isNative ? "Nova Versão do Aplicativo (APK)" : "Atualização Disponível (OTA)"}
                </h4>
              </div>

              {/* Botão de Testar Som / Mudo */}
              <button
                type="button"
                onClick={handleTestSound}
                title="Tocar aviso sonoro de atualização"
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                <Volume2 className="h-3 w-3" />
                <span>Ouvir</span>
              </button>
            </div>

            <p className="mt-1 text-sm font-extrabold text-foreground flex items-center gap-1.5">
              <span>Versão v{otaState.remoteVersion} Pronta!</span>
              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                NOVA
              </span>
            </p>

            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {isNative
                ? "Como você está no aplicativo Android instalado, baixe o APK atualizado para sincronizar as novidades de tela e câmera."
                : "Atualize em 1 segundo para sincronizar os novos recursos visuais, cotações e lista de compras."}
            </p>

            {/* Lista com as novidades da versão se existirem */}
            {otaState.features && otaState.features.length > 0 && (
              <div className="mt-2 rounded-xl bg-secondary/40 p-2 border border-border/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                  <ListChecks className="h-3 w-3 text-primary" />
                  Novidades desta versão:
                </span>
                <ul className="space-y-0.5 text-[10px] text-foreground font-medium">
                  {otaState.features.slice(0, 2).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-1 truncate">
                      <span className="text-primary font-bold">•</span>
                      <span className="truncate">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ações: Atualizar Agora e Baixar Nova Versão */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Opção 1: Atualização Instantânea no Web/PWA ou Download no Android */}
              <button
                type="button"
                onClick={() => applyOtaUpdate()}
                disabled={otaState.isApplying}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-md hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer ring-2 ring-primary/40"
              >
                {otaState.isApplying ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Atualizando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isNative ? "Baixar e Atualizar APK" : "Atualizar Agora"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              {/* Opção 2: Link Direto para o APK Oficial */}
              <a
                href={getOfficialApkDownloadUrl(otaState.remoteVersion)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                title="Baixar arquivo .APK oficial da nova versão direto do GitHub"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar APK v{otaState.remoteVersion}</span>
              </a>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                Lembrar Depois
              </button>
            </div>

            {/* Link visível para clique ou cópia rápida no celular */}
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-[10px]">
              <a
                href={getOfficialReleasePageUrl(otaState.remoteVersion)}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold underline truncate hover:opacity-80"
              >
                🔗 Abrir página de download v{otaState.remoteVersion} no GitHub
              </a>
            </div>
          </div>

          {/* Botão Fechar Notificação */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            title="Dispensar aviso por enquanto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
