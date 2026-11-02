import React, { useState } from "react";
import {
  PackagePlus,
  X,
  Barcode,
  Sparkles,
  Check,
  ChefHat,
  Tags,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { LocaleCurrencyInput, LocaleNumberInput } from "@/components/ui/LocaleInputs";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { NewProductPayload } from "@/services/dataService";
import { parseLocaleNumber } from "@/lib/utils";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProduct: (payload: NewProductPayload) => Promise<any>;
  productLabel?: string;
  initialName?: string;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onCreateProduct,
  productLabel = "Produto",
  initialName = "",
}) => {
  const [nome, setNome] = useState(initialName);
  const [precoVenda, setPrecoVenda] = useState("8,50");
  const [custoEstimado, setCustoEstimado] = useState("3,20");
  const [estoqueInicial, setEstoqueInicial] = useState("20");
  const [gtin, setGtin] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [categoria, setCategoria] = useState("Confeitaria & Sobremesas");
  const [rendimento, setRendimento] = useState("10");
  const [goToRecipe, setGoToRecipe] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial name if passed
  React.useEffect(() => {
    if (initialName) {
      setNome(initialName);
    }
  }, [initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErrorMessage("Por favor, informe o nome do produto.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const precoNum = parseLocaleNumber(precoVenda) ?? 8.5;
      const custoNum = parseLocaleNumber(custoEstimado) ?? 3.2;
      const estoqueNum = Math.max(0, parseInt(estoqueInicial, 10) || 0);
      const rendimentoNum = Math.max(1, parseInt(rendimento, 10) || 10);

      await onCreateProduct({
        nome: nome.trim(),
        preco_venda: precoNum,
        custo_estimado: custoNum,
        estoque_inicial: estoqueNum,
        gtin: gtin.trim() || undefined,
        unidade,
        categoria,
        rendimento_unidades: rendimentoNum,
        goToRecipe,
      });

      // Reset form
      setNome("");
      setPrecoVenda("8,50");
      setCustoEstimado("3,20");
      setEstoqueInicial("20");
      setGtin("");
      onClose();
    } catch (err: any) {
      console.error("Erro ao cadastrar produto:", err);
      setErrorMessage(err?.message || "Ocorreu um erro ao salvar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 bg-secondary/30 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Novo {productLabel}</span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Portfólio & PDV
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Cadastre o produto para vender no PDV e compor a Ficha Técnica
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                {errorMessage}
              </div>
            )}

            {/* Nome do Produto */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Nome do {productLabel} *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: Bolo de Cenoura c/ Brigadeiro, Geladinho Ninho c/ Nutella, Pão de Mel..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Preço de Venda & Custo Estimado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Preço de Venda (Balcão/PDV) *
                </label>
                <LocaleCurrencyInput
                  required
                  value={precoVenda}
                  onValueChange={(_num, raw) => setPrecoVenda(raw)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Preço cobrado do cliente no caixa
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Custo Estimado Inicial (R$) *
                </label>
                <LocaleCurrencyInput
                  required
                  value={custoEstimado}
                  onValueChange={(_num, raw) => setCustoEstimado(raw)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Atualizado automaticamente pela Ficha Técnica
                </span>
              </div>
            </div>

            {/* Estoque Inicial & Unidade Comercial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Estoque Inicial Disponível *
                </label>
                <LocaleNumberInput
                  required
                  maxDecimals={0}
                  value={estoqueInicial}
                  onValueChange={(_num, raw) => setEstoqueInicial(raw)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Fica pronto para venda imediata no PDV
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Unidade Comercial *
                </label>
                <select
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="un">un (Unidade)</option>
                  <option value="fatia">fatia (Fatia / Pedaço)</option>
                  <option value="pote">pote (Pote / Copo)</option>
                  <option value="pct">pct (Pacote)</option>
                  <option value="cento">cento (Cento - 100un)</option>
                  <option value="kg">kg (Quilograma)</option>
                  <option value="g">g (Grama)</option>
                  <option value="L">L (Litro)</option>
                </select>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Como o item é vendido no caixa
                </span>
              </div>
            </div>

            {/* Categoria / Grupo do Produto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Categoria / Grupo
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="Confeitaria & Sobremesas">Confeitaria & Sobremesas</option>
                  <option value="Geladinhos Gourmet">Geladinhos Gourmet</option>
                  <option value="Bolos & Tortas">Bolos & Tortas</option>
                  <option value="Doces Finos & Bombons">Doces Finos & Bombons</option>
                  <option value="Bebidas & Cafés">Bebidas & Cafés</option>
                  <option value="Salgados & Lanches">Salgados & Lanches</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Rendimento Padrão da Receita
                </label>
                <LocaleNumberInput
                  maxDecimals={0}
                  value={rendimento}
                  onValueChange={(_num, raw) => setRendimento(raw)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Unidades geradas por batelada na Ficha
                </span>
              </div>
            </div>

            {/* Código de Barras GTIN / EAN-13 (Opcional com Leitor ML Kit) */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Código de Barras GTIN / EAN (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: 7891000100103"
                  value={gtin}
                  onChange={(e) => setGtin(e.target.value)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                  className="gap-1.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Barcode className="h-4 w-4" />
                  <span>ML Kit</span>
                </Button>
              </div>
            </div>

            {/* Opção: Ir direto para a Ficha Técnica */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={goToRecipe}
                  onChange={(e) => setGoToRecipe(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5 text-primary" />
                    <span>Ir direto para a Ficha Técnica após salvar</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Abre a tela de receita com ingredientes, dosagens e custos detalhados para você personalizar o modo de preparo.
                  </p>
                </div>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !nome.trim()}
                className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                {isSubmitting ? (
                  <span>Salvando no Catálogo...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Salvar & Cadastrar {productLabel}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Google ML Kit Barcode Scanner */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(code) => {
          setGtin(code);
          setScannerOpen(false);
        }}
      />
    </>
  );
};
