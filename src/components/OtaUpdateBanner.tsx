import React, { useEffect, useState } from "react";
import { Sparkles, RefreshCw, ArrowRight, X, Download } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  subscribeToOta,
  applyOtaUpdate,
  OtaUpdateInfo,
} from "@/services/otaService";

export const OtaUpdateBanner: React.FC = () => {
  const [otaState, setOtaState] = useState<OtaUpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    return subscribeToOta((info) => {
      setOtaState(info);
      if (info.hasUpdate) {
        setDismissed(false);
      }
    });
  }, []);

  if (!otaState || !otaState.hasUpdate || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in slide-in-from-top duration-300">
      <div className="rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-2xl backdrop-blur-md ring-2 ring-primary/20 text-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white shadow-sm">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                {isNative ? "Nova Versão do Aplicativo (APK)" : "Atualização Disponível (OTA)"}
              </h4>
            </div>
            <p className="mt-0.5 text-xs font-bold text-foreground">
              Nova versão {otaState.remoteVersion} disponível!
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isNative
                ? "Como você está no aplicativo Android instalado, baixe a nova versão do APK para atualizar os recursos nativos de câmera e layout."
                : "Toque no botão abaixo para aplicar as novas funcionalidades e melhorias de segurança instantaneamente."}
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {isNative ? (
                <a
                  href={`https://github.com/andreweua/geladinhos-roze-dashboard/releases/tag/v${otaState.remoteVersion}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-sm hover:opacity-90 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar Novo APK v{otaState.remoteVersion}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => applyOtaUpdate()}
                  disabled={otaState.isApplying}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {otaState.isApplying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <span>Atualizar Agora</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                Depois
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
