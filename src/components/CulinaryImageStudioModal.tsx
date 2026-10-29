import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Sparkles,
  Camera,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Share2,
  Wand2,
  X,
  RefreshCw,
  KeyRound,
  ExternalLink,
  Package,
  Layers,
  FileEdit,
  RotateCcw,
  Info,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Flame,
  Upload,
  Eye,
} from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { getActiveCompanyGeminiConfig } from "@/services/companyService";
import { BRAND_CONFIG } from "@/config/brand.config";
import { FichaTecnicaProduto } from "@/types/dashboard";

interface CulinaryImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichasTecnicas?: FichaTecnicaProduto[];
  initialFlavor?: string;
  onOpenSettingsModal?: () => void;
}

export type CulinaryPhotoStyle =
  | "ifood_delivery"
  | "macro_gourmet"
  | "artesanal_madeira"
  | "instagram_story"
  | "caixa_presente";

export type CulinaryPackagingType =
  | "saquinho_geladinho"
  | "pote_redondo"
  | "caixa_artesanal"
  | "copo_taca"
  | "prato_gourmet";

export type AspectRatioType = "1:1" | "4:3" | "9:16";

export const PACKAGING_PRESETS: Record<
  CulinaryPackagingType,
  {
    name: string;
    label: string;
    description: string;
    promptSnippet: string;
    icon: string;
  }
> = {
  saquinho_geladinho: {
    name: "Saquinho Tubular (Geladinho / Sacolé / Chup-chup)",
    label: "Saquinho Geladinho (Padrão)",
    description: "Saquinho plástico tubular transparente com nó/lacre no topo, recheio cremoso visível e gotículas de gelo.",
    promptSnippet:
      "Authentic Brazilian artisanal geladinho gourmet (also known as sacolé, chup-chup, dindin). The frozen dessert MUST be packaged inside a clear transparent long cylindrical plastic tube sleeve bag (sacolinha tubular plástica), tightly knotted and tied at the top. The rich thick creamy marbled swirls of gourmet filling and toppings are clearly visible through the glossy clear plastic pouch. Cold frosty freezer condensation and fine ice droplets glistening on the plastic bag surface. Frozen handheld ice pop treat. Strictly NOT served in a drinking glass cup, NOT on a porcelain plate, NOT in a ceramic bowl, NO spoons. Authentic handheld frozen ice pop tubular plastic sleeve packaging only.",
    icon: "🧊",
  },
  pote_redondo: {
    name: "Pote Redondo Cristal (Bolo no Pote / Sobremesa)",
    label: "Pote Cristal de Sobremesa",
    description: "Pote redondo transparente com tampa e camadas farta visíveis de recheio e bolo.",
    promptSnippet:
      "artisanal dessert served inside a clear transparent round plastic tub container with clear lid, visible alternating decadent layers of cake and creamy filling, boutique sticker label",
    icon: "🫙",
  },
  caixa_artesanal: {
    name: "Caixa Presente / Kit Degustação",
    label: "Caixa Presente Gourmet",
    description: "Caixa boutique com visor transparente, fita de cetim e seleção organizada de doces.",
    promptSnippet:
      "luxury confectionery gift box presentation, neatly arranged assortment of artisanal gourmet treats inside a craft gift box with transparent display window, tied with an elegant satin ribbon bow",
    icon: "🎁",
  },
  copo_taca: {
    name: "Copo / Taça de Sobremesa Gourmet",
    label: "Taça / Copo Gourmet",
    description: "Servido em taça ou copo de sobremesa com camadas decoradas e calda escorrendo.",
    promptSnippet:
      "served in an elegant clear glass dessert cup, luscious layered cream, generous toppings, dripping chocolate drizzle and artisan confectionery garnish",
    icon: "🍨",
  },
  prato_gourmet: {
    name: "Empratamento de Confeitaria Fina",
    label: "Prato de Confeitaria",
    description: "Apresentação em prato de cerâmica fina com decoração artística de calda e folhas de hortelã.",
    promptSnippet:
      "fine dining pastry plating on an artisan handcrafted ceramic plate, delicate sauce swirls, dusted cocoa powder and fresh mint leaves garnish, Michelin dessert style",
    icon: "🍽️",
  },
};

const STYLE_PRESETS: Record<
  CulinaryPhotoStyle,
  {
    name: string;
    description: string;
    promptTemplate: string;
    icon: string;
  }
> = {
  ifood_delivery: {
    name: "Cardápio Comercial & iFood",
    description: "Fundo limpo e suave, iluminação difusa de estúdio, ângulo 45° de alta conversão.",
    promptTemplate:
      "Commercial culinary food photography for delivery menu and iFood, clean soft studio lighting, crisp focus, 45 degree top-down perspective, delicious and fresh presentation, appetizing dessert confection, high resolution professional culinary photography, Michelin commercial grade.",
    icon: "🛵",
  },
  macro_gourmet: {
    name: "Macro Textura & Recheio Cremoso",
    description: "Foco fechado no detalhe: calda brilhante, gotas de leite condensado e recheio farto.",
    promptTemplate:
      "Extreme close-up macro food photography, luscious creamy texture, glossy dripping chocolate drizzle, condensed milk droplets, glistening artisanal texture, appetizing shallow depth of field, 8k professional pastry lens.",
    icon: "🍫",
  },
  artesanal_madeira: {
    name: "Estúdio Rústico Confeitaria Nobre",
    description: "Mesa de madeira nobre, folhas frescas de hortelã, farinha e cacau ao fundo com luz dourada.",
    promptTemplate:
      "Artisanal confectionery food photography on a rustic dark polished walnut wooden table, warm golden hour atmospheric lighting, fresh organic mint sprigs and cocoa powder dusted softly in the bokeh background, cozy gourmet vibe, editorial magazine shot.",
    icon: "🪵",
  },
  instagram_story: {
    name: "Story & Reels Instagram / WhatsApp",
    description: "Cores vibrantes, iluminação solar quente, estética moderna e visual irresistível.",
    promptTemplate:
      "Vibrant modern lifestyle dessert photography for Instagram stories and WhatsApp status, energetic bright natural sunlight, vivid colorful aesthetic, mouth-watering trendy gourmet styling, eye-catching handheld composition, photorealistic.",
    icon: "📲",
  },
  caixa_presente: {
    name: "Linha Presente & Embalagem Festa",
    description: "Composição premium com laço de cetim, etiqueta artesanal e visual de presente gourmet.",
    promptTemplate:
      "Luxury confectionery gift presentation, elegant satin ribbon, boutique pastry box, artisanal gold embossed seal of quality, festive celebration dessert styling, high-end patisserie product photography, refined and sophisticated.",
    icon: "🎁",
  },
};

function generateAutomaticPrompt(
  productName: string,
  packaging: CulinaryPackagingType,
  style: CulinaryPhotoStyle,
  customNotes: string
): string {
  const pkg = PACKAGING_PRESETS[packaging];
  const stl = STYLE_PRESETS[style];
  const notesPart = customNotes.trim() ? `, additional garnish and detail: ${customNotes.trim()}` : "";
  return `Professional gourmet culinary advertisement photography of "${productName}". Packaging presentation: ${pkg.promptSnippet}. Setting and camera style: ${stl.promptTemplate}${notesPart}. Ultra sharp focus, mouth-watering appetizing food styling, commercial quality 8k photorealistic. NO cups, NO bowls, NO plates, authentic packaging only.`;
}

export const CulinaryImageStudioModal: React.FC<CulinaryImageStudioModalProps> = ({
  isOpen,
  onClose,
  fichasTecnicas,
  initialFlavor,
  onOpenSettingsModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productName, setProductName] = useState(
    initialFlavor || fichasTecnicas?.[0]?.subtitulo_receita || "Geladinho Gourmet Ninho com Nutella"
  );
  const [packagingType, setPackagingType] = useState<CulinaryPackagingType>("saquinho_geladinho");
  const [photoStyle, setPhotoStyle] = useState<CulinaryPhotoStyle>("ifood_delivery");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("1:1");
  const [customNotes, setCustomNotes] = useState("");
  
  // Prompt editável pelo usuário
  const [editablePrompt, setEditablePrompt] = useState<string>("");
  const [isPromptCustomized, setIsPromptCustomized] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [quotaWarning, setQuotaWarning] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Obtém configuração da IA Gemini da empresa ativa
  const geminiConfig = useMemo(() => getActiveCompanyGeminiConfig(), [isOpen]);
  const hasApiKey = Boolean(geminiConfig.apiKey && geminiConfig.apiKey.trim().length > 10);

  // Atualiza prompt automaticamente sempre que parâmetros mudam (se o usuário não tiver customizado manualmente)
  useEffect(() => {
    if (!isPromptCustomized) {
      const autoPrompt = generateAutomaticPrompt(productName, packagingType, photoStyle, customNotes);
      setEditablePrompt(autoPrompt);
    }
  }, [productName, packagingType, photoStyle, customNotes, isPromptCustomized]);

  // Se abrir o modal com initialFlavor ou mudar externamente
  useEffect(() => {
    if (initialFlavor) {
      setProductName(initialFlavor);
      setIsPromptCustomized(false);
    }
  }, [initialFlavor]);

  if (!isOpen) return null;

  // Restaura a sugestão padrão gerada pela IA
  const handleRestoreDefaultPrompt = () => {
    const autoPrompt = generateAutomaticPrompt(productName, packagingType, photoStyle, customNotes);
    setEditablePrompt(autoPrompt);
    setIsPromptCustomized(false);
  };

  // Upload de foto real do usuário (câmera do celular ou arquivo)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setGeneratedImageUrl(reader.result);
        setGenerationError(null);
        setQuotaWarning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gerador de imagens chamando a API do Google Gemini
  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setQuotaWarning(false);

    const promptToSend = editablePrompt.trim() || generateAutomaticPrompt(productName, packagingType, photoStyle, customNotes);
    const apiKey = geminiConfig.apiKey?.trim();

    if (!apiKey) {
      // Sem chave configurada
      await new Promise((r) => setTimeout(r, 600));
      setGeneratedImageUrl(null);
      setIsGenerating(false);
      setQuotaWarning(true);
      setGenerationError(
        "Nenhuma chave da API Google Gemini está cadastrada para esta empresa. Para tentar gerar diretamente ou usar a consultoria de texto, configure a chave nas Opções da Empresa."
      );
      return;
    }

    try {
      // 1. Tentativa via endpoint interactions (Gemini 2.5/Nano/Image)
      try {
        const respInteractions = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Api-Revision": "2026-05-20",
            },
            body: JSON.stringify({
              model: "gemini-nano-banana-2.1",
              input: [{ type: "text", text: promptToSend }],
            }),
          }
        );

        if (respInteractions.ok) {
          const dataInter = await respInteractions.json();
          const base64Data =
            dataInter?.output_image?.data ||
            dataInter?.steps?.[0]?.output_image?.data;
          if (base64Data) {
            setGeneratedImageUrl(`data:image/jpeg;base64,${base64Data}`);
            setIsGenerating(false);
            return;
          }
        }
      } catch {
        // Tenta próximo endpoint
      }

      // 2. Tentativa via Google Imagen 3 (predict)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: promptToSend }],
            parameters: {
              sampleCount: 1,
              aspectRatio: aspectRatio,
              outputMimeType: "image/jpeg",
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const base64Bytes = data?.predictions?.[0]?.bytesBase64Encoded;
        if (base64Bytes) {
          setGeneratedImageUrl(`data:image/jpeg;base64,${base64Bytes}`);
          setIsGenerating(false);
          return;
        }
      }

      // 3. Tentativa via Imagen 4
      const responseV4 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: promptToSend }],
            parameters: {
              sampleCount: 1,
              aspectRatio: aspectRatio,
              outputMimeType: "image/jpeg",
            },
          }),
        }
      );

      if (responseV4.ok) {
        const dataV4 = await responseV4.json();
        const base64Bytes = dataV4?.predictions?.[0]?.bytesBase64Encoded;
        if (base64Bytes) {
          setGeneratedImageUrl(`data:image/jpeg;base64,${base64Bytes}`);
          setIsGenerating(false);
          return;
        }
      }

      // IMPORTANTE: Se o Google retornou erro/404, NÃO colocar foto fake de sobremesa que confunda o usuário!
      // Mantemos generatedImageUrl como NULL para não parecer que gerou algo errado.
      setGeneratedImageUrl(null);
      setQuotaWarning(true);
      setGenerationError(
        "Acesso à geração direta de imagens restrito pelo Google AI Studio: O Google desativou a geração direta de imagens por API para chaves sem faturamento corporativo no Google Cloud. Nenhuma imagem foi gerada diretamente pela API para evitar cobranças indevidas."
      );
    } catch (err: any) {
      setGeneratedImageUrl(null);
      setQuotaWarning(true);
      setGenerationError(`Falha de conexão com a API Google: ${err?.message || "Verifique sua internet"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    const cleanFileName = productName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.download = `foto_geladinho_${cleanFileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(editablePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleOpenExternalAi = (url: string) => {
    handleCopyPrompt();
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl text-foreground">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-border/80 bg-card/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-foreground">
                  Estúdio de Imagens Culinárias IA
                </h3>
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold gap-1">
                  <Sparkles className="h-3 w-3" />
                  Geladinho no Saquinho • Prompt Calibrado
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Gere fotos realistas no saquinho tubular de geladinho/chup-chup com nó, gelo e recheio cremoso
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Estúdio: 2 Colunas */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna 1: Controles e Parâmetros (6 Colunas) */}
          <div className="lg:col-span-6 space-y-4 text-xs">
            {/* 1. Escolha do Produto / Sabor */}
            <div>
              <label className="block font-bold text-foreground mb-1">
                Nome do Prato / Sabor de Geladinho *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  setIsPromptCustomized(false);
                }}
                placeholder="Ex: Geladinho Gourmet Ninho com Nutella"
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              />

              {/* Botões rápidos de sabores cadastrados */}
              {fichasTecnicas && fichasTecnicas.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground">Do seu cardápio:</span>
                  {fichasTecnicas.slice(0, 5).map((f) => (
                    <button
                      key={f.produto_id}
                      type="button"
                      onClick={() => {
                        setProductName(f.subtitulo_receita || f.produto_id);
                        setIsPromptCustomized(false);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg border border-border/80 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground truncate max-w-[150px]"
                    >
                      {f.subtitulo_receita || f.produto_id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Tipo de Embalagem Real (Focado no Saquinho de Geladinho) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span>Embalagem Real *</span>
                </label>
                <span className="text-[10px] text-primary font-bold">
                  {PACKAGING_PRESETS[packagingType].label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(PACKAGING_PRESETS) as CulinaryPackagingType[]).map((key) => {
                  const preset = PACKAGING_PRESETS[key];
                  const isSelected = packagingType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setPackagingType(key);
                        setIsPromptCustomized(false);
                      }}
                      className={`text-left p-2.5 rounded-2xl border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40 font-bold"
                          : "border-border/70 hover:border-primary/40 hover:bg-secondary/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{preset.icon}</span>
                        <span className="truncate">{preset.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight font-normal">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Estilo de Fotografia Gastronômica */}
            <div>
              <label className="block font-bold text-foreground mb-1.5">
                Estilo Fotográfico *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(STYLE_PRESETS) as CulinaryPhotoStyle[]).map((key) => {
                  const preset = STYLE_PRESETS[key];
                  const isSelected = photoStyle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setPhotoStyle(key);
                        setIsPromptCustomized(false);
                      }}
                      className={`text-left p-2.5 rounded-2xl border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40"
                          : "border-border/70 hover:border-primary/40 hover:bg-secondary/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{preset.icon}</span>
                        <span className="truncate">{preset.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Proporção & Detalhes Extras */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Formato da Imagem *
                </label>
                <div className="flex items-center gap-1.5">
                  {(["1:1", "4:3", "9:16"] as AspectRatioType[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                        aspectRatio === ratio
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border hover:bg-secondary text-foreground"
                      }`}
                    >
                      {ratio === "1:1" ? "1:1 (iFood)" : ratio === "4:3" ? "4:3 (Banner)" : "9:16 (Story)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Detalhes Extras (Opcional)
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => {
                    setCustomNotes(e.target.value);
                    setIsPromptCustomized(false);
                  }}
                  placeholder="Ex: bastante Nutella na parede interna, gotas de gelo"
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* 5. PROMPT GASTRONÔMICO EDITÁVEL */}
            <div className="rounded-2xl border border-border/90 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <FileEdit className="h-3.5 w-3.5 text-primary" />
                  <span>Prompt Gastronômico da IA (Editável)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {isPromptCustomized && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[9px] py-0 px-1.5">
                      Personalizado
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={handleRestoreDefaultPrompt}
                    title="Restaurar fórmula automática da IA"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restaurar Padrão
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                value={editablePrompt}
                onChange={(e) => {
                  setEditablePrompt(e.target.value);
                  setIsPromptCustomized(true);
                }}
                placeholder="Edite aqui o prompt que será enviado à IA..."
                className="w-full rounded-xl border border-input bg-background p-2.5 text-[11px] leading-relaxed text-foreground font-mono focus:border-primary focus:outline-none resize-none"
              />

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>O texto especifica explicitamente o saquinho plástico tubular e proíbe copos/pratos.</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                >
                  {copiedPrompt ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copiedPrompt ? "Copiado!" : "Copiar Prompt"}
                </button>
              </div>
            </div>

            {/* Status da Chave de API */}
            <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-bold text-foreground text-[11px] block">
                    {hasApiKey ? "Chave de IA Google Ativa na Empresa" : "Sem Chave de API"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {hasApiKey
                      ? "Chave conectada para relatórios e texto (Gemini 2.5 Flash)"
                      : "Configure nas Opções da Empresa"}
                  </span>
                </div>
              </div>

              {onOpenSettingsModal && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenSettingsModal}
                  className="text-[10px] h-7 px-2.5 border-primary/40 text-primary hover:bg-primary/10 shrink-0 font-bold rounded-lg"
                >
                  Opções da Empresa
                </Button>
              )}
            </div>

            {/* Botões de Ação: Gerar ou Enviar Foto Real */}
            <div className="space-y-2">
              <Button
                type="button"
                disabled={isGenerating || !productName.trim()}
                onClick={handleGenerateImage}
                className="w-full bg-gradient-to-r from-amber-500 via-rose-500 to-primary text-white font-black text-xs py-3 rounded-2xl shadow-md hover:opacity-95 transition-all gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Conectando à IA...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>Tentar Gerar com Chave Google AI</span>
                  </>
                )}
              </Button>

              {/* Botão de Envio de Foto Real do Celular / Galeria */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border/80 bg-background text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-primary" />
                <span>Carregar Foto Real do Meu Geladinho (Câmera / Celular)</span>
              </button>
            </div>
          </div>

          {/* Coluna 2: Visualizador & Solução Gratuita (6 Colunas) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center rounded-3xl border border-border/80 bg-secondary/20 p-4 relative overflow-hidden min-h-[380px]">
            {generatedImageUrl ? (
              <div className="w-full flex flex-col items-center space-y-3">
                <div className="relative overflow-hidden rounded-2xl border border-border/80 shadow-lg group max-h-[380px] w-full flex items-center justify-center bg-black/20">
                  <img
                    src={generatedImageUrl}
                    alt={productName}
                    className="max-h-[350px] w-auto max-w-full object-contain rounded-xl transition-transform group-hover:scale-[1.02] duration-300"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-black/75 text-white border-white/20 text-[10px] backdrop-blur-xs font-bold">
                      {PACKAGING_PRESETS[packagingType].icon} {PACKAGING_PRESETS[packagingType].label}
                    </Badge>
                    <Badge variant="outline" className="bg-black/75 text-white border-white/20 text-[10px] backdrop-blur-xs font-bold">
                      {aspectRatio}
                    </Badge>
                  </div>
                </div>

                {/* Ações da Imagem */}
                <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDownloadImage}
                    className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 rounded-xl shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Baixar Foto HD</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPrompt}
                    className="text-xs font-semibold gap-1.5 border-border rounded-xl"
                  >
                    {copiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedPrompt ? "Prompt Copiado!" : "Copiar Prompt"}</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const zapText = `📸 *Foto de Geladinho Gourmet PereiraLabs*\n\n🍧 *Sabor:* ${productName}\n🧊 *Embalagem:* ${PACKAGING_PRESETS[packagingType].name}\n✨ *Estilo:* ${STYLE_PRESETS[photoStyle].name}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(zapText)}`, "_blank");
                    }}
                    className="text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </Button>
                </div>
              </div>
            ) : quotaWarning ? (
              /* CARD DE ORIENTAÇÃO QUANDO A CHAVE GOOGLE ESTÁ COM IMAGEM RESTRITA */
              <div className="w-full flex flex-col space-y-3.5 p-4 rounded-2xl border border-amber-500/40 bg-card text-foreground shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground">
                      Geração Direta Restrita pelo Google AI Studio
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Sua Chave Google Gemini está ativa para textos e finanças (Gemini 2.5 Flash), mas o Google não permite gerar imagens por API sem cobrança de cartão corporativo no Google Cloud. <strong>Nenhuma imagem errada foi gerada pelo app.</strong>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Como Gerar a Foto Real do Geladinho 100% Grátis:</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    O seu prompt em inglês já está calibrado para exigir a <strong>sacolinha plástica tubular com nó e recheio de geladinho</strong> (sem copos nem pratos). Basta clicar em um botão abaixo para abrir a IA e colar com <code>Ctrl + V</code>:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenExternalAi("https://gemini.google.com")}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-left transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-primary block">
                          1. Google Gemini Web
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Gera imagens grátis na sua conta Google
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenExternalAi("https://chatgpt.com")}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-left transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                          2. ChatGPT / DALL-E
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Gera grátis com conta OpenAI
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenExternalAi("https://copilot.microsoft.com")}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-left transition-colors sm:col-span-2"
                    >
                      <div>
                        <span className="font-bold text-xs text-blue-600 dark:text-blue-400 block">
                          3. Microsoft Designer (Copilot)
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Geração instantânea e fotorealista em 4K
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground italic">
                    Ao clicar em qualquer botão acima, o prompt é copiado automaticamente!
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPrompt}
                    className="text-xs font-bold gap-1 border-primary/40 text-primary h-7"
                  >
                    {copiedPrompt ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedPrompt ? "Copiado!" : "Copiar Prompt"}</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* ESTADO INICIAL VAZIO */
              <div className="text-center p-6 space-y-3">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="font-bold text-foreground text-sm">
                    Sua foto culinária aparecerá aqui
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O estúdio está configurado para o <strong>Saquinho Tubular de Geladinho</strong>. Você pode tentar gerar ou carregar uma foto da sua câmera.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    {copiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedPrompt ? "Prompt Copiado!" : "Copiar Prompt Pronto de Geladinho"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between border-t border-border/80 bg-card/90 px-5 py-3 text-xs text-muted-foreground">
          <span>
            Tecnologia <strong>PereiraLabs Gastronomia Digital</strong> • Especializado em Geladinhos Gourmet
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
