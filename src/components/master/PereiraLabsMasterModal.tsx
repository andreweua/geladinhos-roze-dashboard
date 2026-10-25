import React, { useEffect, useState } from "react";
import {
  X,
  Building2,
  Plus,
  ShieldCheck,
  Sparkles,
  Share2,
  KeyRound,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  DollarSign,
  Palette,
  ExternalLink,
  Phone,
  QrCode,
  Users,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  Trash2,
  RotateCcw,
  Archive,
  Ban,
  Package,
  Edit2,
  CreditCard,
  Smartphone,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { wipeCompanyData, seedCompanyInitialProducts } from "@/services/dataService";
import {
  Company,
  CompanyLifecycleStatus,
  SubscriptionStatus,
  THEME_COLOR_PALETTES,
  ThemeColorOption,
} from "@/types/multiTenant";
import {
  getLocalCompanies,
  createCompany,
  updateCompany,
  renewCourtesy,
  setSubscriptionStatus,
  resetCompanyPassword,
  buildMagicWhatsAppMessage,
  setActiveCompanyId,
  generateRandomPassword,
  getCompanyLifecycleStatus,
  deleteCompany,
  restoreCompany,
  suspendCompany,
  activateCompany,
  syncCompaniesWithSupabase,
  exportPortfolioAsBase64,
  importPortfolioFromPayload,
} from "@/services/companyService";
import { Badge, Button } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";
import { BillingManagementModule } from "./BillingManagementModule";
import {
  calcularFaturamentoConsolidado,
  getPlanos,
  getEmpresasFaturamento,
  updateEmpresaFaturamento,
} from "@/services/billingService";

function parseInitialProducts(text: string): Array<{ nome: string; preco_venda: number }> {
  const lines = text.split("\n");
  const result: Array<{ nome: string; preco_venda: number }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cleanSeparators = new RegExp("[\\-:=|\\u2013\\u2014]", "g");
    const match = trimmed.match(/^(.*?)(?:[\-:=|\u2013\u2014]|\s+R\$)?\s*(\d+(?:[.,]\d{1,2})?)\s*$/i);
    if (match) {
      const nome = match[1].replace(cleanSeparators, "").trim();
      const preco = parseFloat(match[2].replace(",", "."));
      if (nome && !isNaN(preco)) {
        result.push({ nome, preco_venda: preco });
        continue;
      }
    }
    result.push({ nome: trimmed.replace(cleanSeparators, "").trim(), preco_venda: 5.0 });
  }

  return result;
}

interface PereiraLabsMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
}

export const PereiraLabsMasterModal: React.FC<PereiraLabsMasterModalProps> = ({
  isOpen,
  onClose,
  activeCompanyId,
  onSelectCompany,
}) => {
  const [companies, setCompanies] = useState<Company[]>(() => getLocalCompanies());
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<CompanyLifecycleStatus>("ativa");
  const [masterSection, setMasterSection] = useState<"empresas" | "faturamento" | "sincronizacao">("empresas");
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [copiedSyncLink, setCopiedSyncLink] = useState(false);

  // Sincroniza e recarrega a lista de empresas sempre que o painel abrir
  useEffect(() => {
    if (isOpen) {
      setCompanies(getLocalCompanies());
      syncCompaniesWithSupabase()
        .then((res) => {
          if (res.success && res.count > 0) {
            setCompanies(getLocalCompanies());
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSyncCloudNow = async () => {
    setIsSyncingCloud(true);
    setFeedback(null);
    try {
      const res = await syncCompaniesWithSupabase();
      if (res.success) {
        setCompanies(getLocalCompanies());
        setFeedback(`✓ Nuvem sincronizada! ${res.count} empresas do portfólio unificadas.`);
      } else {
        setFeedback(`Aviso na sincronização: ${res.error || "Verifique sua conexão"}`);
      }
    } catch (err: any) {
      setFeedback(`Erro na sincronização: ${err?.message || err}`);
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleImportPortfolio = () => {
    if (!importJsonText.trim()) return;
    const res = importPortfolioFromPayload(importJsonText);
    if (res.success) {
      setCompanies(getLocalCompanies());
      setFeedback(`✓ ${res.count} empresas importadas e sincronizadas com sucesso!`);
      setImportJsonText("");
    } else {
      setFeedback(`Erro na importação: ${res.error}`);
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  // Form para nova empresa baseado no questionário oficial da PereiraLabs
  const [newNome, setNewNome] = useState("");
  const [newNicho, setNewNicho] = useState("Confeitaria & Pães de Mel");
  const [newResponsavel, setNewResponsavel] = useState("");
  const [newCidade, setNewCidade] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newPix, setNewPix] = useState("");
  const [newPixTipo, setNewPixTipo] = useState<"telefone" | "email" | "cpf_cnpj" | "aleatoria">("telefone");
  const [newCorTema, setNewCorTema] = useState<ThemeColorOption>("dourado");
  const [newEmail, setNewEmail] = useState("");
  const [newSenha, setNewSenha] = useState(() => generateRandomPassword("Mel"));
  const [newPlanoTipo, setNewPlanoTipo] = useState<SubscriptionStatus>("cortesia");
  const [newCortesiaDias, setNewCortesiaDias] = useState<number>(15);
  const availablePlanos = getPlanos();
  const [newPlanoId, setNewPlanoId] = useState<string>("plano-pro");
  const [newProdutosTexto, setNewProdutosTexto] = useState(
    "Pão de Mel Tradicional - 7.00\nPão de Mel Brigadeiro - 8.50\nBolo Gelado de Coco - 12.00"
  );

  // Estado de Edição de Empresa Existente
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editNicho, setEditNicho] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editCidade, setEditCidade] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editPix, setEditPix] = useState("");
  const [editPixTipo, setEditPixTipo] = useState<"telefone" | "email" | "cpf_cnpj" | "aleatoria">("telefone");
  const [editCorTema, setEditCorTema] = useState<ThemeColorOption>("dourado");
  const [editEmail, setEditEmail] = useState("");
  const [editSenha, setEditSenha] = useState("");
  const [editCashierPin, setEditCashierPin] = useState("1234");
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>("ativo");
  const [editPlanoId, setEditPlanoId] = useState<string>("plano-pro");

  const handleOpenEditCompany = (company: Company) => {
    setEditingCompany(company);
    setIsCreating(false);
    setEditNome(company.nome);
    setEditNicho(company.nicho);
    setEditResponsavel(company.responsavel || "");
    setEditCidade(company.cidade || "");
    setEditWhatsapp(company.whatsapp || "");
    setEditPix(company.chavePix || "");
    setEditPixTipo(company.chavePixTipo || "telefone");
    setEditCorTema(company.corTema || "dourado");
    setEditEmail(company.adminEmail || "");
    setEditSenha(company.adminSenha || "");
    setEditCashierPin(company.cashierPin || "1234");
    setEditStatus(company.statusAssinatura || "ativo");

    // Localiza plano da empresa no módulo de faturamento
    const billingEmp = getEmpresasFaturamento().find((b) => b.id === company.id);
    setEditPlanoId(billingEmp?.planoId || "plano-pro");
  };

  const handleUpdateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !editNome.trim()) return;

    const cleanZap = editWhatsapp.replace(/\D/g, "");
    const formattedZap = cleanZap ? (cleanZap.startsWith("55") ? cleanZap : `55${cleanZap}`) : "";

    // REQUISITO 1: O valor da mensalidade é herdado do plano e nunca digitado manualmente
    const selectedPlano = availablePlanos.find((p) => p.id === editPlanoId) || availablePlanos[0];
    const valorHerdado = selectedPlano.valorMensal;

    const updated = updateCompany(editingCompany.id, {
      nome: editNome.trim(),
      nicho: editNicho.trim(),
      responsavel: editResponsavel.trim(),
      cidade: editCidade.trim(),
      whatsapp: formattedZap,
      chavePix: editPix.trim(),
      chavePixTipo: editPixTipo,
      corTema: editCorTema,
      adminEmail: editEmail.trim(),
      adminSenha: editSenha.trim(),
      cashierPin: editCashierPin.trim() || "1234",
      statusAssinatura: editStatus,
      valorMensalidade: valorHerdado,
    });

    // Mantém sincronizado no módulo de faturamento
    updateEmpresaFaturamento(editingCompany.id, {
      planoId: editPlanoId,
      status: editStatus === "ativo" ? "ativa" : editStatus === "cortesia" ? "degustação" : "inativa",
    });

    if (updated) {
      reloadCompanies();
      setFeedback(`✓ Cadastro de "${updated.nome}" atualizado! Plano: ${selectedPlano.nome} (${formatCurrency(valorHerdado)}/mês).`);
      setEditingCompany(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  if (!isOpen) return null;

  const reloadCompanies = () => {
    setCompanies(getLocalCompanies());
  };

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim()) return;

    let cortesiaData: string | undefined = undefined;
    if (newPlanoTipo === "cortesia") {
      const exp = new Date();
      exp.setDate(exp.getDate() + newCortesiaDias);
      exp.setHours(23, 59, 59, 999);
      cortesiaData = exp.toISOString();
    }

    const cleanZap = newWhatsapp.replace(/\D/g, "");
    const formattedZap = cleanZap.startsWith("55") ? cleanZap : `55${cleanZap}`;

    // REQUISITO 1: O valor da mensalidade é herdado do plano e nunca digitado manualmente
    const selectedPlano = availablePlanos.find((p) => p.id === newPlanoId) || availablePlanos[1] || availablePlanos[0];
    const valorHerdado = selectedPlano.valorMensal;

    const created = await createCompany({
      nome: newNome.trim(),
      slug: newNome.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      nicho: newNicho.trim(),
      corTema: newCorTema,
      chavePix: newPix.trim(),
      chavePixTipo: newPixTipo,
      whatsapp: formattedZap,
      cidade: newCidade.trim(),
      responsavel: newResponsavel.trim(),
      adminEmail: newEmail.trim() || `admin@${newNome.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br`,
      adminSenha: newSenha.trim() || generateRandomPassword("Mel"),
      cashierPin: "1234",
      statusAssinatura: newPlanoTipo,
      cortesiaValidadeAte: cortesiaData,
      valorMensalidade: valorHerdado,
    });

    // Se foram informados produtos e preços iniciais no questionário, semeia os itens na empresa
    const parsedInitialProds = parseInitialProducts(newProdutosTexto);
    if (parsedInitialProds.length > 0) {
      seedCompanyInitialProducts(created.id, parsedInitialProds, created.nicho);
    }

    reloadCompanies();
    setIsCreating(false);
    setFeedback(`✓ Empresa "${created.nome}" cadastrada com ${parsedInitialProds.length} produtos iniciais!`);
    setTimeout(() => setFeedback(null), 4000);

    // Envia mensagem formatada com o Link Mágico no WhatsApp
    const msg = buildMagicWhatsAppMessage(created);
    const zapUrl = `https://wa.me/${created.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(zapUrl, "_blank");
  };

  const handleRenewCourtesyAction = (companyId: string, days: number) => {
    const updated = renewCourtesy(companyId, days);
    if (updated) {
      reloadCompanies();
      setFeedback(`✓ Cortesia de ${days} dias concedida com sucesso para "${updated.nome}"!`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleToggleStatusAction = (companyId: string, newStatus: SubscriptionStatus) => {
    const updated = setSubscriptionStatus(companyId, newStatus);
    if (updated) {
      reloadCompanies();
      setFeedback(`✓ Status alterado para: ${newStatus.toUpperCase()}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSuspendCompanyAction = (companyId: string) => {
    const updated = suspendCompany(companyId);
    if (updated) {
      reloadCompanies();
      setFeedback(`✓ Empresa "${updated.nome}" foi suspensa/bloqueada.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleActivateCompanyAction = (companyId: string) => {
    const updated = activateCompany(companyId);
    if (updated) {
      reloadCompanies();
      setFeedback(`✓ Empresa "${updated.nome}" reativada com sucesso!`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDeleteCompanyAction = (companyId: string, permanent: boolean) => {
    const target = companies.find((c) => c.id === companyId);
    if (!target) return;

    if (permanent) {
      const confirmed = window.confirm(
        `PERIGO: Deseja EXCLUIR DEFINITIVAMENTE a empresa "${target.nome}"?\n\n` +
          "Esta ação removerá todos os registros e arquivos do sistema e não poderá ser desfeita."
      );
      if (!confirmed) return;
      deleteCompany(companyId, true);
      reloadCompanies();
      setFeedback(`✓ Empresa "${target.nome}" excluída permanentemente.`);
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    const confirmed = window.confirm(
      `Deseja mover a empresa "${target.nome}" para a aba de Excluídas (Lixeira)?\n\n` +
        "Ela poderá ser restaurada a qualquer momento na aba 'Excluídas'."
    );
    if (!confirmed) return;
    deleteCompany(companyId, false);
    reloadCompanies();
    setFeedback(`✓ Empresa "${target.nome}" movida para a aba de Excluídas.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleRestoreCompanyAction = (companyId: string) => {
    const restored = restoreCompany(companyId);
    if (restored) {
      reloadCompanies();
      setFeedback(`✓ Empresa "${restored.nome}" restaurada para a lista de Ativas!`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleResetPasswordAction = (company: Company) => {
    const { newPassword } = resetCompanyPassword(company.id);
    reloadCompanies();
    const msg = `🔒 *PereiraLabs - Redefinição de Senha*\n\nOlá, ${company.responsavel || company.nome}! Sua nova senha de acesso é: *${newPassword}*\n\nAcesse seu sistema pelo link e faça login normalmente.`;
    const zapUrl = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(zapUrl, "_blank");
    setFeedback(`✓ Nova senha (${newPassword}) gerada e enviada via WhatsApp!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSendMagicLinkAction = (company: Company) => {
    const msg = buildMagicWhatsAppMessage(company);
    const zapUrl = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(zapUrl, "_blank");
  };

  const handleWipeCompanyDataAction = async (company: Company) => {
    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente ZERAR TODOS OS DADOS da empresa "${company.nome}"?\n\n` +
        "✓ Todos os produtos, fichas técnicas e receitas serão excluídos.\n" +
        "✓ Todas as vendas e estoques serão limpos (0 registros).\n" +
        "✓ A empresa começará 100% LIMPA para você cadastrar seus próprios produtos (ex: Pão de Mel, Bolos, Salgados) sem nenhum vestígio da Roze!\n\n" +
        "Deseja prosseguir com a limpeza total?"
    );
    if (!confirmed) return;

    try {
      await wipeCompanyData(company.id);
      setFeedback(`✓ Dados da empresa "${company.nome}" foram 100% zerados com sucesso!`);
      if (company.id === activeCompanyId) {
        onSelectCompany(company.id);
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error("Erro ao zerar dados:", err);
      alert("Erro ao zerar dados da empresa: " + String(err));
    }
  };

  const ativasCompanies = companies.filter((c) => getCompanyLifecycleStatus(c) === "ativa");
  const suspensasCompanies = companies.filter((c) => getCompanyLifecycleStatus(c) === "suspensa");
  const excluidasCompanies = companies.filter((c) => getCompanyLifecycleStatus(c) === "excluida");

  const displayedCompanies =
    currentTab === "ativa"
      ? ativasCompanies
      : currentTab === "suspensa"
      ? suspensasCompanies
      : excluidasCompanies;

  const activeCount = ativasCompanies.filter((c) => c.statusAssinatura === "ativo").length;
  const cortesiaCount = ativasCompanies.filter((c) => c.statusAssinatura === "cortesia").length;
  // Faturamento Consolidado Dinâmico (calculado pelo somatório das mensalidades dos planos vinculados e valores customizados)
  const billingPlanos = getPlanos();
  const billingCompanies = getEmpresasFaturamento();
  const projectedRevenue = calcularFaturamentoConsolidado(billingCompanies, billingPlanos);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl border border-border/90 bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-gradient-to-r from-card to-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-600 text-white shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  Painel Master PereiraLabs
                </h2>
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[10px] font-bold">
                  SaaS Multi-Empresa
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Divisão de Tecnologia e IA • Louzada & Pereira - Soluções Digitais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && (
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
                className="bg-primary text-primary-foreground font-bold text-xs gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Empresa</span>
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {feedback && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in slide-in-from-top-1">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Navigation Tabs between Clientes, Faturamento e Sincronização */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/30 px-6 py-2">
          <button
            type="button"
            onClick={() => setMasterSection("empresas")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              masterSection === "empresas"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Empresas & Clientes ({companies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMasterSection("faturamento")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              masterSection === "faturamento"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Gestão de Faturamento & Planos</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              Dinâmico
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMasterSection("sincronizacao")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              masterSection === "sincronizacao"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4 text-amber-500" />
            <span>Sincronizar Aparelhos & Nuvem</span>
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
              QR Code / OTA
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {masterSection === "faturamento" ? (
            <BillingManagementModule />
          ) : masterSection === "sincronizacao" ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Header Box */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-sm">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-foreground">
                        Sincronização Multi-Aparelhos & Nuvem
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Transfira o portfólio completo de empresas para celulares, tablets e outros computadores em 1 segundo.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSyncCloudNow}
                    disabled={isSyncingCloud}
                    className="bg-primary text-primary-foreground font-bold text-xs gap-2 shadow-md shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncingCloud ? "animate-spin" : ""}`} />
                    <span>{isSyncingCloud ? "Sincronizando Nuvem..." : "Sincronizar Nuvem Agora"}</span>
                  </Button>
                </div>

                {/* Grid 2 Columns: QR Code vs Cloud & Backup */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
                  {/* Card 1: QR Code Master para Celular */}
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-[11px] mb-3">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>QR Code de Sincronização Master</span>
                    </div>

                    <p className="text-xs text-foreground font-semibold max-w-sm mb-4">
                      Aponte a câmera do seu celular ou aplicativo Android para este QR Code para transferir todas as <strong>{companies.length} empresas</strong> e entrar como <strong>Administrador Master</strong>:
                    </p>

                    {/* QR Code Container */}
                    <div className="p-3.5 bg-white rounded-2xl shadow-md border border-amber-500/30 mb-4">
                      <QRCodeSVG
                        value={`${typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://andreweua.github.io/geladinhos-roze-dashboard/"}?sync_portfolio=${exportPortfolioAsBase64()}`}
                        size={190}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <div className="w-full max-w-sm space-y-2">
                      <Button
                        type="button"
                        onClick={() => {
                          const url = `${typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://andreweua.github.io/geladinhos-roze-dashboard/"}?sync_portfolio=${exportPortfolioAsBase64()}`;
                          navigator.clipboard.writeText(url);
                          setCopiedSyncLink(true);
                          setFeedback("✓ Link Mágico Master copiado! Envie no WhatsApp para abrir no celular.");
                          setTimeout(() => setCopiedSyncLink(false), 3000);
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 py-2.5 rounded-xl shadow-sm"
                      >
                        {copiedSyncLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{copiedSyncLink ? "Link Copiado para Área de Transferência!" : "Copiar Link Master para WhatsApp"}</span>
                      </Button>

                      <p className="text-[11px] text-muted-foreground">
                        Você também pode colar esse link no navegador do celular ou WhatsApp pessoal.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Backup JSON & Restauração */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">
                          Exportar Backup do Portfólio (JSON)
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Gere uma cópia segura de todas as empresas e configurações para salvar ou migrar para outro aparelho manualmente.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const json = JSON.stringify(companies, null, 2);
                          navigator.clipboard.writeText(json);
                          setFeedback("✓ Portfólio copiado no formato JSON para sua área de transferência!");
                          setTimeout(() => setFeedback(null), 4000);
                        }}
                        className="w-full text-xs font-semibold gap-2 border-border"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copiar Portfólio Completo (JSON)</span>
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <DownloadCloud className="h-5 w-5 text-emerald-500" />
                        <h4 className="text-sm font-bold text-foreground">
                          Importar Portfólio de Outro Aparelho
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cole abaixo o JSON ou o código do portfólio exportado do seu computador para mesclar com este aparelho:
                      </p>
                      <textarea
                        rows={3}
                        value={importJsonText}
                        onChange={(e) => setImportJsonText(e.target.value)}
                        placeholder='Cole aqui o JSON [{"id": "emp-...", "nome": "..."}]'
                        className="w-full rounded-xl border border-border bg-card p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                      />
                      <Button
                        type="button"
                        onClick={handleImportPortfolio}
                        disabled={!importJsonText.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 py-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>Importar e Mesclar Empresas</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Top KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <span className="text-[11px] font-medium text-muted-foreground block">Empresas Ativas</span>
                  <p className="text-xl font-black text-foreground mt-0.5">{ativasCompanies.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Mensalistas Pagos</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">Em Degustação / Cortesia</span>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{cortesiaCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3.5">
                  <span className="text-[11px] font-medium text-muted-foreground block">Faturamento Mensal</span>
                  <p className="text-xl font-black text-foreground mt-0.5">{formatCurrency(projectedRevenue)}/mês</p>
                </div>
              </div>

          {/* Form de Cadastro de Nova Empresa com Questionário de Onboarding */}
          {isCreating ? (
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Cadastrar Nova Empresa (Questionário de Boas-Vindas)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Insira as respostas do cliente para gerar o sistema exclusivo e o Link Mágico no WhatsApp
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>

              <form onSubmit={handleCreateCompanySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Nome da Confeitaria / Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={newNome}
                      onChange={(e) => setNewNome(e.target.value)}
                      placeholder="Ex: Pão de Mel & Bolos da Maria ou Confeitaria Doce Arte"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Ramo de Atuação / Segmento
                    </label>
                    <select
                      value={newNicho}
                      onChange={(e) => setNewNicho(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="Confeitaria & Bolos Caseiros">🎂 Confeitaria & Bolos Caseiros</option>
                      <option value="Pães de Mel & Doces Artesanais">🍯 Pães de Mel & Doces Artesanais</option>
                      <option value="Geladinhos Artesanais & Sobremesas">🍓 Geladinhos Gourmet & Sorvetes</option>
                      <option value="Salgados, Pastéis & Empadas">🥟 Salgados, Pastéis & Empadas</option>
                      <option value="Lanchonete & Hambúrguer Artesanal">🍔 Lanchonete & Hambúrguer</option>
                      <option value="Marmitaria & Comida Caseira">🍲 Marmitaria & Comida Caseira</option>
                      <option value="Cafeteria & Bistrô">☕ Cafeteria & Bistrô</option>
                      <option value="Alimentação & Bebidas Geral">🍽️ Outro / Alimentação Geral</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Nome Completo do Responsável *
                    </label>
                    <input
                      type="text"
                      required
                      value={newResponsavel}
                      onChange={(e) => setNewResponsavel(e.target.value)}
                      placeholder="Ex: Maria das Graças Silva"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Cidade e Estado *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCidade}
                      onChange={(e) => setNewCidade(e.target.value)}
                      placeholder="Ex: Jaú - SP"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      WhatsApp Comercial *
                    </label>
                    <input
                      type="text"
                      required
                      value={newWhatsapp}
                      onChange={(e) => setNewWhatsapp(e.target.value)}
                      placeholder="Ex: (14) 99888-7766"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Sua Chave Pix para Receber Vendas *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={newPixTipo}
                        onChange={(e) => setNewPixTipo(e.target.value as any)}
                        className="rounded-xl border border-input bg-background px-2 py-2 text-xs text-foreground focus:outline-none"
                      >
                        <option value="telefone">Telefone</option>
                        <option value="cpf_cnpj">CPF / CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="aleatoria">Aleatória</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={newPix}
                        onChange={(e) => setNewPix(e.target.value)}
                        placeholder="Chave Pix da conta onde cairá o dinheiro das vendas"
                        className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Paleta de Cores da Marca
                    </label>
                    <select
                      value={newCorTema}
                      onChange={(e) => setNewCorTema(e.target.value as ThemeColorOption)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none"
                    >
                      <option value="dourado">🍯 Dourado Mel (Pão de Mel / Bolos)</option>
                      <option value="rosa">🍓 Rosa Gourmet (Geladinhos / Doces)</option>
                      <option value="esmeralda">🍃 Verde Esmeralda (Artesanal / Café)</option>
                      <option value="azul">💎 Azul Royal (Empório / Bistrô)</option>
                      <option value="roxo">🍇 Roxo Açaí (Sobremesas Modernas)</option>
                    </select>
                  </div>

                  {/* Campo de Produtos Iniciais do Questionário */}
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-primary" />
                        <span>Seus Principais Produtos e Preços de Venda (Resposta do Questionário)</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground">1 produto por linha</span>
                    </div>
                    <textarea
                      rows={4}
                      value={newProdutosTexto}
                      onChange={(e) => setNewProdutosTexto(e.target.value)}
                      placeholder="Exemplo:&#10;Pão de Mel Tradicional - 7.00&#10;Pão de Mel Brigadeiro - 8.50&#10;Bolo Gelado de Coco - 12.00&#10;Bolo de Pote Cenoura com Chocolate - 10.00"
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      ✨ A empresa iniciará <strong>100% limpa</strong> (sem nenhuma receita da Roze) e o sistema já cadastrará estes produtos e receitas prontos no PDV!
                    </p>
                  </div>
                </div>

                {/* Bloco de Credenciais & Cortesia */}
                <div className="rounded-2xl border border-border bg-background p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      E-mail de Login do Lojista
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="loja@marca.com.br"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-foreground">
                        Senha Inicial
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewSenha(generateRandomPassword("Mel"))}
                        className="text-[10px] text-primary hover:underline font-bold"
                      >
                        Gerar Nova
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newSenha}
                      onChange={(e) => setNewSenha(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Status da Mensalidade
                    </label>
                    <select
                      value={newPlanoTipo}
                      onChange={(e) => setNewPlanoTipo(e.target.value as SubscriptionStatus)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none"
                    >
                      <option value="cortesia">🎁 Período de Cortesia / Teste</option>
                      <option value="ativo">⭐ Mensalista Ativo (Pago)</option>
                      <option value="bloqueado">⛔ Bloqueado Inicial</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Plano de Assinatura * (Valor herdado)
                    </label>
                    <select
                      value={newPlanoId}
                      onChange={(e) => setNewPlanoId(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none"
                    >
                      {availablePlanos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {formatCurrency(p.valorMensal)}/mês
                        </option>
                      ))}
                    </select>
                  </div>

                  {newPlanoTipo === "cortesia" && (
                    <div className="sm:col-span-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-amber-600 dark:text-amber-400">Duração da Cortesia:</strong>
                        <p className="text-[11px] text-muted-foreground">
                          Após esse prazo, o sistema bloqueia automaticamente solicitando renovação da mensalidade.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[7, 15, 30].map((dias) => (
                          <button
                            key={dias}
                            type="button"
                            onClick={() => setNewCortesiaDias(dias)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              newCortesiaDias === dias
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-card border border-border text-foreground hover:bg-secondary"
                            }`}
                          >
                            {dias} dias
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground font-bold text-xs gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Cadastrar & Enviar Link no WhatsApp</span>
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Form de Edição de Empresa Existente */}
          {editingCompany ? (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Edit2 className="h-4 w-4 text-amber-500" />
                    <span>Editar Cadastro da Empresa: <strong>{editingCompany.nome}</strong></span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modifique os dados cadastrais, chaves Pix, senhas e configurações contratuais
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCompany(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>

              <form onSubmit={handleUpdateCompanySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Nome da Empresa / Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Ramo de Atuação / Segmento
                    </label>
                    <input
                      type="text"
                      value={editNicho}
                      onChange={(e) => setEditNicho(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Nome Completo do Responsável
                    </label>
                    <input
                      type="text"
                      value={editResponsavel}
                      onChange={(e) => setEditResponsavel(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Cidade e Estado
                    </label>
                    <input
                      type="text"
                      value={editCidade}
                      onChange={(e) => setEditCidade(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      WhatsApp Comercial
                    </label>
                    <input
                      type="text"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Chave Pix para Receber Vendas
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editPixTipo}
                        onChange={(e) => setEditPixTipo(e.target.value as any)}
                        className="rounded-xl border border-input bg-background px-2 py-2 text-xs text-foreground focus:outline-none"
                      >
                        <option value="telefone">Telefone</option>
                        <option value="cpf_cnpj">CPF / CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="aleatoria">Aleatória</option>
                      </select>
                      <input
                        type="text"
                        value={editPix}
                        onChange={(e) => setEditPix(e.target.value)}
                        className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Paleta de Cores da Marca
                    </label>
                    <select
                      value={editCorTema}
                      onChange={(e) => setEditCorTema(e.target.value as ThemeColorOption)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none"
                    >
                      <option value="dourado">🍯 Dourado Mel (Pão de Mel / Bolos)</option>
                      <option value="rosa">🍓 Rosa Gourmet (Geladinhos / Doces)</option>
                      <option value="esmeralda">🍃 Verde Esmeralda (Artesanal / Café)</option>
                      <option value="azul">💎 Azul Royal (Empório / Bistrô)</option>
                      <option value="roxo">🍇 Roxo Açaí (Sobremesas Modernas)</option>
                    </select>
                  </div>
                </div>

                {/* Bloco de Credenciais & Mensalidade */}
                <div className="rounded-2xl border border-border bg-background p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      E-mail de Login
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Senha de Acesso
                    </label>
                    <input
                      type="text"
                      value={editSenha}
                      onChange={(e) => setEditSenha(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      PIN do Caixa
                    </label>
                    <input
                      type="text"
                      value={editCashierPin}
                      onChange={(e) => setEditCashierPin(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Plano Vinculado * (Valor herdado)
                    </label>
                    <select
                      value={editPlanoId}
                      onChange={(e) => setEditPlanoId(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:outline-none"
                    >
                      {availablePlanos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {formatCurrency(p.valorMensal)}/mês
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCompany(null)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Salvar Alterações</span>
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Abas de Situação da Empresa: Ativas, Suspensas e Excluídas */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab("ativa")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === "ativa"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Ativas ({ativasCompanies.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab("suspensa")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === "suspensa"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Suspensas / Atraso ({suspensasCompanies.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentTab("excluida")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === "excluida"
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Excluídas ({excluidasCompanies.length})</span>
                </button>
              </div>

              <span className="text-[11px] text-muted-foreground">
                Exibindo <strong>{displayedCompanies.length}</strong> de {companies.length} empresas cadastradas
              </span>
            </div>

            {/* Listagem das Empresas filtradas pela Aba Selecionada */}
            <div className="grid grid-cols-1 gap-3.5">
              {displayedCompanies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Nenhuma empresa encontrada nesta aba ({currentTab.toUpperCase()}).
                  </p>
                </div>
              ) : (
                displayedCompanies.map((company) => {
                  const isCurrentActive = company.id === activeCompanyId;
                  const themeMeta = THEME_COLOR_PALETTES[company.corTema] || THEME_COLOR_PALETTES.dourado;
                  const lifecycleStatus = getCompanyLifecycleStatus(company);

                  const isCortesia = company.statusAssinatura === "cortesia";
                  const isBloqueado = company.statusAssinatura === "bloqueado" || lifecycleStatus === "suspensa";
                  const isAtivo = company.statusAssinatura === "ativo" && lifecycleStatus === "ativa";

                  const daysLeft = company.cortesiaValidadeAte
                    ? Math.ceil((new Date(company.cortesiaValidadeAte).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <div
                      key={company.id}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all bg-card ${
                        isCurrentActive
                          ? "border-primary shadow-md ring-1 ring-primary/20"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        {/* Left: Info */}
                        <div className="flex items-start gap-3.5">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm font-black text-base"
                            style={{ backgroundColor: themeMeta.primaryColor }}
                          >
                            {company.nome.substring(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-foreground sm:text-base">
                                {company.nome}
                              </h4>
                              {isCurrentActive && (
                                <Badge variant="default" className="bg-primary text-primary-foreground text-[10px]">
                                  Visualizando Agora
                                </Badge>
                              )}

                              {/* Status da Assinatura / Ciclo */}
                              {lifecycleStatus === "excluida" ? (
                                <Badge variant="destructive" className="text-[10px] gap-1 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30">
                                  <Archive className="h-3 w-3" />
                                  Na Lixeira / Excluída
                                </Badge>
                              ) : isAtivo ? (
                                <Badge variant="success" className="text-[10px] gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Mensalista Ativo
                                </Badge>
                              ) : isCortesia && daysLeft && daysLeft > 0 ? (
                                <Badge variant="outline" className="text-[10px] font-bold gap-1 border-amber-500/40 text-amber-600 bg-amber-500/10">
                                  <Clock className="h-3 w-3" />
                                  🎁 Cortesia: Restam {daysLeft} dias
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <Lock className="h-3 w-3" />
                                  {daysLeft && daysLeft <= 0 ? "Cortesia Expirada" : "Acesso Suspenso / Bloqueado"}
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-0.5">
                              {company.nicho} • {company.cidade || "Brasil"}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-2">
                              <span>
                                👤 Responsável: <strong>{company.responsavel || "Não inf."}</strong>
                              </span>
                              <span>
                                🔑 E-mail: <strong>{company.adminEmail}</strong>
                              </span>
                              <span>
                                📱 WhatsApp: <strong>{company.whatsapp}</strong>
                              </span>
                              <span>
                                💰 Pix: <strong>{company.chavePix}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Quick Switch */}
                        <div className="flex flex-wrap items-center gap-2">
                          {!isCurrentActive && lifecycleStatus !== "excluida" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setActiveCompanyId(company.id);
                                onSelectCompany(company.id);
                              }}
                              className="bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground font-bold text-xs gap-1.5"
                            >
                              <span>Alternar para Esta Empresa</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Bar */}
                      <div className="mt-4 pt-3.5 border-t border-border flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {lifecycleStatus === "excluida" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreCompanyAction(company.id)}
                                className="text-[11px] h-7 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 font-bold"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Restaurar Empresa
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCompanyAction(company.id, true)}
                                className="text-[11px] h-7 text-rose-600 hover:bg-rose-500/10 font-bold"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir Definitivamente
                              </Button>
                            </>
                          ) : (
                            <>
                              {/* Renovar Cortesia */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRenewCourtesyAction(company.id, 15)}
                                className="text-[11px] h-7 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                +15 Dias Cortesia
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRenewCourtesyAction(company.id, 30)}
                                className="text-[11px] h-7 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                +30 Dias Cortesia
                              </Button>

                              {/* Ativar como Mensalista */}
                              {!isAtivo && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActivateCompanyAction(company.id)}
                                  className="text-[11px] h-7 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Ativar Mensalista
                                </Button>
                              )}

                              {/* Bloquear / Desbloquear */}
                              {isBloqueado ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleActivateCompanyAction(company.id)}
                                  className="text-[11px] h-7 text-emerald-600"
                                >
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Desbloquear
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSuspendCompanyAction(company.id)}
                                  className="text-[11px] h-7 text-red-600 hover:bg-red-500/10 border-red-500/30"
                                >
                                  <Lock className="h-3 w-3 mr-1" />
                                  Suspender / Bloquear
                                </Button>
                              )}

                              {/* Botão de Excluir Empresa (Mover para a lixeira) */}
                              {company.id !== "emp-roze-gourmet" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCompanyAction(company.id, false)}
                                  className="text-[11px] h-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                  title="Mover esta empresa para a aba de Excluídas"
                                >
                                  <Trash2 className="h-3 w-3 mr-1 text-rose-500" />
                                  Excluir
                                </Button>
                              )}
                            </>
                          )}
                        </div>

                        {lifecycleStatus !== "excluida" && (
                          <div className="flex items-center gap-1.5">
                            {/* Editar Dados da Empresa */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditCompany(company)}
                              className="text-[11px] h-7 border-border hover:bg-secondary text-foreground font-semibold"
                              title="Editar cadastro completo desta empresa"
                            >
                              <Edit2 className="h-3 w-3 mr-1 text-primary" />
                              Editar
                            </Button>

                            {/* Zerar Dados da Empresa */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleWipeCompanyDataAction(company)}
                              className="text-[11px] h-7 text-rose-600 hover:bg-rose-500/10"
                              title="Zera produtos, fichas e vendas desta empresa para começar do zero"
                            >
                              <RotateCcw className="h-3 w-3 mr-1 text-rose-600" />
                              Zerar Dados
                            </Button>

                            {/* Redefinir Senha */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPasswordAction(company)}
                              className="text-[11px] h-7 text-muted-foreground hover:text-foreground"
                              title="Gera nova senha e abre WhatsApp para envio"
                            >
                              <KeyRound className="h-3 w-3 mr-1 text-primary" />
                              Redefinir Senha
                            </Button>

                            {/* Enviar Link Mágico */}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSendMagicLinkAction(company)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-7 gap-1"
                            >
                              <Share2 className="h-3 w-3" />
                              <span>Link no WhatsApp</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border px-6 py-3.5 bg-secondary/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            PereiraLabs Multi-Tenant SaaS • Versão 3.2.0
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Painel
          </Button>
        </div>
      </div>
    </div>
  );
};
