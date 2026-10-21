import React, { useState } from "react";
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
} from "lucide-react";
import {
  BRAND_CONFIG,
  BrandConfig,
  getCustomBrandConfig,
  saveCustomBrandConfig,
} from "@/config/brand.config";
import { Badge, Button } from "@/components/ui/primitives";
import { resetToCleanSlate } from "@/services/dataService";

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
    "empresa" | "pix_ton" | "stone_api" | "polos" | "supabase"
  >("pix_ton");

  const [feedback, setFeedback] = useState<string | null>(null);

  // Load live config
  const currentConfig = getCustomBrandConfig();

  // Form State
  const [formData, setFormData] = useState({
    companyName: currentConfig.companyName,
    merchantName: currentConfig.tonConfig.merchantName,
    merchantCity: currentConfig.tonConfig.merchantCity,
    tagline: currentConfig.tagline,
    whatsappNumber: currentConfig.tonConfig.whatsappNumber,

    // Pix & TON
    pixKey: currentConfig.tonConfig.pixKey,
    pixKeyType: currentConfig.tonConfig.pixKeyType,
    ratePix: currentConfig.tonConfig.rates.Pix,
    rateDinheiro: currentConfig.tonConfig.rates.Dinheiro,
    rateDebito: currentConfig.tonConfig.rates.Cartao_Debito,
    rateCredito: currentConfig.tonConfig.rates.Cartao_Credito,

    // Stone OpenBank API
    stoneEnv: currentConfig.stoneConfig?.environment || "sandbox",
    stoneClientId: currentConfig.stoneConfig?.clientId || "",
    stoneClientSecret: currentConfig.stoneConfig?.clientSecret || "",
    stoneAccountId: currentConfig.stoneConfig?.accountId || "",
    stoneWebhookSecret: currentConfig.stoneConfig?.webhookSecret || "",

    // Polos Operacionais
    jauResponsavel: currentConfig.basesOperacionais.jau.responsavel,
    jauCep: currentConfig.basesOperacionais.jau.cep,
    jauLogradouro: currentConfig.basesOperacionais.jau.logradouro,
    tresPontasResponsavel: currentConfig.basesOperacionais.tresPontas.responsavel,
    tresPontasCep: currentConfig.basesOperacionais.tresPontas.cep,
    tresPontasLogradouro: currentConfig.basesOperacionais.tresPontas.logradouro,

    // Supabase Cloud Sync
    supabaseUrl: currentConfig.supabaseConfig?.supabaseUrl || "",
    supabaseAnonKey: currentConfig.supabaseConfig?.supabaseAnonKey || "",
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: Partial<BrandConfig> = {
      companyName: formData.companyName.trim() || BRAND_CONFIG.companyName,
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
      setFormData({
        companyName: BRAND_CONFIG.companyName,
        merchantName: BRAND_CONFIG.tonConfig.merchantName,
        merchantCity: BRAND_CONFIG.tonConfig.merchantCity,
        tagline: BRAND_CONFIG.tagline,
        whatsappNumber: BRAND_CONFIG.tonConfig.whatsappNumber,
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

  const [copiedSyncLink, setCopiedSyncLink] = useState(false);

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

        {/* Sub-tabs */}
        <div className="flex border-b border-border text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("pix_ton")}
            className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "pix_ton"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>Chave Pix & TON PJ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stone_api")}
            className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "stone_api"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Key className="h-4 w-4" />
            <span>API Stone OpenBank</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("empresa")}
            className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "empresa"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Dados da Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("polos")}
            className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "polos"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Polos Operacionais & CEPs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("supabase")}
            className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "supabase"
                ? "border-primary text-primary bg-primary/5 font-bold"
                : "border-transparent text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Nuvem Supabase (Sincronização)</span>
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
              title="Zera vendas e estoques mantendo 100% das fichas técnicas para o início real"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              <span>Zerar Vendas e Estoque (Início Real)</span>
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
