import React, { useState, useMemo } from "react";
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
  Layers,
  ChefHat,
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

export type AspectRatioType = "1:1" | "4:3" | "9:16";

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
    category: "Gourmet Gelado",
    demoImg: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80",
  },
  {
    flavor: "Pão de Mel com Doce de Leite & Casquinha Crocante",
    category: "Confeitaria & Chocolateria",
    demoImg: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
  },
  {
    flavor: "Bolo no Pote Red Velvet com Cream Cheese",
    category: "Sobremesas Artesanais",
    demoImg: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80",
  },
  {
    flavor: "Geladinho Gourmet de Maracujá Trufado",
    category: "Gourmet Gelado",
    demoImg: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80",
  },
  {
    flavor: "Bombom de Morango Aberto na Taça",
    category: "Doceria Fina",
    demoImg: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80",
  },
];

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
  const [photoStyle, setPhotoStyle] = useState<CulinaryPhotoStyle>("ifood_delivery");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("1:1");
  const [customNotes, setCustomNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);

  // Obtém configuração da IA Gemini da empresa ativa
  const geminiConfig = useMemo(() => getActiveCompanyGeminiConfig(), [isOpen]);
  const hasApiKey = Boolean(geminiConfig.apiKey && geminiConfig.apiKey.trim().length > 10);

  // Monta o prompt gastrônomico em inglês para máxima precisão de render
  const fullPrompt = useMemo(() => {
    const styleInfo = STYLE_PRESETS[photoStyle];
    const notesPart = customNotes.trim() ? `, ${customNotes.trim()}` : "";
    return `Gourmet Brazilian confectionery food shot: "${productName}"${notesPart}. ${styleInfo.promptTemplate}`;
  }, [productName, photoStyle, customNotes]);

  if (!isOpen) return null;

  // Gerador de imagens chamando a API do Google Gemini / Imagen
  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    const apiKey = geminiConfig.apiKey?.trim();

    if (!apiKey) {
      // Sem chave configurada: carrega o mockup ultra-realista curado e orienta o usuário a inserir a chave da empresa
      await new Promise((r) => setTimeout(r, 1200));
      const match = CULINARY_DEMO_PRESETS.find(
        (p) => productName.toLowerCase().includes(p.flavor.toLowerCase().split(" ")[0])
      ) || CULINARY_DEMO_PRESETS[0];

      setGeneratedImageUrl(match.demoImg);
      setIsGenerating(false);
      setGenerationError(
        "Modo Demonstração Ativo: Configure sua Chave de API Google Gemini nas Configurações da Empresa para gerar imagens 100% inéditas com o Google Imagen."
      );
      return;
    }

    try {
      // 1. Tenta o endpoint Google Imagen 3 GA
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: fullPrompt }],
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

      // 2. Se o modelo Imagen 3 não estiver liberado na conta do usuário, tenta Imagen 4
      const responseV4 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: fullPrompt }],
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

      // Se a conta Google tiver cota restrita de imagem, exibe orientação clara e demonstração
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson?.error?.message || "Serviço de geração de imagem do Google AI indisponível.";
      
      const match = CULINARY_DEMO_PRESETS[0];
      setGeneratedImageUrl(match.demoImg);
      setGenerationError(
        `Aviso da API Google (${response.status}): ${errorMsg}. Exibindo modelo culinário de referência enquanto a permissão do Google Imagen é ativada no AI Studio.`
      );
    } catch (err: any) {
      const match = CULINARY_DEMO_PRESETS[0];
      setGeneratedImageUrl(match.demoImg);
      setGenerationError(`Falha de conexão com a API Google: ${err?.message || "Verifique sua conexão"}`);
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
    navigator.clipboard.writeText(fullPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl text-foreground">
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
                  Google Imagen / Gemini
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Gere fotos profissionais de doces, geladinhos e pratos para iFood, Instagram e cardápio
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

        {/* Corpo do Estúdio: 2 Colunas (Controles à Esquerda / Visualizador à Direita) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna 1: Parâmetros Gastronômicos (5 Colunas) */}
          <div className="lg:col-span-6 space-y-4 text-xs">
            {/* 1. Escolha do Produto / Sabor */}
            <div>
              <label className="block font-bold text-foreground mb-1">
                Nome do Prato / Sobremesa / Sabor *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
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
                      onClick={() => setProductName(f.subtitulo_receita || f.produto_id)}
                      className="text-[10px] px-2 py-0.5 rounded-lg border border-border/80 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground truncate max-w-[150px]"
                    >
                      {f.subtitulo_receita || f.produto_id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Estilo de Fotografia Gastronômica */}
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
                      onClick={() => setPhotoStyle(key)}
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

            {/* 3. Proporção / Enquadramento */}
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
                      {ratio === "1:1" ? "1:1 (Feed/iFood)" : ratio === "4:3" ? "4:3 (Banner)" : "9:16 (Story)"}
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
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: pedaços de morango fresco, calda extra"
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
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
                      ? "Imagens geradas com sua cota direta no Google AI Studio"
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
                  <span>Criando Fotografia Culinária em Alta Resolução...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  <span>Gerar Imagem Culinária com IA</span>
                </>
              )}
            </Button>
          </div>

          {/* Coluna 2: Visualizador & Exportação (7 Colunas) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center rounded-3xl border border-border/80 bg-secondary/20 p-4 relative overflow-hidden min-h-[350px]">
            {generatedImageUrl ? (
              <div className="w-full flex flex-col items-center space-y-3">
                <div className="relative overflow-hidden rounded-2xl border border-border/80 shadow-lg group max-h-[380px] w-full flex items-center justify-center bg-black/20">
                  <img
                    src={generatedImageUrl}
                    alt={productName}
                    className="max-h-[360px] w-auto max-w-full object-contain rounded-xl transition-transform group-hover:scale-[1.02] duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="bg-black/70 text-white border-white/20 text-[10px] backdrop-blur-xs font-bold">
                      {aspectRatio} • {STYLE_PRESETS[photoStyle].name.split(" ")[0]}
                    </Badge>
                  </div>
                </div>

                {generationError && (
                  <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                    {generationError}
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
                      const zapText = `📸 *Foto Culinária Criada com IA PereiraLabs*\n\n🍰 *Produto:* ${productName}\n✨ *Estilo:* ${STYLE_PRESETS[photoStyle].name}\n🖼️ *Link/Arquivo:* Gerado pelo Estúdio Culinário`;
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
                    Escolha o sabor e o estilo fotográfico à esquerda e clique em <strong>"Gerar Imagem Culinária com IA"</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {CULINARY_DEMO_PRESETS.slice(0, 3).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setProductName(item.flavor);
                        setGeneratedImageUrl(item.demoImg);
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    >
                      Ver Exemplo: {item.flavor.split(" ")[0]} {item.flavor.split(" ")[1]}
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
