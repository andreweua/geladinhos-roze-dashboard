import React, { useState } from "react";
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
} from "lucide-react";
import {
  Company,
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
} from "@/services/companyService";
import { Badge, Button } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

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

  // Form para nova empresa
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
  const [newValorMensal, setNewValorMensal] = useState<number>(79.9);

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
      valorMensalidade: Number(newValorMensal) || 79.9,
    });

    reloadCompanies();
    setIsCreating(false);
    setFeedback(`✓ Empresa "${created.nome}" cadastrada com sucesso!`);
    setTimeout(() => setFeedback(null), 4000);

    // Pergunta se deseja enviar mensagem no WhatsApp imediatamente
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

  const activeCount = companies.filter((c) => c.statusAssinatura === "ativo").length;
  const cortesiaCount = companies.filter((c) => c.statusAssinatura === "cortesia").length;
  const projectedRevenue = companies.reduce((acc, c) => acc + (Number(c.valorMensalidade) || 0), 0);

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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border bg-background p-3.5">
              <span className="text-[11px] font-medium text-muted-foreground block">Total de Empresas</span>
              <p className="text-xl font-black text-foreground mt-0.5">{companies.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Mensalistas Ativos</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">Em Cortesia / Teste</span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{cortesiaCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-3.5">
              <span className="text-[11px] font-medium text-muted-foreground block">Faturamento Estimado</span>
              <p className="text-xl font-black text-foreground mt-0.5">{formatCurrency(projectedRevenue)}/mês</p>
            </div>
          </div>

          {/* Form de Cadastro de Nova Empresa */}
          {isCreating ? (
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Cadastrar Nova Empresa (Ex: Confeitaria Pão de Mel & Bolos)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Preencha os dados da lojista para gerar o acesso e o Link Mágico no WhatsApp
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
                      Nome da Empresa / Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={newNome}
                      onChange={(e) => setNewNome(e.target.value)}
                      placeholder="Ex: Doceria Mel Real ou Bolos & Pães de Mel"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Nicho Comercial
                    </label>
                    <input
                      type="text"
                      value={newNicho}
                      onChange={(e) => setNewNicho(e.target.value)}
                      placeholder="Ex: Pão de Mel & Bolos Gelados"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Nome do Responsável
                    </label>
                    <input
                      type="text"
                      value={newResponsavel}
                      onChange={(e) => setNewResponsavel(e.target.value)}
                      placeholder="Ex: Maria dos Santos"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Cidade / Polo
                    </label>
                    <input
                      type="text"
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
                      Chave Pix para Receber Vendas *
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
                        placeholder="Chave Pix onde cairá o dinheiro da loja"
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
                      placeholder="loja@confeitariamel.com.br"
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

                  {newPlanoTipo === "cortesia" && (
                    <div className="sm:col-span-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <strong className="text-amber-600 dark:text-amber-400">Duração da Cortesia:</strong>
                        <p className="text-[11px] text-muted-foreground">
                          Após esse prazo, o sistema bloqueia automaticamente solicitando renovação.
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

          {/* Lista de Empresas Cadastradas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Empresas sob Gestão da PereiraLabs ({companies.length})
            </h3>

            <div className="grid grid-cols-1 gap-3.5">
              {companies.map((company) => {
                const isCurrentActive = company.id === activeCompanyId;
                const themeMeta = THEME_COLOR_PALETTES[company.corTema] || THEME_COLOR_PALETTES.dourado;

                const isCortesia = company.statusAssinatura === "cortesia";
                const isBloqueado = company.statusAssinatura === "bloqueado";
                const isAtivo = company.statusAssinatura === "ativo";

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

                            {/* Status da Assinatura */}
                            {isAtivo && (
                              <Badge variant="success" className="text-[10px] gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Mensalista Ativo
                              </Badge>
                            )}
                            {isCortesia && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold gap-1 ${
                                  daysLeft && daysLeft <= 0
                                    ? "border-red-500/40 text-red-600 bg-red-500/10"
                                    : "border-amber-500/40 text-amber-600 bg-amber-500/10"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {daysLeft && daysLeft <= 0
                                  ? "Cortesia Expirada"
                                  : `🎁 Cortesia: Restam ${daysLeft} dias`}
                              </Badge>
                            )}
                            {isBloqueado && (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <Lock className="h-3 w-3" />
                                Acesso Bloqueado
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
                        {!isCurrentActive && (
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
                            onClick={() => handleToggleStatusAction(company.id, "ativo")}
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
                            onClick={() => handleToggleStatusAction(company.id, "ativo")}
                            className="text-[11px] h-7 text-emerald-600"
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Desbloquear
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatusAction(company.id, "bloqueado")}
                            className="text-[11px] h-7 text-red-600 hover:bg-red-500/10 border-red-500/30"
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            Bloquear
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-border px-6 py-3.5 bg-secondary/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            PereiraLabs Multi-Tenant SaaS • Versão 3.1.0
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Painel
          </Button>
        </div>
      </div>
    </div>
  );
};
