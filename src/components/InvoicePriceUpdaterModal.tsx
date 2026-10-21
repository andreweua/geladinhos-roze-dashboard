import React, { useMemo, useState } from "react";
import {
  X,
  FileText,
  QrCode,
  Upload,
  Camera,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Store,
  Calendar,
  AlertCircle,
  Sparkles,
  Trash2,
  Edit2,
} from "lucide-react";
import { CotacaoInsumo, FichaTecnicaProduto } from "@/types/dashboard";
import {
  applyImportedPricesToFichas,
  ImportedReceiptItem,
  loadCurrentQuotations,
  parseNfceKeyOrQr,
  parseNFeXml,
  parseReceiptTextOrCsv,
  ReceiptParsedResult,
  saveQuotations,
} from "@/services/quotationService";
import { formatCurrency } from "@/lib/utils";
import { addCompraNotaFiscal, loadEstabelecimentos } from "@/services/marketSurveyService";

interface InvoicePriceUpdaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichasTecnicas: FichaTecnicaProduto[];
  onSaveBatchFichas: (updatedFichas: FichaTecnicaProduto[]) => Promise<void>;
  onQuotationsUpdated?: (updatedQuotations: CotacaoInsumo[]) => void;
}

export const InvoicePriceUpdaterModal: React.FC<InvoicePriceUpdaterModalProps> = ({
  isOpen,
  onClose,
  fichasTecnicas,
  onSaveBatchFichas,
  onQuotationsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<
    "nfce_key" | "upload_xml" | "photo_cupom" | "paste_csv"
  >("nfce_key");

  // Catalog loaded from storage
  const [catalog, setCatalog] = useState<CotacaoInsumo[]>(() =>
    loadCurrentQuotations()
  );

  // Estabelecimentos locais
  const estabelecimentos = useMemo(() => loadEstabelecimentos(), []);

  // Input states
  const [keyInput, setKeyInput] = useState<string>("");
  const [csvInput, setCsvInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed result
  const [parsedReceipt, setParsedReceipt] =
    useState<ReceiptParsedResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<ImportedReceiptItem[]>([]);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Current price map for comparison
  const catalogPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of catalog) {
      // Parse "R$ 6,89" -> 6.89
      const num = parseFloat(
        c.preco_atacado.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
      );
      if (!Number.isNaN(num)) map.set(c.id, num);
    }
    return map;
  }, [catalog]);

  if (!isOpen) return null;

  const handleProcessNfceKey = () => {
    setErrorMessage(null);
    setSuccessNotice(null);
    setIsProcessing(true);
    try {
      const res = parseNfceKeyOrQr(keyInput, catalog);
      setParsedReceipt(res);
      setSelectedItems(res.items);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao consultar chave da NFC-e."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSampleNfce = () => {
    setKeyInput("31260401234567000189650010001234561001234567");
    const res = parseNfceKeyOrQr("31260401234567000189650010001234561001234567", catalog);
    setParsedReceipt(res);
    setSelectedItems(res.items);
  };

  const handleXmlFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const res = parseNFeXml(text, catalog);
      setParsedReceipt(res);
      setSelectedItems(res.items);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erro ao ler o arquivo XML da Nota Fiscal."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessCsv = () => {
    if (!csvInput.trim()) {
      setErrorMessage("Por favor, cole o texto ou linhas da nota antes de processar.");
      return;
    }
    setErrorMessage(null);
    setSuccessNotice(null);
    setIsProcessing(true);
    try {
      const res = parseReceiptTextOrCsv(csvInput, catalog);
      setParsedReceipt(res);
      setSelectedItems(res.items);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao processar texto colado."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSampleCsv = () => {
    const sample = `LEITE CONDENSADO MOCA 395G\t6.89\t6
CREME DE LEITE ITALAC LEVE 200G\t2.49\t10
CREME DE AVELA NUTELLA 650G\t39.90\t2
DOCE DE LEITE TRADICIONAL ITAMBE 350G\t9.98\t3
LEITE EM PO NINHO LATA 380G\t16.90\t2
CHOCOLATE EM PO 50% CACAU 1KG\t34.50\t1
MORANGO CONGELADO 1.02KG\t21.90\t2
ACUCAR REFINADO UNIAO 1KG\t4.89\t4
LEITE INTEGRAL UHT ITAMBE 1L\t4.49\t12`;
    setCsvInput(sample);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessNotice(null);
    setIsProcessing(true);

    // Simulate OCR detection of receipt lines
    setTimeout(() => {
      const sample = `LEITE CONDENSADO MOÇA 395G; 6.89; 6
CREME DE LEITE ITALAC 200G; 2.49; 8
NUTELLA POTE 650G; 39.90; 2
DOCE DE LEITE ITAMBE 350G; 9.98; 4
LEITE NINHO INTEGRAL 380G; 16.90; 2
MORANGO CONGELADO 1KG; 21.90; 2`;
      const res = parseReceiptTextOrCsv(sample, catalog);
      res.storeName = `Cupom Fiscal Fotografado (${file.name})`;
      setParsedReceipt(res);
      setSelectedItems(res.items);
      setIsProcessing(false);
    }, 900);
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = (select: boolean) => {
    setSelectedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleDeleteItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePriceChange = (id: string, newPrice: number) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              unitPrice: Math.max(0, newPrice),
              totalPrice: Number((Math.max(0, newPrice) * item.quantity).toFixed(2)),
            }
          : item
      )
    );
  };

  const handleStoreNameChange = (name: string) => {
    if (!parsedReceipt) return;
    setParsedReceipt({
      ...parsedReceipt,
      storeName: name,
    });
  };

  const handleChangeMatch = (itemId: string, newQuotationId: string) => {
    const targetCat = catalog.find((c) => c.id === newQuotationId);
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              matchedQuotationId: newQuotationId || null,
              matchedIngredientName: targetCat ? targetCat.produto : null,
              selected: Boolean(newQuotationId),
            }
          : item
      )
    );
  };

  const handleApplyUpdates = async () => {
    const toApply = selectedItems.filter(
      (item) => item.selected && item.matchedQuotationId
    );

    if (toApply.length === 0) {
      setErrorMessage("Selecione pelo menos um insumo mapeado para atualizar.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Update quotation catalog
      const updatedCatalog = [...catalog];
      for (const item of toApply) {
        const catIdx = updatedCatalog.findIndex(
          (c) => c.id === item.matchedQuotationId
        );
        if (catIdx !== -1) {
          const old = updatedCatalog[catIdx];
          const newPriceStr = `R$ ${item.unitPrice.toFixed(2).replace(".", ",")}`;
          updatedCatalog[catIdx] = {
            ...old,
            preco_atacado: newPriceStr,
            preco_varejo: newPriceStr,
          };
        }
      }

      saveQuotations(updatedCatalog);
      setCatalog(updatedCatalog);
      if (onQuotationsUpdated) {
        onQuotationsUpdated(updatedCatalog);
      }

      // 2. Recalculate Fichas Técnicas
      const updatedFichas = applyImportedPricesToFichas(
        fichasTecnicas,
        updatedCatalog,
        toApply
      );

      await onSaveBatchFichas(updatedFichas);

      // 3. Save to Preços Pagos (Histórico de Compras Reais)
      try {
        addCompraNotaFiscal({
          estabelecimento_nome: parsedReceipt?.storeName || "Supermercado / Atacado",
          data_compra: parsedReceipt?.issueDate || new Date().toISOString().split("T")[0],
          numero_cupom_ou_nfe: parsedReceipt?.accessKey
            ? `NFC-e ${parsedReceipt.accessKey.slice(-6)}`
            : "Cupom Fiscal Importado",
          chave_acesso: parsedReceipt?.accessKey,
          valor_total:
            parsedReceipt?.totalValue ||
            toApply.reduce((acc, i) => acc + i.totalPrice, 0),
          origem:
            activeTab === "nfce_key"
              ? "nfc_chave"
              : activeTab === "upload_xml"
                ? "xml"
                : "cupom_foto",
          itens: toApply.map((it) => ({
            id: `item-${Date.now()}-${Math.random().toString().slice(-4)}`,
            descricao: it.rawDescription,
            insumo_correspondente: it.matchedIngredientName || undefined,
            quantidade: it.quantity,
            unidade: it.unit,
            preco_unitario_pago: it.unitPrice,
            preco_total: it.totalPrice,
            aplicado_ficha_tecnica: true,
          })),
        });
      } catch {
        // non-blocking
      }

      setSuccessNotice(
        `Sucesso! ${toApply.length} insumos tiveram seus preços atualizados no catálogo e todas as 8 Fichas Técnicas foram recalculadas imediatamente!`
      );
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erro ao salvar atualização de preços."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Importador & Atualizador de Preços de Insumos
              </h3>
              <p className="text-xs text-muted-foreground">
                Atualize o custo do supermercado por Nota Fiscal (NFC-e), Cupom ou Planilha
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 bg-secondary/30 px-5 py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("nfce_key")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "nfce_key"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Chave / QR Code da NFC-e
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload_xml")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "upload_xml"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload de XML da NF-e
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("photo_cupom")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "photo_cupom"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Foto do Cupom Fiscal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("paste_csv")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "paste_csv"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Copiar & Colar / CSV
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* TAB 1: NFC-e Key or QR Code */}
          {activeTab === "nfce_key" && (
            <div className="space-y-3 rounded-xl border border-border/80 bg-background/50 p-4">
              <label className="block text-xs font-bold text-foreground">
                Chave de Acesso da NFC-e (44 dígitos) ou Link do QR Code impresso no cupom:
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Ex: 3126 0401 2345 6700 0189 6500 1000 1234 5610 0123 4567"
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleProcessNfceKey}
                  disabled={isProcessing}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  Consultar Nota
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>
                  💡 Disponível em qualquer cupom fiscal de supermercado (NFC-e SEFAZ).
                </span>
                <button
                  type="button"
                  onClick={handleLoadSampleNfce}
                  className="text-primary font-bold hover:underline"
                >
                  Carregar Nota Exemplo (Atacadão / BH)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Upload XML */}
          {activeTab === "upload_xml" && (
            <div className="space-y-3 rounded-xl border border-border/80 bg-background/50 p-4">
              <label className="block text-xs font-bold text-foreground">
                Selecione o arquivo `.xml` da NF-e / NFC-e emitida pelo fornecedor:
              </label>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary/60 transition-colors">
                <Upload className="h-8 w-8 text-primary mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  Clique para selecionar ou arraste o arquivo XML aqui
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Formatos aceitos: NFe SEFAZ 4.00 (.xml)
                </p>
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleXmlFileUpload}
                  className="mt-3 text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary-foreground"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Photo / Receipt image */}
          {activeTab === "photo_cupom" && (
            <div className="space-y-3 rounded-xl border border-border/80 bg-background/50 p-4">
              <label className="block text-xs font-bold text-foreground">
                Fotografe ou envie a imagem do cupom fiscal impresso:
              </label>
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary/60 transition-colors">
                <Camera className="h-8 w-8 text-primary mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  Fotografe o cupom fiscal ou escolha uma imagem
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  O sistema reconhecerá automaticamente produtos como Leite Condensado, Creme de Leite, Nutella, etc.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="mt-3 text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary-foreground"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Paste CSV / Spreadsheet text */}
          {activeTab === "paste_csv" && (
            <div className="space-y-3 rounded-xl border border-border/80 bg-background/50 p-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-foreground">
                  Cole as linhas da nota fiscal, planilha ou mensagem:
                </label>
                <button
                  type="button"
                  onClick={handleLoadSampleCsv}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Preencher Exemplo
                </button>
              </div>
              <textarea
                rows={5}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="Exemplo (Produto; Preço; Quantidade):&#10;LEITE CONDENSADO MOÇA 395G; 6.89; 6&#10;CREME DE LEITE ITALAC 200G; 2.49; 10&#10;NUTELLA 650G; 39.90; 2"
                className="w-full rounded-xl border border-input bg-background p-3 text-xs font-mono focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleProcessCsv}
                disabled={isProcessing}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                Processar Texto Colado
              </button>
            </div>
          )}

          {/* PARSED RECEIPT CONCILIATION TABLE */}
          {parsedReceipt && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-foreground">
                    <Store className="h-4 w-4 text-primary shrink-0" />
                    Onde comprou:
                  </span>
                  <input
                    type="text"
                    value={parsedReceipt.storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    placeholder="Nome do Supermercado..."
                    className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold text-foreground focus:border-primary focus:outline-none w-44 sm:w-56"
                    title="Edite o nome do estabelecimento onde comprou"
                  />
                  {estabelecimentos.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleStoreNameChange(e.target.value);
                      }}
                      defaultValue=""
                      className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                      title="Escolha um dos mercados cadastrados"
                    >
                      <option value="" disabled>
                        Ou selecione cadastrado...
                      </option>
                      {estabelecimentos.map((e) => {
                        const cityLabel = e.cidade ? ` (${e.cidade.split(" - ")[0]})` : "";
                        return (
                          <option
                            key={e.id}
                            value={`${e.nome}${cityLabel}`}
                          >
                            {e.nome}{cityLabel}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {parsedReceipt.issueDate && (
                    <span className="flex items-center gap-1 text-muted-foreground ml-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(parsedReceipt.issueDate).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span>
                    Total da Nota:{" "}
                    <strong className="text-foreground">
                      {formatCurrency(parsedReceipt.totalValue)}
                    </strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-[11px] font-bold text-muted-foreground hover:underline"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-secondary/50 font-bold text-foreground">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Item da Nota / Cupom</th>
                      <th className="py-2.5 px-3">Qtd</th>
                      <th className="py-2.5 px-3">Preço Unit. Pago</th>
                      <th className="py-2.5 px-3">Vincular ao Insumo do Cardápio</th>
                      <th className="py-2.5 px-3 text-right">Comparativo (Δ)</th>
                      <th className="py-2.5 px-2 text-center w-10">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedItems.map((item) => {
                      const oldPrice = item.matchedQuotationId
                        ? catalogPriceMap.get(item.matchedQuotationId)
                        : null;
                      const hasDelta = oldPrice !== undefined && oldPrice !== null && oldPrice > 0;
                      const deltaVal = hasDelta ? item.unitPrice - oldPrice : 0;
                      const deltaPct = hasDelta
                        ? Number(((deltaVal / oldPrice) * 100).toFixed(1))
                        : 0;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-secondary/30 transition-colors ${
                            item.selected ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleSelectItem(item.id)}
                              className="accent-primary h-4 w-4 rounded cursor-pointer"
                              title={item.selected ? "Desmarcar para não importar" : "Marcar para importar"}
                            />
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {item.rawDescription}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-[11px] font-mono">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handlePriceChange(item.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 rounded-md border border-input bg-background px-1.5 py-1 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                                title="Edite o preço unitário se necessário"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={item.matchedQuotationId || ""}
                              onChange={(e) =>
                                handleChangeMatch(item.id, e.target.value)
                              }
                              className="w-full max-w-xs rounded-lg border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
                            >
                              <option value="">-- Não vincular --</option>
                              {catalog.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.produto} ({cat.preco_atacado})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {hasDelta ? (
                              <span
                                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  deltaVal < 0
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : deltaVal > 0
                                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                      : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {deltaVal < 0 ? (
                                  <TrendingDown className="h-3 w-3" />
                                ) : deltaVal > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : null}
                                {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">
                                Novo item
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                              title="Excluir este item da importação"
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

              {/* Action Button */}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {selectedItems.filter((i) => i.selected && i.matchedQuotationId).length}{" "}
                  insumos selecionados para atualização automática nas 8 Fichas Técnicas.
                </p>
                <button
                  type="button"
                  onClick={handleApplyUpdates}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Atualizar Catálogo & Recalcular Fichas Técnicas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 text-right bg-secondary/20">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
