import React, { useState, useMemo } from "react";
import {
  Store,
  MapPin,
  Globe,
  Phone,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Receipt,
  Building2,
  FileText,
  BadgePercent,
  X,
  Clock,
  History,
  Flame,
  HelpCircle,
  Calculator,
  AlertTriangle,
  Barcode,
  Camera,
  ShoppingCart,
  Upload,
  Key,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui/primitives";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { BRAND_CONFIG } from "@/config/brand.config";
import {
  EstabelecimentoLocal,
  PesquisaPrecoLocal,
  CompraNotaFiscalReal,
  FichaTecnicaProduto,
  EstoquePorProduto,
} from "@/types/dashboard";
import {
  loadEstabelecimentos,
  addOrUpdateEstabelecimento,
  deleteEstabelecimento,
  loadPesquisasPreco,
  addPesquisaPreco,
  deletePesquisaPreco,
  loadComprasNotasFiscais,
  deleteCompraNotaFiscal,
  calculateNormalizedPrice,
  isQuotationValid,
  analyzeHistoricalPrices,
  calculateWeightedAverageCost,
} from "@/services/marketSurveyService";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { ShoppingListSection } from "@/components/ShoppingListSection";
import {
  consultarProdutoPorGtin,
  getRscGtinToken,
  saveRscGtinToken,
  loginRscSistemas,
} from "@/services/gtinService";

interface LocalMarketAndInvoicesSectionProps {
  onOpenInvoiceModal: () => void;
  fichasTecnicas?: FichaTecnicaProduto[];
  reposicaoEstoque?: EstoquePorProduto[];
  onApplyPaidPriceToRecipes?: (
    insumoNome: string,
    novoPrecoUnit: number
  ) => void;
}

export const LocalMarketAndInvoicesSection: React.FC<
  LocalMarketAndInvoicesSectionProps
> = ({ onOpenInvoiceModal, fichasTecnicas, reposicaoEstoque = [], onApplyPaidPriceToRecipes }) => {
  const [activeTab, setActiveTab] = useState<
    "estabelecimentos" | "pesquisas" | "historico_inflacao" | "compras" | "lista_compras"
  >("pesquisas");

  // Live state
  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoLocal[]>(
    () => loadEstabelecimentos()
  );
  const [pesquisas, setPesquisas] = useState<PesquisaPrecoLocal[]>(() =>
    loadPesquisasPreco()
  );
  const [compras, setCompras] = useState<CompraNotaFiscalReal[]>(() =>
    loadComprasNotasFiscais()
  );

  // Search & Filters
  const [filterText, setFilterText] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("todas");
  const [selectedEstabFilter, setSelectedEstabFilter] = useState<string>("todos");
  const [onlyValidQuotations, setOnlyValidQuotations] = useState<boolean>(true);
  const [onlyPromos, setOnlyPromos] = useState(false);

  // Modals state
  const [estabModalOpen, setEstabModalOpen] = useState(false);
  const [editingEstab, setEditingEstab] = useState<EstabelecimentoLocal | null>(null);
  const [estabForm, setEstabForm] = useState({
    nome: "",
    tipo: "Atacado e Varejo" as EstabelecimentoLocal["tipo"],
    cidade: "Jaú - SP",
    endereco_fisico: "",
    endereco_eletronico: "",
    telefone: "",
    contato_responsavel: "",
    observacoes: "",
  });

  const [pesquisaModalOpen, setPesquisaModalOpen] = useState(false);
  const [pesquisaForm, setPesquisaForm] = useState({
    estabelecimento_id: "",
    cidade: "Jaú - SP",
    insumo_nome: "Leite Condensado",
    marca: "",
    gtin: "",
    foto_url: "",
    quantidade_embalagem: 395,
    unidade_medida: "g" as PesquisaPrecoLocal["unidade_medida"],
    preco_pesquisado: 4.89,
    preco_varejo: 5.49 as number | string,
    preco_atacado: 4.89 as number | string,
    qtd_minima_atacado: 12 as number | string,
    data_pesquisa: new Date().toISOString().split("T")[0],
    data_validade: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    em_promocao: true,
    observacoes: "",
  });

  // Native Barcode Scanner & RSC Sistemas GTIN state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearchingGtin, setIsSearchingGtin] = useState(false);
  const [gtinSearchFeedback, setGtinSearchFeedback] = useState<string | null>(null);
  const [rscTokenModalOpen, setRscTokenModalOpen] = useState(false);
  const [rscTokenInput, setRscTokenInput] = useState(() => getRscGtinToken());
  const [rscEmailInput, setRscEmailInput] = useState(() => BRAND_CONFIG.rscGtinConfig?.email || "ANDREWEUA@GMAIL.COM");
  const [rscPasswordInput, setRscPasswordInput] = useState(() => BRAND_CONFIG.rscGtinConfig?.defaultPassword || "");
  const [isLoggingInRsc, setIsLoggingInRsc] = useState(false);
  const [rscLoginFeedback, setRscLoginFeedback] = useState<string | null>(null);

  const [selectedInsumoAnalysis, setSelectedInsumoAnalysis] = useState<string>("Leite Condensado");
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [showCostMethodModal, setShowCostMethodModal] = useState(false);
  const [pendingRecipeApply, setPendingRecipeApply] = useState<{
    insumoNome: string;
    precoPagoUnit: number;
    precoTotalPago: number;
    quantidadeComprada: number;
  } | null>(null);

  // Available ingredients list from recipes
  const commonIngredients = useMemo(() => {
    const set = new Set<string>();
    (fichasTecnicas || []).forEach((f) => {
      f.ingredientes.forEach((i) => {
        const clean = i.nome.split("(")[0].trim();
        if (clean) set.add(clean);
      });
    });
    if (set.size === 0) {
      return [
        "Leite Condensado",
        "Creme de Leite",
        "Doce de Leite",
        "Nutella Original",
        "Leite Ninho em Pó",
        "Ovomaltine",
        "Chocolate em Pó 50%",
        "Polpa de Maracujá",
        "Morango / Frutas Vermelhas",
        "Saquinhos para Geladinho",
      ];
    }
    return Array.from(set);
  }, [fichasTecnicas]);

  // Handlers for Estabelecimentos
  const handleOpenNewEstab = () => {
    setEditingEstab(null);
    setEstabForm({
      nome: "",
      tipo: "Atacado e Varejo",
      cidade: "Jaú - SP",
      endereco_fisico: "",
      endereco_eletronico: "",
      telefone: "",
      contato_responsavel: "",
      observacoes: "",
    });
    setEstabModalOpen(true);
  };

  const handleEditEstab = (estab: EstabelecimentoLocal) => {
    setEditingEstab(estab);
    setEstabForm({
      nome: estab.nome,
      tipo: estab.tipo,
      cidade: estab.cidade || "Jaú - SP",
      endereco_fisico: estab.endereco_fisico,
      endereco_eletronico: estab.endereco_eletronico,
      telefone: estab.telefone || "",
      contato_responsavel: estab.contato_responsavel || "",
      observacoes: estab.observacoes || "",
    });
    setEstabModalOpen(true);
  };

  const handleSaveEstab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estabForm.nome.trim()) return;

    addOrUpdateEstabelecimento({
      id: editingEstab?.id,
      nome: estabForm.nome.trim(),
      tipo: estabForm.tipo,
      cidade: estabForm.cidade.trim() || undefined,
      endereco_fisico: estabForm.endereco_fisico.trim(),
      endereco_eletronico: estabForm.endereco_eletronico.trim(),
      telefone: estabForm.telefone.trim() || undefined,
      contato_responsavel: estabForm.contato_responsavel.trim() || undefined,
      observacoes: estabForm.observacoes.trim() || undefined,
    });

    setEstabelecimentos(loadEstabelecimentos());
    setEstabModalOpen(false);
  };

  const handleDeleteEstab = (id: string) => {
    if (window.confirm("Deseja realmente excluir este estabelecimento do cadastro?")) {
      deleteEstabelecimento(id);
      setEstabelecimentos(loadEstabelecimentos());
    }
  };

  // Handlers for Pesquisa de Preço & GTIN Barcode
  const handleConsultarGtin = async (code: string) => {
    const clean = code.replace(/\D/g, "").trim();
    if (!clean) return;
    setIsSearchingGtin(true);
    setGtinSearchFeedback(null);
    try {
      const info = await consultarProdutoPorGtin(clean);
      if (info) {
        setPesquisaForm((prev) => ({
          ...prev,
          gtin: clean,
          insumo_nome: info.nome || prev.insumo_nome,
          marca: info.marca || prev.marca,
          quantidade_embalagem: info.quantidade_embalagem || prev.quantidade_embalagem,
          unidade_medida: info.unidade_medida || prev.unidade_medida,
          foto_url: info.foto_url || prev.foto_url,
        }));
        setGtinSearchFeedback(
          `Identificado (${info.fonte === "rsc_sistemas" ? "API RSC Sistemas" : "Catálogo Oficial"}): ${info.nome}`
        );
      } else {
        setGtinSearchFeedback("Código GTIN não localizado. Preencha os campos abaixo.");
      }
    } catch {
      setGtinSearchFeedback("Erro ao consultar GTIN.");
    } finally {
      setIsSearchingGtin(false);
    }
  };

  const handleBarcodeScanned = (scannedGtin: string) => {
    setPesquisaForm((prev) => ({ ...prev, gtin: scannedGtin }));
    handleConsultarGtin(scannedGtin);
  };

  const handleSaveRscToken = () => {
    saveRscGtinToken(rscTokenInput);
    setRscTokenModalOpen(false);
    setGtinSearchFeedback("Token RSC Sistemas salvo com sucesso!");
    setTimeout(() => setGtinSearchFeedback(null), 3500);
  };

  const handleAutoLoginRsc = async () => {
    if (!rscEmailInput.trim() || !rscPasswordInput.trim()) {
      setRscLoginFeedback("Informe o e-mail e a senha do painel RSC Sistemas.");
      return;
    }
    setIsLoggingInRsc(true);
    setRscLoginFeedback(null);
    const result = await loginRscSistemas(rscEmailInput, rscPasswordInput);
    setIsLoggingInRsc(false);
    if (result.success && result.token) {
      setRscTokenInput(result.token);
      setRscLoginFeedback("Autenticado com sucesso! Token gerado e ativado.");
      setGtinSearchFeedback("Token RSC Sistemas ativado com sucesso!");
      setTimeout(() => {
        setRscTokenModalOpen(false);
        setRscLoginFeedback(null);
      }, 1500);
    } else {
      setRscLoginFeedback(result.error || "Erro ao conectar.");
    }
  };

  const handleOpenNewPesquisa = () => {
    const firstEstab = estabelecimentos[0];
    setPesquisaForm({
      estabelecimento_id: firstEstab?.id || "",
      cidade: firstEstab?.cidade || "Jaú - SP",
      insumo_nome: commonIngredients[0] || "Leite Condensado",
      marca: "",
      gtin: "",
      foto_url: "",
      quantidade_embalagem: 395,
      unidade_medida: "g",
      preco_pesquisado: 4.89,
      preco_varejo: 5.49,
      preco_atacado: 4.89,
      qtd_minima_atacado: 12,
      data_pesquisa: new Date().toISOString().split("T")[0],
      data_validade: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      em_promocao: true,
      observacoes: "",
    });
    setGtinSearchFeedback(null);
    setPesquisaModalOpen(true);
  };

  const handleSavePesquisa = (e: React.FormEvent) => {
    e.preventDefault();
    const estab = estabelecimentos.find((e) => e.id === pesquisaForm.estabelecimento_id);
    const estabNome = estab ? estab.nome : "Mercado Local";
    const estabCidade = estab?.cidade || pesquisaForm.cidade;

    const precoVarejo =
      pesquisaForm.preco_varejo !== "" && pesquisaForm.preco_varejo !== undefined
        ? Number(pesquisaForm.preco_varejo)
        : Number(pesquisaForm.preco_pesquisado) || 0;

    const precoAtacado =
      pesquisaForm.preco_atacado !== "" && pesquisaForm.preco_atacado !== undefined && Number(pesquisaForm.preco_atacado) > 0
        ? Number(pesquisaForm.preco_atacado)
        : undefined;

    const qtdMinAtacado =
      pesquisaForm.qtd_minima_atacado !== "" && pesquisaForm.qtd_minima_atacado !== undefined && Number(pesquisaForm.qtd_minima_atacado) > 0
        ? Number(pesquisaForm.qtd_minima_atacado)
        : undefined;

    addPesquisaPreco({
      estabelecimento_id: pesquisaForm.estabelecimento_id,
      estabelecimento_nome: estabNome,
      cidade: estabCidade,
      insumo_nome: pesquisaForm.insumo_nome.trim(),
      marca: pesquisaForm.marca.trim() || "Geral",
      quantidade_embalagem: Number(pesquisaForm.quantidade_embalagem) || 1,
      unidade_medida: pesquisaForm.unidade_medida,
      preco_pesquisado: precoVarejo,
      preco_varejo: precoVarejo,
      preco_atacado: precoAtacado,
      qtd_minima_atacado: qtdMinAtacado,
      data_pesquisa: pesquisaForm.data_pesquisa,
      data_validade: pesquisaForm.data_validade || undefined,
      em_promocao: pesquisaForm.em_promocao,
      gtin: pesquisaForm.gtin?.trim() || undefined,
      foto_url: pesquisaForm.foto_url?.trim() || undefined,
      observacoes: pesquisaForm.observacoes.trim() || undefined,
    });

    setPesquisas(loadPesquisasPreco());
    setPesquisaModalOpen(false);
  };

  const handleDeletePesquisa = (id: string) => {
    if (window.confirm("Deseja remover esta cotação de preço?")) {
      deletePesquisaPreco(id);
      setPesquisas(loadPesquisasPreco());
    }
  };

  // Handlers for Preços Pagos (Compras)
  const handleDeleteCompra = (id: string) => {
    if (window.confirm("Deseja remover este registro de cupom fiscal?")) {
      deleteCompraNotaFiscal(id);
      setCompras(loadComprasNotasFiscais());
    }
  };

  const handlePromptApplyRecipe = (
    insumoNome: string,
    precoPagoUnit: number,
    precoTotalPago: number,
    quantidadeComprada: number
  ) => {
    setPendingRecipeApply({
      insumoNome,
      precoPagoUnit,
      precoTotalPago,
      quantidadeComprada,
    });
    setShowCostMethodModal(true);
  };

  const handleConfirmApplyRecipe = (method: "reposicao" | "cmp") => {
    if (!pendingRecipeApply || !onApplyPaidPriceToRecipes) {
      setShowCostMethodModal(false);
      return;
    }

    const { insumoNome, precoPagoUnit } = pendingRecipeApply;
    let precoFinal = precoPagoUnit;

    if (method === "cmp") {
      // Find current recipe cost to simulate CMP
      let custoAtual = precoPagoUnit;
      fichasTecnicas?.forEach((f) => {
        const found = f.ingredientes.find((i) =>
          i.nome.toLowerCase().includes(insumoNome.toLowerCase())
        );
        if (found) custoAtual = found.custo_receita;
      });

      // Pondera com estoque estimado de 1 lote anterior
      const cmpResult = calculateWeightedAverageCost(
        1,
        custoAtual,
        1,
        precoPagoUnit
      );
      precoFinal = cmpResult.custoMedioPonderado;
    }

    onApplyPaidPriceToRecipes(insumoNome, precoFinal);
    setShowCostMethodModal(false);
    setAppliedFeedback(
      `Preço atualizado para "${insumoNome}" (${method === "reposicao" ? "Custo de Reposição Atual" : "Custo Médio Ponderado"}): ${formatCurrency(precoFinal)}!`
    );
    setTimeout(() => setAppliedFeedback(null), 5000);
  };

  // Filtered Estabelecimentos
  const filteredEstabelecimentos = useMemo(() => {
    return estabelecimentos.filter((estab) => {
      const matchCity =
        selectedCityFilter === "todas" ||
        (estab.cidade && estab.cidade.toLowerCase().includes(selectedCityFilter.toLowerCase()));
      return matchCity;
    });
  }, [estabelecimentos, selectedCityFilter]);

  // Filtered Pesquisas
  const filteredPesquisas = useMemo(() => {
    return pesquisas.filter((p) => {
      const matchText =
        p.insumo_nome.toLowerCase().includes(filterText.toLowerCase()) ||
        p.marca.toLowerCase().includes(filterText.toLowerCase()) ||
        p.estabelecimento_nome.toLowerCase().includes(filterText.toLowerCase());

      const matchCity =
        selectedCityFilter === "todas" ||
        (p.cidade && p.cidade.toLowerCase().includes(selectedCityFilter.toLowerCase()));

      const matchEstab =
        selectedEstabFilter === "todos" || p.estabelecimento_id === selectedEstabFilter;

      const isValid = isQuotationValid(p);
      const matchValidity = !onlyValidQuotations || isValid;
      const matchPromo = !onlyPromos || p.em_promocao;

      return matchText && matchCity && matchEstab && matchValidity && matchPromo;
    });
  }, [pesquisas, filterText, selectedCityFilter, selectedEstabFilter, onlyValidQuotations, onlyPromos]);

  // Regra Estrita: O "Menor Preço Vigente" NUNCA considera ofertas expiradas!
  const lowestPriceByInsumo = useMemo(() => {
    const map = new Map<string, number>();
    pesquisas.forEach((p) => {
      // APENAS COTAÇÕES VÁLIDAS / VIGENTES entram no cálculo de menor preço atual!
      if (!isQuotationValid(p)) return;

      const cur = map.get(p.insumo_nome);
      if (cur === undefined || p.preco_por_kg_ou_l < cur) {
        map.set(p.insumo_nome, p.preco_por_kg_ou_l);
      }
    });
    return map;
  }, [pesquisas]);

  // Historical Analysis for the selected ingredient
  const currentAnalysis = useMemo(() => {
    return analyzeHistoricalPrices(pesquisas, selectedInsumoAnalysis);
  }, [pesquisas, selectedInsumoAnalysis]);

  return (
    <section id="mercados-e-precos-reais" className="space-y-6">
      {/* Header Banner */}
      <Card className="border border-primary/30 bg-gradient-to-r from-card via-primary/5 to-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
                    Pesquisa de Mercados & Preços Pagos Reais
                  </h2>
                  <Badge variant="outline" className="border-primary/40 text-primary font-bold">
                    Jaú (SP) & Três Pontas (MG)
                  </Badge>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Atacado, Varejo e <strong>Atacado e Varejo (Atacarejos)</strong>. Controle rigoroso de validade de ofertas, histórico de inflação para sugestão de estoque e custos pagos na NF.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("lista_compras")}
                className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Listas de Compras</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenInvoiceModal}
                className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs"
              >
                <Receipt className="h-4 w-4" />
                <span>Importar Cupom / NF-e</span>
              </Button>

              {activeTab === "estabelecimentos" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenNewEstab}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-bold text-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Estabelecimento</span>
                </Button>
              )}

              <Button
                variant="default"
                size="sm"
                onClick={handleOpenNewPesquisa}
                className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-bold text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Cotação c/ Validade</span>
              </Button>
            </div>
          </div>

          {/* Feedback message */}
          {appliedFeedback && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{appliedFeedback}</span>
            </div>
          )}

          {/* Polos Operacionais Cadastrados */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-border/50">
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-background/70 p-3 text-xs shadow-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">
                    {BRAND_CONFIG.basesOperacionais.jau.cidade}
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary font-semibold">
                    CEP {BRAND_CONFIG.basesOperacionais.jau.cep}
                  </Badge>
                </div>
                <p className="truncate text-muted-foreground text-[11px] mt-0.5">
                  <strong className="text-foreground">{BRAND_CONFIG.basesOperacionais.jau.responsavel}</strong> • {BRAND_CONFIG.basesOperacionais.jau.logradouro}
                </p>
                <p className="text-[10px] text-primary/80 font-medium">
                  {BRAND_CONFIG.basesOperacionais.jau.tipoPolo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-background/70 p-3 text-xs shadow-xs">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">
                    {BRAND_CONFIG.basesOperacionais.tresPontas.cidade}
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary font-semibold">
                    CEP {BRAND_CONFIG.basesOperacionais.tresPontas.cep}
                  </Badge>
                </div>
                <p className="truncate text-muted-foreground text-[11px] mt-0.5">
                  <strong className="text-foreground">{BRAND_CONFIG.basesOperacionais.tresPontas.responsavel}</strong> • {BRAND_CONFIG.basesOperacionais.tresPontas.logradouro}
                </p>
                <p className="text-[10px] text-primary/80 font-medium">
                  {BRAND_CONFIG.basesOperacionais.tresPontas.tipoPolo}
                </p>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab("pesquisas")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "pesquisas"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Search className="h-4 w-4" />
              1. Cotações & Comparador de Preços ({pesquisas.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("historico_inflacao")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "historico_inflacao"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <History className="h-4 w-4 text-amber-500" />
              2. Radar de Inflação & Oportunidade de Estocar
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("estabelecimentos")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "estabelecimentos"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Building2 className="h-4 w-4" />
              3. Cadastro de Mercados ({estabelecimentos.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("compras")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "compras"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              4. Preços Efetivamente Pagos (Cupons & NF-e)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("lista_compras")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "lista_compras"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              5. Listas de Compras & Importação
            </button>
          </div>
        </CardContent>
      </Card>

      {/* SUB-ABA 1: COTAÇÕES DE PREÇO & COMPARADOR COM VALIDADE */}
      {activeTab === "pesquisas" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Buscar insumo ou marca..."
                  className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              {/* City Filter: Jaú - SP vs Três Pontas - MG */}
              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="todas">Todas as Cidades (Jaú & Três Pontas)</option>
                <option value="Jaú">Jaú - SP</option>
                <option value="Três Pontas">Três Pontas - MG</option>
              </select>

              {/* Store Filter */}
              <select
                value={selectedEstabFilter}
                onChange={(e) => setSelectedEstabFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
              >
                <option value="todos">Todos os Estabelecimentos</option>
                {filteredEstabelecimentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} ({e.tipo})
                  </option>
                ))}
              </select>

              {/* Toggle: Apenas Vigentes vs Histórico */}
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyValidQuotations}
                  onChange={(e) => setOnlyValidQuotations(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Apenas Ofertas Vigentes Hoje</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyPromos}
                  onChange={(e) => setOnlyPromos(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <BadgePercent className="h-3.5 w-3.5 text-emerald-600" />
                <span>Promoções</span>
              </label>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleOpenNewPesquisa}
              className="gap-1.5 bg-primary text-primary-foreground font-bold self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Cotação</span>
            </Button>
          </div>

          {/* Quotations Table */}
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-3">Marca & Embalagem</th>
                    <th className="py-3 px-3">Estabelecimento / Praça</th>
                    <th className="py-3 px-3 text-right">Preço Embalagem</th>
                    <th className="py-3 px-3 text-right">Preço por Kg / L</th>
                    <th className="py-3 px-3 text-center">Status / Validade</th>
                    <th className="py-3 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPesquisas.map((pesq) => {
                    const isValid = isQuotationValid(pesq);
                    const lowest = lowestPriceByInsumo.get(pesq.insumo_nome);
                    // O selo de Menor Preço Local SOMENTE é atribuído a cotações VIGENTES
                    const isBestPrice =
                      isValid && lowest !== undefined && pesq.preco_por_kg_ou_l <= lowest;

                    return (
                      <tr
                        key={pesq.id}
                        className={`transition-colors hover:bg-secondary/40 ${
                          !isValid
                            ? "opacity-60 bg-secondary/10"
                            : isBestPrice
                              ? "bg-emerald-500/5 font-medium"
                              : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">
                                {pesq.insumo_nome}
                              </span>
                              {isBestPrice && (
                                <Badge
                                  variant="success"
                                  className="text-[10px] gap-1 py-0 px-1.5"
                                  title="Menor preço vigente hoje entre todas as cotações válidas"
                                >
                                  <TrendingDown className="h-3 w-3" />
                                  Menor Preço Vigente
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {pesq.cidade || "Praça Local"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-muted-foreground">
                          <div>
                            <span className="text-foreground">{pesq.marca}</span>
                            <span className="ml-1 text-[11px] text-muted-foreground font-mono">
                              ({pesq.quantidade_embalagem}
                              {pesq.unidade_medida})
                            </span>
                            {pesq.em_promocao && (
                              <span className="ml-1.5 rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Oferta
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-foreground font-medium">
                              {pesq.estabelecimento_nome}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-foreground">
                          {pesq.preco_atacado && pesq.preco_atacado > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                Atacado: {formatCurrency(pesq.preco_atacado)}
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Varejo: {formatCurrency(pesq.preco_varejo || pesq.preco_pesquisado)}
                                {pesq.qtd_minima_atacado ? ` (mín. ${pesq.qtd_minima_atacado} un)` : ""}
                              </span>
                            </div>
                          ) : (
                            <span>{formatCurrency(pesq.preco_pesquisado)}</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span
                            className={
                              isBestPrice
                                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                : "text-foreground"
                            }
                          >
                            {formatCurrency(pesq.preco_atacado_por_kg_ou_l || pesq.preco_por_kg_ou_l)}
                            <span className="text-[10px] font-normal text-muted-foreground">
                              /{pesq.unidade_medida === "un" ? "un" : pesq.unidade_medida === "ml" || pesq.unidade_medida === "l" ? "L" : "kg"}
                            </span>
                          </span>
                          {pesq.preco_atacado_por_kg_ou_l && (
                            <span className="block text-[9px] font-normal text-muted-foreground">
                              (Base atacado)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <Clock className="h-3 w-3" />
                              {pesq.data_validade
                                ? `Válido até ${formatShortDate(new Date(pesq.data_validade))}`
                                : "Vigente"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400" title="Oferta expirada. Mantida no banco para cálculo de inflação histórica.">
                              <History className="h-3 w-3" />
                              Expirada em {pesq.data_validade ? formatShortDate(new Date(pesq.data_validade)) : pesq.data_pesquisa}
                            </span>
                          )}
                        </td>

                        <td className="py-3 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePesquisa(pesq.id)}
                            title="Remover cotação"
                            className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPesquisas.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                  <p>Nenhuma cotação encontrada com os filtros selecionados.</p>
                  {onlyValidQuotations && (
                    <button
                      type="button"
                      onClick={() => setOnlyValidQuotations(false)}
                      className="mt-2 text-primary hover:underline font-bold"
                    >
                      Ver também ofertas expiradas no histórico
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: RADAR DE INFLAÇÃO & SUGESTÃO DE ESTOQUE */}
      {activeTab === "historico_inflacao" && (
        <div className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="h-5 w-5 text-amber-500" />
                Histórico Temporal de Preços & Radar Anti-Inflação
              </h3>
              <p className="text-xs text-muted-foreground">
                Compara cotações passadas com as vigentes para medir a inflação real dos insumos e sugerir o momento ideal para <strong>estocar</strong>.
              </p>
            </div>

            {/* Select Insumo to Analyze */}
            <select
              value={selectedInsumoAnalysis}
              onChange={(e) => setSelectedInsumoAnalysis(e.target.value)}
              className="rounded-xl border border-input bg-card px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
            >
              {commonIngredients.map((ing) => (
                <option key={ing} value={ing}>
                  Insumo: {ing}
                </option>
              ))}
            </select>
          </div>

          {/* Smart Stock Opportunity Alert */}
          {currentAnalysis.sugestaoEstocar && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
                <Flame className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="font-extrabold uppercase tracking-wide">
                    Oportunidade de Estocar
                  </Badge>
                  <span className="text-xs font-bold text-foreground">
                    {currentAnalysis.insumo_nome}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground font-medium">
                  {currentAnalysis.motivoEstoque}
                </p>
              </div>
            </div>
          )}

          {/* Metric Cards for the Ingredient */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Menor Preço Vigente Hoje
                </span>
                <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {currentAnalysis.menorPrecoVigente
                    ? formatCurrency(currentAnalysis.menorPrecoVigente)
                    : "Sem oferta válida"}
                  <span className="text-xs font-normal text-muted-foreground">/kg ou L</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground truncate">
                  {currentAnalysis.estabelecimentoMenorPreco || "Nenhuma oferta válida no momento"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Média Histórica
                </span>
                <p className="mt-1 text-2xl font-black text-foreground">
                  {formatCurrency(currentAnalysis.mediaHistorica)}
                  <span className="text-xs font-normal text-muted-foreground">/kg ou L</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Calculado sobre {currentAnalysis.totalCotacoes} cotações registradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Variação / Inflação
                </span>
                <p className="mt-1 flex items-center gap-1.5 text-2xl font-black text-foreground">
                  {currentAnalysis.inflacaoAcumuladaPct >= 0 ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-rose-500" />
                      <span className="text-rose-500">+{currentAnalysis.inflacaoAcumuladaPct}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5 text-emerald-500" />
                      <span className="text-emerald-500">{currentAnalysis.inflacaoAcumuladaPct}%</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Variação do menor ao mais recente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Faixa Histórica (Min - Max)
                </span>
                <p className="mt-1 text-lg font-bold text-foreground">
                  {formatCurrency(currentAnalysis.menorHistorico)} a {formatCurrency(currentAnalysis.maiorHistorico)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {currentAnalysis.cotacoesVigentes} vigentes • {currentAnalysis.cotacoesExpiradas} expiradas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline of all quotes for this ingredient */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-foreground">
                Linha do Tempo das Cotações: {selectedInsumoAnalysis}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                {pesquisas
                  .filter((p) =>
                    p.insumo_nome.toLowerCase().includes(selectedInsumoAnalysis.toLowerCase())
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.data_pesquisa).getTime() - new Date(a.data_pesquisa).getTime()
                  )
                  .map((item) => {
                    const isValid = isQuotationValid(item);
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs ${
                          isValid
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-border/60 bg-secondary/20 opacity-75"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">
                              {item.estabelecimento_nome} ({item.cidade})
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Marca: {item.marca} • Embalagem {item.quantidade_embalagem}{item.unidade_medida}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-extrabold text-foreground">
                              {formatCurrency(item.preco_pesquisado)} ({formatCurrency(item.preco_por_kg_ou_l)}/kg)
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Pesquisado em {formatShortDate(new Date(item.data_pesquisa))}
                            </p>
                          </div>

                          {isValid ? (
                            <Badge variant="success" className="text-[10px]">
                              Válida até {item.data_validade ? formatShortDate(new Date(item.data_validade)) : "hoje"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                              Expirada (Histórico)
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-ABA 3: CADASTRO DE ESTABELECIMENTOS (JAÚ E TRÊS PONTAS) */}
      {activeTab === "estabelecimentos" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Mercados, Atacados e Atacarejos Cadastrados
              </h3>
              <p className="text-xs text-muted-foreground">
                Cidades configuradas: <strong>Jaú - SP</strong> e <strong>Três Pontas - MG</strong>. Tipos incluem Supermercado, Atacado e <strong>Atacado e Varejo (Atacarejo)</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="rounded-xl border border-input bg-card px-3 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
              >
                <option value="todas">Todas as Praças (Jaú & Três Pontas)</option>
                <option value="Jaú">Jaú - SP</option>
                <option value="Três Pontas">Três Pontas - MG</option>
              </select>

              <Button
                variant="default"
                size="sm"
                onClick={handleOpenNewEstab}
                className="gap-1.5 bg-primary text-primary-foreground font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Estabelecimento</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEstabelecimentos.map((estab) => {
              const cotacoesDoLocal = pesquisas.filter(
                (p) => p.estabelecimento_id === estab.id
              ).length;
              const comprasDoLocal = compras.filter(
                (c) => c.estabelecimento_id === estab.id
              ).length;

              return (
                <Card
                  key={estab.id}
                  className="flex flex-col justify-between overflow-hidden border border-border/80 transition-shadow hover:shadow-md"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge
                            variant={
                              estab.tipo === "Atacado e Varejo"
                                ? "warning"
                                : estab.tipo === "Atacado"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-[10px] font-bold uppercase tracking-wider"
                          >
                            {estab.tipo}
                          </Badge>
                          {estab.cidade && (
                            <Badge variant="outline" className="text-[10px]">
                              {estab.cidade}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {estab.nome}
                        </CardTitle>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditEstab(estab)}
                          title="Editar cadastro"
                          className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEstab(estab.id)}
                          title="Excluir estabelecimento"
                          className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 p-4 pt-2 text-xs">
                    {/* Endereço Físico */}
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <div>
                        <span className="font-semibold text-foreground">
                          Endereço Físico:
                        </span>
                        <p className="mt-0.5 line-clamp-2">
                          {estab.endereco_fisico || "Não informado"}
                        </p>
                      </div>
                    </div>

                    {/* Endereço Eletrônico */}
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      <div className="overflow-hidden">
                        <span className="font-semibold text-foreground">
                          Endereço Eletrônico:
                        </span>
                        {estab.endereco_eletronico ? (
                          <p className="mt-0.5 truncate">
                            <a
                              href={
                                estab.endereco_eletronico.startsWith("http")
                                  ? estab.endereco_eletronico
                                  : `https://${estab.endereco_eletronico}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                            >
                              <span>{estab.endereco_eletronico}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </p>
                        ) : (
                          <p className="mt-0.5 text-muted-foreground">Não informado</p>
                        )}
                      </div>
                    </div>

                    {/* Telefone / Contato */}
                    {estab.telefone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span>
                          <strong className="text-foreground">Contato:</strong>{" "}
                          {estab.telefone}{" "}
                          {estab.contato_responsavel && `(${estab.contato_responsavel})`}
                        </span>
                      </div>
                    )}

                    {estab.observacoes && (
                      <div className="rounded-lg bg-secondary/40 p-2 text-[11px] text-muted-foreground italic">
                        💡 {estab.observacoes}
                      </div>
                    )}

                    {/* Metadados / Resumo */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                      <span>{cotacoesDoLocal} cotações salvas</span>
                      <span>{comprasDoLocal} notas importadas</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-ABA 4: PREÇOS PAGOS (CUPONS FISCAIS E NF-E) */}
      {activeTab === "compras" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Histórico de Preços Efetivamente Pagos (Cupons & NF-e)
              </h3>
              <p className="text-xs text-muted-foreground">
                Notas fiscais de compras reais. Ao aplicar às fichas técnicas, você pode escolher entre <strong>Custo de Reposição</strong> (último preço pago) ou <strong>Custo Médio Ponderado (CMP)</strong>.
              </p>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={onOpenInvoiceModal}
              className="gap-1.5 bg-primary text-primary-foreground font-bold self-start"
            >
              <Receipt className="h-4 w-4" />
              <span>Importar Nova Nota / Cupom</span>
            </Button>
          </div>

          <div className="space-y-4">
            {compras.map((compra) => (
              <Card key={compra.id} className="overflow-hidden border border-border/80">
                <CardHeader className="bg-secondary/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-foreground">
                          {compra.numero_cupom_ou_nfe} • {compra.estabelecimento_nome}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Data da Compra: {formatShortDate(new Date(compra.data_compra))} • Origem: {compra.origem === "nfc_chave" ? "Chave de Acesso NFC-e" : compra.origem === "xml" ? "Arquivo XML SEFAZ" : "Cupom Impresso"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-foreground">
                        Total Pago: {formatCurrency(compra.valor_total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCompra(compra.id)}
                        title="Remover cupom"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="pb-2">Descrição do Produto na Nota</th>
                          <th className="pb-2">Insumo na Receita</th>
                          <th className="pb-2 text-center">Quantidade</th>
                          <th className="pb-2 text-right">Preço Pago (Unitário)</th>
                          <th className="pb-2 text-right">Subtotal</th>
                          <th className="pb-2 text-right">Ação / Ficha Técnica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {compra.itens.map((it) => (
                          <tr key={it.id} className="hover:bg-secondary/25">
                            <td className="py-2.5 font-medium text-foreground">
                              {it.descricao}
                            </td>
                            <td className="py-2.5 text-primary font-semibold">
                              {it.insumo_correspondente || "Geral"}
                            </td>
                            <td className="py-2.5 text-center font-mono text-muted-foreground">
                              {it.quantidade} {it.unidade}
                            </td>
                            <td className="py-2.5 text-right font-bold text-foreground">
                              {formatCurrency(it.preco_unitario_pago)}
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-foreground">
                              {formatCurrency(it.preco_total)}
                            </td>
                            <td className="py-2.5 text-right">
                              {it.insumo_correspondente ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePromptApplyRecipe(
                                      it.insumo_correspondente!,
                                      it.preco_unitario_pago,
                                      it.preco_total,
                                      it.quantidade
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  <Calculator className="h-3 w-3" />
                                  <span>Atualizar Ficha</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 5: LISTAS DE COMPRAS & IMPORTAÇÃO */}
      {activeTab === "lista_compras" && (
        <ShoppingListSection
          estabelecimentos={estabelecimentos}
          fichasTecnicas={fichasTecnicas}
          reposicaoEstoque={reposicaoEstoque}
          onQuotationsSaved={() => setPesquisas(loadPesquisasPreco())}
        />
      )}

      {/* MODAL EXPLICATIVO: CUSTO DE REPOSIÇÃO VS CUSTO MÉDIO PONDERADO (CMP) */}
      {showCostMethodModal && pendingRecipeApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Como atualizar a Ficha Técnica de "{pendingRecipeApply.insumoNome}"?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCostMethodModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 text-xs text-muted-foreground space-y-2">
              <p className="flex items-center gap-1.5 font-bold text-foreground">
                <HelpCircle className="h-4 w-4 text-indigo-500" />
                Entenda a diferença contábil entre os métodos:
              </p>
              <p>
                <strong>Preço pago nesta Nota:</strong> {formatCurrency(pendingRecipeApply.precoPagoUnit)} ({pendingRecipeApply.quantidadeComprada} un.)
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Option 1: Custo de Reposição (Recomendado) */}
              <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    Opção 1: Custo de Reposição Atual (Recomendado)
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    Protege o Lucro
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Aplica diretamente o valor da última compra ({formatCurrency(pendingRecipeApply.precoPagoUnit)}).
                  <strong> Por que é o mais seguro?</strong> Quando você vende um geladinho, o dinheiro que entra no caixa precisa cobrir o preço que o supermercado está cobrando <em>hoje</em> para repor a despensa.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleConfirmApplyRecipe("reposicao")}
                  className="w-full bg-primary text-primary-foreground font-bold mt-1"
                >
                  Usar Custo de Reposição ({formatCurrency(pendingRecipeApply.precoPagoUnit)})
                </Button>
              </div>

              {/* Option 2: Custo Médio Ponderado */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Calculator className="h-4 w-4" />
                    Opção 2: Custo Médio Ponderado (CMP)
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Contábil
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Faz a média ponderada entre os insumos antigos que você já tinha no armário e o novo lote que acabou de entrar pela nota fiscal. Ideal se você comprou um lote promocional grande e quer diluir o custo ao longo das semanas.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfirmApplyRecipe("cmp")}
                  className="w-full font-bold mt-1"
                >
                  Usar Custo Médio Ponderado (CMP)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE ESTABELECIMENTO */}
      {estabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingEstab ? "Editar Estabelecimento" : "Novo Estabelecimento Local"}
              </h3>
              <button
                type="button"
                onClick={() => setEstabModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEstab} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground">
                  Nome do Estabelecimento *:
                </label>
                <input
                  type="text"
                  required
                  value={estabForm.nome}
                  onChange={(e) =>
                    setEstabForm((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder="Ex: Mart Minas Atacado & Varejo ou Jaú Serve"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground">
                    Tipo de Estabelecimento:
                  </label>
                  <select
                    value={estabForm.tipo}
                    onChange={(e) =>
                      setEstabForm((prev) => ({
                        ...prev,
                        tipo: e.target.value as EstabelecimentoLocal["tipo"],
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="Atacado e Varejo">Atacado e Varejo (Atacarejo)</option>
                    <option value="Atacado">Atacado</option>
                    <option value="Supermercado">Supermercado (Varejo)</option>
                    <option value="Distribuidora">Distribuidora de Embalagens</option>
                    <option value="Empório">Empório / Especializado</option>
                    <option value="Internet">Internet / E-commerce</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground">
                    Cidade / Praça *:
                  </label>
                  <select
                    value={estabForm.cidade}
                    onChange={(e) =>
                      setEstabForm((prev) => ({ ...prev, cidade: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none"
                  >
                    <option value="Jaú - SP">Jaú - SP</option>
                    <option value="Três Pontas - MG">Três Pontas - MG</option>
                    <option value="Outra Cidade">Outra Cidade</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground">
                  Endereço Físico (Rua, Número, Bairro, Cidade, CEP) *:
                </label>
                <input
                  type="text"
                  required
                  value={estabForm.endereco_fisico}
                  onChange={(e) =>
                    setEstabForm((prev) => ({
                      ...prev,
                      endereco_fisico: e.target.value,
                    }))
                  }
                  placeholder="Ex: Rodovia MG-167, km 32 - Três Pontas/MG ou Rua Floriano Peixoto, 575 - Jaú/SP"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground">
                  Endereço Eletrônico (Site, E-commerce, Link Maps ou WhatsApp) *:
                </label>
                <input
                  type="text"
                  required
                  value={estabForm.endereco_eletronico}
                  onChange={(e) =>
                    setEstabForm((prev) => ({
                      ...prev,
                      endereco_eletronico: e.target.value,
                    }))
                  }
                  placeholder="Ex: https://www.martminas.com.br ou https://www.jauserve.com.br"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground">
                    Telefone / WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={estabForm.telefone}
                    onChange={(e) =>
                      setEstabForm((prev) => ({ ...prev, telefone: e.target.value }))
                    }
                    placeholder="Ex: (35) 3266-9000 ou (14) 3602-1500"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground">
                    Contato do Responsável:
                  </label>
                  <input
                    type="text"
                    value={estabForm.contato_responsavel}
                    onChange={(e) =>
                      setEstabForm((prev) => ({
                        ...prev,
                        contato_responsavel: e.target.value,
                      }))
                    }
                    placeholder="Ex: Televendas Atacado"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground">
                  Observações / Dicas de Compra:
                </label>
                <textarea
                  rows={2}
                  value={estabForm.observacoes}
                  onChange={(e) =>
                    setEstabForm((prev) => ({
                      ...prev,
                      observacoes: e.target.value,
                    }))
                  }
                  placeholder="Ex: Desconto em caixas fechadas de leite condensado ou encarte de quarta-feira"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEstabModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Salvar Estabelecimento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA PESQUISA DE PREÇO COM VALIDADE */}
      {pesquisaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                Registrar Cotação de Preço com Validade
              </h3>
              <button
                type="button"
                onClick={() => setPesquisaModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePesquisa} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground">
                    Estabelecimento *:
                  </label>
                  <select
                    required
                    value={pesquisaForm.estabelecimento_id}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        estabelecimento_id: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    {estabelecimentos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome} ({e.cidade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground">
                    Praça / Cidade:
                  </label>
                  <select
                    value={pesquisaForm.cidade}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        cidade: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Jaú - SP">Jaú - SP</option>
                    <option value="Três Pontas - MG">Três Pontas - MG</option>
                  </select>
                </div>
              </div>

              {/* Pesquisa por Código de Barras GTIN / EAN com Câmera */}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Barcode className="h-4 w-4 text-primary" />
                    Código de Barras GTIN / EAN-13 (Opcional):
                  </label>
                  <button
                    type="button"
                    onClick={() => setRscTokenModalOpen(true)}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Key className="h-3 w-3" />
                    {getRscGtinToken() ? "Token RSC Sistemas Ativo" : "Configurar Token RSC Sistemas"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pesquisaForm.gtin}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPesquisaForm((prev) => ({ ...prev, gtin: val }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && pesquisaForm.gtin.trim()) {
                          e.preventDefault();
                          handleConsultarGtin(pesquisaForm.gtin);
                        }
                      }}
                      placeholder="Ex: 7891000100103 ou escaneie com a câmera"
                      className="w-full rounded-xl border border-input bg-background pl-3 pr-8 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                    />
                    {pesquisaForm.gtin && (
                      <button
                        type="button"
                        onClick={() => setPesquisaForm((prev) => ({ ...prev, gtin: "", foto_url: "" }))}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSearchingGtin || !pesquisaForm.gtin.trim()}
                    onClick={() => handleConsultarGtin(pesquisaForm.gtin)}
                    className="gap-1 text-xs font-semibold"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>{isSearchingGtin ? "Buscando..." : "Buscar"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setIsScannerOpen(true)}
                    className="gap-1.5 bg-primary text-primary-foreground font-bold text-xs shadow-sm"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Câmera</span>
                  </Button>
                </div>

                {gtinSearchFeedback && (
                  <div className="rounded-lg bg-background/90 p-2 text-[11px] font-medium text-foreground flex items-center justify-between border border-border">
                    <span className="truncate">{gtinSearchFeedback}</span>
                    {pesquisaForm.gtin && (
                      <a
                        href={`https://www.gtin.rscsistemas.com.br/?gtin=${pesquisaForm.gtin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-bold inline-flex items-center gap-1 shrink-0 ml-2"
                      >
                        Ver no RSC Sistemas
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {pesquisaForm.foto_url && (
                  <div className="flex items-center gap-3 pt-1 border-t border-border/60">
                    <img
                      src={pesquisaForm.foto_url}
                      alt={pesquisaForm.insumo_nome}
                      className="h-12 w-12 rounded-lg border border-border object-contain bg-white p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground">{pesquisaForm.insumo_nome}</strong>
                      <span className="block">{pesquisaForm.marca} • {pesquisaForm.quantidade_embalagem}{pesquisaForm.unidade_medida}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-foreground">
                  Insumo / Ingrediente *:
                </label>
                <input
                  type="text"
                  required
                  list="common-ingredients-list-modal"
                  value={pesquisaForm.insumo_nome}
                  onChange={(e) =>
                    setPesquisaForm((prev) => ({
                      ...prev,
                      insumo_nome: e.target.value,
                    }))
                  }
                  placeholder="Ex: Leite Condensado"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
                <datalist id="common-ingredients-list-modal">
                  {commonIngredients.map((ing) => (
                    <option key={ing} value={ing} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-foreground">
                    Marca / Linha:
                  </label>
                  <input
                    type="text"
                    value={pesquisaForm.marca}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        marca: e.target.value,
                      }))
                    }
                    placeholder="Ex: Piracanjuba TP"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-foreground">
                    Data da Consulta *:
                  </label>
                  <input
                    type="date"
                    required
                    value={pesquisaForm.data_pesquisa}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        data_pesquisa: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-foreground text-primary flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Validade da Oferta *:
                  </label>
                  <input
                    type="date"
                    required
                    value={pesquisaForm.data_validade}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        data_validade: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-primary/50 bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-foreground">
                    Qtd. Embalagem:
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={pesquisaForm.quantidade_embalagem}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        quantidade_embalagem: Number(e.target.value),
                      }))
                    }
                    placeholder="395"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground">
                    Unidade:
                  </label>
                  <select
                    value={pesquisaForm.unidade_medida}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        unidade_medida: e.target.value as PesquisaPrecoLocal["unidade_medida"],
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="g">Gramas (g)</option>
                    <option value="kg">Quilos (kg)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="l">Litros (L)</option>
                    <option value="un">Unidade (un)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-foreground">
                    Preço Varejo (Unitário) *:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pesquisaForm.preco_varejo !== undefined && pesquisaForm.preco_varejo !== "" ? pesquisaForm.preco_varejo : pesquisaForm.preco_pesquisado}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        preco_varejo: e.target.value === "" ? "" : Number(e.target.value),
                        preco_pesquisado: e.target.value === "" ? 0 : Number(e.target.value),
                      }))
                    }
                    placeholder="5.49"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Bloco de Atacado & Limite Mínimo */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Preço de Atacado & Volume Mínimo (Opcional)</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Ex: Tenda, Mart Minas, Assaí
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground text-[11px]">
                      Preço Unitário no Atacado (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pesquisaForm.preco_atacado}
                      onChange={(e) =>
                        setPesquisaForm((prev) => ({
                          ...prev,
                          preco_atacado: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      placeholder="Ex: 4.89"
                      className="mt-1 w-full rounded-xl border border-emerald-500/40 bg-background px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-foreground text-[11px]">
                      Qtd. Mínima p/ Atacado (un/cx):
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={pesquisaForm.qtd_minima_atacado}
                      onChange={(e) =>
                        setPesquisaForm((prev) => ({
                          ...prev,
                          qtd_minima_atacado: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      placeholder="Ex: 12"
                      className="mt-1 w-full rounded-xl border border-emerald-500/40 bg-background px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {pesquisaForm.preco_atacado !== "" && Number(pesquisaForm.preco_atacado) > 0 && (
                  <div className="flex items-center justify-between text-[11px] pt-1 text-emerald-800 dark:text-emerald-300 font-semibold border-t border-emerald-500/20">
                    <span>Desconto Atacado:</span>
                    <span>
                      {Number(pesquisaForm.preco_varejo || pesquisaForm.preco_pesquisado) > Number(pesquisaForm.preco_atacado)
                        ? `-${(((Number(pesquisaForm.preco_varejo || pesquisaForm.preco_pesquisado) - Number(pesquisaForm.preco_atacado)) / Number(pesquisaForm.preco_varejo || pesquisaForm.preco_pesquisado)) * 100).toFixed(1)}% de economia a partir de ${pesquisaForm.qtd_minima_atacado || 1} un`
                        : "Preço de atacado cadastrado"}
                    </span>
                  </div>
                )}
              </div>

              {/* Real-time normalized preview */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-2.5 text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span>Preço Normalizado Calculado:</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-mono font-bold">
                    Varejo: {formatCurrency(
                      calculateNormalizedPrice(
                        Number(pesquisaForm.preco_varejo || pesquisaForm.preco_pesquisado),
                        pesquisaForm.quantidade_embalagem,
                        pesquisaForm.unidade_medida
                      )
                    )}/{pesquisaForm.unidade_medida === "un" ? "un" : pesquisaForm.unidade_medida === "ml" || pesquisaForm.unidade_medida === "l" ? "L" : "kg"}
                  </span>

                  {pesquisaForm.preco_atacado !== "" && Number(pesquisaForm.preco_atacado) > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-extrabold">
                      • Atacado: {formatCurrency(
                        calculateNormalizedPrice(
                          Number(pesquisaForm.preco_atacado),
                          pesquisaForm.quantidade_embalagem,
                          pesquisaForm.unidade_medida
                        )
                      )}/{pesquisaForm.unidade_medida === "un" ? "un" : pesquisaForm.unidade_medida === "ml" || pesquisaForm.unidade_medida === "l" ? "L" : "kg"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promo-check-validade"
                  checked={pesquisaForm.em_promocao}
                  onChange={(e) =>
                    setPesquisaForm((prev) => ({
                      ...prev,
                      em_promocao: e.target.checked,
                    }))
                  }
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label
                  htmlFor="promo-check-validade"
                  className="font-semibold text-foreground cursor-pointer select-none"
                >
                  Item em oferta / promoção com data limite definida
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPesquisaModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold"
                >
                  Salvar Cotação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL CONFIGURAR TOKEN RSC SISTEMAS */}
      {rscTokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Token da API GTIN RSC Sistemas
              </h3>
              <button
                type="button"
                onClick={() => setRscTokenModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Opção 1: Login Automático */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-black">1</span>
                  <span>Gerar Token Automaticamente (Recomendado)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Informe o seu e-mail e senha da conta <strong>gtin.rscsistemas.com.br</strong> para o app gerar o token JWT automaticamente via API v3:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      E-mail do painel:
                    </label>
                    <input
                      type="email"
                      value={rscEmailInput}
                      onChange={(e) => setRscEmailInput(e.target.value)}
                      placeholder="seu_email@dominio.com"
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                      Senha do painel:
                    </label>
                    <input
                      type="password"
                      value={rscPasswordInput}
                      onChange={(e) => setRscPasswordInput(e.target.value)}
                      placeholder="Sua senha da RSC..."
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {rscLoginFeedback && (
                  <p className={`text-[11px] font-semibold ${rscLoginFeedback.includes("sucesso") ? "text-emerald-500" : "text-amber-500"}`}>
                    {rscLoginFeedback}
                  </p>
                )}

                <Button
                  type="button"
                  size="sm"
                  disabled={isLoggingInRsc || !rscEmailInput || !rscPasswordInput}
                  onClick={handleAutoLoginRsc}
                  className="w-full bg-primary text-primary-foreground font-bold text-xs shadow-sm mt-1"
                >
                  {isLoggingInRsc ? "Conectando e gerando token..." : "Gerar & Ativar Token RSC"}
                </Button>
              </div>

              {/* Opção 2: Colar Token Manualmente */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] text-foreground font-black">2</span>
                  <span>Ou cole o Bearer Token gerado via cURL:</span>
                </div>
                <textarea
                  rows={2}
                  value={rscTokenInput}
                  onChange={(e) => setRscTokenInput(e.target.value)}
                  placeholder="Cole aqui seu token JWT (Bearer Token)..."
                  className="w-full rounded-lg border border-input bg-background p-2 font-mono text-[11px] text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!rscTokenInput.trim()}
                  onClick={handleSaveRscToken}
                  className="w-full text-xs font-semibold"
                >
                  Salvar Token Manualmente
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRscTokenModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal with Native Camera */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title="Escanear Código GTIN / EAN do Produto"
      />
    </section>
  );
};
