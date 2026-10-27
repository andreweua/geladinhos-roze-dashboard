import React, { useEffect, useState } from "react";
import {
  X,
  Building2,
  QrCode,
  CreditCard,
  Key,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Phone,
  MapPin,
  HelpCircle,
  ExternalLink,
  Database,
  Cloud,
  Share2,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import {
  BRAND_CONFIG,
  BrandConfig,
  getCustomBrandConfig,
  saveCustomBrandConfig,
} from "@/config/brand.config";
import { Badge, Button } from "@/components/ui/primitives";
import {
  clearOrphanLocalSales,
  resetToCleanSlate,
  syncPendingLocalSalesToSupabase,
  wipeCompanyData,
} from "@/services/dataService";
import { getActiveCompany, updateCompany } from "@/services/companyService";
import { updateCurrentUserEmpresa } from "@/services/authService";
import { ClientPlanManagementCard } from "@/components/billing/ClientPlanManagementCard";

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [activeTab, setActiveTab] = useState<
    "empresa" | "plano" | "gemini_ia" | "pix_ton" | "stone_api" | "polos" | "supabase"
  >("plano");

  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedSyncLink, setCopiedSyncLink] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load live config & active company
  const currentConfig = getCustomBrandConfig();
  const currentActiveComp = getActiveCompany();

  // Form State
  const [formData, setFormData] = useState({
    companyName: currentActiveComp?.nome || currentConfig.companyName || BRAND_CONFIG.companyName,
    merchantName: currentActiveComp?.responsavel || currentConfig.tonConfig?.merchantName || BRAND_CONFIG.tonConfig.merchantName,
    merchantCity: currentActiveComp?.cidade || currentConfig.tonConfig?.merchantCity || BRAND_CONFIG.tonConfig.merchantCity,
    tagline: currentActiveComp?.nicho || currentConfig.tagline || BRAND_CONFIG.tagline,
    whatsappNumber: currentActiveComp?.whatsapp || currentConfig.tonConfig?.whatsappNumber || BRAND_CONFIG.tonConfig.whatsappNumber,
    permitirEstoqueNegativo: currentActiveComp?.permitirEstoqueNegativo ?? false,

    // Google Gemini AI (SaaS por Empresa)
    geminiApiKey: currentActiveComp?.geminiApiKey || "",
    geminiModel: currentActiveComp?.geminiModel || "gemini-2.5-flash",

    // Pix & TON
    pixKey: currentActiveComp?.chavePix || currentConfig.tonConfig?.pixKey || BRAND_CONFIG.tonConfig.pixKey,
    pixKeyType: currentActiveComp?.chavePixTipo || currentConfig.tonConfig?.pixKeyType || BRAND_CONFIG.tonConfig.pixKeyType,
    ratePix: currentConfig.tonConfig?.rates?.Pix ?? BRAND_CONFIG.tonConfig.rates.Pix,
    rateDinheiro: currentConfig.tonConfig?.rates?.Dinheiro ?? BRAND_CONFIG.tonConfig.rates.Dinheiro,
    rateDebito: currentConfig.tonConfig?.rates?.Cartao_Debito ?? BRAND_CONFIG.tonConfig.rates.Cartao_Debito,
    rateCredito: currentConfig.tonConfig?.rates?.Cartao_Credito ?? BRAND_CONFIG.tonConfig.rates.Cartao_Credito,

    // Stone OpenBank API
    stoneEnv: currentConfig.stoneConfig?.environment || "sandbox",
    stoneClientId: currentConfig.stoneConfig?.clientId || "",
    stoneClientSecret: currentConfig.stoneConfig?.clientSecret || "",
    stoneAccountId: currentConfig.stoneConfig?.accountId || "",
    stoneWebhookSecret: currentConfig.stoneConfig?.webhookSecret || "",

    // Polos Operacionais
    jauResponsavel: currentConfig.basesOperacionais?.jau?.responsavel || BRAND_CONFIG.basesOperacionais.jau.responsavel,
    jauCep: currentConfig.basesOperacionais?.jau?.cep || BRAND_CONFIG.basesOperacionais.jau.cep,
    jauLogradouro: currentConfig.basesOperacionais?.jau?.logradouro || BRAND_CONFIG.basesOperacionais.jau.logradouro,
    tresPontasResponsavel: currentConfig.basesOperacionais?.tresPontas?.responsavel || BRAND_CONFIG.basesOperacionais.tresPontas.responsavel,
    tresPontasCep: currentConfig.basesOperacionais?.tresPontas?.cep || BRAND_CONFIG.basesOperacionais.tresPontas.cep,
    tresPontasLogradouro: currentConfig.basesOperacionais?.tresPontas?.logradouro || BRAND_CONFIG.basesOperacionais.tresPontas.logradouro,

    // Supabase Cloud Sync
    supabaseUrl: currentConfig.supabaseConfig?.supabaseUrl || "",
    supabaseAnonKey: currentConfig.supabaseConfig?.supabaseAnonKey || "",
  });

  // Re-sync form whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const live = getCustomBrandConfig();
      const activeComp = getActiveCompany();
      setFormData({
        companyName: activeComp?.nome || live.companyName || BRAND_CONFIG.companyName,
        merchantName: activeComp?.responsavel || live.tonConfig?.merchantName || BRAND_CONFIG.tonConfig.merchantName,
        merchantCity: activeComp?.cidade || live.tonConfig?.merchantCity || BRAND_CONFIG.tonConfig.merchantCity,
        tagline: activeComp?.nicho || live.tagline || BRAND_CONFIG.tagline,
        whatsappNumber: activeComp?.whatsapp || live.tonConfig?.whatsappNumber || BRAND_CONFIG.tonConfig.whatsappNumber,
        permitirEstoqueNegativo: activeComp?.permitirEstoqueNegativo ?? false,
        geminiApiKey: activeComp?.geminiApiKey || "",
        geminiModel: activeComp?.geminiModel || "gemini-2.5-flash",
        pixKey: activeComp?.chavePix || live.tonConfig?.pixKey || BRAND_CONFIG.tonConfig.pixKey,
        pixKeyType: activeComp?.chavePixTipo || live.tonConfig?.pixKeyType || BRAND_CONFIG.tonConfig.pixKeyType,
        ratePix: live.tonConfig?.rates?.Pix ?? BRAND_CONFIG.tonConfig.rates.Pix,
        rateDinheiro: live.tonConfig?.rates?.Dinheiro ?? BRAND_CONFIG.tonConfig.rates.Dinheiro,
        rateDebito: live.tonConfig?.rates?.Cartao_Debito ?? BRAND_CONFIG.tonConfig.rates.Cartao_Debito,
        rateCredito: live.tonConfig?.rates?.Cartao_Credito ?? BRAND_CONFIG.tonConfig.rates.Cartao_Credito,
        stoneEnv: live.stoneConfig?.environment || "sandbox",
        stoneClientId: live.stoneConfig?.clientId || "",
        stoneClientSecret: live.stoneConfig?.clientSecret || "",
        stoneAccountId: live.stoneConfig?.accountId || "",
        stoneWebhookSecret: live.stoneConfig?.webhookSecret || "",
        jauResponsavel: live.basesOperacionais?.jau?.responsavel || BRAND_CONFIG.basesOperacionais.jau.responsavel,
        jauCep: live.basesOperacionais?.jau?.cep || BRAND_CONFIG.basesOperacionais.jau.cep,
        jauLogradouro: live.basesOperacionais?.jau?.logradouro || BRAND_CONFIG.basesOperacionais.jau.logradouro,
        tresPontasResponsavel: live.basesOperacionais?.tresPontas?.responsavel || BRAND_CONFIG.basesOperacionais.tresPontas.responsavel,
        tresPontasCep: live.basesOperacionais?.tresPontas?.cep || BRAND_CONFIG.basesOperacionais.tresPontas.cep,
        tresPontasLogradouro: live.basesOperacionais?.tresPontas?.logradouro || BRAND_CONFIG.basesOperacionais.tresPontas.logradouro,
        supabaseUrl: live.supabaseConfig?.supabaseUrl || "",
        supabaseAnonKey: live.supabaseConfig?.supabaseAnonKey || "",
      });
      setGeminiTestResult(null);
    }
  }, [isOpen]);

  const handleTestGeminiKey = async () => {
    const key = formData.geminiApiKey.trim();
    if (!key) {
      setGeminiTestResult({ success: false, message: "Insira uma chave de API antes de testar." });
      return;
    }

    setIsTestingGemini(true);
    setGeminiTestResult(null);

    try {
      const model = formData.geminiModel || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Diga apenas: 'OK'" }] }],
          }),
        }
      );

      if (res.ok) {
        setGeminiTestResult({
          success: true,
          message: `✓ Chave Gemini validada com sucesso no modelo ${model}!`,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setGeminiTestResult({
          success: false,
          message: `Falha na validação (${res.status}): ${errorData?.error?.message || "Verifique se a chave é válida e está ativa no Google AI Studio."}`,
        });
      }
    } catch (err: any) {
      setGeminiTestResult({
        success: false,
        message: `Erro de conexão: ${err?.message || "Não foi possível contactar o Google Gemini"}`,
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleSave = () => {
    const newCompanyName = formData.companyName.trim() || BRAND_CONFIG.companyName;

    // Atualiza empresa ativa no sistema multi-empresa
    const activeComp = getActiveCompany();
    if (activeComp) {
      updateCompany(activeComp.id, {
        nome: newCompanyName,
        nicho: formData.tagline.trim() || activeComp.nicho,
        whatsapp: formData.whatsappNumber.replace(/\D/g, "") || activeComp.whatsapp,
        chavePix: formData.pixKey.trim() || activeComp.chavePix,
        chavePixTipo: (formData.pixKeyType as any) || activeComp.chavePixTipo,
        responsavel: formData.merchantName.trim() || activeComp.responsavel,
        cidade: formData.merchantCity.trim().toUpperCase() || activeComp.cidade,
        permitirEstoqueNegativo: formData.permitirEstoqueNegativo,
        geminiApiKey: formData.geminiApiKey.trim(),
        geminiModel: formData.geminiModel.trim(),
      });
    }

    // Atualiza o perfil da sessão atual autenticada imediatamente
    updateCurrentUserEmpresa(newCompanyName);

    const updated: Partial<BrandConfig> = {
      companyName: newCompanyName,
      tagline: formData.tagline.trim() || BRAND_CONFIG.tagline,
      tonConfig: {
        ...currentConfig.tonConfig,
        merchantName: formData.merchantName.trim() || BRAND_CONFIG.tonConfig.merchantName,
        merchantCity: formData.merchantCity.trim().toUpperCase() || "JAU",
        pixKey: formData.pixKey.trim() || BRAND_CONFIG.tonConfig.pixKey,
        pixKeyType: formData.pixKeyType,
        whatsappNumber: formData.whatsappNumber.replace(/\D/g, "") || BRAND_CONFIG.tonConfig.whatsappNumber,
        rates: {
          Pix: Number(formData.ratePix) || 0,
          Dinheiro: Number(formData.rateDinheiro) || 0,
          Cartao_Debito: Number(formData.rateDebito) || 0,
          Cartao_Credito: Number(formData.rateCredito) || 0,
        },
      },
      paymentFeeRates: {
        Pix: Number(formData.ratePix) || 0,
        Dinheiro: Number(formData.rateDinheiro) || 0,
        Cartao_Debito: Number(formData.rateDebito) || 0,
        Cartao_Credito: Number(formData.rateCredito) || 0,
      },
      stoneConfig: {
        environment: formData.stoneEnv,
        apiUrl:
          formData.stoneEnv === "production"
            ? "https://api.openbank.stone.com.br"
            : "https://sandbox-api.openbank.stone.com.br",
        clientId: formData.stoneClientId.trim(),
        clientSecret: formData.stoneClientSecret.trim(),
        accountId: formData.stoneAccountId.trim(),
        webhookSecret: formData.stoneWebhookSecret.trim(),
      },
      basesOperacionais: {
        jau: {
          ...currentConfig.basesOperacionais.jau,
          responsavel: formData.jauResponsavel.trim(),
          cep: formData.jauCep.trim(),
          logradouro: formData.jauLogradouro.trim(),
        },
        tresPontas: {
          ...currentConfig.basesOperacionais.tresPontas,
          responsavel: formData.tresPontasResponsavel.trim(),
          cep: formData.tresPontasCep.trim(),
          logradouro: formData.tresPontasLogradouro.trim(),
        },
      },
      supabaseConfig: {
        supabaseUrl: formData.supabaseUrl.trim(),
        supabaseAnonKey: formData.supabaseAnonKey.trim(),
      },
    };

    saveCustomBrandConfig(updated);
    setFeedback("Configurações da Empresa, Pix, Stone e Supabase salvas com sucesso!");
    onConfigSaved();

    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1800);
  };

  const handleResetDefaults = () => {
    if (window.confirm("Deseja restaurar as configurações originais padrão de fábrica?")) {
      localStorage.removeItem(`${BRAND_CONFIG.storagePrefix}_company_settings_v1`);

      const activeComp = getActiveCompany();
      if (activeComp) {
        updateCompany(activeComp.id, {
          nome: BRAND_CONFIG.companyName,
          responsavel: BRAND_CONFIG.tonConfig.merchantName,
          cidade: BRAND_CONFIG.tonConfig.merchantCity,
          whatsapp: BRAND_CONFIG.tonConfig.whatsappNumber,
          chavePix: BRAND_CONFIG.tonConfig.pixKey,
          chavePixTipo: BRAND_CONFIG.tonConfig.pixKeyType,
        });
      }
      updateCurrentUserEmpresa(BRAND_CONFIG.companyName);

      setFormData({
        companyName: BRAND_CONFIG.companyName,
        merchantName: BRAND_CONFIG.tonConfig.merchantName,
        merchantCity: BRAND_CONFIG.tonConfig.merchantCity,
        tagline: BRAND_CONFIG.tagline,
        whatsappNumber: BRAND_CONFIG.tonConfig.whatsappNumber,
        permitirEstoqueNegativo: false,
        geminiApiKey: "",
        geminiModel: "gemini-2.5-flash",
        pixKey: BRAND_CONFIG.tonConfig.pixKey,
        pixKeyType: BRAND_CONFIG.tonConfig.pixKeyType,
        ratePix: BRAND_CONFIG.tonConfig.rates.Pix,
        rateDinheiro: BRAND_CONFIG.tonConfig.rates.Dinheiro,
        rateDebito: BRAND_CONFIG.tonConfig.rates.Cartao_Debito,
        rateCredito: BRAND_CONFIG.tonConfig.rates.Cartao_Credito,
        stoneEnv: "sandbox",
        stoneClientId: "",
        stoneClientSecret: "",
        stoneAccountId: "",
        stoneWebhookSecret: "",
        jauResponsavel: BRAND_CONFIG.basesOperacionais.jau.responsavel,
        jauCep: BRAND_CONFIG.basesOperacionais.jau.cep,
        jauLogradouro: BRAND_CONFIG.basesOperacionais.jau.logradouro,
        tresPontasResponsavel: BRAND_CONFIG.basesOperacionais.tresPontas.responsavel,
        tresPontasCep: BRAND_CONFIG.basesOperacionais.tresPontas.cep,
        tresPontasLogradouro: BRAND_CONFIG.basesOperacionais.tresPontas.logradouro,
        supabaseUrl: "",
        supabaseAnonKey: "",
      });
      setFeedback("Configurações restauradas com sucesso!");
      onConfigSaved();
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleCleanSlateAction = async () => {
    const confirmed = window.confirm(
      "Atenção: Deseja zerar todas as vendas e estoques de lotes para a Rozana iniciar a produção real amanhã?\n\n" +
        "✓ Todas as 8 Fichas Técnicas e receitas serão 100% preservadas.\n" +
        "✓ O catálogo de produtos continuará intacto.\n" +
        "✓ Vendas simuladas e saldos de estoque serão zerados (0 un)."
    );
    if (!confirmed) return;

    try {
      await resetToCleanSlate();
      setFeedback("Operação concluída! Vendas e estoques zerados para início da produção real.");
      onConfigSaved();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao zerar dados:", err);
      alert("Não foi possível zerar os dados: " + String(err));
    }
  };

  const handleWipeAllCompanyData = async () => {
    const activeComp = getActiveCompany();
    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente ZERAR TUDO da empresa "${activeComp.nome}"?\n\n` +
        "✓ Todos os produtos, receitas e fichas técnicas serão excluídos.\n" +
        "✓ Todas as vendas e estoques serão limpos (0 registros).\n" +
        "✓ O painel começará 100% LIMPO para cadastrar seus próprios produtos (ex: Pão de Mel, Bolos, Doces) sem nenhum vestígio da Roze!\n\n" +
        "Deseja prosseguir com a limpeza total?"
    );
    if (!confirmed) return;

    try {
      await wipeCompanyData(activeComp.id);
      setFeedback(`✓ Empresa "${activeComp.nome}" zerada com sucesso! Catálogo 100% limpo.`);
      onConfigSaved();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error("Erro ao zerar dados da empresa:", err);
      alert("Não foi possível zerar os dados da empresa: " + String(err));
    }
  };

  const [isSyncingSales, setIsSyncingSales] = useState(false);

  const handleManualSyncSales = async () => {
    setIsSyncingSales(true);
    try {
      const res = await syncPendingLocalSalesToSupabase();
      if (res.syncedCount > 0) {
        setFeedback(`✓ ${res.syncedCount} venda(s) sincronizada(s) com sucesso na Nuvem!`);
      } else if (res.discardedDuplicatesCount > 0) {
        setFeedback(`✓ ${res.discardedDuplicatesCount} venda(s) duplicada(s) limpa(s). Base 100% atualizada!`);
      } else {
        setFeedback("✓ Todas as vendas já estão 100% sincronizadas com a Nuvem!");
      }
      onConfigSaved();
    } catch {
      setFeedback("Erro ao tentar sincronizar vendas com a Nuvem.");
    } finally {
      setIsSyncingSales(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleClearOrphanSales = () => {
    const confirmed = window.confirm(
      "Deseja realmente limpar as vendas salvas apenas na memória deste aparelho?\n\n" +
        "✓ As vendas oficiais salvas no banco Supabase NÃO serão apagadas.\n" +
        "✓ Isso garante que o App Web e o App Nativo Android mostrem exatamente os mesmos números."
    );
    if (!confirmed) return;

    clearOrphanLocalSales();
    setFeedback("✓ Vendas locais órfãs removidas deste aparelho. Base agora reflete 100% a Nuvem.");
    onConfigSaved();
    setTimeout(() => setFeedback(null), 5000);
  };

  const generateMagicSyncUrl = () => {
    const configToSync: Partial<BrandConfig> = {
      companyName: formData.companyName.trim() || BRAND_CONFIG.companyName,
      tonConfig: {
        ...currentConfig.tonConfig,
        merchantName:
          formData.merchantName.trim() || BRAND_CONFIG.tonConfig.merchantName,
        merchantCity:
          formData.merchantCity.trim().toUpperCase() || "JAU",
        pixKey: formData.pixKey.trim() || BRAND_CONFIG.tonConfig.pixKey,
        pixKeyType: formData.pixKeyType,
        whatsappNumber:
          formData.whatsappNumber.replace(/\D/g, "") ||
          BRAND_CONFIG.tonConfig.whatsappNumber,
      },
      supabaseConfig: {
        supabaseUrl: formData.supabaseUrl.trim(),
        supabaseAnonKey: formData.supabaseAnonKey.trim(),
      },
    };

    const encoded = btoa(
      unescape(encodeURIComponent(JSON.stringify(configToSync)))
    );
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?sync_config=${encoded}`;
  };

  const handleCopyMagicSyncLink = () => {
    const url = generateMagicSyncUrl();
    navigator.clipboard.writeText(url);
    setCopiedSyncLink(true);
    setTimeout(() => setCopiedSyncLink(false), 2500);
  };

  const handleSendMagicSyncLinkWhatsApp = () => {
    const url = generateMagicSyncUrl();
    const msg =
      `🍧 *CONEXÃO DO PAINEL — GELADINHOS DA ROZE* 🍧\n\n` +
      `Oi Roze! Aqui está o seu link de conexão com o nosso painel e banco de dados em tempo real.\n\n` +
      `👉 Basta tocar neste link no seu celular para sincronizar tudo automaticamente:\n${url}\n\n` +
      `✅ Não precisa digitar senha nem chave nenhuma! É só abrir o link!`;
    const waPhone =
      formData.whatsappNumber.replace(/\D/g, "") || "5514988183327";
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Painel de Configurações da Empresa & Gateway Pix
                </h3>
                <Badge variant="outline" className="border-primary/40 text-primary font-bold">
                  v{BRAND_CONFIG.appVersion}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Cadastre e altere chave Pix, dados cadastrais, taxas da TON e credenciais Stone OpenBank sem precisar mexer em código
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-tabs com proteção estrita contra sobreposição (shrink-0 + scroll horizontal suave) */}
        <div className="flex w-full min-w-0 items-center border-b border-border/80 bg-secondary/30 px-3 text-xs font-semibold overflow-x-auto no-scrollbar gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("plano")}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 transition-all border-b-2 whitespace-nowrap text-xs font-bold rounded-t-lg ${
              activeTab === "plano"
                ? "border-primary text-primary bg-primary/10 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Meu Plano</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gemini_ia")}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 transition-all border-b-2 whitespace-nowrap text-xs font-bold rounded-t-lg ${
              activeTab === "gemini_ia"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>IA Gemini (SaaS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pix_ton")}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 transition-all border-b-2 whitespace-nowrap text-xs font-bold rounded-t-lg ${
              activeTab === "pix_ton"
                ? "border-primary text-primary bg-primary/10 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <QrCode className="h-4 w-4 shrink-0" />
            <span>Chave Pix & TON</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stone_api")}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 transition-all border-b-2 whitespace-nowrap text-xs font-bold rounded-t-lg ${
              activeTab === "stone_api"
                ? "border-primary text-primary bg-primary/10 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Key className="h-4 w-4 shrink-0" />
            <span>API Stone</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("empresa")}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 transition-all border-b-2 whitespace-nowrap text-xs font-bold rounded-t-lg ${
              activeTab === "empresa"
                ? "border-primary text-primary bg-primary/10 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span>Dados da Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("polos")}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 transition-all border-b-2 whitespace-nowrap text-xs font-bold rounded-t-lg ${
              activeTab === "polos"
                ? "border-primary text-primary bg-primary/10 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span>Polos & CEPs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("supabase")}
            className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 transition-all border-b-2 whitespace-nowrap text-xs font-bold rounded-t-lg ${
              activeTab === "supabase"
                ? "border-primary text-primary bg-primary/10 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            <Database className="h-4 w-4 shrink-0" />
            <span>Nuvem Supabase</span>
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div className="m-4 mb-0 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 0: MEU PLANO & ASSINATURA (AUTONOMIA DO CLIENTE) */}
          {activeTab === "plano" && (
            <div className="space-y-4">
              <ClientPlanManagementCard
                empresaId={currentActiveComp.id}
                onPlanChanged={onConfigSaved}
              />
            </div>
          )}

          {/* TAB 0.5: INTELIGÊNCIA ARTIFICIAL GOOGLE GEMINI (SaaS MULTI-TENANT POR EMPRESA) */}
          {activeTab === "gemini_ia" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 text-xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-foreground text-sm">
                      Consultor Virtual IA — Google Gemini da Empresa
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Empresa: <strong>{currentActiveComp?.nome}</strong> • Cada assinante do SaaS possui sua própria chave privativa.
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed pt-1">
                  🔒 <strong>Segurança & Privacidade:</strong> A chave de API do Gemini cadastrada aqui fica salva exclusivamente para esta empresa. Ela <strong>nunca é exposta</strong> no código-fonte público do GitHub Pages.
                </p>
              </div>

              <div className="rounded-2xl border border-border p-4 bg-card space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-primary" />
                      Chave de API do Google Gemini (API Key):
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <span>Obter Chave Grátis no Google AI Studio</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      value={formData.geminiApiKey}
                      onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey((prev) => !prev)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Insira a chave iniciando com <code>AIzaSy...</code>. Se deixar em branco, o sistema utilizará o motor analítico local gratuito.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Modelo de Inteligência Artificial Preferencial:
                  </label>
                  <select
                    value={formData.geminiModel}
                    onChange={(e) => setFormData({ ...formData, geminiModel: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado — Ultra-rápido, raciocínio de custos e margem)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Alta velocidade e estabilidade em produção)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Nova geração de IA multimodal)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Versão estável consolidada)</option>
                  </select>
                </div>

                {/* Status da Conexão */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        formData.geminiApiKey ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                      }`}
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {formData.geminiApiKey ? "Chave de API Configurada" : "Motor Analítico Local Ativo"}
                    </span>
                  </div>

                  {formData.geminiApiKey && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleTestGeminiKey}
                      disabled={isTestingGemini}
                      className="text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      {isTestingGemini ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Testando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          <span>Testar Conexão</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {geminiTestResult && (
                  <div
                    className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                      geminiTestResult.success
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {geminiTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{geminiTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: PIX & TON */}
          {activeTab === "pix_ton" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
                <span className="font-bold text-foreground block mb-1">
                  💡 Como funciona a Chave Pix no PDV:
                </span>
                <p className="text-muted-foreground">
                  A chave cadastrada abaixo é usada para gerar o QR Code oficial padrão BACEN (EMV) no momento de cada pedido, além de ser enviada diretamente no WhatsApp do cliente com o Pix Copia e Cola.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Chave Pix (TON PJ / Stone):
                  </label>
                  <input
                    type="text"
                    value={formData.pixKey}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                    placeholder="+5514988183327 ou email@dominio.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Para telefone, inclua +55 e o DDD. Para CNPJ/CPF, apenas números.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Tipo de Chave:
                  </label>
                  <select
                    value={formData.pixKeyType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pixKeyType: e.target.value as BrandConfig["tonConfig"]["pixKeyType"],
                      })
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="telefone">Telefone (+55...)</option>
                    <option value="email">E-mail</option>
                    <option value="cpf_cnpj">CPF / CNPJ</option>
                    <option value="aleatoria">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Nome do Titular / Razão Social na Conta:
                  </label>
                  <input
                    type="text"
                    value={formData.merchantName}
                    onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                    placeholder="ROZANA HELENA MIGUEL"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Cidade / Praça da Conta Bancária:
                  </label>
                  <input
                    type="text"
                    value={formData.merchantCity}
                    onChange={(e) => setFormData({ ...formData, merchantCity: e.target.value })}
                    placeholder="JAU"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Taxas da Maquininha Ton */}
              <div className="pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Taxas da Maquininha TON (Stone):
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Taxa Pix (%):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ratePix}
                      onChange={(e) => setFormData({ ...formData, ratePix: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">Padrão Ton: 0.99%</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Taxa Dinheiro (%):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rateDinheiro}
                      onChange={(e) => setFormData({ ...formData, rateDinheiro: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">Sem taxa: 0.00%</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Taxa Débito (%):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rateDebito}
                      onChange={(e) => setFormData({ ...formData, rateDebito: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">Padrão Ton: 1.99%</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Taxa Crédito à Vista (%):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rateCredito}
                      onChange={(e) => setFormData({ ...formData, rateCredito: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-[10px] text-muted-foreground">Padrão Ton: 3.50%</span>
                  </div>
                </div>
              </div>

              {/* Política de Estoque do PDV */}
              <div className="pt-3 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Política de Estoque no PDV (Frente de Caixa):
                </h4>
                <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/50 p-3.5">
                  <input
                    type="checkbox"
                    id="permitirEstoqueNegativo"
                    checked={formData.permitirEstoqueNegativo}
                    onChange={(e) =>
                      setFormData({ ...formData, permitirEstoqueNegativo: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="permitirEstoqueNegativo" className="text-xs cursor-pointer">
                    <span className="font-bold text-foreground block">
                      Permitir Venda com Estoque Zerado / Negativo
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Quando desativado (recomendado por segurança), o PDV bloqueia a seleção e a finalização de vendas de produtos sem estoque em freezer. Ative apenas se a filial opera sob encomenda ou aceita saldo negativo temporário.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STONE OPENBANK API */}
          {activeTab === "stone_api" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Integração Stone OpenBank (Liquidação Automática via Webhook)</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  As credenciais abaixo conectam o seu painel diretamente com a API bancária da Stone. Ao emitir uma cobrança, o sistema gera o txid dinâmico e o Webhook da Stone avisa o dashboard em milissegundos para baixar o estoque e liquidar o pedido.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Ambiente Stone OpenBank:
                  </label>
                  <select
                    value={formData.stoneEnv}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stoneEnv: e.target.value as "sandbox" | "production",
                      })
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="sandbox">Sandbox (Ambiente de Testes Stone)</option>
                    <option value="production">Produção Oficial (Conta PJ Stone/Ton)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Account ID (ID da Conta Stone):
                  </label>
                  <input
                    type="text"
                    value={formData.stoneAccountId}
                    onChange={(e) => setFormData({ ...formData, stoneAccountId: e.target.value })}
                    placeholder="Ex: acc_01HXYZ123456..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Client ID (Chave de Aplicação):
                  </label>
                  <input
                    type="text"
                    value={formData.stoneClientId}
                    onChange={(e) => setFormData({ ...formData, stoneClientId: e.target.value })}
                    placeholder="Ex: client_openbank_..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Client Secret:
                  </label>
                  <input
                    type="password"
                    value={formData.stoneClientSecret}
                    onChange={(e) => setFormData({ ...formData, stoneClientSecret: e.target.value })}
                    placeholder="••••••••••••••••••••"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Webhook Secret / Assinatura (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formData.stoneWebhookSecret}
                    onChange={(e) => setFormData({ ...formData, stoneWebhookSecret: e.target.value })}
                    placeholder="Chave secreta para validação do cabeçalho x-stone-signature"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    URL do seu Webhook: <code>https://[seu-projeto].supabase.co/functions/v1/webhook-stone-pix</code>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DADOS DA EMPRESA */}
          {activeTab === "empresa" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Nome Fantasia:
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Geladinhos Gourmet da Roze"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Slogan / Tagline:
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Confeitaria Gelada & Sobremesas Artesanais"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    WhatsApp Comercial (com DDD):
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="5514988183327"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: POLOS OPERACIONAIS */}
          {activeTab === "polos" && (
            <div className="space-y-4">
              {/* Polo Jaú */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-bold text-xs text-foreground">
                      Polo Jaú - SP (Matriz de Produção Artesanal)
                    </span>
                  </div>
                  <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[10px]">
                    CEP {formData.jauCep}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Responsável Local:
                    </label>
                    <input
                      type="text"
                      value={formData.jauResponsavel}
                      onChange={(e) => setFormData({ ...formData, jauResponsavel: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      CEP Oficial:
                    </label>
                    <input
                      type="text"
                      value={formData.jauCep}
                      onChange={(e) => setFormData({ ...formData, jauCep: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Logradouro & Bairro:
                    </label>
                    <input
                      type="text"
                      value={formData.jauLogradouro}
                      onChange={(e) => setFormData({ ...formData, jauLogradouro: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Polo Três Pontas */}
              <div className="rounded-xl border border-border/80 bg-secondary/15 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-bold text-xs text-foreground">
                      Polo Três Pontas - MG (Inteligência & Suporte)
                    </span>
                  </div>
                  <Badge variant="outline" className="border-border text-muted-foreground font-bold text-[10px]">
                    CEP {formData.tresPontasCep}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Responsável Local:
                    </label>
                    <input
                      type="text"
                      value={formData.tresPontasResponsavel}
                      onChange={(e) =>
                        setFormData({ ...formData, tresPontasResponsavel: e.target.value })
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      CEP Oficial:
                    </label>
                    <input
                      type="text"
                      value={formData.tresPontasCep}
                      onChange={(e) => setFormData({ ...formData, tresPontasCep: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Logradouro & Bairro:
                    </label>
                    <input
                      type="text"
                      value={formData.tresPontasLogradouro}
                      onChange={(e) =>
                        setFormData({ ...formData, tresPontasLogradouro: e.target.value })
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUPABASE CLOUD SYNC */}
          {activeTab === "supabase" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                <div className="flex items-center gap-2 font-bold text-foreground mb-1">
                  <Database className="h-4 w-4 text-primary" />
                  Sincronização em Tempo Real (Jaú-SP ↔ Três Pontas-MG)
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Para que você e a Rozana vejam as mesmas vendas, estoques e receitas atualizados instantaneamente em qualquer lugar, basta conectar um banco gratuito no <strong>Supabase</strong>.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    Abrir Supabase (Gratuito)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    Script das tabelas pronto no repositório: <code>supabase-schema.sql</code>
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border p-4 bg-background">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Supabase Project URL (API URL):
                  </label>
                  <input
                    type="text"
                    value={formData.supabaseUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, supabaseUrl: e.target.value })
                    }
                    placeholder="Ex: https://xyzcompany.supabase.co"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Encontrado no painel do Supabase em: <em>Project Settings → API → Project URL</em>.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Supabase Anon Public Key (Chave Anônima Pública):
                  </label>
                  <textarea
                    rows={3}
                    value={formData.supabaseAnonKey}
                    onChange={(e) =>
                      setFormData({ ...formData, supabaseAnonKey: e.target.value })
                    }
                    placeholder="Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Encontrado no painel do Supabase em: <em>Project Settings → API → Project API Keys → anon / public</em>.
                  </p>
                </div>

                <div className="rounded-lg bg-secondary/50 p-3 text-[11px] text-muted-foreground">
                  💡 <strong>Modo Offline Atual:</strong> Se deixar os campos vazios, o sistema continuará rodando com segurança no <strong>Modo Local Offline</strong>, guardando os dados no próprio aparelho.
                </div>

                {/* Magic Sync Link Button */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Link Mágico de Conexão para o Celular da Rozana (1 Toque)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Você como administrador configura aqui no seu computador uma única vez. Depois, basta clicar abaixo para mandar o link no WhatsApp da Rozana. Ao tocar nele, o celular dela conecta automaticamente à mesma nuvem sem ela precisar digitar nada!
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendMagicSyncLinkWhatsApp}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1.5" />
                      Enviar Conexão no WhatsApp da Rozana
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMagicSyncLink}
                      className="text-xs"
                    >
                      {copiedSyncLink ? "✓ Link Copiado!" : "Copiar Link de Conexão"}
                    </Button>
                  </div>
                </div>

                {/* Diagnóstico e Reconciliação de Vendas */}
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Reconciliação de Vendas (App Web ↔ App Nativo Android)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se você notar qualquer diferença entre as vendas que aparecem no computador e no celular, use as ações abaixo para alinhar instantaneamente as duas telas com o banco Supabase:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleManualSyncSales}
                      disabled={isSyncingSales}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1.5 ${isSyncingSales ? "animate-spin" : ""}`}
                      />
                      {isSyncingSales ? "Sincronizando..." : "Sincronizar Vendas com a Nuvem"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearOrphanSales}
                      className="border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5 text-red-600" />
                      Limpar Vendas Locais Órfãs Deste Aparelho
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3.5 bg-secondary/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              <span>Restaurar Padrões</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanSlateAction}
              className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs font-medium"
              title="Zera vendas e estoques mantendo as fichas técnicas para o início real"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              <span>Zerar Vendas e Estoque</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWipeAllCompanyData}
              className="border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 text-xs font-bold"
              title="Zera absolutamente tudo desta empresa: produtos, fichas e vendas, para começar 100% limpo sem nenhum vestígio anterior"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
              <span>Zerar Tudo Desta Empresa (Começar do Zero)</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-1.5" />
              <span>Salvar Alterações</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
