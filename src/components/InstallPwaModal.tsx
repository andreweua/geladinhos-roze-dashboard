import React from "react";
import {
  X,
  Smartphone,
  Share,
  PlusSquare,
  Download,
  CheckCircle2,
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand.config";
import { Button, Badge } from "@/components/ui/primitives";

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  canTriggerNativeInstall: boolean;
  onTriggerNativeInstall: () => Promise<void>;
  isInstalled: boolean;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  isOpen,
  onClose,
  canTriggerNativeInstall,
  onTriggerNativeInstall,
  isInstalled,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Instalar Aplicativo (PWA)
              </h2>
              <p className="text-xs text-muted-foreground">
                Android, iPhone (iOS) e Desktop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6 text-xs sm:text-sm">
          {isInstalled ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p>
                O aplicativo <strong>{BRAND_CONFIG.shortName}</strong> já está
                instalado e rodando em tela cheia no seu dispositivo!
              </p>
            </div>
          ) : canTriggerNativeInstall ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  Instalação Direta Disponível (Android / Chrome)
                </span>
                <Badge variant="default">1 Clique</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Seu navegador suporta instalação direta na tela inicial com
                ícone próprio e funcionamento offline.
              </p>
              <Button
                type="button"
                onClick={onTriggerNativeInstall}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-500 text-white"
              >
                <Download className="h-4 w-4" />
                Instalar Aplicativo Agora
              </Button>
            </div>
          ) : null}

          {/* Android Manual Guide */}
          <div className="rounded-xl border border-border bg-secondary/35 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">
                📱 No Android (Chrome / Samsung Internet)
              </h3>
              <Badge variant="outline">WebAPK Nativo</Badge>
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
              <li>
                Toque no botão <strong>"Instalar Aplicativo"</strong> acima ou
                no menu <strong>⋮ (três pontos)</strong> do navegador.
              </li>
              <li>
                Selecione <strong>"Instalar aplicativo"</strong> ou{" "}
                <strong>"Adicionar à tela inicial"</strong>.
              </li>
              <li>
                O ícone <strong>{BRAND_CONFIG.shortName}</strong> aparecerá na
                sua gaveta de apps como um app nativo.
              </li>
            </ol>
          </div>

          {/* iOS (iPhone / iPad) Guide */}
          <div className="rounded-xl border border-border bg-secondary/35 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">
                🍏 No iPhone ou iPad (iOS Safari)
              </h3>
              <Badge variant="outline">Tela de Início</Badge>
            </div>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span>
                  Abra este link no <strong>Safari</strong> e toque no ícone{" "}
                  <strong>Compartilhar</strong>
                </span>
                <Share className="inline h-3.5 w-3.5 text-rose-500" />
                <span>na barra inferior.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>
                  Role para baixo e toque em{" "}
                  <strong>"Adicionar à Tela de Início"</strong>
                </span>
                <PlusSquare className="inline h-3.5 w-3.5 text-rose-500" />.
              </li>
              <li>
                Toque em <strong>Adicionar</strong> no canto superior direito.
              </li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end border-t border-border bg-secondary/20 px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
