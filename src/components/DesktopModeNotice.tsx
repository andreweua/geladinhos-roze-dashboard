import React, { useEffect, useState } from "react";
import { Monitor, Smartphone, X } from "lucide-react";

export const DesktopModeNotice: React.FC = () => {
  const [isDesktopModeOnMobile, setIsDesktopModeOnMobile] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("plabs_dismiss_desktop_notice") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkDesktopMode = () => {
      try {
        const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        const screenWidth = Math.min(window.screen.width, window.screen.height);
        const viewportWidth = window.innerWidth;

        // Physical phone screen is usually <= 500px, but desktop mode forces viewport >= 850px
        if (isTouch && screenWidth < 600 && viewportWidth >= 850) {
          setIsDesktopModeOnMobile(true);
        } else {
          setIsDesktopModeOnMobile(false);
        }
      } catch {
        // ignore
      }
    };

    checkDesktopMode();
    window.addEventListener("resize", checkDesktopMode);
    return () => window.removeEventListener("resize", checkDesktopMode);
  }, []);

  if (!isDesktopModeOnMobile || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("plabs_dismiss_desktop_notice", "true");
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-2 text-foreground text-xs backdrop-blur-sm z-40 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Smartphone className="h-3.5 w-3.5" />
          </div>
          <p className="text-[11px] sm:text-xs text-amber-900 dark:text-amber-200">
            <strong>Dica de exibição:</strong> Seu navegador móvel está com a opção <em>&quot;Para computador&quot;</em> marcada. Para ver a versão 100% responsiva de celular com botões adaptados, desmarque <em>&quot;Para computador&quot;</em> nos 3 pontinhos do navegador.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-amber-500/20 hover:text-foreground transition-colors shrink-0"
          title="Fechar aviso"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
