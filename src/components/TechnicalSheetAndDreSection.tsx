import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  ChefHat,
  Clock,
  Beaker,
  TrendingUp,
  CheckCircle2,
  Edit3,
  Layers,
  ShoppingBag,
  Search,
  Sparkles,
  PackageCheck,
  Percent,
  Receipt,
  Camera,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui/primitives";
import { calculateDynamicIfoodPrice } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { calculateUnitCostFromFicha } from "@/services/dataService";
import { loadCurrentQuotations } from "@/services/quotationService";
import {
  CALDAS_ARTESANAIS_BASE,
  RESUMO_LOTES_PRODUCAO,
  SOBRAS_ESTOQUE_INSUMOS,
  TABELA_COTACAO_INSUMOS,
} from "@/data/insumosCatalog";
import { getActiveCompanyId } from "@/services/companyService";
import {
  DreProdutoItem,
  FichaTecnicaProduto,
  IngredienteFicha,
  Produto,
} from "@/types/dashboard";

interface TechnicalSheetAndDreSectionProps {
  produtos: Produto[];
  fichasTecnicas: FichaTecnicaProduto[];
  drePorProduto: DreProdutoItem[];
  dreConsolidada: DreProdutoItem;
  selectedProductId: string;
  onSelectProductId: (id: string) => void;
  onSaveFicha: (
    ficha: FichaTecnicaProduto,
    novoPrecoVenda?: number
  ) => Promise<void>;
  ifoodFeePct: number;
  onChangeIfoodFeePct: (newRate: number) => void;
  onOpenInvoiceModal?: () => void;
  onOpenCreateProduct?: () => void;
  onDeleteProduct?: (produtoId: string) => Promise<void>;
  onOpenCulinaryStudio?: (flavor?: string) => void;
}

export const TechnicalSheetAndDreSection: React.FC<
  TechnicalSheetAndDreSectionProps
> = ({
  produtos,
  fichasTecnicas,
  drePorProduto,
  dreConsolidada,
  selectedProductId,
  onSelectProductId,
  onSaveFicha,
  ifoodFeePct,
  onChangeIfoodFeePct,
  onOpenInvoiceModal,
  onOpenCreateProduct,
  onDeleteProduct,
  onOpenCulinaryStudio,
}) => {
  const isRozeCompany = getActiveCompanyId() === "emp-roze-gourmet";
  const activeProducts = produtos.filter((p) => p.ativo);
  const currentProduct =
    activeProducts.find((p) => p.id === selectedProductId) || activeProducts[0];

  const currentFicha = fichasTecnicas.find(
    (f) => f.produto_id === currentProduct?.id
  );
  const currentDre =
    drePorProduto.find((d) => d.produto_id === currentProduct?.id) ||
    drePorProduto[0];

  const [isEditing, setIsEditing] = useState(false);
  const [draftFicha, setDraftFicha] = useState<FichaTecnicaProduto | null>(
    null
  );
  const [draftPrecoVenda, setDraftPrecoVenda] = useState<string>("");
  const [dreViewMode, setDreViewMode] = useState<
    "periodo" | "local_un" | "ifood_un"
  >("periodo");
  const [savedNotice, setSavedNotice] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quotation table filter
  const [insumoSearch, setInsumoSearch] = useState("");
  const [insumoCat, setInsumoCat] = useState<string>("Todas");

  useEffect(() => {
    if (currentFicha && currentProduct) {
      setDraftFicha(JSON.parse(JSON.stringify(currentFicha)));
      setDraftPrecoVenda(String(currentProduct.preco_venda));
      setIsEditing(false);
    }
  }, [currentFicha, currentProduct]);

  // Se a empresa ainda não tiver produtos cadastrados, exibe o Estado Vazio acolhedor
  if (activeProducts.length === 0 || !currentProduct || !draftFicha || !currentDre) {
    return (
      <section
        id="secao-ficha-dre"
        aria-label="Ficha Técnica e DRE por Produto"
        className="space-y-6"
      >
        <Card className="border-border/80 bg-card/60 backdrop-blur-md p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-sm">
            <ChefHat className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Nenhum Produto ou Receita Cadastrada
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1.5 mb-6">
            Esta empresa ainda não possui produtos cadastrados. Adicione seu primeiro produto para montar a ficha técnica e analisar os custos dos ingredientes e margens de lucro.
          </p>
          {onOpenCreateProduct && (
            <Button
              onClick={onOpenCreateProduct}
              className="bg-primary text-primary-foreground font-bold gap-2 px-6 py-2.5 rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeiro Produto / Sabor</span>
            </Button>
          )}
        </Card>
      </section>
    );
  }

  const calc = calculateUnitCostFromFicha(draftFicha);
  const precoVendaNum =
    parseFloat(draftPrecoVenda) || currentProduct.preco_venda;
  const lucroLocalUn = Number((precoVendaNum - calc.custoTotalUn).toFixed(2));

  // Dynamic iFood calculation based on registered fee rate (ifoodFeePct)
  const dynamicIfood = calculateDynamicIfoodPrice(
    precoVendaNum,
    calc.custoTotalUn,
    ifoodFeePct
  );

  const markupMultiplicador =
    calc.custoTotalUn > 0
      ? Number((precoVendaNum / calc.custoTotalUn).toFixed(2))
      : 0;

  const handleIngredientChange = (
    id: string,
    field: keyof IngredienteFicha,
    value: string | number
  ) => {
    setDraftFicha((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ingredientes: prev.ingredientes.map((ing) =>
          ing.id === id ? { ...ing, [field]: value } : ing
        ),
      };
    });
  };

  const handleAddIngredient = () => {
    setDraftFicha((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ingredientes: [
          ...prev.ingredientes,
          {
            id: `ing-${Date.now()}`,
            nome: "Novo Insumo / Ingrediente",
            quantidade_receita: 100,
            unidade: "g",
            custo_receita: 2.5,
          },
        ],
      };
    });
    setIsEditing(true);
  };

  const handleRemoveIngredient = (id: string) => {
    setDraftFicha((prev) => {
      if (!prev || prev.ingredientes.length <= 1) return prev;
      return {
        ...prev,
        ingredientes: prev.ingredientes.filter((i) => i.id !== id),
      };
    });
  };

  const handleSave = async () => {
    if (!draftFicha) return;
    const updatedFicha: FichaTecnicaProduto = {
      ...draftFicha,
      preco_ifood_sugerido: dynamicIfood.precoIfood,
      lucro_ifood_estimado: dynamicIfood.lucroLiquidoIfood,
    };
    await onSaveFicha(updatedFicha, precoVendaNum);
    setIsEditing(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  // DRE values depending on toggle ("periodo" vs "local_un" vs "ifood_un")
  const dreLinhas =
    dreViewMode === "periodo"
      ? {
          subtitulo: `${formatNumber(currentDre.unidades_vendidas)} saquinhos (150ml) vendidos no período filtrado`,
          receitaBruta: currentDre.receita_bruta,
          labelTaxas: "(-) Taxas de Maquininha / Cartão",
          taxasPagamento: currentDre.taxas_pagamento,
          receitaLiquida: currentDre.receita_liquida,
          cmvInsumos: currentDre.cmv_insumos,
          embalagens: currentDre.custo_embalagens_total,
          operacional: currentDre.custo_operacional_total,
          cpvTotal: currentDre.cpv_total,
          lucroLiquido: currentDre.lucro_liquido,
        }
      : dreViewMode === "local_un"
        ? {
            subtitulo: `Venda Local / Retirada — Por 1 Saquinho (${draftFicha.volume_unitario_ml}ml)`,
            receitaBruta: precoVendaNum,
            labelTaxas: "(-) Taxa Venda Direta (Pix/Dinheiro 0%)",
            taxasPagamento: 0,
            receitaLiquida: precoVendaNum,
            cmvInsumos: calc.custoInsumosUn,
            embalagens: draftFicha.custo_embalagem_un,
            operacional: draftFicha.custo_operacional_un,
            cpvTotal: calc.custoTotalUn,
            lucroLiquido: lucroLocalUn,
          }
        : {
            subtitulo: `Venda Delivery / iFood (Taxa Cadastrada ${ifoodFeePct}% → Fator ÷ ${dynamicIfood.fatorDivisor})`,
            receitaBruta: dynamicIfood.precoIfood,
            labelTaxas: `(-) Comissão & Taxa Cadastrada (${ifoodFeePct}%)`,
            taxasPagamento: dynamicIfood.taxaValor,
            receitaLiquida: dynamicIfood.repasseLiquido,
            cmvInsumos: calc.custoInsumosUn,
            embalagens: draftFicha.custo_embalagem_un,
            operacional: draftFicha.custo_operacional_un,
            cpvTotal: calc.custoTotalUn,
            lucroLiquido: dynamicIfood.lucroLiquidoIfood,
          };

  const pctOfBruta = (val: number) =>
    dreLinhas.receitaBruta > 0
      ? Number(((val / dreLinhas.receitaBruta) * 100).toFixed(1))
      : 0;

  const currentCatalog = loadCurrentQuotations();
  const filteredQuotations = currentCatalog.filter((item) => {
    const matchesCat = insumoCat === "Todas" || item.categoria === insumoCat;
    const matchesSearch =
      !insumoSearch.trim() ||
      item.produto.toLowerCase().includes(insumoSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const { loteCardapioExpandido9Receitas, loteCaderno6Receitas } =
    RESUMO_LOTES_PRODUCAO;

  return (
    <section
      id="secao-ficha-dre"
      aria-label="Ficha Técnica e DRE por Produto"
      className="space-y-6"
    >
      {/* EXECUTIVE BATCH PROJECTION BANNER (Apenas na Matriz Roze Gourmet) */}
      {isRozeCompany && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Lote Completo (1 Receita/Sabor)
              </p>
              <p className="mt-1 text-xl font-extrabold text-foreground">
                {loteCardapioExpandido9Receitas.rendimentoTotal}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Saquinho 150ml a{" "}
                <strong>
                  {formatCurrency(
                    loteCardapioExpandido9Receitas.custoSaquinho150ml
                  )}
                </strong>{" "}
                / un.
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Custo Produção (69 un.)
              </p>
              <p className="mt-1 text-xl font-extrabold text-foreground">
                {formatCurrency(loteCardapioExpandido9Receitas.custoTotalProducao)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Insumos + Saquinhos + Gás (15%)
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Lucro Líquido do Lote (Local)
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    loteCardapioExpandido9Receitas.lucroLiquidoEstimadoLocal
                  )}
                </p>
                <Badge variant="success" className="text-[10px]">
                  +{loteCardapioExpandido9Receitas.margemLucroSobreCustoPct}% s/
                  custo
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Faturamento Bruto:{" "}
                {formatCurrency(
                  loteCardapioExpandido9Receitas.faturamentoBrutoLocal
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Desembolso Caixa vs. Sobras
              </p>
              <p className="mt-1 text-xl font-extrabold text-foreground">
                {formatCurrency(loteCaderno6Receitas.valorFicadoEmEstoqueSobras)}{" "}
                <span className="text-xs font-semibold text-muted-foreground">
                  em sobras
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Compra:{" "}
                {formatCurrency(
                  loteCaderno6Receitas.desembolsoCaixaEmbalagensFechadas
                )}{" "}
                • Uso:{" "}
                {formatCurrency(loteCaderno6Receitas.custoEfetivamenteConsumido)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selector Bar for Flavors + Dynamic iFood Fee Configurator */}
      <Card className="border-rose-500/20 bg-gradient-to-r from-rose-500/[0.04] via-card to-amber-500/[0.04]">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-rose-500" />
                <h2 className="text-base font-bold text-foreground sm:text-lg">
                  Ficha Técnica & Precificação • {currentProduct.nome}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                O preço iFood é calculado dinamicamente pela fórmula{" "}
                <strong className="text-foreground">
                  Preço Local ÷ (1 - Taxa%)
                </strong>{" "}
                para garantir que você ganhe exatamente o mesmo valor líquido da
                venda local.
              </p>
            </div>

            {/* Dynamic iFood Fee Rate Control */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/30 bg-card px-3.5 py-2.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-rose-500" />
                <label
                  htmlFor="taxa-ifood-input"
                  className="text-xs font-bold text-foreground"
                >
                  Taxa iFood Cadastrada:
                </label>
              </div>
              <div className="flex items-center gap-1">
                <input
                  id="taxa-ifood-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="80"
                  value={ifoodFeePct}
                  onChange={(e) =>
                    onChangeIfoodFeePct(
                      Math.min(80, Math.max(0, parseFloat(e.target.value) || 0))
                    )
                  }
                  className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-center text-xs font-extrabold text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs font-bold text-muted-foreground">
                  %
                </span>
              </div>

              <Badge variant="secondary" className="text-[11px] font-bold">
                Fator: ÷ {dynamicIfood.fatorDivisor}
              </Badge>

              {/* Quick rate presets */}
              <div className="flex items-center gap-1 border-l border-border pl-2">
                {[
                  { label: "26,2% (÷0,738)", val: 26.2 },
                  { label: "30% (÷0,70)", val: 30.0 },
                  { label: "15% (÷0,85)", val: 15.0 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => onChangeIfoodFeePct(preset.val)}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                      Math.abs(ifoodFeePct - preset.val) < 0.05
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {savedNotice && (
            <Badge variant="success" className="gap-1.5 py-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ficha Técnica e Custo Unitário atualizados!
            </Badge>
          )}

          {/* Product selector pills + Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {activeProducts.map((prod) => {
                const active = prod.id === currentProduct.id;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => onSelectProductId(prod.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{prod.nome}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      Custo: {formatCurrency(prod.custo_estimado)}
                    </span>
                  </button>
                );
              })}

              {onOpenCreateProduct && (
                <button
                  type="button"
                  onClick={onOpenCreateProduct}
                  className="flex items-center gap-1.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Novo Produto</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onOpenCulinaryStudio && currentProduct && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenCulinaryStudio(currentProduct.nome)}
                  className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-primary/10 border-primary/40 text-primary hover:bg-primary/20 gap-1.5 text-xs font-bold rounded-xl shadow-xs"
                  title={`Criar foto culinária profissional com IA para ${currentProduct.nome}`}
                >
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  <span>Foto Culinária IA</span>
                </Button>
              )}

              {/* Delete current product button */}
              {onDeleteProduct && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Deseja realmente excluir permanentemente o produto "${currentProduct.nome}" e sua ficha técnica deste estabelecimento?`
                      )
                    ) {
                      setIsDeleting(true);
                      try {
                        await onDeleteProduct(currentProduct.id);
                      } finally {
                        setIsDeleting(false);
                      }
                    }
                  }}
                  className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 gap-1.5 text-xs font-semibold rounded-xl"
                  title="Excluir este produto e sua receita"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isDeleting ? "Excluindo..." : "Excluir Produto"}</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Grid: Left = Ficha Técnica | Right = DRE do Produto */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN (7 cols): FICHA TÉCNICA COMPLETA (150ML) */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-rose-500" />
                Ficha Técnica — {currentProduct.nome}
              </CardTitle>
              <CardDescription>{draftFicha.subtitulo_receita}</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-3.5 w-3.5 text-rose-500" />
                  Editar Ficha
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="bg-gradient-to-r from-rose-600 to-rose-500 text-white"
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar Ficha
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Batch Parameters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Layers className="h-3 w-3 text-rose-500" />
                  Rendimento (Saquinhos)
                </span>
                {isEditing ? (
                  <input
                    type="number"
                    min={1}
                    value={draftFicha.rendimento_unidades}
                    onChange={(e) =>
                      setDraftFicha({
                        ...draftFicha,
                        rendimento_unidades: Math.max(
                          1,
                          parseInt(e.target.value, 10) || 1
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-bold"
                  />
                ) : (
                  <p className="mt-1 text-base font-extrabold text-foreground">
                    {draftFicha.rendimento_unidades} un (
                    {draftFicha.volume_unitario_ml}ml)
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  Preço Local (un.)
                </span>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.10"
                    value={draftPrecoVenda}
                    onChange={(e) => setDraftPrecoVenda(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-bold"
                  />
                ) : (
                  <p className="mt-1 text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(precoVendaNum)}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Lucro Local: +{formatCurrency(lucroLocalUn)}/un
                </p>
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  <ShoppingBag className="h-3 w-3" />
                  iFood ({ifoodFeePct}% → ÷{dynamicIfood.fatorDivisor})
                </span>
                <p className="mt-1 text-base font-extrabold text-rose-600 dark:text-rose-400">
                  {formatCurrency(dynamicIfood.precoIfood)}
                </p>
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Lucro Líquido: +{formatCurrency(dynamicIfood.lucroLiquidoIfood)}
                  /un
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Clock className="h-3 w-3 text-amber-500" />
                  Padronização
                </span>
                <p className="mt-1 text-base font-extrabold text-foreground">
                  {draftFicha.volume_unitario_ml} ml
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Validade: 30 dias congelado
                </p>
              </div>
            </div>

            {/* Ingredients Table */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ingredientes da Receita (Rendimento:{" "}
                  {draftFicha.rendimento_unidades} saquinhos de 150ml)
                </h4>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Insumo
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-[11px] font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2">Ingrediente / Insumo</th>
                      <th className="py-2.5 px-2 text-center">Qtd. Receita</th>
                      <th className="py-2.5 px-2 text-right">
                        Custo Fracionado
                      </th>
                      <th className="py-2.5 px-3 text-right">Custo / Un.</th>
                      {isEditing && <th className="py-2.5 pr-2 text-right" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {draftFicha.ingredientes.map((ing) => {
                      const custoPorUn =
                        Number(ing.custo_receita || 0) /
                        Math.max(1, draftFicha.rendimento_unidades);
                      return (
                        <tr key={ing.id} className="hover:bg-secondary/25">
                          <td className="py-2.5 pl-3 pr-2 font-medium text-foreground">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  list="common-ingredients-list"
                                  value={ing.nome}
                                  onChange={(e) =>
                                    handleIngredientChange(
                                      ing.id,
                                      "nome",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Nome e marca do insumo..."
                                  className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                                />
                                <datalist id="common-ingredients-list">
                                  <option value="Leite Condensado Moça 395g" />
                                  <option value="Creme de Leite Nestlé 200g" />
                                  <option value="Doce de Leite Viçosa Tradicional" />
                                  <option value="Chocolate em Barra Melken Meio Amargo" />
                                  <option value="Chocolate em Barra Harald Melken Blend" />
                                  <option value="Cacau em Pó Alcalino 50% Melken" />
                                  <option value="Mel Puro de Abelha Silvestre" />
                                  <option value="Farinha de Trigo Dona Benta" />
                                  <option value="Açúcar Mascavo Orgânico" />
                                  <option value="Especiarias para Pão de Mel (Canela, Cravo)" />
                                  <option value="Fermento em Pó Royal" />
                                  <option value="Manteiga sem Sal Primeira Qualidade" />
                                  <option value="Ovos Frescos Tipo Extra" />
                                  <option value="Leite em Pó Ninho Integral" />
                                  <option value="Nutella Original Ferrero 650g" />
                                  <option value="Coco Ralado Sococo" />
                                  <option value="Leite de Coco Sococo 200ml" />
                                  <option value="Embalagem e Etiqueta Personalizada com Marca" />
                                  <option value="Saquinho Transparente com Aba Adesiva" />
                                </datalist>
                              </>
                            ) : (
                              ing.nome
                            )}
                          </td>
                          <td className="whitespace-nowrap py-2.5 px-2 text-center text-muted-foreground">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  value={ing.quantidade_receita}
                                  onChange={(e) =>
                                    handleIngredientChange(
                                      ing.id,
                                      "quantidade_receita",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-16 rounded border border-input bg-background px-1.5 py-1 text-center text-xs"
                                />
                                <span>{ing.unidade}</span>
                              </div>
                            ) : (
                              `${ing.quantidade_receita} ${ing.unidade}`
                            )}
                          </td>
                          <td className="whitespace-nowrap py-2.5 px-2 text-right font-semibold text-foreground">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.10"
                                value={ing.custo_receita}
                                onChange={(e) =>
                                  handleIngredientChange(
                                    ing.id,
                                    "custo_receita",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 rounded border border-input bg-background px-1.5 py-1 text-right text-xs"
                              />
                            ) : (
                              formatCurrency(ing.custo_receita)
                            )}
                          </td>
                          <td className="whitespace-nowrap py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                            {formatCurrency(custoPorUn)}
                          </td>
                          {isEditing && (
                            <td className="py-2.5 pr-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredient(ing.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-border bg-secondary/40 font-bold text-foreground">
                    <tr>
                      <td className="py-2.5 pl-3 pr-2" colSpan={2}>
                        Subtotal Efetivo de Ingredientes da Receita
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {formatCurrency(calc.custoInsumosReceita)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                        {formatCurrency(calc.custoInsumosUn)} / un.
                      </td>
                      {isEditing && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Packaging (R$ 0,05) + Operational Cost (15% Gás/Energia) + Final Unit Cost */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Saquinho 150ml (/un.)
                </p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={draftFicha.custo_embalagem_un}
                    onChange={(e) =>
                      setDraftFicha({
                        ...draftFicha,
                        custo_embalagem_un: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded border border-input bg-card px-2 py-1 text-xs font-bold"
                  />
                ) : (
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {formatCurrency(draftFicha.custo_embalagem_un)}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Gás / Energia / Água (15%)
                </p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.05"
                    value={draftFicha.custo_operacional_un}
                    onChange={(e) =>
                      setDraftFicha({
                        ...draftFicha,
                        custo_operacional_un: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 w-full rounded border border-input bg-card px-2 py-1 text-xs font-bold"
                  />
                ) : (
                  <p className="mt-1 text-sm font-bold text-foreground">
                    {formatCurrency(draftFicha.custo_operacional_un)}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                <p className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400">
                  Custo p/ Unid.* (150ml)
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <p className="text-base font-extrabold text-foreground">
                    {formatCurrency(calc.custoTotalUn)}
                  </p>
                  <Badge variant="success" className="text-[10px]">
                    Markup {markupMultiplicador}x
                  </Badge>
                </div>
              </div>
            </div>

            {/* Modo de Preparo */}
            <div className="rounded-xl border border-border/70 bg-secondary/25 p-3.5 text-xs">
              <p className="mb-1 font-bold uppercase tracking-wider text-muted-foreground">
                Modo de Preparo & Padronização Gourmet (150ml)
              </p>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={draftFicha.modo_preparo}
                  onChange={(e) =>
                    setDraftFicha({
                      ...draftFicha,
                      modo_preparo: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs"
                />
              ) : (
                <p className="leading-relaxed text-foreground/90">
                  {draftFicha.modo_preparo}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN (5 cols): DRE DO PRODUTO (PERÍODO | LOCAL | IFOOD) */}
        <Card className="lg:col-span-5 flex flex-col justify-between">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  DRE — {currentProduct.nome}
                </CardTitle>
                <CardDescription>{dreLinhas.subtitulo}</CardDescription>
              </div>

              {/* Switch Período vs Local Un vs iFood Un */}
              <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1">
                <button
                  type="button"
                  onClick={() => setDreViewMode("periodo")}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                    dreViewMode === "periodo"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Período
                </button>
                <button
                  type="button"
                  onClick={() => setDreViewMode("local_un")}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                    dreViewMode === "local_un"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Local (1 un)
                </button>
                <button
                  type="button"
                  onClick={() => setDreViewMode("ifood_un")}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
                    dreViewMode === "ifood_un"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  iFood ({ifoodFeePct}%)
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-xs sm:text-sm">
            {/* 1. Receita Operacional Bruta */}
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3.5 py-2.5 font-bold">
              <span>(+) Receita Operacional Bruta</span>
              <div className="text-right">
                <span>{formatCurrency(dreLinhas.receitaBruta)}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  100%
                </span>
              </div>
            </div>

            {/* 2. Deduções / Taxas de Pagamento ou iFood */}
            <div className="flex items-center justify-between px-3.5 py-1.5 text-muted-foreground">
              <span>{dreLinhas.labelTaxas}</span>
              <div className="text-right font-medium text-amber-600 dark:text-amber-400">
                <span>- {formatCurrency(dreLinhas.taxasPagamento)}</span>
                <span className="ml-2 text-[11px]">
                  ({pctOfBruta(dreLinhas.taxasPagamento)}%)
                </span>
              </div>
            </div>

            {/* 3. Receita Líquida */}
            <div className="flex items-center justify-between border-y border-border/70 px-3.5 py-2 font-semibold text-foreground">
              <span>(=) Receita Líquida (Repasse)</span>
              <div className="text-right">
                <span>{formatCurrency(dreLinhas.receitaLiquida)}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  ({pctOfBruta(dreLinhas.receitaLiquida)}%)
                </span>
              </div>
            </div>

            {/* 4. Custos Variáveis (CMV + Saquinho + Gás/Energia) */}
            <div className="space-y-1.5 pl-2">
              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span>(-) CMV — Ingredientes Fracionados</span>
                <div className="text-right text-rose-600 dark:text-rose-400">
                  <span>- {formatCurrency(dreLinhas.cmvInsumos)}</span>
                  <span className="ml-2 text-[11px]">
                    ({pctOfBruta(dreLinhas.cmvInsumos)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span>(-) Saquinho Gourmet 150ml (R$ 0,05/un)</span>
                <div className="text-right text-rose-600 dark:text-rose-400">
                  <span>- {formatCurrency(dreLinhas.embalagens)}</span>
                  <span className="ml-2 text-[11px]">
                    ({pctOfBruta(dreLinhas.embalagens)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span>(-) Adicional Operacional (Gás/Energia 15%)</span>
                <div className="text-right text-rose-600 dark:text-rose-400">
                  <span>- {formatCurrency(dreLinhas.operacional)}</span>
                  <span className="ml-2 text-[11px]">
                    ({pctOfBruta(dreLinhas.operacional)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 5. CPV Total */}
            <div className="flex items-center justify-between border-t border-border/70 px-3.5 py-2 font-semibold text-rose-600 dark:text-rose-400">
              <span>(=) Custo Total de Produção (CPV)</span>
              <div className="text-right">
                <span>- {formatCurrency(dreLinhas.cpvTotal)}</span>
                <span className="ml-2 text-[11px]">
                  ({pctOfBruta(dreLinhas.cpvTotal)}%)
                </span>
              </div>
            </div>

            {/* 6. Resultado / Lucro Líquido */}
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    (=) Lucro Líquido Real
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Local: +{formatCurrency(lucroLocalUn)}/un • iFood: +
                    {formatCurrency(dynamicIfood.lucroLiquidoIfood)}/un (Empate
                    100%)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(dreLinhas.lucroLiquido)}
                  </p>
                  <Badge variant="success" className="mt-1">
                    {pctOfBruta(dreLinhas.lucroLiquido)}% s/ Receita
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FULL-WIDTH OFFICIAL PRICING & DRE MATRIX */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-rose-500" />
                Tabela Completa: Ficha Técnica, Precificação Local vs. iFood
                (Taxa {ifoodFeePct}% → ÷{dynamicIfood.fatorDivisor}) & DRE
              </CardTitle>
              <CardDescription>
                O Preço iFood é calculado automaticamente sobre a taxa
                cadastrada ({ifoodFeePct}%) para empatar 100% o lucro líquido
                com a venda local
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              Margem Líquida no Período: {dreConsolidada.margem_contribuicao_pct}%
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-3">Sabor / Receita (150ml)</th>
                  <th className="pb-3 px-2 text-center">Rendimento</th>
                  <th className="pb-3 px-2 text-right">Custo/Un.*</th>
                  <th className="pb-3 px-2 text-right">Preço Local</th>
                  <th className="pb-3 px-2 text-right">Lucro Local</th>
                  <th className="pb-3 px-2 text-right">
                    Preço iFood (÷{dynamicIfood.fatorDivisor})
                  </th>
                  <th className="pb-3 px-2 text-right">Lucro iFood</th>
                  <th className="pb-3 px-2 text-center">Vendidos</th>
                  <th className="pb-3 pl-2 text-right">(=) Lucro Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {drePorProduto.map((item) => {
                  const isSelected = item.produto_id === currentProduct.id;
                  return (
                    <tr
                      key={item.produto_id}
                      onClick={() => onSelectProductId(item.produto_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/5 font-medium"
                          : "hover:bg-secondary/35"
                      }`}
                    >
                      <td className="py-3 pr-3 font-bold text-foreground">
                        {item.nome}
                      </td>
                      <td className="py-3 px-2 text-center text-muted-foreground">
                        {item.rendimento_lote} un
                      </td>
                      <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-400 font-semibold">
                        {formatCurrency(item.custo_total_un)}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-foreground">
                        {formatCurrency(item.preco_venda)}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.lucro_bruto_un)}
                      </td>
                      <td className="py-3 px-2 text-right font-extrabold text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.preco_ifood)}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.lucro_liquido_ifood)}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold">
                        {formatNumber(item.unidades_vendidas)} un
                      </td>
                      <td className="py-3 pl-2 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.lucro_liquido)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border bg-secondary/50 font-extrabold text-foreground">
                <tr>
                  <td className="py-3.5 pl-2 pr-3" colSpan={7}>
                    RESULTADO CONSOLIDADO NO PERÍODO FILTRADO (Receita Bruta:{" "}
                    {formatCurrency(dreConsolidada.receita_bruta)} | CPV:{" "}
                    {formatCurrency(dreConsolidada.cpv_total)})
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {formatNumber(dreConsolidada.unidades_vendidas)} un
                  </td>
                  <td className="py-3.5 pl-2 text-right text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(dreConsolidada.lucro_liquido)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CALDAS ARTESANAIS BASE & SOBRAS DE ESTOQUE */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose-500" />
              Caldas & Geleias Artesanais (Base p/ Mesclar)
            </CardTitle>
            <CardDescription>
              Receitas complementares do caderno aplicadas nas paredes internas
              do saquinho de 150ml
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {CALDAS_ARTESANAIS_BASE.map((calda) => (
              <div
                key={calda.id}
                className="rounded-xl border border-border/80 bg-secondary/30 p-4 text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-foreground">
                    {calda.nome}
                  </span>
                  <Badge variant="default">
                    Lote: {formatCurrency(calda.custoLote)}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  <strong>Rendimento:</strong> {calda.rendimento} (Custo:{" "}
                  <strong>
                    {formatCurrency(calda.custoPorPorcao)}/porção
                  </strong>
                  )
                </p>
                <p className="text-muted-foreground">
                  <strong>Ingredientes:</strong> {calda.ingredientes}
                </p>
                <p className="text-foreground/90">{calda.aplicacao}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-amber-500" />
              Desembolso Inicial no Caixa x Sobras em Estoque
            </CardTitle>
            <CardDescription>
              Controle de aproveitamento das embalagens fechadas para as
              próximas produções
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2.5 pr-2">Insumo Comercial</th>
                    <th className="pb-2.5 px-2">Embalagem Padrão</th>
                    <th className="pb-2.5 px-2">Consumo por Receita</th>
                    <th className="pb-2.5 pl-2">
                      Sobra p/ Próximas Produções
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {SOBRAS_ESTOQUE_INSUMOS.map((item) => (
                    <tr key={item.insumo} className="hover:bg-secondary/30">
                      <td className="py-2.5 pr-2 font-bold text-foreground">
                        {item.insumo}
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">
                        {item.embalagem_padrao}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-rose-600 dark:text-rose-400">
                        {item.consumo_por_receita}
                      </td>
                      <td className="py-2.5 pl-2">
                        <Badge variant="success" className="text-[11px]">
                          {item.sobra_estoque}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABELA DE COTAÇÃO DE INSUMOS (VAREJO / ATACADO / PREÇO DE 1G - PDF 5) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-primary" />
                  Tabela de Cotação de Insumos (Varejo, Atacado & Preço de 1g)
                </CardTitle>
                {onOpenInvoiceModal && (
                  <button
                    type="button"
                    onClick={onOpenInvoiceModal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Atualizar por NF-e / Cupom Fiscal
                  </button>
                )}
              </div>
              <CardDescription>
                Base completa de referência de preços por unidade e por grama
                (1g) para cálculo de fichas técnicas
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar insumo ou marca..."
                  value={insumoSearch}
                  onChange={(e) => setInsumoSearch(e.target.value)}
                  className="rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  "Todas",
                  "Laticínios",
                  "Chocolates & Recheios",
                  "Frutas & Mercearia",
                  "Embalagens & Descartáveis",
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setInsumoCat(cat)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      insumoCat === cat
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Guia Didático de Onde Ficam Outros Custos */}
          <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/5 via-card to-primary/5 p-4 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground text-[11px]">
                ℹ
              </span>
              <span>Onde ficam cadastrados os outros materiais, utensílios, freezer e taxas?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-muted-foreground">
              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5 space-y-1">
                <strong className="text-foreground block">📦 Embalagens & Descartáveis:</strong>
                <span>
                  Saquinhos 150ml, adesivos de sabor, sacolas de delivery e colherinhas descartáveis estão cotados nesta tabela e entram na ficha técnica como <strong>custo de embalagem unitário (R$ 0,05 a R$ 0,10/un)</strong>.
                </span>
              </div>
              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5 space-y-1">
                <strong className="text-foreground block">⚡ Freezer, Utensílios & Energia:</strong>
                <span>
                  O freezer, liquidificador e colheres de preparo são equipamentos (CAPEX). Eles não se gastam por grama: o consumo de energia elétrica e a depreciação entram no DRE como <strong>Custo Operacional Fixo (15% = R$ 0,35/un)</strong>.
                </span>
              </div>
              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5 space-y-1">
                <strong className="text-foreground block">💳 Taxas de Cartão/Pix & iFood:</strong>
                <span>
                  Não são insumos físicos. Ficam no painel <em>Dados & Pix</em> (Ton Pix 0,99%, Débito 1,99%, Crédito 3,50%) e no <strong>divisor do iFood (26,2%)</strong>, descontadas percentualmente sobre a venda bruta.
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-border/80">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="sticky top-0 bg-secondary text-[11px] font-semibold uppercase text-muted-foreground shadow-sm">
                <tr>
                  <th className="py-2.5 pl-4 pr-2">Produto / Marca</th>
                  <th className="py-2.5 px-2">Categoria</th>
                  <th className="py-2.5 px-2 text-right">Preço Varejo</th>
                  <th className="py-2.5 px-2 text-right">Preço Atacado</th>
                  <th className="py-2.5 pl-2 pr-4 text-right">Preço Unitário / 1g</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredQuotations.map((cot) => (
                  <tr key={cot.id} className="hover:bg-secondary/35">
                    <td className="py-2.5 pl-4 pr-2 font-semibold text-foreground">
                      {cot.produto}
                    </td>
                    <td className="py-2.5 px-2">
                      <Badge variant="outline" className="text-[10px]">
                        {cot.categoria}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">
                      {cot.preco_varejo}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-foreground">
                      {cot.preco_atacado}
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right font-bold text-rose-600 dark:text-rose-400">
                      {cot.preco_por_grama}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
