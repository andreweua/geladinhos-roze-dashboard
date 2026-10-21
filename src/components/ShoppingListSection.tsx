import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  Share2,
  FileText,
  Upload,
  Download,
  Barcode,
  Camera,
  Search,
  ExternalLink,
  Store,
  Calendar,
  Check,
  Edit2,
  Sparkles,
  Layers,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import {
  ListaCompras,
  ListaComprasItem,
  EstabelecimentoLocal,
} from "@/types/dashboard";
import {
  loadShoppingLists,
  saveShoppingLists,
  addOrUpdateShoppingList,
  deleteShoppingList,
  SHOPPING_LIST_TEMPLATES,
  parseShoppingListFromText,
  saveBatchQuotationsFromShoppingList,
} from "@/services/shoppingListService";
import { consultarProdutoPorGtin } from "@/services/gtinService";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { formatCurrency } from "@/lib/utils";
import { Button, Badge, Card, CardContent } from "@/components/ui/primitives";

interface ShoppingListSectionProps {
  estabelecimentos: EstabelecimentoLocal[];
  onQuotationsSaved?: () => void;
}

export const ShoppingListSection: React.FC<ShoppingListSectionProps> = ({
  estabelecimentos,
  onQuotationsSaved,
}) => {
  const [lists, setLists] = useState<ListaCompras[]>(() => loadShoppingLists());
  const [selectedListId, setSelectedListId] = useState<string>(() => {
    const loaded = loadShoppingLists();
    return loaded[0]?.id || "";
  });

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanningTargetItemId, setScanningTargetItemId] = useState<string | null>(null);

  // Forms state
  const [importText, setImportText] = useState("");
  const [importTitle, setImportTitle] = useState("Lista Importada do WhatsApp");
  const [newListTitle, setNewListTitle] = useState("");
  const [newListCity, setNewListCity] = useState("Jaú - SP");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Feedback states
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [batchSaveFeedback, setBatchSaveFeedback] = useState<string | null>(null);

  // Active list
  const activeList = useMemo(() => {
    return lists.find((l) => l.id === selectedListId) || lists[0] || null;
  }, [lists, selectedListId]);

  // Totals of active list
  const totals = useMemo(() => {
    if (!activeList) return { totalPrevisto: 0, totalComprado: 0, qtdItens: 0, qtdComprados: 0 };
    let previsto = 0;
    let comprado = 0;
    let compradosCount = 0;

    activeList.itens.forEach((it) => {
      const preco = it.preco_cotado || it.preco_estimado || 0;
      const subtotal = preco * (it.quantidade_necessaria || 1);
      previsto += subtotal;
      if (it.comprado) {
        comprado += subtotal;
        compradosCount++;
      }
    });

    return {
      totalPrevisto: previsto,
      totalComprado: comprado,
      qtdItens: activeList.itens.length,
      qtdComprados: compradosCount,
    };
  }, [activeList]);

  // Handle toggle bought status
  const handleToggleBought = (itemId: string) => {
    if (!activeList) return;
    const updatedItens = activeList.itens.map((it) =>
      it.id === itemId ? { ...it, comprado: !it.comprado } : it
    );
    const updatedList = { ...activeList, itens: updatedItens };
    const saved = addOrUpdateShoppingList(updatedList);
    setLists(saved);
  };

  // Handle update item price or packaging
  const handleUpdateItem = (itemId: string, updates: Partial<ListaComprasItem>) => {
    if (!activeList) return;
    const updatedItens = activeList.itens.map((it) =>
      it.id === itemId ? { ...it, ...updates } : it
    );
    const updatedList = { ...activeList, itens: updatedItens };
    const saved = addOrUpdateShoppingList(updatedList);
    setLists(saved);
  };

  // Handle remove item
  const handleRemoveItem = (itemId: string) => {
    if (!activeList) return;
    const updatedItens = activeList.itens.filter((it) => it.id !== itemId);
    const updatedList = { ...activeList, itens: updatedItens };
    const saved = addOrUpdateShoppingList(updatedList);
    setLists(saved);
  };

  // Handle add custom item
  const handleAddBlankItem = () => {
    if (!activeList) return;
    const newItem: ListaComprasItem = {
      id: `item-${Date.now()}`,
      insumo_nome: "Novo Insumo",
      quantidade_necessaria: 1,
      unidade_medida: "un",
      quantidade_embalagem: 1,
      preco_estimado: 0,
      comprado: false,
    };
    const updatedList = { ...activeList, itens: [...activeList.itens, newItem] };
    const saved = addOrUpdateShoppingList(updatedList);
    setLists(saved);
  };

  // Handle Barcode Scan Success for an Item
  const handleBarcodeScanForItem = async (barcode: string) => {
    if (!activeList || !scanningTargetItemId) return;

    const prodInfo = await consultarProdutoPorGtin(barcode);
    if (prodInfo) {
      handleUpdateItem(scanningTargetItemId, {
        gtin: barcode,
        insumo_nome: prodInfo.nome || activeList.itens.find((i) => i.id === scanningTargetItemId)?.insumo_nome,
        marca: prodInfo.marca,
        quantidade_embalagem: prodInfo.quantidade_embalagem,
        unidade_medida: prodInfo.unidade_medida,
      });
    } else {
      handleUpdateItem(scanningTargetItemId, { gtin: barcode });
    }
    setScanningTargetItemId(null);
  };

  // Handle create list from scratch or template
  const handleCreateList = () => {
    const title = newListTitle.trim() || "Nova Lista de Compras";
    let initialItens: ListaComprasItem[] = [];

    if (selectedTemplateId) {
      const tmpl = SHOPPING_LIST_TEMPLATES.find((t) => t.id === selectedTemplateId);
      if (tmpl) {
        initialItens = tmpl.itens.map((it, idx) => ({
          ...it,
          id: `item-${Date.now()}-${idx}`,
          comprado: false,
        }));
      }
    }

    const newList: ListaCompras = {
      id: `lista-${Date.now()}`,
      titulo: title,
      cidade: newListCity,
      itens: initialItens,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = addOrUpdateShoppingList(newList);
    setLists(updated);
    setSelectedListId(newList.id);
    setIsCreateListModalOpen(false);
    setNewListTitle("");
    setSelectedTemplateId("");
  };

  // Handle import list from pasted text
  const handleImportTextList = () => {
    if (!importText.trim()) return;
    const parsedItens = parseShoppingListFromText(importText);
    if (parsedItens.length === 0) {
      alert("Não foi possível identificar itens no texto colado. Verifique o formato.");
      return;
    }

    const newList: ListaCompras = {
      id: `lista-importada-${Date.now()}`,
      titulo: importTitle.trim() || "Lista Importada",
      cidade: "Jaú - SP",
      itens: parsedItens,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = addOrUpdateShoppingList(newList);
    setLists(updated);
    setSelectedListId(newList.id);
    setIsImportModalOpen(false);
    setImportText("");
  };

  // Handle share list to WhatsApp
  const handleShareWhatsApp = () => {
    if (!activeList) return;
    const itemsFormatted = activeList.itens
      .map((it) => {
        const check = it.comprado ? "✅" : "⬜";
        const precoStr = it.preco_cotado ? ` — R$ ${it.preco_cotado.toFixed(2)}` : "";
        const embStr = it.quantidade_embalagem ? ` (${it.quantidade_embalagem}${it.unidade_medida})` : "";
        return `${check} ${it.quantidade_necessaria}x *${it.insumo_nome}*${embStr}${precoStr}`;
      })
      .join("\n");

    const text =
      `🛒 *LISTA DE COMPRAS — GELADINHOS GOURMET DA ROZE* 🛒\n` +
      `📋 *${activeList.titulo}*\n` +
      `📍 Praça: ${activeList.cidade || "Jaú - SP"}\n` +
      `💰 Total Estimado: ${formatCurrency(totals.totalPrevisto)}\n` +
      `📊 Progresso: ${totals.qtdComprados}/${totals.qtdItens} itens comprados\n\n` +
      `*ITENS:*\n${itemsFormatted}\n\n` +
      `✨ _Gerado pelo Painel Roze Gourmet (PWA Nativo)_`;

    navigator.clipboard.writeText(text);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Bulk save quotations from shopping list
  const [batchEstabId, setBatchEstabId] = useState<string>(() => estabelecimentos[0]?.id || "");
  const [batchValidade, setBatchValidade] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [showBatchModal, setShowBatchModal] = useState(false);

  const handleExecuteBatchSave = () => {
    if (!activeList) return;
    const estab = estabelecimentos.find((e) => e.id === batchEstabId) || estabelecimentos[0];
    if (!estab) {
      alert("Selecione um estabelecimento válido.");
      return;
    }

    const count = saveBatchQuotationsFromShoppingList(
      activeList,
      estab.id,
      estab.nome,
      estab.cidade || "Jaú - SP",
      batchValidade
    );

    setShowBatchModal(false);
    setBatchSaveFeedback(`Sucesso! ${count} cotações com preços válidos foram salvas no comparador de preços!`);
    setTimeout(() => setBatchSaveFeedback(null), 5000);
    if (onQuotationsSaved) onQuotationsSaved();
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-foreground">Selecionar Lista:</label>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.titulo} ({l.itens.length} itens)
              </option>
            ))}
          </select>

          {activeList && (
            <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[11px]">
              {totals.qtdComprados}/{totals.qtdItens} Comprados
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importar Lista (Texto/WhatsApp)</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => setIsCreateListModalOpen(true)}
            className="gap-1.5 bg-primary text-primary-foreground text-xs font-bold shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Criar Nova Lista</span>
          </Button>
        </div>
      </div>

      {batchSaveFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{batchSaveFeedback}</span>
        </div>
      )}

      {/* Active list body */}
      {activeList ? (
        <div className="space-y-4">
          {/* Header Card of the active list */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  {activeList.titulo}
                </h3>
                {activeList.descricao && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeList.descricao}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  className="gap-1.5 text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{copiedFeedback ? "Copiado!" : "Enviar WhatsApp"}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBatchModal(true)}
                  className="gap-1.5 text-xs font-bold text-primary border-primary/40 hover:bg-primary/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Salvar Cotações no Banco</span>
                </Button>

                {lists.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja excluir a lista "${activeList.titulo}"?`)) {
                        const updated = deleteShoppingList(activeList.id);
                        setLists(updated);
                        setSelectedListId(updated[0]?.id || "");
                      }
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir Lista"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Metrics cards */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="rounded-xl border border-border/70 bg-background/60 p-2.5">
                <span className="text-[10px] text-muted-foreground block">Total Previsto:</span>
                <strong className="text-sm font-extrabold text-foreground font-mono">
                  {formatCurrency(totals.totalPrevisto)}
                </strong>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-2.5">
                <span className="text-[10px] text-muted-foreground block">Já Comprado:</span>
                <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(totals.totalComprado)}
                </strong>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-2.5">
                <span className="text-[10px] text-muted-foreground block">Restante a Desembolsar:</span>
                <strong className="text-sm font-extrabold text-primary font-mono">
                  {formatCurrency(Math.max(0, totals.totalPrevisto - totals.totalComprado))}
                </strong>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-2.5">
                <span className="text-[10px] text-muted-foreground block">Progresso da Compra:</span>
                <strong className="text-sm font-extrabold text-foreground">
                  {totals.qtdItens > 0
                    ? `${Math.round((totals.qtdComprados / totals.qtdItens) * 100)}%`
                    : "0%"}
                </strong>
              </div>
            </div>
          </div>

          {/* Table of items */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">Status</th>
                    <th className="py-3 px-3">Insumo / Ingrediente</th>
                    <th className="py-3 px-3">Código GTIN/EAN</th>
                    <th className="py-3 px-3 text-center">Qtd. Necessária</th>
                    <th className="py-3 px-3">Embalagem</th>
                    <th className="py-3 px-3 text-right">Preço Cotado</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                    <th className="py-3 px-3 text-center w-12">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activeList.itens.map((item) => {
                    const preco = item.preco_cotado || item.preco_estimado || 0;
                    const subtotal = preco * (item.quantidade_necessaria || 1);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          item.comprado ? "bg-emerald-500/5 text-muted-foreground" : "hover:bg-secondary/20"
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.comprado}
                            onChange={() => handleToggleBought(item.id)}
                            className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.insumo_nome}
                            onChange={(e) => handleUpdateItem(item.id, { insumo_nome: e.target.value })}
                            className={`w-full bg-transparent font-bold text-xs focus:bg-background focus:border focus:border-primary rounded px-1.5 py-0.5 ${
                              item.comprado ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          />
                          {item.marca && (
                            <span className="block text-[10px] text-muted-foreground px-1.5">
                              Marca: {item.marca}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-foreground">
                              {item.gtin || <span className="text-muted-foreground/60 italic">Sem código</span>}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setScanningTargetItemId(item.id);
                                setIsScannerOpen(true);
                              }}
                              className="rounded-md bg-secondary p-1 text-primary hover:bg-primary hover:text-primary-foreground"
                              title="Escanear Código com a Câmera"
                            >
                              <Camera className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantidade_necessaria}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                quantidade_necessaria: Math.max(1, parseFloat(e.target.value) || 1),
                              })
                            }
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-center font-bold text-xs focus:border-primary focus:outline-none"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={item.quantidade_embalagem || ""}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  quantidade_embalagem: parseFloat(e.target.value) || undefined,
                                })
                              }
                              placeholder="395"
                              className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                            />
                            <select
                              value={item.unidade_medida}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  unidade_medida: e.target.value as ListaComprasItem["unidade_medida"],
                                })
                              }
                              className="rounded border border-input bg-background px-1.5 py-1 text-xs focus:border-primary focus:outline-none"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">L</option>
                              <option value="un">un</option>
                            </select>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.preco_cotado !== undefined ? item.preco_cotado : item.preco_estimado || ""}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  preco_cotado: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.00"
                              className="w-20 rounded border border-input bg-background px-2 py-1 text-right font-mono font-bold text-xs text-primary focus:border-primary focus:outline-none"
                            />
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          {formatCurrency(subtotal)}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remover Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add new item row button */}
            <div className="border-t border-border p-3 bg-card/60 flex items-center justify-between">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddBlankItem}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Linha / Insumo</span>
              </Button>

              <span className="text-xs text-muted-foreground">
                Total da Lista: <strong className="text-foreground">{formatCurrency(totals.totalPrevisto)}</strong>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          Nenhuma lista de compras cadastrada. Clique em "Criar Nova Lista" ou "Importar Lista".
        </div>
      )}

      {/* MODAL: CRIAR NOVA LISTA DE COMPRAS */}
      {isCreateListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Criar Nova Lista de Compras
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateListModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Nome da Lista *:
                </label>
                <input
                  type="text"
                  required
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Ex: Compras da Semana - Fornada 69 un"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Carregar de um Modelo Pronto (Opcional):
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">Começar do zero (Em branco)</option>
                  {SHOPPING_LIST_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.titulo} ({tmpl.itens.length} itens)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Modelos calculados com a quantidade exata de insumos para cada receita oficial da Roze Gourmet.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Praça / Cidade:
                </label>
                <select
                  value={newListCity}
                  onChange={(e) => setNewListCity(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="Jaú - SP">Jaú - SP</option>
                  <option value="Três Pontas - MG">Três Pontas - MG</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateListModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleCreateList}
                className="bg-primary text-primary-foreground font-bold"
              >
                Criar Lista
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR LISTA DE COMPRAS (TEXTO / WHATSAPP / CSV) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Importar Lista de Compras (WhatsApp / Notas)
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Título da Lista:
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="Lista de Compras Importada"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Cole o texto da lista abaixo:
                </label>
                <textarea
                  rows={8}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Cole linhas como:\n2x Leite Condensado 395g R$ 5,29\nNutella 650g - R$ 38,90\n4 caixas de creme de leite piracanjuba\n1 pacote saquinhos 150ml`}
                  className="w-full rounded-xl border border-input bg-background p-3 font-mono text-xs focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  💡 Nosso parser inteligente extrai quantidades, pesos (ex: 395g, 1kg) e preços automaticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!importText.trim()}
                onClick={handleImportTextList}
                className="bg-primary text-primary-foreground font-bold"
              >
                Processar & Importar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SALVAR COTAÇÕES EM LOTE NO COMPARADOR */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Salvar Cotações da Lista no Banco
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Todos os itens da lista que possuem <strong>Preço Cotado</strong> serão automaticamente salvos na tabela de <em>Pesquisas de Preço com Validade</em>.
              </p>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Estabelecimento onde cotou *:
                </label>
                <select
                  value={batchEstabId}
                  onChange={(e) => setBatchEstabId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                >
                  {estabelecimentos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome} ({e.cidade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Data de Validade da Oferta *:
                </label>
                <input
                  type="date"
                  required
                  value={batchValidade}
                  onChange={(e) => setBatchValidade(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBatchModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleExecuteBatchSave}
                className="bg-primary text-primary-foreground font-bold"
              >
                Gravar Cotações em Lote
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode scanner camera modal for item */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScanningTargetItemId(null);
        }}
        onScanSuccess={handleBarcodeScanForItem}
        title="Escanear Código GTIN / EAN do Produto"
      />
    </div>
  );
};
