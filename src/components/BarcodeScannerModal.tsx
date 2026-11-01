import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Camera,
  Flashlight,
  RefreshCw,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  Cpu,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { Button } from "@/components/ui/primitives";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  initialMode?: "camera" | "manual";
  /** Se true, permite retornar URLs de QR Code (ex: NFC-e SEFAZ) além de códigos numéricos GTIN/EAN */
  allowRawQrValue?: boolean;
}

type ScannerEngineStatus =
  | "mlkit_native"
  | "mlkit_web_detector"
  | "installing_mlkit"
  | "hardware_fallback";

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Leitor de Código de Barras GTIN / EAN",
  initialMode = "camera",
  allowRawQrValue = false,
}) => {
  const [activeMode, setActiveMode] = useState<"camera" | "manual">(initialMode);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isNativeScanRunningRef = useRef<boolean>(false);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [zoomAvailable, setZoomAvailable] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [manualCode, setManualCode] = useState<string>("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<ScannerEngineStatus>(
    Capacitor.isNativePlatform() ? "mlkit_native" : "mlkit_web_detector"
  );
  const [useWebFallbackInNative, setUseWebFallbackInNative] = useState<boolean>(false);

  const isNative = Capacitor.isNativePlatform();

  // Play audio beep on barcode detection
  const playBeep = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz (A5)
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle successful scan
  const handleDetectedCode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      let finalValue = trimmed;
      if (!allowRawQrValue) {
        const cleanDigits = trimmed.replace(/\D/g, "").trim();
        if (!cleanDigits || cleanDigits.length < 6) return;
        finalValue = cleanDigits;
      } else {
        // Para QR Code de NFC-e ou código de barras: aceita URL http(s) ou sequência numérica >= 6 dígitos
        const digits = trimmed.replace(/\D/g, "");
        if (!trimmed.startsWith("http") && digits.length >= 6) {
          finalValue = digits;
        } else if (trimmed.length < 6) {
          return;
        }
      }

      setScannedCode(finalValue);
      playBeep();

      if (navigator.vibrate) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {
          // ignore
        }
      }

      // Small delay to show success UI then close
      setTimeout(() => {
        onScanSuccess(finalValue);
        onClose();
      }, 350);
    },
    [allowRawQrValue, onClose, onScanSuccess, playBeep]
  );

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (codeReaderRef.current) {
      try {
        // Stop any active decoding
      } catch {
        // ignore
      }
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
  }, []);

  // Start camera stream (Prioriza SEMPRE o motor Google ML Kit via BarcodeDetector API;
  // usa fallback apenas se houver restrição de hardware/navegador)
  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);
    setScannedCode(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrorMessage(
          "Câmera indisponível neste dispositivo. Certifique-se de acessar via conexão segura HTTPS ou digite o código de barras abaixo."
        );
        setHasPermission(false);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      setHasPermission(true);

      // Check track capabilities for Continuous Autofocus, Torch and Zoom
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as {
          focusMode?: string[];
          torch?: boolean;
          zoom?: { min: number; max: number };
        };

        if (capabilities?.focusMode && capabilities.focusMode.includes("continuous")) {
          try {
            await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
              advanced: [{ focusMode: "continuous" }],
            });
          } catch {
            // ignore
          }
        }

        setTorchAvailable(Boolean(capabilities?.torch));
        setZoomAvailable(Boolean(capabilities?.zoom));
      }

      // ESTRATÉGIA 1 (PADRÃO OBRIGATÓRIO): Motor Google ML Kit / Shape Detection API nativa por hardware
      let mlKitDetectorActive = false;
      const BarcodeDetectorClass = (
        window as unknown as {
          BarcodeDetector?: new (options?: { formats: string[] }) => {
            detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector;

      if (typeof BarcodeDetectorClass === "function") {
        try {
          const detector = new BarcodeDetectorClass({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
          });

          mlKitDetectorActive = true;
          setEngineStatus("mlkit_web_detector");
          let isDetecting = false;

          const scanLoop = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              animationFrameRef.current = requestAnimationFrame(scanLoop);
              return;
            }

            if (!isDetecting) {
              isDetecting = true;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleDetectedCode(barcodes[0].rawValue);
                  return;
                }
              } catch {
                // ignore frame detect error
              } finally {
                isDetecting = false;
              }
            }

            animationFrameRef.current = requestAnimationFrame(scanLoop);
          };

          animationFrameRef.current = requestAnimationFrame(scanLoop);
        } catch {
          mlKitDetectorActive = false;
        }
      }

      // ESTRATÉGIA 2 (SOMENTE SE HOUVER RESTRIÇÃO DE HARDWARE): Fallback de software ZXing
      if (!mlKitDetectorActive && videoRef.current) {
        setEngineStatus("hardware_fallback");
        const reader = new BrowserMultiFormatReader();
        codeReaderRef.current = reader;

        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) {
            handleDetectedCode(result.getText());
          }
        });
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
        setErrorMessage(
          "Permissão da câmera negada. Habilite o acesso à câmera nas configurações ou digite o código manualmente."
        );
      } else {
        setErrorMessage(
          "Não foi possível acessar a câmera. Verifique se outro app está usando a câmera ou digite o código abaixo."
        );
      }
    }
  }, [facingMode, handleDetectedCode, stopCamera]);

  // Native Google ML Kit Scanner for Android/iOS App (Sempre usa Google ML Kit, exceto restrição de hardware)
  const startNativeScanner = useCallback(async () => {
    if (isNativeScanRunningRef.current) return;
    isNativeScanRunningRef.current = true;
    setErrorMessage(null);

    try {
      // 1. Verifica suporte de hardware ao Google ML Kit no aparelho
      const supportedRes = await BarcodeScanner.isSupported().catch(() => ({ supported: false }));
      if (!supportedRes.supported) {
        // Restrição de hardware detectada -> cai automaticamente para o stream de câmera WebView
        isNativeScanRunningRef.current = false;
        setUseWebFallbackInNative(true);
        setEngineStatus("hardware_fallback");
        await startCamera();
        return;
      }

      setEngineStatus("mlkit_native");

      // 2. Verifica se o módulo Google Barcode Scanner (ML Kit) já está disponível no Google Play Services
      try {
        const isAvailable = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if (!isAvailable.available) {
          setEngineStatus("installing_mlkit");
          await new Promise<void>(async (resolve) => {
            let resolved = false;
            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve();
              }
            }, 4500);

            let listenerHandle: { remove: () => Promise<void> } | null = null;
            listenerHandle = await BarcodeScanner.addListener(
              "googleBarcodeScannerModuleInstallProgress",
              (event) => {
                // state 4 = COMPLETED, state 5 = FAILED, state 3 = CANCELED
                if (event.state === 4 || event.state === 5 || event.state === 3) {
                  if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    listenerHandle?.remove().catch(() => {});
                    resolve();
                  }
                }
              }
            ).catch(() => null);

            await BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve();
              }
            });
          });
          setEngineStatus("mlkit_native");
        }
      } catch (err) {
        console.warn("Google ML Kit module check/install:", err);
      }

      // 3. Solicita permissão da câmera
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== "granted" && camera !== "limited") {
        setErrorMessage("Permissão da câmera necessária para escanear com Google ML Kit.");
        isNativeScanRunningRef.current = false;
        return;
      }

      // 4. Abre o scanner oficial Google ML Kit
      const { barcodes } = await BarcodeScanner.scan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.QrCode,
        ],
      });

      isNativeScanRunningRef.current = false;

      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        handleDetectedCode(barcodes[0].rawValue);
      }
    } catch (err) {
      isNativeScanRunningRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Native Google ML Kit scan info:", msg);

      // Se o usuário apenas cancelou/voltou no scanner nativo, mantém o modal aberto ou fecha suavemente
      if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("user")) {
        return;
      }

      // Se houve restrição de hardware ou falha no Google Play Services, ativa o fallback de câmera automático!
      setUseWebFallbackInNative(true);
      setEngineStatus("hardware_fallback");
      await startCamera();
    }
  }, [handleDetectedCode, startCamera]);

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const newTorch = !torchOn;
        await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: newTorch }],
        });
        setTorchOn(newTorch);
      } catch (err) {
        console.warn("Failed to toggle torch:", err);
      }
    }
  };

  // Toggle Zoom (1x <-> 2x)
  const handleToggleZoom = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextZoom = zoomLevel === 1 ? 2 : 1;
        await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ zoom: nextZoom }],
        });
        setZoomLevel(nextZoom);
      } catch (err) {
        console.warn("Failed to toggle zoom:", err);
      }
    }
  };

  // Flip Camera (environment <-> user)
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
      setManualCode("");
      setScannedCode(null);
      setErrorMessage(null);
      setUseWebFallbackInNative(false);
    } else {
      isNativeScanRunningRef.current = false;
      stopCamera();
    }
  }, [isOpen, initialMode, stopCamera]);

  // Single unified effect for camera/Google ML Kit activation (prevents duplicate concurrent calls)
  useEffect(() => {
    if (!isOpen) return;

    if (activeMode === "camera") {
      if (isNative && !useWebFallbackInNative) {
        startNativeScanner();
      } else {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      if (!isNative || useWebFallbackInNative) {
        stopCamera();
      }
    };
  }, [isOpen, activeMode, isNative, useWebFallbackInNative, startCamera, startNativeScanner, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/20 bg-card shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Barcode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {engineStatus === "hardware_fallback" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    <Cpu className="h-2.5 w-2.5" />
                    Modo Compatibilidade (Restrição de Hardware)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" />
                    Google ML Kit Ativo • RSC Sistemas
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-secondary p-1.5 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-secondary/50 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveMode("manual")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMode === "manual"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5 text-primary" />
            <span>Digitar Código (Teclado)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("camera")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMode === "camera"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span>Google ML Kit (Câmera)</span>
          </button>
        </div>

        {activeMode === "manual" ? (
          /* Manual Typing Mode */
          <div className="p-6 space-y-5 bg-card">
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Barcode className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-foreground">
                Digitar Código de Barras (GTIN / EAN)
              </h4>
              <p className="text-xs text-muted-foreground">
                Digite os 8 ou 13 números da embalagem para buscar o produto no RSC Sistemas
              </p>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                autoFocus
                inputMode={allowRawQrValue ? "text" : "numeric"}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: 7891000100103"
                className="w-full rounded-2xl border-2 border-primary/40 bg-background px-4 py-3 text-center text-lg font-mono font-black tracking-widest text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualCode.trim()) {
                    e.preventDefault();
                    handleDetectedCode(manualCode);
                  }
                }}
              />

              <Button
                type="button"
                disabled={!manualCode.trim()}
                onClick={() => handleDetectedCode(manualCode)}
                className="w-full bg-primary text-primary-foreground font-bold text-xs py-2.5 rounded-xl gap-2 shadow-sm"
              >
                <Search className="h-4 w-4" />
                <span>Localizar Produto & Preencher</span>
              </Button>
            </div>

            {/* Quick Insumo Presets */}
            <div className="border-t border-border pt-3.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Atalhos Rápidos de Confeitaria:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Leite Moça 395g", ean: "7891000100103" },
                  { label: "Creme Nestlé 200g", ean: "7891000248706" },
                  { label: "Piracanjuba 395g", ean: "7898215150018" },
                  { label: "Ninho 380g", ean: "7891000053508" },
                  { label: "Nutella 350g", ean: "7898024394122" },
                  { label: "Choc. Dois Frades", ean: "7891149103003" },
                ].map((quick) => (
                  <button
                    key={quick.ean}
                    type="button"
                    onClick={() => {
                      setManualCode(quick.ean);
                      handleDetectedCode(quick.ean);
                    }}
                    className="rounded-lg bg-secondary/80 border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Viewfinder Camera Area */
          <>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
              />

              {/* Native Target Viewfinder Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="relative h-44 w-64 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-primary rounded-br-lg" />

                  {/* Animated Red Laser Scan Line */}
                  <div
                    className="absolute inset-x-2 top-0 h-0.5 bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.9)] animate-pulse"
                    style={{
                      animation: "scanLaser 2s ease-in-out infinite alternate",
                    }}
                  />
                </div>
              </div>

              {/* Feedback Detected Overlay */}
              {scannedCode && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                  <span className="mt-2 text-sm font-extrabold text-white">
                    Código Capturado!
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-300 px-4 truncate max-w-full">
                    {scannedCode}
                  </span>
                </div>
              )}

              {/* Camera Controls on top of video */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {zoomAvailable && (
                  <button
                    type="button"
                    onClick={handleToggleZoom}
                    className="rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-black/80"
                    title="Alternar Zoom 1x / 2x"
                  >
                    {zoomLevel}x
                  </button>
                )}
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`rounded-full p-2 text-xs font-bold shadow-md transition-colors ${
                      torchOn ? "bg-amber-400 text-black" : "bg-black/60 text-white hover:bg-black/80"
                    }`}
                    title="Lanterna / Flash"
                  >
                    <Flashlight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="rounded-full bg-black/60 p-2 text-xs text-white shadow-md hover:bg-black/80"
                  title="Trocar Câmera Frontal/Traseira"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {/* Native Google ML Kit Mode Card */}
              {isNative && !useWebFallbackInNative && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/95 p-6 text-center backdrop-blur-md">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                  </div>
                  <h4 className="text-sm font-black text-foreground">
                    {engineStatus === "installing_mlkit"
                      ? "Preparando Motor Google ML Kit..."
                      : "Leitor Oficial Google ML Kit"}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                    Visão computacional Google ML Kit com autofoco contínuo e leitura instantânea de GTIN/EAN e QR Code.
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
                    <Button
                      type="button"
                      onClick={startNativeScanner}
                      className="bg-primary text-primary-foreground font-bold text-xs shadow-lg"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Abrir Google ML Kit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUseWebFallbackInNative(true);
                      }}
                      className="text-xs font-semibold"
                    >
                      Usar Câmera Integrada
                    </Button>
                  </div>
                </div>
              )}

              {/* Target Hint Badge */}
              <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center px-4">
                <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md">
                  {engineStatus === "hardware_fallback"
                    ? "Aponte a câmera para o código (Modo Compatibilidade de Hardware)"
                    : "Google ML Kit Ativo — Aponte para o Código de Barras ou QR Code"}
                </span>
              </div>
            </div>

            {/* Error message if camera is blocked */}
            {errorMessage && (
              <div className="border-t border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </>
        )}

        {/* Manual GTIN Input Fallback */}
        <div className="border-t border-border bg-card p-4 space-y-2">
          <label className="block text-[11px] font-bold text-foreground">
            Ou digite/edite o código de barras (GTIN/EAN) manualmente:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode={allowRawQrValue ? "text" : "numeric"}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 7891000100103"
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  e.preventDefault();
                  handleDetectedCode(manualCode);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={!manualCode.trim()}
              onClick={() => handleDetectedCode(manualCode)}
              className="bg-primary text-primary-foreground font-bold text-xs"
            >
              <Search className="h-3.5 w-3.5 mr-1" />
              Aplicar
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 6%; }
          100% { top: 92%; }
        }
      `}</style>
    </div>
  );
};
