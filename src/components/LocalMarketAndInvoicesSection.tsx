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
  Receipt,
  Tag,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpDown,
  FileText,
  BadgePercent,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
} from "@/components/ui/primitives";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import {
  EstabelecimentoLocal,
  PesquisaPrecoLocal,
  CompraNotaFiscalReal,
  FichaTecnicaProduto,
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
} from "@/services/marketSurveyService";

interface LocalMarketAndInvoicesSectionProps {
  onOpenInvoiceModal: () => void;
  fichasTecnicas?: FichaTecnicaProduto[];
  onApplyPaidPriceToRecipes?: (
    insumoNome: string,
    novoPrecoUnit: number
  ) => void;
}

export const LocalMarketAndInvoicesSection: React.FC<
  LocalMarketAndInvoicesSectionProps
> = ({ onOpenInvoiceModal, fichasTecnicas, onApplyPaidPriceToRecipes }) => {
  const [activeTab, setActiveTab] = useState<"estabelecimentos" | "pesquisas" | "compras">(
    "estabelecimentos"
  );

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
  const [selectedEstabFilter, setSelectedEstabFilter] = useState<string>("todos");
  const [onlyPromos, setOnlyPromos] = useState(false);

  // Modals state
  const [estabModalOpen, setEstabModalOpen] = useState(false);
  const [editingEstab, setEditingEstab] = useState<EstabelecimentoLocal | null>(null);
  const [estabForm, setEstabForm] = useState({
    nome: "",
    tipo: "Supermercado" as EstabelecimentoLocal["tipo"],
    endereco_fisico: "",
    endereco_eletronico: "",
    telefone: "",
    contato_responsavel: "",
    observacoes: "",
  });

  const [pesquisaModalOpen, setPesquisaModalOpen] = useState(false);
  const [pesquisaForm, setPesquisaForm] = useState({
    estabelecimento_id: "",
    insumo_nome: "Leite Condensado",
    marca: "",
    quantidade_embalagem: 395,
    unidade_medida: "g" as PesquisaPrecoLocal["unidade_medida"],
    preco_pesquisado: 4.99,
    data_pesquisa: new Date().toISOString().split("T")[0],
    em_promocao: false,
    observacoes: "",
  });

  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Available ingredients list from recipes
  const commonIngredients = useMemo(() => {
    const set = new Set<string>();
    (fichasTecnicas || []).forEach((f) => {
      f.ingredientes.forEach((i) => {
        // extract clean base name
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
        "Saquinhos para Geladinho 150ml",
      ];
    }
    return Array.from(set);
  }, [fichasTecnicas]);

  // Handlers for Estabelecimentos
  const handleOpenNewEstab = () => {
    setEditingEstab(null);
    setEstabForm({
      nome: "",
      tipo: "Supermercado",
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

  // Handlers for Pesquisa de Preço
  const handleOpenNewPesquisa = () => {
    const firstEstab = estabelecimentos[0]?.id || "";
    setPesquisaForm({
      estabelecimento_id: firstEstab,
      insumo_nome: commonIngredients[0] || "Leite Condensado",
      marca: "",
      quantidade_embalagem: 395,
      unidade_medida: "g",
      preco_pesquisado: 4.99,
      data_pesquisa: new Date().toISOString().split("T")[0],
      em_promocao: false,
      observacoes: "",
    });
    setPesquisaModalOpen(true);
  };

  const handleSavePesquisa = (e: React.FormEvent) => {
    e.preventDefault();
    const estab = estabelecimentos.find((e) => e.id === pesquisaForm.estabelecimento_id);
    const estabNome = estab ? estab.nome : "Mercado Local";

    addPesquisaPreco({
      estabelecimento_id: pesquisaForm.estabelecimento_id,
      estabelecimento_nome: estabNome,
      insumo_nome: pesquisaForm.insumo_nome.trim(),
      marca: pesquisaForm.marca.trim() || "Geral",
      quantidade_embalagem: Number(pesquisaForm.quantidade_embalagem) || 1,
      unidade_medida: pesquisaForm.unidade_medida,
      preco_pesquisado: Number(pesquisaForm.preco_pesquisado) || 0,
      data_pesquisa: pesquisaForm.data_pesquisa,
      em_promocao: pesquisaForm.em_promocao,
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

  const handleApplyItemCostToRecipe = (insumoNome: string, precoUnit: number) => {
    if (onApplyPaidPriceToRecipes) {
      onApplyPaidPriceToRecipes(insumoNome, precoUnit);
      setAppliedFeedback(`Preço real pago de ${formatCurrency(precoUnit)} aplicado à ficha técnica de "${insumoNome}"!`);
      setTimeout(() => setAppliedFeedback(null), 4000);
    }
  };

  // Filtered Pesquisas
  const filteredPesquisas = useMemo(() => {
    return pesquisas.filter((p) => {
      const matchText =
        p.insumo_nome.toLowerCase().includes(filterText.toLowerCase()) ||
        p.marca.toLowerCase().includes(filterText.toLowerCase()) ||
        p.estabelecimento_nome.toLowerCase().includes(filterText.toLowerCase());
      const matchEstab =
        selectedEstabFilter === "todos" || p.estabelecimento_id === selectedEstabFilter;
      const matchPromo = !onlyPromos || p.em_promocao;
      return matchText && matchEstab && matchPromo;
    });
  }, [pesquisas, filterText, selectedEstabFilter, onlyPromos]);

  // Map lowest normalized price per insumo
  const lowestPriceByInsumo = useMemo(() => {
    const map = new Map<string, number>();
    pesquisas.forEach((p) => {
      const cur = map.get(p.insumo_nome);
      if (cur === undefined || p.preco_por_kg_ou_l < cur) {
        map.set(p.insumo_nome, p.preco_por_kg_ou_l);
      }
    });
    return map;
  }, [pesquisas]);

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
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    100% Dados Reais
                  </Badge>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Cadastro de estabelecimentos locais (com endereço físico e eletrônico), cotações comparativas de insumos e preços comprovados por cupom fiscal.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenInvoiceModal}
                className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Receipt className="h-4 w-4" />
                <span>Importar Cupom / NF-e</span>
              </Button>

              {activeTab === "estabelecimentos" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenNewEstab}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-bold"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Estabelecimento</span>
                </Button>
              )}

              {activeTab === "pesquisas" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenNewPesquisa}
                  className="gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-bold"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova Pesquisa de Preço</span>
                </Button>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {appliedFeedback && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{appliedFeedback}</span>
            </div>
          )}

          {/* Sub Navigation Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
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
              1. Cadastro de Estabelecimentos ({estabelecimentos.length})
            </button>

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
              2. Pesquisa de Preços nos Mercados ({pesquisas.length} cotações)
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
              3. Preços Efetivamente Pagos (Cupons & NF-e)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* SUB-ABA 1: CADASTRO DE ESTABELECIMENTOS */}
      {activeTab === "estabelecimentos" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Mercados, Atacados e Distribuidoras Cadastrados
              </h3>
              <p className="text-xs text-muted-foreground">
                Consulte e cadastre o endereço físico e os canais eletrônicos oficiais de cada fornecedor local.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenNewEstab}
              className="gap-1.5 self-start"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span>Adicionar Estabelecimento</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {estabelecimentos.map((estab) => {
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
                        <Badge
                          variant="secondary"
                          className="mb-1 text-[10px] font-bold uppercase tracking-wider"
                        >
                          {estab.tipo}
                        </Badge>
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

      {/* SUB-ABA 2: PESQUISA DE PREÇOS (COTAÇÕES LOCAIS) */}
      {activeTab === "pesquisas" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Buscar insumo ou marca..."
                  className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <select
                value={selectedEstabFilter}
                onChange={(e) => setSelectedEstabFilter(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
              >
                <option value="todos">Todos os Mercados</option>
                {estabelecimentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyPromos}
                  onChange={(e) => setOnlyPromos(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <BadgePercent className="h-3.5 w-3.5 text-emerald-600" />
                <span>Apenas Promoções</span>
              </label>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleOpenNewPesquisa}
              className="gap-1.5 bg-primary text-primary-foreground font-bold self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar Preço</span>
            </Button>
          </div>

          {/* Quotations Table */}
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Insumo / Ingrediente</th>
                    <th className="py-3 px-3">Marca & Embalagem</th>
                    <th className="py-3 px-3">Estabelecimento / Mercado</th>
                    <th className="py-3 px-3 text-right">Preço Embalagem</th>
                    <th className="py-3 px-3 text-right">Preço por Kg / L</th>
                    <th className="py-3 px-3 text-center">Data Cotação</th>
                    <th className="py-3 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPesquisas.map((pesq) => {
                    const lowest = lowestPriceByInsumo.get(pesq.insumo_nome);
                    const isBestPrice =
                      lowest !== undefined && pesq.preco_por_kg_ou_l <= lowest;

                    return (
                      <tr
                        key={pesq.id}
                        className={`transition-colors hover:bg-secondary/40 ${
                          isBestPrice ? "bg-emerald-500/5 font-medium" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {pesq.insumo_nome}
                            </span>
                            {isBestPrice && (
                              <Badge
                                variant="success"
                                className="text-[10px] gap-1 py-0 px-1.5"
                                title="Menor preço encontrado entre todos os mercados cadastrados"
                              >
                                <TrendingDown className="h-3 w-3" />
                                Menor Preço Local
                              </Badge>
                            )}
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
                                Promoção
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
                          {formatCurrency(pesq.preco_pesquisado)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span
                            className={
                              isBestPrice
                                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                : "text-foreground"
                            }
                          >
                            {formatCurrency(pesq.preco_por_kg_ou_l)}
                            <span className="text-[10px] font-normal text-muted-foreground">
                              /{pesq.unidade_medida === "un" ? "un" : pesq.unidade_medida === "ml" || pesq.unidade_medida === "l" ? "L" : "kg"}
                            </span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center text-xs text-muted-foreground">
                          {formatShortDate(new Date(pesq.data_pesquisa))}
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
                <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                  Nenhuma pesquisa de preço encontrada com os filtros selecionados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: PREÇOS PAGOS (CUPONS FISCAIS E NF-E) */}
      {activeTab === "compras" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Histórico de Preços Efetivamente Pagos (Cupons & NF-e)
              </h3>
              <p className="text-xs text-muted-foreground">
                Notas fiscais e cupons de compras reais. Você pode aplicar o preço efetivamente pago diretamente às fichas técnicas das receitas.
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
                        <CardTitle className="text-sm font-bold text-foreground">
                          {compra.numero_cupom_ou_nfe} • {compra.estabelecimento_nome}
                        </CardTitle>
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
                          <th className="pb-2 text-right">Ação</th>
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
                                    handleApplyItemCostToRecipe(
                                      it.insumo_correspondente!,
                                      it.preco_unitario_pago
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  <span>Atualizar Ficha Técnica</span>
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

            {compras.length === 0 && (
              <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                Nenhum cupom fiscal ou compra real importada ainda. Clique em "Importar Nova Nota / Cupom".
              </div>
            )}
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
                  placeholder="Ex: Atacadão Marília ou Tauste Supermercados"
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
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="Atacado">Atacado</option>
                    <option value="Supermercado">Supermercado</option>
                    <option value="Distribuidora">Distribuidora</option>
                    <option value="Empório">Empório</option>
                    <option value="Internet">Internet / E-commerce</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

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
                    placeholder="Ex: (14) 3402-1200"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
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
                  placeholder="Ex: Av. Tiradentes, 1200 - Bairro Fragata - Marília/SP"
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
                  placeholder="Ex: https://www.atacadao.com.br ou https://wa.me/5514..."
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground">
                  Observações / Dicas de Compra (Opcional):
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
                  placeholder="Ex: Melhores preços para fardos fechados ou encarte das terças-feiras"
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

      {/* MODAL: NOVA PESQUISA DE PREÇO */}
      {pesquisaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                Registrar Pesquisa de Preço Local
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
              <div>
                <label className="block font-semibold text-foreground">
                  Estabelecimento Pesquisado *:
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
                      {e.nome} ({e.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground">
                  Insumo / Ingrediente *:
                </label>
                <input
                  type="text"
                  required
                  list="common-ingredients-list"
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
                <datalist id="common-ingredients-list">
                  {commonIngredients.map((ing) => (
                    <option key={ing} value={ing} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground">
                    Marca / Fabricante:
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
                    placeholder="Ex: Piracanjuba ou Moça"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground">
                    Data da Pesquisa:
                  </label>
                  <input
                    type="date"
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
                    Preço Pesquisado *:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pesquisaForm.preco_pesquisado}
                    onChange={(e) =>
                      setPesquisaForm((prev) => ({
                        ...prev,
                        preco_pesquisado: Number(e.target.value),
                      }))
                    }
                    placeholder="4.99"
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold text-primary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time normalized preview */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Preço Normalizado Calculado:</span>
                <strong className="text-foreground font-mono">
                  {formatCurrency(
                    calculateNormalizedPrice(
                      pesquisaForm.preco_pesquisado,
                      pesquisaForm.quantidade_embalagem,
                      pesquisaForm.unidade_medida
                    )
                  )}
                  /{pesquisaForm.unidade_medida === "un" ? "un" : pesquisaForm.unidade_medida === "ml" || pesquisaForm.unidade_medida === "l" ? "L" : "kg"}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promo-check"
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
                  htmlFor="promo-check"
                  className="font-semibold text-foreground cursor-pointer select-none"
                >
                  Este item está em oferta / promoção no estabelecimento
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
                  Salvar Pesquisa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
