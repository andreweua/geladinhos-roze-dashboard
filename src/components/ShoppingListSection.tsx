import React, { useState, useMemo, useEffect } from "react";
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
  RefreshCw,
  FileSpreadsheet,
  FileUp,
  Flame,
  LayoutGrid,
  Table as TableIcon,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  ListaCompras,
  ListaComprasItem,
  EstabelecimentoLocal,
  EstoquePorProduto,
  FichaTecnicaProduto,
} from "@/types/dashboard";
import {
  loadShoppingLists,
  saveShoppingLists,
  addOrUpdateShoppingList,
  deleteShoppingList,
  SHOPPING_LIST_TEMPLATES,
  parseShoppingListFromText,
  parseShoppingListFromJson,
  parseShoppingListFromCsv,
  generateShoppingListFromCriticalStock,
  saveBatchQuotationsFromShoppingList,
  parseDisplayPackaging,
} from "@/services/shoppingListService";
import {
  consultarProdutoPorGtin,
  getRscGtinToken,
  saveRscGtinToken,
  loginRscSistemas,
  GtinProductInfo,
  isOfficialProductItem,
  getPendingEditRequestForProduct,
  subscribeProductGovernanceChanges,
} from "@/services/gtinService";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { ProductEditRequestModal, OfficialProductTarget } from "@/components/ProductEditRequestModal";
import { IngredientSearchInput } from "@/components/ingredients/IngredientSearchInput";
import { InsumoSearchResult } from "@/types/ingredients";
import { formatCurrency } from "@/lib/utils";
import { Button, Badge, Card, CardContent } from "@/components/ui/primitives";

interface ShoppingListSectionProps {
  estabelecimentos: EstabelecimentoLocal[];
  fichasTecnicas?: FichaTecnicaProduto[];
  reposicaoEstoque?: EstoquePorProduto[];
  onQuotationsSaved?: () => void;
}

export const ShoppingListSection: React.FC<ShoppingListSectionProps> = ({
  estabelecimentos,
  fichasTecnicas = [],
  reposicaoEstoque = [],
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
  const [scannerInitialMode, setScannerInitialMode] = useState<"camera" | "manual">("camera");
  const [scanningTargetItemId, setScanningTargetItemId] = useState<string | null>(null);
  const [searchingGtinItemId, setSearchingGtinItemId] = useState<string | null>(null);
  const [gtinFeedback, setGtinFeedback] = useState<string | null>(null);
  const [duplicateItemPrompt, setDuplicateItemPrompt] = useState<{
    existingItem: ListaComprasItem;
    scannedGtin?: string;
  } | null>(null);
  const [editRequestTarget, setEditRequestTarget] = useState<{
    itemId?: string;
    product: OfficialProductTarget;
  } | null>(null);
  const [, setGovernanceTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeProductGovernanceChanges(() => {
      setLists(loadShoppingLists());
      setGovernanceTick((t) => t + 1);
    });
    return unsub;
  }, []);

  // RSC Sistemas Config Modal State
  const [isRscModalOpen, setIsRscModalOpen] = useState(false);
  const [rscToken, setRscToken] = useState(() => getRscGtinToken());
  const [rscEmail, setRscEmail] = useState("");
  const [rscPassword, setRscPassword] = useState("");
  const [rscTestStatus, setRscTestStatus] = useState<string | null>(null);
  const [isTestingRsc, setIsTestingRsc] = useState(false);

  // Forms state
  const [importText, setImportText] = useState("");
  const [importTitle, setImportTitle] = useState("Lista Importada do WhatsApp");
  const [newListTitle, setNewListTitle] = useState("");
  const [newListCity, setNewListCity] = useState("Jaú - SP");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Feedback states
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [batchSaveFeedback, setBatchSaveFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

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
      const qtd = it.quantidade_necessaria || 1;
      const isAtacado = Boolean(
        it.preco_atacado &&
        it.preco_atacado > 0 &&
        it.qtd_minima_atacado &&
        it.qtd_minima_atacado > 0 &&
        qtd >= it.qtd_minima_atacado
      );
      const precoUnit = isAtacado
        ? it.preco_atacado!
        : it.preco_varejo || it.preco_cotado || it.preco_estimado || 0;
      const subtotal = precoUnit * qtd;
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
      dados_oficiais: false,
      fonte_dados: "manual",
      quantidade_necessaria: 1,
      unidade_compra: "un",
      unidade_medida: "g",
      quantidade_embalagem: 395,
      unidade_embalagem: "g",
      preco_estimado: 0,
      preco_varejo: 0,
      preco_cotado: 0,
      preco_atacado: undefined,
      qtd_minima_atacado: undefined,
      comprado: false,
    };
    const updatedList = { ...activeList, itens: [...activeList.itens, newItem] };
    const saved = addOrUpdateShoppingList(updatedList);
    setLists(saved);
  };

  // Handle search GTIN for an item (typing or button)
  const handleSearchGtinForItem = async (itemId: string, barcode: string) => {
    const clean = barcode.replace(/\D/g, "").trim();
    if (!clean || clean.length < 6) {
      alert("Por favor, informe um código de barras GTIN/EAN válido com pelo menos 6 dígitos numéricos.");
      return;
    }

    setSearchingGtinItemId(itemId);
    try {
      const prodInfo = await consultarProdutoPorGtin(clean);
      if (prodInfo) {
        const currentItem = activeList?.itens.find((i) => i.id === itemId);
        const isOfficial = prodInfo.fonte !== "manual" && !prodInfo.nome.startsWith("Produto GTIN");
        const resolvedName =
          prodInfo.nome && !prodInfo.nome.startsWith("Produto GTIN")
            ? prodInfo.nome
            : currentItem?.insumo_nome || prodInfo.nome;
        const resolvedBrand =
          prodInfo.marca && prodInfo.marca !== "A Identificar"
            ? prodInfo.marca
            : currentItem?.marca;

        const displayPkg = parseDisplayPackaging(resolvedName);
        const resolvedEmbQtd = displayPkg.quantidade || prodInfo.quantidade_embalagem || currentItem?.quantidade_embalagem;
        const resolvedEmbUnit = displayPkg.unidade || prodInfo.unidade_medida || currentItem?.unidade_embalagem || "g";

        handleUpdateItem(itemId, {
          gtin: clean,
          insumo_nome: resolvedName,
          marca: resolvedBrand,
          foto_url: prodInfo.foto_url || currentItem?.foto_url,
          dados_oficiais: isOfficial,
          fonte_dados: isOfficial ? prodInfo.fonte : "manual",
          unidade_compra: currentItem?.unidade_compra || displayPkg.containerHint || "un",
          quantidade_embalagem: resolvedEmbQtd,
          unidade_embalagem: resolvedEmbUnit,
          unidade_medida: resolvedEmbUnit,
        });

        const origem =
          prodInfo.fonte === "rsc_sistemas"
            ? "API RSC Sistemas / Catálogo Aberto"
            : prodInfo.fonte === "catalogo_local"
            ? "Catálogo Local Integrado"
            : "Registro Manual";

        setGtinFeedback(`✅ ${resolvedName}${resolvedBrand ? ` (${resolvedBrand})` : ""} identificado via ${origem}!`);
      } else {
        handleUpdateItem(itemId, { gtin: clean });
        setGtinFeedback(`ℹ️ Código GTIN ${clean} registrado no item.`);
      }
      setTimeout(() => setGtinFeedback(null), 4500);
    } catch (err) {
      console.error("Erro na busca de GTIN:", err);
      setGtinFeedback("⚠️ Falha temporária ao consultar GTIN. Código salvo.");
      setTimeout(() => setGtinFeedback(null), 3500);
    } finally {
      setSearchingGtinItemId(null);
    }
  };

  // Handle Barcode Scan Success for an Item or Global Add
  const handleBarcodeScanForItem = async (barcode: string) => {
    if (!activeList) return;
    const clean = barcode.replace(/\D/g, "").trim();
    if (!clean) return;

    setIsScannerOpen(false);

    // Caso 1: Escaneamento associado a um item específico da lista
    if (scanningTargetItemId) {
      const targetId = scanningTargetItemId;
      setScanningTargetItemId(null);
      await handleSearchGtinForItem(targetId, clean);
      return;
    }

    // Caso 2: Escaneamento geral de produto com a câmera
    // Verifica se já existe um item na lista de compras com este GTIN ou nome
    const existing = activeList.itens.find((i) => i.gtin === clean);
    if (existing) {
      // Produto já existe na lista -> Pergunta se quer acrescentar +1 unidade
      setDuplicateItemPrompt({
        existingItem: existing,
        scannedGtin: clean,
      });
      return;
    }

    // Se não existe, busca informações oficiais do GTIN e adiciona à lista
    try {
      const info = await consultarProdutoPorGtin(clean);
      const isOfficial = Boolean(info && info.fonte !== "manual" && !info.nome.startsWith("Produto GTIN"));
      const resolvedName = (info?.nome || `Produto GTIN ${clean}`).toUpperCase();
      const displayPkg = parseDisplayPackaging(resolvedName);
      const embUnit = displayPkg.unidade || info?.unidade_medida || "g";
      const newItem: ListaComprasItem = {
        id: `item-${Date.now()}`,
        insumo_nome: resolvedName,
        marca: info?.marca || "Genérico",
        gtin: clean,
        foto_url: info?.foto_url,
        dados_oficiais: isOfficial,
        fonte_dados: isOfficial ? info?.fonte : "manual",
        quantidade_necessaria: 1,
        unidade_compra: displayPkg.containerHint || "un",
        unidade_medida: embUnit,
        quantidade_embalagem: displayPkg.quantidade || info?.quantidade_embalagem || 1,
        unidade_embalagem: embUnit,
        preco_estimado: 0,
        comprado: false,
      };

      const updatedList = { ...activeList, itens: [...activeList.itens, newItem] };
      const saved = addOrUpdateShoppingList(updatedList);
      setLists(saved);
      setGtinFeedback(`✓ ${resolvedName} adicionado à lista de compras via Leitor de Código de Barras!`);
      setTimeout(() => setGtinFeedback(null), 4000);
    } catch {
      setGtinFeedback(`⚠️ Erro ao consultar GTIN ${clean}.`);
      setTimeout(() => setGtinFeedback(null), 3000);
    }
  };

  // Handle Selection from Smart Autocorrect Ingredient Search
  const handleSelectInsumoBusca = (insumo: InsumoSearchResult) => {
    if (!activeList) return;

    // Verifica se o item já existe na lista
    const existing = activeList.itens.find(
      (i) =>
        (insumo.gtin && i.gtin === insumo.gtin) ||
        i.insumo_nome.trim().toUpperCase() === insumo.nomeFormatado.trim().toUpperCase()
    );

    if (existing) {
      // Pergunta se deseja acrescentar +1 unidade ao item existente
      setDuplicateItemPrompt({
        existingItem: existing,
        scannedGtin: insumo.gtin,
      });
      return;
    }

    const displayPkg = parseDisplayPackaging(insumo.nomeFormatado);
    const embUnit = displayPkg.unidade || insumo.unidadeMedida || "g";

    const newItem: ListaComprasItem = {
      id: `item-${Date.now()}`,
      insumo_nome: insumo.nomeFormatado, // STRICTLY UPPERCASE
      marca: insumo.marca,
      gtin: insumo.gtin,
      dados_oficiais: true,
      fonte_dados: insumo.origem === "rcsistemas_sincronizado" ? "rsc_sistemas" : "catalogo_local",
      quantidade_necessaria: 1,
      unidade_compra: displayPkg.containerHint || "un",
      unidade_medida: embUnit,
      quantidade_embalagem: displayPkg.quantidade || insumo.quantidadeEmbalagem || 1,
      unidade_embalagem: embUnit,
      preco_estimado: insumo.precoReferencia || 0,
      comprado: false,
    };
    const updatedList = { ...activeList, itens: [...activeList.itens, newItem] };
    const saved = addOrUpdateShoppingList(updatedList);
    setLists(saved);
    setGtinFeedback(
      `✓ ${insumo.nomeFormatado} adicionado à lista via ${
        insumo.origem === "autocorrecao_local"
          ? "Autocorreção Inteligente (Levenshtein)"
          : insumo.origem === "rcsistemas_sincronizado"
          ? "RCSistemas (Sincronizado no IndexedDB)"
          : "Catálogo Local PereiraLabs"
      }!`
    );
    setTimeout(() => setGtinFeedback(null), 4000);
  };

  // Handle RSC Sistemas Live Test
  const handleTestRscConnection = async () => {
    setIsTestingRsc(true);
    setRscTestStatus("Consultando produto de teste (Leite Moça: 7891000100103)...");
    try {
      const result = await consultarProdutoPorGtin("7891000100103");
      if (result && result.nome) {
        setRscTestStatus(`✅ Sucesso! Produto retornado: "${result.nome}" - Marca: ${result.marca} (${result.fonte})`);
      } else {
        setRscTestStatus("⚠️ Não foi possível obter detalhes do produto de teste. Verifique credenciais ou conexão.");
      }
    } catch (err) {
      setRscTestStatus(`❌ Erro no teste: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTestingRsc(false);
    }
  };

  // Handle Save RSC Token directly
  const handleSaveRscToken = () => {
    saveRscGtinToken(rscToken);
    alert("Token RSC Sistemas atualizado com sucesso!");
  };

  // Handle Login to RSC Sistemas
  const handleLoginRsc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rscEmail.trim() || !rscPassword.trim()) {
      alert("Informe e-mail e senha cadastrados na RSC Sistemas.");
      return;
    }
    setIsTestingRsc(true);
    setRscTestStatus("Autenticando na API RSC Sistemas...");
    try {
      const res = await loginRscSistemas(rscEmail.trim(), rscPassword.trim());
      if (res.success && res.token) {
        setRscToken(res.token);
        setRscTestStatus("✅ Login realizado com sucesso! Token gerado e ativado.");
      } else {
        setRscTestStatus(`❌ Falha no login: ${res.error || "Credenciais inválidas"}`);
      }
    } catch (err) {
      setRscTestStatus(`❌ Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTestingRsc(false);
    }
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

  const criticalFlavors = useMemo(
    () => reposicaoEstoque.filter((i) => i.abaixo_do_minimo || i.quantidade_disponivel <= 0),
    [reposicaoEstoque]
  );

  const handleGenerateFromCriticalStock = () => {
    if (criticalFlavors.length === 0) {
      alert("Tudo certo no freezer! Nenhum sabor está zerado ou abaixo do estoque mínimo.");
      return;
    }

    const generated = generateShoppingListFromCriticalStock(reposicaoEstoque, fichasTecnicas);
    if (!generated || generated.itens.length === 0) {
      alert("Não foi possível gerar a lista dos itens críticos.");
      return;
    }

    const updated = addOrUpdateShoppingList(generated);
    setLists(updated);
    setSelectedListId(generated.id);
    setGtinFeedback(
      `✓ Lista gerada com ${generated.itens.length} insumos necessários para repor ${criticalFlavors.length} sabor(es) do freezer!`
    );
    setTimeout(() => setGtinFeedback(null), 5000);
  };

  // Handle import list from pasted text, JSON or CSV file
  const handleImportFileOrText = (rawContent: string, fileName?: string) => {
    const trimmed = rawContent.trim();
    if (!trimmed) return;

    let res: { titulo: string; itens: ListaComprasItem[] } | null = null;

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      res = parseShoppingListFromJson(trimmed);
    }

    if (!res && (trimmed.includes(";") || trimmed.includes(","))) {
      res = parseShoppingListFromCsv(trimmed);
    }

    if (!res) {
      const fallbackItens = parseShoppingListFromText(trimmed);
      if (fallbackItens.length > 0) {
        res = {
          titulo: importTitle.trim() || fileName || "Lista Importada (Texto)",
          itens: fallbackItens,
        };
      }
    }

    if (!res || res.itens.length === 0) {
      alert("Não foi possível reconhecer o formato do arquivo ou texto. Verifique se é um CSV, JSON ou texto válido.");
      return;
    }

    const newList: ListaCompras = {
      id: `lista-importada-${Date.now()}`,
      titulo: importTitle.trim() || res.titulo,
      cidade: "Jaú - SP",
      itens: res.itens,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = addOrUpdateShoppingList(newList);
    setLists(updated);
    setSelectedListId(newList.id);
    setIsImportModalOpen(false);
    setImportText("");
    setImportTitle("");
    setGtinFeedback(`✓ Lista "${newList.titulo}" importada com ${newList.itens.length} itens com sucesso!`);
    setTimeout(() => setGtinFeedback(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        handleImportFileOrText(content, file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent =
`nome;categoria;quantidade;unidade;preco_varejo;preco_atacado;qtd_minima_atacado;prioridade;fornecedor_sugerido;gtin
Leite Condensado 395g;Laticínios;24;un;5.49;4.89;12;alta;Mart Minas Atacado e Varejo;7891000100101
Creme de Leite 200g;Laticínios;27;un;3.49;2.99;24;alta;Tenda Atacado;7891000200202
Leite Integral 1L;Laticínios;12;l;4.49;3.99;12;media;Jaú Serve Supermercados;7891000300303
Nutella Pote 650g;Chocolates & Recheios;6;un;44.90;38.90;3;alta;Simão Doces Matriz;7898024394182
Liga Neutra 100g;Confeitaria & Insumos;2;un;7.80;6.90;5;alta;Distribuidora Doce Sabor;
Emulsificante 200g;Confeitaria & Insumos;2;un;8.90;7.90;4;media;Distribuidora Doce Sabor;
Saquinho Geladinho 6x24cm (Fardo c/ 1000);Embalagens & Descartáveis;2;fardo;28.50;24.90;2;alta;Simão Embalagens;
Polpa de Maracujá Congelada 1kg;Frutas & Mercearia;3;kg;18.00;15.50;5;media;Pomar Natural;
Açúcar Cristal 5kg;Mercearia;2;pct;17.50;15.90;5;baixa;Mart Minas Atacado e Varejo;`;

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modelo_lista_compras_atacado_varejo_pereiralabs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonTemplate = () => {
    const jsonContent = JSON.stringify(
      {
        versao_schema: "2.0",
        lista_nome: "Modelo de Reposição Atacado e Varejo PereiraLabs",
        cidade: "Jaú - SP",
        data_criacao: new Date().toISOString(),
        itens: [
          {
            nome: "Leite Condensado 395g",
            categoria: "Laticínios",
            quantidade: 24,
            unidade: "un",
            preco_varejo: 5.49,
            preco_atacado: 4.89,
            qtd_minima_atacado: 12,
            prioridade: "alta",
            fornecedor_sugerido: "Mart Minas Atacado e Varejo",
            gtin: "7891000100101"
          },
          {
            nome: "Creme de Leite 200g",
            categoria: "Laticínios",
            quantidade: 27,
            unidade: "un",
            preco_varejo: 3.49,
            preco_atacado: 2.99,
            qtd_minima_atacado: 24,
            prioridade: "alta",
            fornecedor_sugerido: "Tenda Atacado",
            gtin: "7891000200202"
          },
          {
            nome: "Nutella Pote 650g",
            categoria: "Chocolates & Recheios",
            quantidade: 6,
            unidade: "un",
            preco_varejo: 44.90,
            preco_atacado: 38.90,
            qtd_minima_atacado: 3,
            prioridade: "alta",
            fornecedor_sugerido: "Simão Doces Matriz",
            gtin: "7898024394182"
          },
          {
            nome: "Saquinho Geladinho 6x24cm (Fardo c/ 1000)",
            categoria: "Embalagens & Descartáveis",
            quantidade: 2,
            unidade: "fardo",
            preco_varejo: 28.50,
            preco_atacado: 24.90,
            qtd_minima_atacado: 2,
            prioridade: "alta",
            fornecedor_sugerido: "Simão Embalagens"
          }
        ]
      },
      null,
      2
    );

    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modelo_lista_compras_pereiralabs.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle share list to WhatsApp
  const handleShareWhatsApp = () => {
    if (!activeList) return;
    const itemsFormatted = activeList.itens
      .map((it) => {
        const check = it.comprado ? "✅" : "⬜";
        const qtd = it.quantidade_necessaria || 1;
        const isAtacado = Boolean(
          it.preco_atacado &&
          it.preco_atacado > 0 &&
          it.qtd_minima_atacado &&
          it.qtd_minima_atacado > 0 &&
          qtd >= it.qtd_minima_atacado
        );
        const precoUnit = isAtacado
          ? it.preco_atacado!
          : it.preco_varejo || it.preco_cotado || it.preco_estimado || 0;

        const precoStr = precoUnit > 0
          ? ` — R$ ${precoUnit.toFixed(2)}${isAtacado ? ` (Atacado a partir de ${it.qtd_minima_atacado} un)` : ""}`
          : "";
        const unCompra = it.unidade_compra || "un";
        const unEmb = it.unidade_embalagem || it.unidade_medida || "g";
        const embStr = it.quantidade_embalagem ? ` (Emb: ${it.quantidade_embalagem}${unEmb})` : "";
        return `${check} ${qtd} ${unCompra} *${it.insumo_nome}*${embStr}${precoStr}`;
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
            onClick={() => setIsRscModalOpen(true)}
            className="gap-1.5 border-border hover:bg-secondary text-xs font-semibold"
            title="Configuração de busca automática GTIN / RSC Sistemas"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                rscToken ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <Barcode className="h-3.5 w-3.5 text-primary" />
            <span>RSC Sistemas GTIN</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleGenerateFromCriticalStock}
            className="gap-1.5 border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold shadow-xs"
            title="Gera lista de compras automática a partir dos geladinhos com estoque zerado ou abaixo do mínimo"
          >
            <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
            <span>Gerar da Falta de Freezer</span>
            {criticalFlavors.length > 0 && (
              <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-black">
                {criticalFlavors.length}
              </span>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importar (CSV, Excel, JSON)</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDownloadCsvTemplate}
            title="Baixar Modelo de Planilha CSV (.csv) para preencher no Excel e importar"
            className="hidden sm:inline-flex gap-1.5 text-muted-foreground hover:text-foreground text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Baixar Modelo CSV</span>
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

      {gtinFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs font-bold text-primary animate-fadeIn">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>{gtinFeedback}</span>
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

          {/* Barra de Busca e Autocorreção Inteligente de Insumos */}
          <div className="rounded-2xl border border-primary/20 bg-card p-3.5 shadow-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Busca & Autocorreção Inteligente de Insumos (IndexedDB Offline / RCSistemas)
              </label>
              <span className="text-[10px] text-muted-foreground">
                Digite em minúsculas (ex: <code>leite mosa</code>, <code>harald</code>) → Retorno em <strong className="uppercase text-foreground">MAIÚSCULAS</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <IngredientSearchInput
                  onSelectInsumo={handleSelectInsumoBusca}
                  placeholder="Digite o insumo em minúsculas (ex: leite mosa, nestle, harald melken)..."
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setScanningTargetItemId(null);
                  setScannerInitialMode("camera");
                  setIsScannerOpen(true);
                }}
                title="Escanear Código de Barras (Câmera) para Adicionar à Lista"
                className="gap-1.5 bg-primary/10 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground font-bold text-xs shrink-0 h-10 shadow-xs"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Escanear Câmera</span>
                <span className="sm:hidden">Câmera</span>
              </Button>
            </div>
          </div>

          {/* Barra de Ações Rápidas: Alternar Visão (Cards vs Tabela) e Adicionar Insumo */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Visualização:</span>
              <div className="inline-flex rounded-xl bg-secondary/60 p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "cards"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Visão em Cards Mobile First (Otimizado para Celulares e PWA)"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cards (Recomendado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Visão em Planilha/Tabela Clássica"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Tabela</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-between sm:justify-end">
              <span className="text-xs text-muted-foreground">
                Itens na lista: <strong className="text-foreground">{activeList.itens.length}</strong>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddBlankItem}
                className="gap-1.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Insumo</span>
              </Button>
            </div>
          </div>

          {/* VISUALIZAÇÃO EM CARDS MOBILE-FIRST (Padrão e Recomendado) */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {activeList.itens.map((item) => {
                const qtd = item.quantidade_necessaria || 1;
                const isAtacadoAplicado = Boolean(
                  item.preco_atacado &&
                  item.preco_atacado > 0 &&
                  item.qtd_minima_atacado &&
                  item.qtd_minima_atacado > 0 &&
                  qtd >= item.qtd_minima_atacado
                );
                const precoUnitarioAplicado = isAtacadoAplicado
                  ? item.preco_atacado!
                  : item.preco_varejo || item.preco_cotado || item.preco_estimado || 0;
                const subtotal = precoUnitarioAplicado * qtd;
                const isOfficial = isOfficialProductItem(item);
                const pendingReq = isOfficial
                  ? getPendingEditRequestForProduct(item.gtin, item.insumo_nome)
                  : undefined;

                const openEditRequestForItem = () => {
                  setEditRequestTarget({
                    itemId: item.id,
                    product: {
                      gtin: item.gtin,
                      nome_atual: item.insumo_nome,
                      marca_atual: item.marca || "Geral",
                      quantidade_embalagem_atual: item.quantidade_embalagem || 1,
                      unidade_medida_atual: (item.unidade_embalagem ||
                        item.unidade_medida ||
                        "g") as "g" | "kg" | "ml" | "l" | "un",
                      fonte_original:
                        item.fonte_dados === "catalogo_local" ? "catalogo_local" : "rsc_sistemas",
                    },
                  });
                };

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl border p-4 shadow-sm transition-all duration-200 flex flex-col justify-between gap-3.5 ${
                      item.comprado
                        ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/15 opacity-85"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    {/* Topo do Card: Checkbox + Foto do Insumo + Nome do Insumo + Botão de Excluir */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleBought(item.id)}
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                          item.comprado
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                            : "border-border bg-background hover:border-emerald-500 text-transparent hover:text-emerald-500/40"
                        }`}
                        title={item.comprado ? "Desmarcar como comprado" : "Marcar como comprado no carrinho"}
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                      </button>

                      {/* Foto Real do Produto (RSC Sistemas / Catálogo Oficial) */}
                      {item.foto_url && (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-white p-0.5 shadow-xs">
                          <img
                            src={item.foto_url}
                            alt={item.insumo_nome}
                            loading="lazy"
                            onError={(e) => {
                              // Se a imagem falhar, esconde suavemente o container
                              (e.target as HTMLElement).parentElement?.classList.add("hidden");
                            }}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {isOfficial ? (
                          <div className="space-y-1">
                            <div
                              onClick={openEditRequestForItem}
                              title="Produto oficial (RSC Sistemas / Banco de Dados). Edição direta bloqueada — clique para solicitar revisão caso haja divergência."
                              className={`font-extrabold text-sm leading-snug px-1 py-0.5 cursor-pointer select-none ${
                                item.comprado ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {item.insumo_nome}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 px-1">
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                <Lock className="h-2.5 w-2.5" />
                                Oficial RSC Sistemas
                              </span>

                              {pendingReq ? (
                                <button
                                  type="button"
                                  onClick={openEditRequestForItem}
                                  className="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/25 transition-colors"
                                >
                                  <Clock className="h-2.5 w-2.5 animate-pulse" />
                                  Em análise pela PereiraLabs
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={openEditRequestForItem}
                                  className="inline-flex items-center gap-1 rounded-md bg-secondary hover:bg-primary/15 border border-border hover:border-primary/40 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Edit2 className="h-2.5 w-2.5" />
                                  Dados divergentes? Solicitar edição
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item.insumo_nome}
                              onChange={(e) => handleUpdateItem(item.id, { insumo_nome: e.target.value })}
                              placeholder="Nome do Insumo..."
                              className={`w-full bg-transparent font-extrabold text-sm rounded px-1 py-0.5 focus:bg-background focus:border focus:border-primary focus:outline-none ${
                                item.comprado ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            />
                          </div>
                        )}

                        {item.marca && (
                          <span className="block text-[11px] text-muted-foreground px-1 font-medium mt-0.5">
                            Marca: <strong className="text-foreground/80">{item.marca}</strong>
                          </span>
                        )}

                        {/* Badges de Atacado ou Dica de Economia */}
                        {isAtacadoAplicado && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            🏷️ Preço Atacado Ativo ({qtd}/{item.qtd_minima_atacado}+ un)
                          </div>
                        )}
                        {!isAtacadoAplicado && item.preco_atacado && item.qtd_minima_atacado && item.qtd_minima_atacado > qtd && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            💡 Faltam {item.qtd_minima_atacado - qtd} un p/ atacado ({formatCurrency(item.preco_atacado)})
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                        title="Remover Item da Lista"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Linha de Código GTIN / EAN com Atalhos Rápidos */}
                    <div className="rounded-xl border border-border/80 bg-background/50 p-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <Barcode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          readOnly={isOfficial}
                          value={item.gtin || ""}
                          onChange={(e) => {
                            if (isOfficial) return;
                            handleUpdateItem(item.id, {
                              gtin: e.target.value.replace(/\D/g, ""),
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && item.gtin) {
                              e.preventDefault();
                              handleSearchGtinForItem(item.id, item.gtin);
                            }
                          }}
                          placeholder="Código GTIN/EAN..."
                          title={
                            isOfficial
                              ? "Código GTIN oficial vinculado ao RSC Sistemas"
                              : "Digite o código e busque ou tecle Enter"
                          }
                          className={`w-full bg-transparent font-mono text-xs focus:outline-none ${
                            isOfficial ? "text-muted-foreground cursor-not-allowed" : "text-foreground"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSearchGtinForItem(item.id, item.gtin || "")}
                          disabled={!item.gtin || searchingGtinItemId === item.id}
                          className="rounded-lg bg-secondary px-2 py-1 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-colors text-[10px] font-bold flex items-center gap-1"
                          title="Buscar ou sincronizar dados oficiais do produto"
                        >
                          {searchingGtinItemId === item.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Search className="h-3 w-3" />
                          )}
                          <span className="hidden sm:inline">Buscar</span>
                        </button>

                        {!isOfficial && (
                          <button
                            type="button"
                            onClick={() => {
                              setScanningTargetItemId(item.id);
                              setScannerInitialMode("camera");
                              setIsScannerOpen(true);
                            }}
                            className="rounded-lg bg-primary/10 p-1.5 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="Escanear com a Câmera do Celular"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Grade de Informações Operacionais: Quantidade, Embalagem e Preços */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Qtd. Necessária (Unidade de Compra: un, cx, pct, fardo...) */}
                      <div className="rounded-xl border border-border/70 bg-secondary/30 p-2">
                        <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                          Qtd. Necessária (Compra)
                        </span>
                        <div className="flex items-center gap-1">
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
                            className="w-full rounded-lg border border-input bg-background px-2 py-1 text-center font-extrabold text-sm focus:border-primary focus:outline-none"
                          />
                          <select
                            value={item.unidade_compra || "un"}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                unidade_compra: e.target.value,
                              })
                            }
                            title="Unidade da quantidade que será comprada (ex: un, cx, pct, fardo)"
                            className="rounded-lg border border-input bg-background px-1.5 py-1 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="un">un</option>
                            <option value="cx">cx</option>
                            <option value="pct">pct</option>
                            <option value="fardo">fardo</option>
                            <option value="lata">lata</option>
                            <option value="pote">pote</option>
                            <option value="kg">kg</option>
                            <option value="l">L</option>
                          </select>
                        </div>
                      </div>

                      {/* Embalagem / Tamanho (Peso/Volume do Produto: 395g, 1L, 1.01kg...) */}
                      <div
                        className={`rounded-xl border p-2 ${
                          isOfficial
                            ? "border-amber-500/25 bg-amber-500/5"
                            : "border-border/70 bg-secondary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            Embalagem / Tamanho
                          </span>
                          {isOfficial && (
                            <span title="Tamanho da embalagem oficial RSC Sistemas (para corrigir, solicite edição à PereiraLabs)">
                              <Lock className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        {isOfficial ? (
                          <div
                            onClick={openEditRequestForItem}
                            title="Dado oficial RSC Sistemas. Clique para solicitar correção à PereiraLabs caso divergente."
                            className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-bold text-foreground cursor-pointer hover:border-primary/40"
                          >
                            <span>
                              {item.quantidade_embalagem || 1}{" "}
                              {item.unidade_embalagem || item.unidade_medida || "g"}
                            </span>
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                          </div>
                        ) : (
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
                              className="w-full rounded-lg border border-input bg-background px-2 py-1 text-center font-bold text-xs focus:border-primary focus:outline-none"
                            />
                            <select
                              value={item.unidade_embalagem || item.unidade_medida || "g"}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  unidade_embalagem: e.target.value,
                                  unidade_medida: e.target.value,
                                })
                              }
                              title="Unidade de medida do tamanho/peso da embalagem (ex: g, kg, ml, L)"
                              className="rounded-lg border border-input bg-background px-1.5 py-1 text-xs font-bold focus:border-primary focus:outline-none"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">L</option>
                              <option value="un">un</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preços: Varejo & Atacado */}
                    <div className="rounded-xl border border-border/70 bg-secondary/20 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-muted-foreground">Preço Varejo (un):</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.preco_varejo !== undefined ? item.preco_varejo : item.preco_cotado !== undefined ? item.preco_cotado : item.preco_estimado || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleUpdateItem(item.id, {
                                preco_varejo: val,
                                preco_cotado: val,
                              });
                            }}
                            placeholder="0,00"
                            className="w-20 rounded-lg border border-input bg-background px-2 py-0.5 text-right font-mono font-bold text-xs text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs border-t border-border/40 pt-1.5">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          Preço Atacado:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-emerald-600 font-bold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.preco_atacado !== undefined ? item.preco_atacado : ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                preco_atacado: e.target.value ? parseFloat(e.target.value) : undefined,
                              })
                            }
                            placeholder="Atacado"
                            title="Preço unitário no atacado"
                            className="w-20 rounded-lg border border-emerald-500/40 bg-background px-2 py-0.5 text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-muted-foreground font-semibold">mín:</span>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={item.qtd_minima_atacado !== undefined ? item.qtd_minima_atacado : ""}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                qtd_minima_atacado: e.target.value ? parseInt(e.target.value, 10) : undefined,
                              })
                            }
                            placeholder="12"
                            title="Mínimo de unidades para atacado"
                            className="w-12 rounded-lg border border-emerald-500/40 bg-background px-1 py-0.5 text-center font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rodapé do Card: Subtotal com Destaque e Condição Aplicada */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Subtotal Calculado
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {qtd} × {formatCurrency(precoUnitarioAplicado)} ({isAtacadoAplicado ? "Atacado" : "Varejo"})
                        </span>
                      </div>
                      <strong className="text-base font-black font-mono text-primary">
                        {formatCurrency(subtotal)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISUALIZAÇÃO EM TABELA (Para visualização clássica em telas desktop largas) */}
          {viewMode === "table" && (
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
                    <th className="py-3 px-3 text-right">Preço (Varejo / Atacado)</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                    <th className="py-3 px-3 text-center w-12">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activeList.itens.map((item) => {
                    const qtd = item.quantidade_necessaria || 1;
                    const isAtacadoAplicado = Boolean(
                      item.preco_atacado &&
                      item.preco_atacado > 0 &&
                      item.qtd_minima_atacado &&
                      item.qtd_minima_atacado > 0 &&
                      qtd >= item.qtd_minima_atacado
                    );
                    const precoUnitarioAplicado = isAtacadoAplicado
                      ? item.preco_atacado!
                      : item.preco_varejo || item.preco_cotado || item.preco_estimado || 0;
                    const subtotal = precoUnitarioAplicado * qtd;
                    const isOfficial = isOfficialProductItem(item);
                    const pendingReq = isOfficial
                      ? getPendingEditRequestForProduct(item.gtin, item.insumo_nome)
                      : undefined;

                    const openEditRequestForItem = () => {
                      setEditRequestTarget({
                        itemId: item.id,
                        product: {
                          gtin: item.gtin,
                          nome_atual: item.insumo_nome,
                          marca_atual: item.marca || "Geral",
                          quantidade_embalagem_atual: item.quantidade_embalagem || 1,
                          unidade_medida_atual: (item.unidade_embalagem ||
                            item.unidade_medida ||
                            "g") as "g" | "kg" | "ml" | "l" | "un",
                          fonte_original:
                            item.fonte_dados === "catalogo_local"
                              ? "catalogo_local"
                              : "rsc_sistemas",
                        },
                      });
                    };

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
                          <div className="flex items-center gap-2">
                            {item.foto_url && (
                              <img
                                src={item.foto_url}
                                alt={item.insumo_nome}
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLElement).classList.add("hidden");
                                }}
                                className="h-8 w-8 object-contain rounded border border-border/80 bg-white p-0.5 shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              {isOfficial ? (
                                <div className="space-y-0.5 px-1.5">
                                  <div
                                    onClick={openEditRequestForItem}
                                    className={`font-bold text-xs cursor-pointer ${
                                      item.comprado ? "line-through text-muted-foreground" : "text-foreground"
                                    }`}
                                    title="Produto oficial RSC Sistemas (não editável diretamente)"
                                  >
                                    {item.insumo_nome}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                      <Lock className="h-2.5 w-2.5" />
                                      Oficial RSC
                                    </span>
                                    <button
                                      type="button"
                                      onClick={openEditRequestForItem}
                                      className="inline-flex items-center gap-0.5 rounded bg-secondary hover:bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary transition-colors"
                                    >
                                      <Edit2 className="h-2.5 w-2.5" />
                                      {pendingReq ? "Em análise PereiraLabs" : "Solicitar edição"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={item.insumo_nome}
                                  onChange={(e) => handleUpdateItem(item.id, { insumo_nome: e.target.value })}
                                  className={`w-full bg-transparent font-bold text-xs focus:bg-background focus:border focus:border-primary rounded px-1.5 py-0.5 ${
                                    item.comprado ? "line-through text-muted-foreground" : "text-foreground"
                                  }`}
                                />
                              )}
                              {item.marca && (
                                <span className="block text-[10px] text-muted-foreground px-1.5">
                                  Marca: {item.marca}
                                </span>
                              )}
                              {isAtacadoAplicado && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  🏷️ Preço Atacado Ativo ({qtd}/{item.qtd_minima_atacado}+ un)
                                </span>
                              )}
                              {!isAtacadoAplicado && item.preco_atacado && item.qtd_minima_atacado && item.qtd_minima_atacado > qtd && (
                                <span className="block text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                                  💡 Faltam {item.qtd_minima_atacado - qtd} un p/ atacado ({formatCurrency(item.preco_atacado)})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              readOnly={isOfficial}
                              value={item.gtin || ""}
                              onChange={(e) => {
                                if (isOfficial) return;
                                handleUpdateItem(item.id, {
                                  gtin: e.target.value.replace(/\D/g, ""),
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && item.gtin) {
                                  e.preventDefault();
                                  handleSearchGtinForItem(item.id, item.gtin);
                                }
                              }}
                              placeholder="Código EAN..."
                              title={
                                isOfficial
                                  ? "Código GTIN oficial RSC Sistemas"
                                  : "Digite o código e tecle Enter ou use a lupa para buscar na RSC Sistemas"
                              }
                              className={`w-28 rounded-lg border border-input bg-background px-2 py-1 font-mono text-[11px] focus:border-primary focus:outline-none ${
                                isOfficial ? "text-muted-foreground cursor-not-allowed" : "text-foreground"
                              }`}
                            />
                            {/* Buscar no RSC Sistemas / Catálogo */}
                            <button
                              type="button"
                              onClick={() => handleSearchGtinForItem(item.id, item.gtin || "")}
                              disabled={!item.gtin || searchingGtinItemId === item.id}
                              className="rounded-md bg-secondary p-1 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-colors"
                              title="Buscar produto na RSC Sistemas / Catálogo"
                            >
                              {searchingGtinItemId === item.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Search className="h-3 w-3" />
                              )}
                            </button>
                            {!isOfficial && (
                              <>
                                {/* Digitar no modal */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScanningTargetItemId(item.id);
                                    setScannerInitialMode("manual");
                                    setIsScannerOpen(true);
                                  }}
                                  className="rounded-md bg-secondary p-1 text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
                                  title="Digitar código com teclado ampliado"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                {/* Câmera */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScanningTargetItemId(item.id);
                                    setScannerInitialMode("camera");
                                    setIsScannerOpen(true);
                                  }}
                                  className="rounded-md bg-secondary p-1 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                  title="Escanear com a Câmera"
                                >
                                  <Camera className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
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
                              className="w-14 rounded border border-input bg-background px-1.5 py-1 text-center font-bold text-xs focus:border-primary focus:outline-none"
                            />
                            <select
                              value={item.unidade_compra || "un"}
                              onChange={(e) =>
                                handleUpdateItem(item.id, {
                                  unidade_compra: e.target.value,
                                })
                              }
                              title="Unidade de compra (un, cx, pct, fardo)"
                              className="rounded border border-input bg-background px-1 py-1 text-xs font-semibold focus:border-primary focus:outline-none"
                            >
                              <option value="un">un</option>
                              <option value="cx">cx</option>
                              <option value="pct">pct</option>
                              <option value="fardo">fardo</option>
                              <option value="lata">lata</option>
                              <option value="pote">pote</option>
                              <option value="kg">kg</option>
                              <option value="l">L</option>
                            </select>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          {isOfficial ? (
                            <div
                              onClick={openEditRequestForItem}
                              title="Embalagem oficial RSC Sistemas. Clique para solicitar correção à PereiraLabs."
                              className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-xs font-bold text-foreground cursor-pointer"
                            >
                              <Lock className="h-2.5 w-2.5 text-amber-500" />
                              <span>
                                {item.quantidade_embalagem || 1}
                                {item.unidade_embalagem || item.unidade_medida || "g"}
                              </span>
                            </div>
                          ) : (
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
                                value={item.unidade_embalagem || item.unidade_medida || "g"}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    unidade_embalagem: e.target.value,
                                    unidade_medida: e.target.value,
                                  })
                                }
                                title="Unidade do tamanho da embalagem (g, kg, ml, L)"
                                className="rounded border border-input bg-background px-1.5 py-1 text-xs focus:border-primary focus:outline-none"
                              >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="l">L</option>
                                <option value="un">un</option>
                              </select>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            {/* Preço de Varejo */}
                            <div className="inline-flex items-center gap-1" title="Preço de Varejo / Unitário">
                              <span className="text-[10px] text-muted-foreground font-semibold">Var:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.preco_varejo !== undefined ? item.preco_varejo : item.preco_cotado !== undefined ? item.preco_cotado : item.preco_estimado || ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleUpdateItem(item.id, {
                                    preco_varejo: val,
                                    preco_cotado: val,
                                  });
                                }}
                                placeholder="0.00"
                                className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-right font-mono font-bold text-xs text-foreground focus:border-primary focus:outline-none"
                              />
                            </div>

                            {/* Preço de Atacado & Qtd Mínima */}
                            <div className="inline-flex items-center gap-1" title="Preço de Atacado e Quantidade Mínima para desconto">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Atac:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.preco_atacado !== undefined ? item.preco_atacado : ""}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    preco_atacado: e.target.value ? parseFloat(e.target.value) : undefined,
                                  })
                                }
                                placeholder="R$ atac"
                                title="Preço unitário no atacado"
                                className="w-16 rounded border border-emerald-500/40 bg-background px-1.5 py-0.5 text-right font-mono font-bold text-[11px] text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                              />
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={item.qtd_minima_atacado !== undefined ? item.qtd_minima_atacado : ""}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, {
                                    qtd_minima_atacado: e.target.value ? parseInt(e.target.value, 10) : undefined,
                                  })
                                }
                                placeholder="mín"
                                title="Quantidade mínima de unidades/caixas para liberar o preço de atacado"
                                className="w-12 rounded border border-emerald-500/40 bg-background px-1 py-0.5 text-center font-mono font-bold text-[10px] text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:outline-none"
                              />
                            </div>
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
          )}
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

      {/* MODAL: IMPORTAR LISTA DE COMPRAS (CSV / EXCEL / JSON / TEXTO) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Importar Lista de Compras Inteligente
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Título da Lista (Opcional):
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="Ex: Reposição Semanal de Ingredientes"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              {/* Botão de Upload de Arquivo .CSV ou .JSON */}
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center hover:bg-primary/10 transition-colors">
                <FileUp className="h-7 w-7 text-primary mx-auto mb-1.5" />
                <label className="cursor-pointer">
                  <span className="font-bold text-primary hover:underline text-xs block">
                    Clique aqui para carregar planilha (.CSV / Excel) ou arquivo (.JSON)
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Aceita colunas: <code>nome;categoria;quantidade;unidade;preco;prioridade;fornecedor</code>
                  </span>
                  <input
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Baixar Modelos Prontos de CSV e JSON */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl border border-border/80 bg-secondary/40 shadow-xs">
                <div>
                  <span className="font-bold text-foreground text-xs block">
                    Não tem uma planilha ou arquivo pronto?
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Baixe o modelo oficial com exemplos para só preencher e carregar:
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadCsvTemplate}
                    className="flex-1 sm:flex-initial text-[11px] h-8 gap-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-xl"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Baixar Modelo .CSV (Excel)</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadJsonTemplate}
                    className="flex-1 sm:flex-initial text-[11px] h-8 gap-1.5 border-primary/50 text-primary hover:bg-primary/10 font-bold rounded-xl"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Baixar Modelo .JSON</span>
                  </Button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Ou cole o texto / dados brutos abaixo (CSV, JSON ou WhatsApp):
                </label>
                <textarea
                  rows={7}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Opção 1 (CSV / Planilha):\nnome;categoria;quantidade;unidade;preco_estimado_unitario;prioridade;fornecedor_sugerido\nLeite Condensado 395g;Laticínios;12;un;5.49;alta;Atacadista Central\nCreme de Leite 200g;Laticínios;15;un;3.19;alta;Atacadista Central\n\nOpção 2 (JSON Universal):\n{\n  "lista_nome": "Reposição Semanal",\n  "itens": [{ "nome": "Liga Neutra 100g", "quantidade": 2, "unidade": "pct" }]\n}\n\nOpção 3 (Texto corrido):\n2x Leite Condensado 395g\n1kg Morangos Congelados`}
                  className="w-full rounded-xl border border-input bg-background p-3 font-mono text-xs focus:border-primary focus:outline-none leading-relaxed"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  💡 <strong>Parser Inteligente Automático:</strong> Detecta sozinho se o formato colado é JSON estruturado, planilha CSV (separada por vírgula ou ponto-e-vírgula) ou lista do WhatsApp.
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
                onClick={() => handleImportFileOrText(importText)}
                className="bg-primary text-primary-foreground font-bold text-xs"
              >
                Processar & Importar Lista
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

      {/* Modal de Conexão RSC Sistemas GTIN */}
      {isRscModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Barcode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">
                    Conexão RSC Sistemas & Catálogo GTIN
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Busca instantânea de produtos por Código de Barras (EAN-13)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRscModalOpen(false)}
                className="rounded-full bg-secondary p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Status do Serviço:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      rscToken
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        rscToken ? "bg-emerald-500" : "bg-blue-500"
                      }`}
                    />
                    {rscToken
                      ? "API RSC Sistemas Autenticada"
                      : "Catálogo Nacional + Base Aberta Ativa"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ao escanear ou digitar o código de barras (Ex: <em>7891000100103</em> para Leite Moça), o sistema preenche automaticamente o <strong>nome exato, marca, peso e unidade</strong>.
                </p>
              </div>

              {/* Botão de teste imediato */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="block text-foreground font-bold">Teste em Tempo Real:</strong>
                    <span className="text-[11px] text-muted-foreground">
                      Testa a busca de um produto oficial (Leite Moça 395g)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleTestRscConnection}
                    disabled={isTestingRsc}
                    className="border-primary/40 text-primary font-bold text-xs shrink-0"
                  >
                    {isTestingRsc ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    Testar Agora
                  </Button>
                </div>
                {rscTestStatus && (
                  <div className="mt-2.5 rounded-xl border border-border bg-background p-2.5 text-[11px] font-medium text-foreground">
                    {rscTestStatus}
                  </div>
                )}
              </div>

              {/* Form de Login RSC Sistemas */}
              <form onSubmit={handleLoginRsc} className="space-y-3 rounded-2xl border border-border p-3.5 bg-card">
                <strong className="block text-foreground font-bold">
                  Autenticar com Conta RSC Sistemas (Opcional):
                </strong>
                <p className="text-[11px] text-muted-foreground">
                  Se você possui cadastro na <code>gtin.rscsistemas.com.br</code>, informe suas credenciais para consultas com fotos em alta resolução:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">E-mail RSC:</label>
                    <input
                      type="email"
                      value={rscEmail}
                      onChange={(e) => setRscEmail(e.target.value)}
                      placeholder="usuario@email.com"
                      className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-foreground mb-1">Senha RSC:</label>
                    <input
                      type="password"
                      value={rscPassword}
                      onChange={(e) => setRscPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isTestingRsc}
                    className="bg-primary text-primary-foreground font-bold text-xs"
                  >
                    Entrar e Gerar Token
                  </Button>
                </div>
              </form>

              {/* Token Manual */}
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  Ou cole um Bearer Token RSC Sistemas diretamente:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={rscToken}
                    onChange={(e) => setRscToken(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 font-mono text-xs focus:border-primary focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveRscToken}
                    className="text-xs font-bold shrink-0"
                  >
                    Salvar Token
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end border-t border-border pt-3">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsRscModalOpen(false)}
                className="bg-primary text-primary-foreground font-bold"
              >
                Concluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta inteligente: Produto já existe na lista de compras -> Adicionar +1 unidade? */}
      {duplicateItemPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 text-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Barcode className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Produto Já na Lista!</h4>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {duplicateItemPrompt.scannedGtin ? `GTIN: ${duplicateItemPrompt.scannedGtin}` : "Insumo Cadastrado"}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-secondary/60 p-3 border border-border/70 space-y-1">
              <p className="text-xs font-bold text-foreground">{duplicateItemPrompt.existingItem.insumo_nome}</p>
              <p className="text-[11px] text-muted-foreground">
                Marca: <strong>{duplicateItemPrompt.existingItem.marca || "Padrão"}</strong>
              </p>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-muted-foreground">Quantidade Atual na Lista:</span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  {duplicateItemPrompt.existingItem.quantidade_necessaria}{" "}
                  {duplicateItemPrompt.existingItem.unidade_medida}
                </span>
              </div>
            </div>

            <p className="text-xs text-foreground font-medium leading-relaxed">
              Este produto já está na sua lista de compras. Deseja <strong>acrescentar mais 1 unidade (+1)</strong> à quantidade necessária?
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setDuplicateItemPrompt(null)}
              >
                Manter ({duplicateItemPrompt.existingItem.quantidade_necessaria} {duplicateItemPrompt.existingItem.unidade_medida})
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="flex-1 text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
                onClick={() => {
                  handleUpdateItem(duplicateItemPrompt.existingItem.id, {
                    quantidade_necessaria: duplicateItemPrompt.existingItem.quantidade_necessaria + 1,
                  });
                  setGtinFeedback(
                    `✓ +1 unidade adicionada a ${duplicateItemPrompt.existingItem.insumo_nome} (Total: ${
                      duplicateItemPrompt.existingItem.quantidade_necessaria + 1
                    })!`
                  );
                  setTimeout(() => setGtinFeedback(null), 3500);
                  setDuplicateItemPrompt(null);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Sim, Adicionar +1</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode scanner camera modal for item */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        initialMode={scannerInitialMode}
        onClose={() => {
          setIsScannerOpen(false);
          setScanningTargetItemId(null);
        }}
        onScanSuccess={handleBarcodeScanForItem}
        title="Escanear Código GTIN / EAN do Produto"
      />

      {/* Modal de Solicitação de Correção de Produto Oficial (Aprovação Exclusiva PereiraLabs) */}
      <ProductEditRequestModal
        isOpen={Boolean(editRequestTarget)}
        onClose={() => setEditRequestTarget(null)}
        product={editRequestTarget?.product || null}
        onSuccess={({ action, updatedData }) => {
          if (action === "approved" && updatedData && editRequestTarget?.itemId) {
            handleUpdateItem(editRequestTarget.itemId, {
              insumo_nome: updatedData.nome,
              marca: updatedData.marca,
              quantidade_embalagem: updatedData.quantidade_embalagem,
              unidade_embalagem: updatedData.unidade_medida,
              unidade_medida: updatedData.unidade_medida,
              dados_oficiais: true,
            });
            setGtinFeedback(
              `✅ Produto oficial atualizado e aprovado pela PereiraLabs: ${updatedData.nome}`
            );
          } else if (action === "requested") {
            setGtinFeedback(
              `⏳ Solicitação de revisão enviada! Somente a PereiraLabs pode aprovar alterações em produtos oficiais.`
            );
          }
          setLists(loadShoppingLists());
          setGovernanceTick((t) => t + 1);
          setTimeout(() => setGtinFeedback(null), 5000);
        }}
      />
    </div>
  );
};
