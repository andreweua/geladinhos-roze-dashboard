import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Search,
  Train,
  Gift,
  Sparkles,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
  Heart,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Store,
  RefreshCw,
} from "lucide-react";
import {
  ClienteRecorrente,
  getRegisteredCustomers,
  formatPhoneBr,
  getCustomerLoyaltySummary,
  syncCustomersWithSupabase,
  updateCustomer,
  deleteCustomer,
} from "@/services/customerService";
import { Company } from "@/types/multiTenant";
import { formatCurrency } from "@/lib/utils";

interface CustomersCrmViewProps {
  empresaId: string;
  activeCompany?: Company | null;
}

export const CustomersCrmView: React.FC<CustomersCrmViewProps> = ({
  empresaId,
  activeCompany,
}) => {
  const isTematico = activeCompany?.cupomConfig?.tipoCupom !== "padrao_comercial";
  const companyName = activeCompany?.nome || "Estação da Rô";

  // Termos dinâmicos baseados no modelo da empresa
  const termoCliente = isTematico ? "Passageiro" : "Cliente";
  const termoClientes = isTematico ? "Passageiros" : "Clientes";
  const termoSelos = isTematico ? "Paradas" : "Selos";
  const termoSelo = isTematico ? "Parada" : "Selo";
  const termoRecompensa = isTematico ? "Viagem Doce Grátis" : "Recompensa Cortesia";
  const termoPassaporte = isTematico ? "Passaporte da Estrada Real" : "Cartão Fidelidade";

  // Estado da lista de clientes
  const [customers, setCustomers] = useState<ClienteRecorrente[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<
    "todos" | "quase_ganhando" | "com_cortesia" | "sumidos" | "vips"
  >("todos");

  // Estado para Modal de Envio de WhatsApp Personalizado
  const [whatsappModalCustomer, setWhatsappModalCustomer] = useState<ClienteRecorrente | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("falta_pouco");

  // Estado para Modal de Edição de Cliente
  const [editingCustomer, setEditingCustomer] = useState<ClienteRecorrente | null>(null);
  const [editNome, setEditNome] = useState<string>("");
  const [editEndereco, setEditEndereco] = useState<string>("");

  // Estados de Sincronização em Nuvem (Supabase)
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Carrega clientes da empresa ativa
  const loadCustomers = () => {
    if (!empresaId) return;
    const list = getRegisteredCustomers(empresaId);
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
    if (empresaId) {
      syncCustomersWithSupabase(empresaId).then((res) => {
        if (res.success) {
          loadCustomers();
        }
      });
    }
  }, [empresaId]);

  const handleManualSync = async () => {
    if (!empresaId || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncCustomersWithSupabase(empresaId);
      if (res.success) {
        loadCustomers();
        setSyncFeedback(`✓ ${res.totalSynced} ${termoClientes.toLowerCase()} sincronizados!`);
      } else {
        setSyncFeedback(`⚠️ ${res.error || "Erro ao sincronizar"}`);
      }
    } catch (e: any) {
      setSyncFeedback(`⚠️ Erro: ${e?.message || "Falha na sincronização"}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // KPIs e Métricas Rápidas
  const stats = useMemo(() => {
    const total = customers.length;
    let quaseGanhando = 0;
    let comCortesia = 0;
    let sumidos = 0;
    let totalGastoAcumulado = 0;

    const now = Date.now();
    const VINTE_DIAS_MS = 20 * 24 * 60 * 60 * 1000;

    customers.forEach((c) => {
      totalGastoAcumulado += c.totalGasto || 0;
      const selos = c.selos_atuais || 0;
      const recompensas = c.recompensas_disponiveis || 0;

      if (recompensas > 0 || selos === 10) {
        comCortesia++;
      } else if (selos >= 7 && selos <= 9) {
        quaseGanhando++;
      }

      if (c.ultimaCompra) {
        const lastTime = new Date(c.ultimaCompra).getTime();
        if (now - lastTime > VINTE_DIAS_MS) {
          sumidos++;
        }
      }
    });

    const ticketMedioGeral = total > 0 ? totalGastoAcumulado / total : 0;

    return {
      total,
      quaseGanhando,
      comCortesia,
      sumidos,
      totalGastoAcumulado,
      ticketMedioGeral,
    };
  }, [customers]);

  // Lista filtrada e pesquisada
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const now = Date.now();
    const VINTE_DIAS_MS = 20 * 24 * 60 * 60 * 1000;

    return customers.filter((cust) => {
      // Filtro de Busca Texto
      const matchSearch =
        !term ||
        cust.nome.toLowerCase().includes(term) ||
        cust.telefone.includes(term) ||
        (cust.endereco && cust.endereco.toLowerCase().includes(term));

      if (!matchSearch) return false;

      // Filtro por Categoria / Segmento
      const selos = cust.selos_atuais || 0;
      const recompensas = cust.recompensas_disponiveis || 0;

      if (selectedFilter === "quase_ganhando") {
        return selos >= 7 && selos <= 9 && recompensas === 0;
      }
      if (selectedFilter === "com_cortesia") {
        return recompensas > 0 || selos === 10;
      }
      if (selectedFilter === "sumidos") {
        if (!cust.ultimaCompra) return false;
        const diff = now - new Date(cust.ultimaCompra).getTime();
        return diff > VINTE_DIAS_MS;
      }
      if (selectedFilter === "vips") {
        return cust.totalPedidos >= 3 || cust.totalGasto >= 50;
      }

      return true;
    });
  }, [customers, searchTerm, selectedFilter]);

  // Formata tempo decorrido amigável
  const formatTimeAgo = (isoDate?: string) => {
    if (!isoDate) return "Sem registro";
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 30) return `Há ${diffDays} dias`;
    const diffMonths = Math.floor(diffDays / 30);
    return `Há ${diffMonths} ${diffMonths === 1 ? "mês" : "meses"}`;
  };

  // Gerador de Mensagens do WhatsApp
  const generateWhatsAppMessage = (
    cust: ClienteRecorrente,
    template: string
  ): string => {
    const nome = cust.nome ? cust.nome.split(" ")[0] : termoCliente;
    const selos = cust.selos_atuais || 0;
    const faltam = Math.max(0, 10 - selos);
    const favorito = cust.saboresFavoritos?.[0]?.sabor || "Geladinho Gourmet";

    if (template === "falta_pouco") {
      if (isTematico) {
        return `Olá, *${nome}*! 🚂 Passando para avisar que faltam apenas *${faltam} ${faltam === 1 ? "parada" : "paradas"}* no seu *Passaporte da Estrada Real* para você ganhar sua *Viagem Doce 100% grátis* aqui na *${companyName}*! 🍧✨\n\nQue tal pedir hoje e completar seu passaporte? Temos o seu favorito (*${favorito}*) fresquinho esperando por você! 🛵`;
      }
      return `Olá, *${nome}*! 🍧 Passando para avisar que faltam apenas *${faltam} ${faltam === 1 ? "selo" : "selos"}* no seu cartão fidelidade para você resgatar sua *recompensa exclusiva* aqui na *${companyName}*! 🎁✨\n\nQue tal pedir hoje? Temos o seu favorito (*${favorito}*) pronto para entrega! 🛵`;
    }

    if (template === "cortesia_disponivel") {
      if (isTematico) {
        return `Parabéns, *${nome}*! 🎉🚂 Você carimbou as *10 paradas* e tem uma *VIAGEM DOCE GRÁTIS* disponível para resgate na *${companyName}*! 🍧🎁\n\nVenha retirar sua cortesia na estação ou peça junto com o seu próximo delivery que enviamos para você! ✨`;
      }
      return `Parabéns, *${nome}*! 🎉🎁 Você completou seus selos de fidelidade e tem uma *CORTESIA EXCLUSIVA* liberada para resgate na *${companyName}*! 🍧✨\n\nVenha retirar ou peça junto com seu delivery de hoje!`;
    }

    if (template === "saudade_favorito") {
      if (isTematico) {
        return `Olá, *${nome}*! 🚂 Sentimos sua falta aqui na *${companyName}*! Passando para te contar que acabou de sair uma remessa maravilhosa do seu sabor preferido: *${favorito}*! 🍧❤️\n\nSeu passaporte continua com *${selos}/10 paradas* salvas. Deseja que a gente separe seu pedido hoje? 🛵`;
      }
      return `Olá, *${nome}*! 🍧 Sentimos sua falta aqui na *${companyName}*! Passando para te avisar que preparamos uma remessa deliciosa do seu sabor favorito: *${favorito}*! ❤️✨\n\nPodemos separar o seu pedido de hoje? 🛵`;
    }

    // Default livre
    return `Olá, *${nome}*! Tudo bem? Passando para te enviar o cardápio atualizado da *${companyName}*! 🍧✨`;
  };

  // Abre conversa no WhatsApp
  const handleSendWhatsApp = (cust: ClienteRecorrente, template: string) => {
    const rawDigits = cust.telefone.replace(/\D/g, "");
    if (!rawDigits) return;
    const msg = generateWhatsAppMessage(cust, template);
    const targetUrl = `https://wa.me/55${rawDigits}?text=${encodeURIComponent(msg)}`;
    window.open(targetUrl, "_blank");
    setWhatsappModalCustomer(null);
  };

  // Salva edições do cliente no localStorage e na nuvem
  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    await updateCustomer(
      editingCustomer.telefone,
      {
        nome: editNome.trim() || editingCustomer.nome,
        endereco: editEndereco.trim() || undefined,
      },
      empresaId
    );
    loadCustomers();
    setEditingCustomer(null);
  };

  // Exclusão do cliente (Conformidade com LGPD e Nuvem)
  const handleDeleteCustomer = async (telefone: string) => {
    const conf = window.confirm(
      `Excluir cadastro deste cliente do sistema em definitivo?\n(Esta ação remove o histórico e dados de fidelidade conforme a LGPD)`
    );
    if (!conf) return;

    await deleteCustomer(telefone, empresaId);
    loadCustomers();
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* 1. Header do Módulo CRM */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            {isTematico ? <Train className="h-6 w-6" /> : <Users className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                {isTematico ? "Passageiros & Passaporte da Estrada Real" : "Clientes & Programa de Fidelidade (CRM)"}
              </h2>
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                Multi-Tenant
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isTematico
                ? `Gestão de passageiros, paradas carimbadas e incentivo a viagens na ${companyName}.`
                : `Gestão de clientes cadastrados, histórico de consumo e fidelização na ${companyName}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
          {syncFeedback && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 animate-in fade-in">
              {syncFeedback}
            </span>
          )}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold border border-border shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            title="Sincronizar passageiros com a nuvem Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar Nuvem"}</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de KPIs & Gatilhos de Vendas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total de Clientes */}
        <div
          onClick={() => setSelectedFilter("todos")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            selectedFilter === "todos"
              ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
              : "border-border/70 bg-card/50 hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium">{termoClientes} Ativos</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Cadastrados na base da empresa
          </p>
        </div>

        {/* KPI 2: Quase Ganhando (7 a 9 selos) */}
        <div
          onClick={() => setSelectedFilter("quase_ganhando")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            selectedFilter === "quase_ganhando"
              ? "border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40 shadow-xs"
              : "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold">⭐ Quase Ganhando</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300">
            {stats.quaseGanhando}
          </p>
          <p className="text-[10px] text-amber-800/80 dark:text-amber-400/80 mt-0.5">
            Faltam 1 a 3 {termoSelos.toLowerCase()} (Gatilho ideal!)
          </p>
        </div>

        {/* KPI 3: Com Cortesia Pronta (10 selos) */}
        <div
          onClick={() => setSelectedFilter("com_cortesia")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            selectedFilter === "com_cortesia"
              ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/40 shadow-xs"
              : "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-bold">🎁 Cortesia Disponível</span>
            <Gift className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {stats.comCortesia}
          </p>
          <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
            Prontos para resgatar o brinde
          </p>
        </div>

        {/* KPI 4: Passageiros Sumidos (+20 dias) */}
        <div
          onClick={() => setSelectedFilter("sumidos")}
          className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
            selectedFilter === "sumidos"
              ? "border-rose-500 bg-rose-500/15 ring-1 ring-rose-500/40 shadow-xs"
              : "border-border/70 bg-card/50 hover:bg-secondary/40"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-medium">💤 Sumidos (+20 dias)</span>
            <Clock className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{stats.sumidos}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Oportunidade de reengajamento
          </p>
        </div>
      </div>

      {/* 3. Barra de Pesquisa e Filtros por Segmento */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar por nome, WhatsApp ou endereço do ${termoCliente.toLowerCase()}...`}
              className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Chips de Filtros Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filtro:
          </span>

          <button
            type="button"
            onClick={() => setSelectedFilter("todos")}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
              selectedFilter === "todos"
                ? "border-primary bg-primary/15 text-primary font-bold shadow-xs"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Todos ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("quase_ganhando")}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
              selectedFilter === "quase_ganhando"
                ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shadow-xs"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            ⭐ Quase Ganhando ({stats.quaseGanhando})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("com_cortesia")}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
              selectedFilter === "com_cortesia"
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            🎁 Com Cortesia Pronta ({stats.comCortesia})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("sumidos")}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
              selectedFilter === "sumidos"
                ? "border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold shadow-xs"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            💤 Sumidos +20d ({stats.sumidos})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter("vips")}
            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
              selectedFilter === "vips"
                ? "border-purple-500 bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold shadow-xs"
                : "border-border/70 bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            🏆 Mais Frequentes (VIPs)
          </button>
        </div>
      </div>

      {/* 4. Lista de Passageiros / Clientes */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-foreground">
            Nenhum {termoCliente.toLowerCase()} encontrado
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {searchTerm
              ? "Tente buscar por outro termo ou limpe o filtro atual."
              : `Assim que você registrar novas vendas com identificação no PDV, os ${termoClientes.toLowerCase()} aparecerão aqui com passaporte de fidelidade completo.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredCustomers.map((cust) => {
            const selos = cust.selos_atuais || 0;
            const recompensas = cust.recompensas_disponiveis || 0;
            const faltam = Math.max(0, 10 - selos);
            const favorito = cust.saboresFavoritos?.[0];

            return (
              <div
                key={cust.telefone}
                className="rounded-2xl border border-border/80 bg-card/70 hover:bg-card/90 transition-all p-4 space-y-3.5 shadow-xs flex flex-col justify-between"
              >
                {/* Linha Superior: Nome, Telefone e Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-foreground truncate">
                          {cust.nome || "Passageiro(a) Sem Nome"}
                        </h4>
                        {recompensas > 0 ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                            <Gift className="h-2.5 w-2.5" />
                            Cortesia Pronta!
                          </span>
                        ) : selos >= 7 ? (
                          <span className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-extrabold flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            Faltam {faltam} {termoSelos.toLowerCase()}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono flex items-center gap-1 text-foreground/80">
                          <Phone className="h-3 w-3 text-primary shrink-0" />
                          {cust.telefoneFormatado || cust.telefone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Última compra: {formatTimeAgo(cust.ultimaCompra)}
                        </span>
                      </div>

                      {cust.endereco && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1.5 truncate">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span>{cust.endereco}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2. Passaporte Visual (10 Carimbos) */}
                  <div className="mt-3.5 rounded-xl border border-border/60 bg-background/50 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                      <span className="text-foreground flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        {termoPassaporte}
                      </span>
                      <span
                        className={
                          recompensas > 0
                            ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                            : "text-primary"
                        }
                      >
                        {recompensas > 0
                          ? `10/10 — ${termoRecompensa} Liberada!`
                          : `${selos}/10 ${termoSelos} (Faltam ${faltam})`}
                      </span>
                    </div>

                    {/* Grid dos 10 Carimbos */}
                    <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                      {Array.from({ length: 10 }).map((_, idx) => {
                        const stampNum = idx + 1;
                        const isCarimbado = stampNum <= selos || recompensas > 0;
                        const isRewardSlot = stampNum === 10;

                        return (
                          <div
                            key={idx}
                            title={`${termoSelo} ${stampNum}/10`}
                            className={`flex h-7 items-center justify-center rounded-lg border text-[10px] font-black transition-all ${
                              isRewardSlot
                                ? isCarimbado
                                  ? "border-emerald-500 bg-emerald-500 text-white shadow-xs animate-pulse"
                                  : "border-dashed border-amber-500/70 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : isCarimbado
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-border/60 bg-card/60 text-muted-foreground/50"
                            }`}
                          >
                            {isRewardSlot ? (
                              <Gift className="h-3.5 w-3.5" />
                            ) : isCarimbado ? (
                              "✓"
                            ) : (
                              stampNum
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Métricas de Consumo & Sabor Favorito */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] bg-secondary/30 rounded-xl p-2 border border-border/40">
                    <div>
                      <p className="text-muted-foreground">Pedidos</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {cust.totalPedidos}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Gasto</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {formatCurrency(cust.totalGasto)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ticket Médio</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {formatCurrency(cust.ticketMedio || cust.totalGasto / Math.max(1, cust.totalPedidos))}
                      </p>
                    </div>
                  </div>

                  {/* Sabor Favorito */}
                  {favorito && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-rose-500 fill-rose-500 shrink-0" />
                        Favorito: <strong className="text-foreground">{favorito.sabor}</strong>
                      </span>
                      <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md font-mono">
                        {favorito.quantidade} un.
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Ações no Rodapé: Enviar WhatsApp e Gerenciar */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomer(cust);
                        setEditNome(cust.nome);
                        setEditEndereco(cust.endereco || "");
                      }}
                      title="Editar nome ou endereço do cliente"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(cust.telefone)}
                      title="Excluir dados (Direito LGPD)"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappModalCustomer(cust);
                      setSelectedTemplate(
                        recompensas > 0 ? "cortesia_disponivel" : "falta_pouco"
                      );
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 shadow-xs transition-all"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Disparo de Mensagem Personalizada no WhatsApp */}
      {whatsappModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Enviar WhatsApp para {whatsappModalCustomer.nome || termoCliente}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {whatsappModalCustomer.telefoneFormatado || whatsappModalCustomer.telefone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappModalCustomer(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground block">
                Escolha o Gatilho da Mensagem:
              </label>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate("falta_pouco")}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedTemplate === "falta_pouco"
                      ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary/40"
                      : "border-border/70 bg-card hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Incentivo "Faltam Poucos Selos"</span>
                  </span>
                  <span className="text-[10px] opacity-75">
                    {whatsappModalCustomer.selos_atuais || 0}/10
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate("cortesia_disponivel")}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedTemplate === "cortesia_disponivel"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/40"
                      : "border-border/70 bg-card hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Gift className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Aviso de Cortesia Pronta para Resgate</span>
                  </span>
                  <span className="text-[10px] opacity-75">10/10</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate("saudade_favorito")}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedTemplate === "saudade_favorito"
                      ? "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold ring-1 ring-rose-500/40"
                      : "border-border/70 bg-card hover:bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    <span>Saudades & Sabor Favorito</span>
                  </span>
                  <span className="text-[10px] opacity-75">Reengajamento</span>
                </button>
              </div>

              {/* Pré-visualização do Texto */}
              <div className="rounded-xl border border-border/80 bg-background/80 p-3 text-xs text-foreground/90 font-sans leading-relaxed whitespace-pre-wrap">
                {generateWhatsAppMessage(whatsappModalCustomer, selectedTemplate)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setWhatsappModalCustomer(null)}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(whatsappModalCustomer, selectedTemplate)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-sm"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edição dos Dados do Cliente */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-sm font-bold text-foreground">
                Editar Cadastro do {termoCliente}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Nome Completo:
                </label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Endereço Residencial / Entrega:
                </label>
                <input
                  type="text"
                  value={editEndereco}
                  onChange={(e) => setEditEndereco(e.target.value)}
                  placeholder="Rua, número, complemento, bairro..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  WhatsApp (Chave única):
                </label>
                <input
                  type="text"
                  disabled
                  value={editingCustomer.telefoneFormatado || editingCustomer.telefone}
                  className="w-full rounded-xl border border-input bg-secondary/50 px-3 py-2 text-xs text-muted-foreground cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-xs font-bold shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
