import React, { useState, useMemo, useEffect } from "react";
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
      "authentic Brazilian artisanal geladinho gourmet (also called sacolé, chup-chup, dindin), frozen ice pop dessert packaged inside an authentic long clear transparent plastic tube sleeve bag (sacolinha plástica tubular de geladinho), tightly tied with a knot or ribbon at the top. The rich thick creamy marbled filling with swirls of cream and toppings is clearly visible through the clear plastic pouch. Cold frosty freezer condensation and fine ice droplets glistening on the plastic bag surface. Frozen handheld treat displayed on an artisanal tabletop with raw ingredients nearby. Strictly NOT served in a drinking glass cup, NOT on a porcelain plate, NOT in a ceramic bowl. Authentic handheld frozen ice pop tubular plastic bag packaging",
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

// Exemplos gastronômicos curados para teste rápido
const CULINARY_DEMO_PRESETS = [
  {
    flavor: "Geladinho Gourmet Ninho com Nutella",
    packaging: "saquinho_geladinho" as CulinaryPackagingType,
    category: "Gourmet Gelado no Saquinho",
    demoImg: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=900&q=80",
  },
  {
    flavor: "Geladinho Gourmet de Maracujá Trufado",
    packaging: "saquinho_geladinho" as CulinaryPackagingType,
    category: "Gourmet Gelado no Saquinho",
    demoImg: "https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=900&q=80",
  },
  {
    flavor: "Pão de Mel com Doce de Leite & Casquinha Crocante",
    packaging: "caixa_artesanal" as CulinaryPackagingType,
    category: "Confeitaria & Chocolateria",
    demoImg: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
  },
  {
    flavor: "Bolo no Pote Red Velvet com Cream Cheese",
    packaging: "pote_redondo" as CulinaryPackagingType,
    category: "Sobremesas no Pote",
    demoImg: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=900&q=80",
  },
  {
    flavor: "Bombom de Morango Aberto na Taça",
    packaging: "copo_taca" as CulinaryPackagingType,
    category: "Doceria na Taça",
    demoImg: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80",
  },
];

function generateAutomaticPrompt(
  productName: string,
  packaging: CulinaryPackagingType,
  style: CulinaryPhotoStyle,
  customNotes: string
): string {
  const pkg = PACKAGING_PRESETS[packaging];
  const stl = STYLE_PRESETS[style];
  const notesPart = customNotes.trim() ? `, additional garnish and detail: ${customNotes.trim()}` : "";
  return `Professional gourmet culinary advertisement photography of "${productName}". Packaging presentation: ${pkg.promptSnippet}. Setting and camera style: ${stl.promptTemplate}${notesPart}. Ultra sharp focus, mouth-watering appetizing food styling, commercial quality 8k photorealistic.`;
}

export const CulinaryImageStudioModal: React.FC<CulinaryImageStudioModalProps> = ({
  isOpen,
  onClose,
  fichasTecnicas,
  initialFlavor,
  onOpenSettingsModal,
}) => {
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

  // Gerador de imagens chamando a API do Google Gemini / Imagen
  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setQuotaWarning(false);

    const promptToSend = editablePrompt.trim() || generateAutomaticPrompt(productName, packagingType, photoStyle, customNotes);
    const apiKey = geminiConfig.apiKey?.trim();

    if (!apiKey) {
      // Sem chave configurada: carrega o mockup ultra-realista curado e orienta o usuário
      await new Promise((r) => setTimeout(r, 1000));
      const match =
        CULINARY_DEMO_PRESETS.find((p) => p.packaging === packagingType) ||
        CULINARY_DEMO_PRESETS[0];

      setGeneratedImageUrl(match.demoImg);
      setIsGenerating(false);
      setGenerationError(
        "Modo Demonstração Ativo: Nenhuma chave da API Google Gemini cadastrada para esta empresa. Para gerar fotos inéditas, configure a Chave de API nas Opções da Empresa."
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

      // Se a Google retornou 404 ou restrição de cota do Imagen no AI Studio
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson?.error?.message || "";
      
      const match =
        CULINARY_DEMO_PRESETS.find((p) => p.packaging === packagingType) ||
        CULINARY_DEMO_PRESETS[0];

      setGeneratedImageUrl(match.demoImg);
      setQuotaWarning(true);
      setGenerationError(
        `Aviso da API Google (${response.status}): ${
          errorMsg.includes("not found") || response.status === 404
            ? "O Google AI Studio liberou sua chave para texto (Gemini 2.5 Flash), mas a geração nativa de imagens pelo modelo Google Imagen requer faturamento 'Pay-As-You-Go' ativo na sua conta do Google AI Studio."
            : errorMsg || "Cota de geração de imagem do Google AI Studio indisponível no momento."
        }`
      );
    } catch (err: any) {
      const match =
        CULINARY_DEMO_PRESETS.find((p) => p.packaging === packagingType) ||
        CULINARY_DEMO_PRESETS[0];
      setGeneratedImageUrl(match.demoImg);
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
    link.download = `foto_culinaria_${cleanFileName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(editablePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
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
                  Google Imagen & Gemini 2.5
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Gere fotos profissionais no saquinho de geladinho, pote ou taça com prompt 100% editável
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
                Nome do Prato / Sobremesa / Sabor *
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
                  {fichasTecnicas.slice(0, 4).map((f) => (
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

            {/* 2. NOVO: Tipo de Embalagem / Apresentação Real (Crucial para Geladinhos) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span>Embalagem / Apresentação Real *</span>
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
                Estilo Fotográfico Desejado *
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
                  placeholder="Ex: bastante calda escorrendo, gotas de condensação"
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* 5. NOVO: PROMPT GASTRONÔMICO 100% EDITÁVEL */}
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
                <span>Você pode alterar palavras em português ou inglês antes de gerar.</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                >
                  {copiedPrompt ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copiedPrompt ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>

            {/* Status da Chave de API */}
            <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="font-bold text-foreground text-[11px] block">
                    {hasApiKey ? "Chave de IA Google Ativa na Empresa" : "Modo Demonstração (Sem Chave)"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {hasApiKey
                      ? "Conectado ao Google AI Studio da sua empresa"
                      : "Configure nas Opções da Empresa para gerar fotos inéditas em 4K"}
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
                  Configurar Chave
                </Button>
              )}
            </div>

            {/* Botão Principal de Geração */}
            <Button
              type="button"
              disabled={isGenerating || !productName.trim()}
              onClick={handleGenerateImage}
              className="w-full bg-gradient-to-r from-amber-500 via-rose-500 to-primary text-white font-black text-xs py-3 rounded-2xl shadow-md hover:opacity-95 transition-all gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Criando Fotografia Culinária com IA...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>Gerar Imagem Culinária com IA</span>
                </>
              )}
            </Button>
          </div>

          {/* Coluna 2: Visualizador & Exportação (6 Colunas) */}
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

                {/* Bloco de Tratamento de Erro / Orientação Google AI Studio */}
                {generationError && (
                  <div className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Status da Conexão com Google AI:</span>
                        <p className="mt-0.5 leading-relaxed">{generationError}</p>
                      </div>
                    </div>

                    {/* Botões Rápidos para Gerar Grátis na Web */}
                    {quotaWarning && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-2">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                          💡 Dica PereiraLabs: Gere Grátis e com 1 Clique em Qualquer IA
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleCopyPrompt();
                              window.open("https://gemini.google.com", "_blank");
                            }}
                            className="text-[10px] h-7 px-2.5 bg-card hover:bg-secondary border-amber-500/40 text-foreground font-bold gap-1 rounded-lg"
                          >
                            <ExternalLink className="h-3 w-3 text-primary" />
                            Abrir Google Gemini Web (Grátis)
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleCopyPrompt();
                              window.open("https://chatgpt.com", "_blank");
                            }}
                            className="text-[10px] h-7 px-2.5 bg-card hover:bg-secondary border-amber-500/40 text-foreground font-bold gap-1 rounded-lg"
                          >
                            <ExternalLink className="h-3 w-3 text-emerald-500" />
                            ChatGPT / DALL-E (Grátis)
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleCopyPrompt();
                              window.open("https://copilot.microsoft.com", "_blank");
                            }}
                            className="text-[10px] h-7 px-2.5 bg-card hover:bg-secondary border-amber-500/40 text-foreground font-bold gap-1 rounded-lg"
                          >
                            <ExternalLink className="h-3 w-3 text-blue-500" />
                            Copilot Designer (Grátis)
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                          (Ao clicar, o prompt do saquinho de geladinho já é copiado automaticamente para a sua área de transferência!)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Ações da Imagem Gerada */}
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
                      const zapText = `📸 *Foto Culinária Criada com IA PereiraLabs*\n\n🍰 *Produto:* ${productName}\n📦 *Embalagem:* ${PACKAGING_PRESETS[packagingType].name}\n✨ *Estilo:* ${STYLE_PRESETS[photoStyle].name}\n🖼️ *Link/Arquivo:* Gerado pelo Estúdio Culinário`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(zapText)}`, "_blank");
                    }}
                    className="text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="font-bold text-foreground text-sm">
                    Sua foto culinária aparecerá aqui
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Escolha a embalagem (saquinho, pote ou taça), o estilo e clique em <strong>"Gerar Imagem Culinária com IA"</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {CULINARY_DEMO_PRESETS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setProductName(item.flavor);
                        setPackagingType(item.packaging);
                        setGeneratedImageUrl(item.demoImg);
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    >
                      {PACKAGING_PRESETS[item.packaging].icon} {item.flavor.split(" ")[0]} {item.flavor.split(" ")[1]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between border-t border-border/80 bg-card/90 px-5 py-3 text-xs text-muted-foreground">
          <span>
            Tecnologia <strong>Google Imagen & PereiraLabs AI</strong> • Gastronomia Digital
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
