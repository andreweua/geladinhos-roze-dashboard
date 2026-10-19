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
import { formatCurrency, formatNumber } from "@/lib/utils";
import { calculateUnitCostFromFicha } from "@/services/dataService";
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
}) => {
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
  const [dreViewMode, setDreViewMode] = useState<"periodo" | "unitario">(
    "periodo"
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (currentFicha && currentProduct) {
      setDraftFicha(JSON.parse(JSON.stringify(currentFicha)));
      setDraftPrecoVenda(String(currentProduct.preco_venda));
      setIsEditing(false);
    }
  }, [currentFicha, currentProduct]);

  if (!currentProduct || !draftFicha || !currentDre) {
    return null;
  }

  const calc = calculateUnitCostFromFicha(draftFicha);
  const precoVendaNum =
    parseFloat(draftPrecoVenda) || currentProduct.preco_venda;
  const lucroUnitario = Number((precoVendaNum - calc.custoTotalUn).toFixed(2));
  const margemUnitariaPct =
    precoVendaNum > 0
      ? Number(((lucroUnitario / precoVendaNum) * 100).toFixed(1))
      : 0;
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
    await onSaveFicha(draftFicha, precoVendaNum);
    setIsEditing(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  // DRE values depending on toggle ("periodo" vs "unitario")
  const taxaMediaPct =
    currentDre.receita_bruta > 0
      ? (currentDre.taxas_pagamento / currentDre.receita_bruta) * 100
      : 1.5;

  const dreLinhas =
    dreViewMode === "periodo"
      ? {
          subtitulo: `${formatNumber(currentDre.unidades_vendidas)} unidades vendidas no período filtrado`,
          receitaBruta: currentDre.receita_bruta,
          taxasPagamento: currentDre.taxas_pagamento,
          receitaLiquida: currentDre.receita_liquida,
          cmvInsumos: currentDre.cmv_insumos,
          embalagens: currentDre.custo_embalagens_total,
          operacional: currentDre.custo_operacional_total,
          cpvTotal: currentDre.cpv_total,
          lucroLiquido: currentDre.lucro_liquido,
        }
      : {
          subtitulo: `Simulação unitária por 1 geladinho (${draftFicha.volume_unitario_ml}ml)`,
          receitaBruta: precoVendaNum,
          taxasPagamento: Number(
            ((precoVendaNum * taxaMediaPct) / 100).toFixed(2)
          ),
          receitaLiquida: Number(
            (precoVendaNum - (precoVendaNum * taxaMediaPct) / 100).toFixed(2)
          ),
          cmvInsumos: calc.custoInsumosUn,
          embalagens: draftFicha.custo_embalagem_un,
          operacional: draftFicha.custo_operacional_un,
          cpvTotal: calc.custoTotalUn,
          lucroLiquido: Number(
            (
              precoVendaNum -
              (precoVendaNum * taxaMediaPct) / 100 -
              calc.custoTotalUn
            ).toFixed(2)
          ),
        };

  const pctOfBruta = (val: number) =>
    dreLinhas.receitaBruta > 0
      ? Number(((val / dreLinhas.receitaBruta) * 100).toFixed(1))
      : 0;

  return (
    <section
      id="secao-ficha-dre"
      aria-label="Ficha Técnica e DRE por Produto"
      className="space-y-6"
    >
      {/* Selector Bar for Flavors */}
      <Card className="border-rose-500/20 bg-gradient-to-r from-rose-500/[0.04] via-card to-amber-500/[0.04]">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-rose-500" />
                <h2 className="text-base font-bold text-foreground sm:text-lg">
                  Engenharia de Cardápio: Ficha Técnica & DRE por Sabor
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione um sabor abaixo para inspecionar ou editar sua receita,
                custos de insumos e Demonstrativo de Resultado (DRE)
              </p>
            </div>

            {savedNotice && (
              <Badge variant="success" className="gap-1.5 py-1 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ficha Técnica e Custo Unitário atualizados!
              </Badge>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
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
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Grid: Left = Ficha Técnica | Right = DRE do Produto */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN (7 cols): FICHA TÉCNICA COMPLETA */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-rose-500" />
                Ficha Técnica — {currentProduct.nome}
              </CardTitle>
              <CardDescription>
                Composição de insumos por batelada, rendimento e cálculo
                automático do custo unitário
              </CardDescription>
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
                  Rendimento Receita
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
                    {draftFicha.rendimento_unidades} un.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Beaker className="h-3 w-3 text-rose-500" />
                  Volume Unitário
                </span>
                {isEditing ? (
                  <input
                    type="number"
                    min={50}
                    value={draftFicha.volume_unitario_ml}
                    onChange={(e) =>
                      setDraftFicha({
                        ...draftFicha,
                        volume_unitario_ml: parseInt(e.target.value, 10) || 130,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-bold"
                  />
                ) : (
                  <p className="mt-1 text-base font-extrabold text-foreground">
                    {draftFicha.volume_unitario_ml} ml
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Clock className="h-3 w-3 text-amber-500" />
                  Tempo Preparo
                </span>
                {isEditing ? (
                  <input
                    type="number"
                    min={5}
                    value={draftFicha.tempo_preparo_min}
                    onChange={(e) =>
                      setDraftFicha({
                        ...draftFicha,
                        tempo_preparo_min: parseInt(e.target.value, 10) || 30,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-bold"
                  />
                ) : (
                  <p className="mt-1 text-base font-extrabold text-foreground">
                    {draftFicha.tempo_preparo_min} min
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  Preço Venda (un.)
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
              </div>
            </div>

            {/* Ingredients Table */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Insumos da Receita (Para {draftFicha.rendimento_unidades}{" "}
                  unidades)
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
                      <th className="py-2.5 px-2 text-right">Custo Receita</th>
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
                              <input
                                type="text"
                                value={ing.nome}
                                onChange={(e) =>
                                  handleIngredientChange(
                                    ing.id,
                                    "nome",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                              />
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
                        Subtotal de Insumos da Receita
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

            {/* Packaging + Operational Cost + Summary Bar */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 bg-background p-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Embalagem + Adesivo (/un.)
                </p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.05"
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
                  Energia & Freezer (/un.)
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
                  Custo Unitário Final
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
                Padrão de Preparo & Envase
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

        {/* RIGHT COLUMN (5 cols): DRE DO PRODUTO SELECIONADO */}
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

              {/* Switch Período vs Unitário */}
              <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1">
                <button
                  type="button"
                  onClick={() => setDreViewMode("periodo")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    dreViewMode === "periodo"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Período
                </button>
                <button
                  type="button"
                  onClick={() => setDreViewMode("unitario")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    dreViewMode === "unitario"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Por 1 Un.
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

            {/* 2. Deduções / Taxas de Pagamento */}
            <div className="flex items-center justify-between px-3.5 py-1.5 text-muted-foreground">
              <span>(-) Taxas de Pagamento (Cartão)</span>
              <div className="text-right font-medium text-amber-600 dark:text-amber-400">
                <span>- {formatCurrency(dreLinhas.taxasPagamento)}</span>
                <span className="ml-2 text-[11px]">
                  ({pctOfBruta(dreLinhas.taxasPagamento)}%)
                </span>
              </div>
            </div>

            {/* 3. Receita Líquida */}
            <div className="flex items-center justify-between border-y border-border/70 px-3.5 py-2 font-semibold text-foreground">
              <span>(=) Receita Líquida de Vendas</span>
              <div className="text-right">
                <span>{formatCurrency(dreLinhas.receitaLiquida)}</span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  ({pctOfBruta(dreLinhas.receitaLiquida)}%)
                </span>
              </div>
            </div>

            {/* 4. Custos Variáveis (CMV + Embalagem + Operacional) */}
            <div className="space-y-1.5 pl-2">
              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span>(-) CMV — Insumos da Ficha Técnica</span>
                <div className="text-right text-rose-600 dark:text-rose-400">
                  <span>- {formatCurrency(dreLinhas.cmvInsumos)}</span>
                  <span className="ml-2 text-[11px]">
                    ({pctOfBruta(dreLinhas.cmvInsumos)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span>(-) Embalagens & Adesivos Gourmet</span>
                <div className="text-right text-rose-600 dark:text-rose-400">
                  <span>- {formatCurrency(dreLinhas.embalagens)}</span>
                  <span className="ml-2 text-[11px]">
                    ({pctOfBruta(dreLinhas.embalagens)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span>(-) Custo Operacional (Energia/Freezer)</span>
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
              <span>(=) Custo Total do Produto (CPV)</span>
              <div className="text-right">
                <span>- {formatCurrency(dreLinhas.cpvTotal)}</span>
                <span className="ml-2 text-[11px]">
                  ({pctOfBruta(dreLinhas.cpvTotal)}%)
                </span>
              </div>
            </div>

            {/* 6. Resultado / Margem de Contribuição Líquida */}
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    (=) Lucro Líquido / Margem de Contribuição
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Livre de insumos, embalagens e taxas de cartão
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(dreLinhas.lucroLiquido)}
                  </p>
                  <Badge variant="success" className="mt-1">
                    {pctOfBruta(dreLinhas.lucroLiquido)}% de Margem Líquida
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FULL-WIDTH COMPARATIVE DRE TABLE ACROSS ALL PRODUCTS */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-rose-500" />
                Matriz Comparativa de DRE por Produto (Período Filtrado)
              </CardTitle>
              <CardDescription>
                Demonstrativo consolidado comparando faturamento, taxas, custos
                da ficha técnica e lucro líquido real de cada sabor
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              Margem Consolidada: {dreConsolidada.margem_contribuicao_pct}%
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-3">Sabor Gourmet</th>
                  <th className="pb-3 px-2 text-center">Vendidos</th>
                  <th className="pb-3 px-2 text-right">(+) Rec. Bruta</th>
                  <th className="pb-3 px-2 text-right">(-) Taxas</th>
                  <th className="pb-3 px-2 text-right">(-) Insumos</th>
                  <th className="pb-3 px-2 text-right">(-) Emb.+Oper.</th>
                  <th className="pb-3 px-2 text-right">(=) Lucro Líquido</th>
                  <th className="pb-3 pl-2 text-right">Margem %</th>
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
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {item.nome}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({formatCurrency(item.preco_venda)})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-semibold">
                        {formatNumber(item.unidades_vendidas)} un.
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-foreground">
                        {formatCurrency(item.receita_bruta)}
                      </td>
                      <td className="py-3 px-2 text-right text-amber-600 dark:text-amber-400">
                        -{formatCurrency(item.taxas_pagamento)}
                      </td>
                      <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-400">
                        -{formatCurrency(item.cmv_insumos)}
                      </td>
                      <td className="py-3 px-2 text-right text-rose-600 dark:text-rose-400">
                        -
                        {formatCurrency(
                          item.custo_embalagens_total +
                            item.custo_operacional_total
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.lucro_liquido)}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <Badge variant="success" className="text-[11px]">
                          {item.margem_contribuicao_pct}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-border bg-secondary/50 font-extrabold text-foreground">
                <tr>
                  <td className="py-3.5 pl-2 pr-3">
                    TOTAL CONSOLIDADO NO PERÍODO
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    {formatNumber(dreConsolidada.unidades_vendidas)} un.
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    {formatCurrency(dreConsolidada.receita_bruta)}
                  </td>
                  <td className="py-3.5 px-2 text-right text-amber-600 dark:text-amber-400">
                    -{formatCurrency(dreConsolidada.taxas_pagamento)}
                  </td>
                  <td className="py-3.5 px-2 text-right text-rose-600 dark:text-rose-400">
                    -{formatCurrency(dreConsolidada.cmv_insumos)}
                  </td>
                  <td className="py-3.5 px-2 text-right text-rose-600 dark:text-rose-400">
                    -
                    {formatCurrency(
                      dreConsolidada.custo_embalagens_total +
                        dreConsolidada.custo_operacional_total
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-right text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(dreConsolidada.lucro_liquido)}
                  </td>
                  <td className="py-3.5 pl-2 text-right">
                    <Badge variant="success">
                      {dreConsolidada.margem_contribuicao_pct}%
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
