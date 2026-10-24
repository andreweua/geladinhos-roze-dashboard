import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Sparkles,
  Wifi,
  WifiOff,
  Check,
  X,
  Database,
  RefreshCw,
  Barcode,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { InsumoSearchResult } from "@/types/ingredients";
import {
  buscarInsumosComAutocorrecao,
  normalizarEntradaUsuario,
  formatarRetornoSistema,
} from "@/services/autocorrectService";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/primitives";

interface IngredientSearchInputProps {
  onSelectInsumo: (insumo: InsumoSearchResult) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const IngredientSearchInput: React.FC<IngredientSearchInputProps> = ({
  onSelectInsumo,
  placeholder = "Digite o nome ou marca do insumo (ex: leite mosa, harald...)",
  className = "",
  autoFocus = false,
}) => {
  // REQUISITO 1: O estado de entrada do usuário é tratado estritamente em minúsculas (lowercase)
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<InsumoSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitora conectividade Online / Offline do dispositivo (Android/iOS PWA)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Executa busca com autocorreção com debounce
  const performSearch = useCallback(async (text: string) => {
    // REQUISITO 1: Minúscula
    const normalized = normalizarEntradaUsuario(text);

    if (!normalized || normalized.length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await buscarInsumosComAutocorrecao(normalized);
      setResults(data);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Erro na busca de insumos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manipula digitação no <Input>
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // REQUISITO 1: Converte estritamente para minúsculas
    const rawValue = e.target.value;
    const lowerValue = rawValue.toLowerCase();
    setQuery(lowerValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!lowerValue.trim()) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(lowerValue);
    }, 200);
  };

  // Limpa o campo
  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Seleciona um insumo (REQUISITO 3: Retornado em MAIÚSCULA)
  const handleSelect = (insumo: InsumoSearchResult) => {
    // REQUISITO 3: Atualiza o input ou fecha mantendo o nome em MAIÚSCULA
    setQuery(insumo.nomeFormatado);
    setIsOpen(false);
    onSelectInsumo(insumo);
  };

  // Atalho da sugestão de autocorreção ("Você quis dizer...")
  const topCorrection = results.find((r) => r.foiAutocorrigido && r.sugestaoCorrecao);

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else if (results.length > 0) {
        handleSelect(results[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Campo de Entrada Shadcn UI */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>

        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          className="pl-9 pr-20 text-xs font-mono font-medium lowercase shadow-sm h-10 rounded-2xl border-input bg-card text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />

        {/* Indicadores de Ação e Status no canto direito do input */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />}

          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              title="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Badge de Conectividade / Modo Offline */}
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
            title={
              isOnline
                ? "Modo Online: Busca estendida à RCSistemas com sincronização no IndexedDB"
                : "Modo Offline (PWA): Busca instantânea no banco local PereiraLabs (IndexedDB)"
            }
          >
            {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* DROPDOWN DE AUTO-COMPLETE & FEEDBACK VISUAL DE AUTOCORREÇÃO */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
          {/* BANNER DE AUTOCORREÇÃO (LEVENSTHEIN MATCH) */}
          {topCorrection && (
            <div className="flex items-center justify-between border-b border-primary/20 bg-primary/10 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                <span className="text-foreground text-[11px]">
                  Você quis dizer:{" "}
                  <strong className="font-extrabold text-primary tracking-wide">
                    {topCorrection.sugestaoCorrecao}
                  </strong>
                  ?{" "}
                  <span className="text-muted-foreground text-[10px]">
                    (corrigido de "{topCorrection.termoBuscado}")
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelect(topCorrection)}
                className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground shadow-sm hover:bg-primary/90 transition-all shrink-0 ml-2"
              >
                Aceitar Sugestão
              </button>
            </div>
          )}

          {/* LISTA DE RESULTADOS FORMATADOS ESTREITAMENTE EM MAIÚSCULAS */}
          <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-border/40">
            {results.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p>Nenhum insumo encontrado para "{query}".</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  {isOnline
                    ? "Consultando catálogo aberto e RCSistemas..."
                    : "No modo offline, apenas insumos do catálogo local e itens já cacheados estão disponíveis."}
                </p>
              </div>
            ) : (
              results.map((item, idx) => {
                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex items-center justify-between rounded-xl p-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary/60 text-foreground"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      {/* REQUISITO 3: NOME RETORNADO ESTREITAMENTE EM MAIÚSCULAS */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="font-extrabold text-xs tracking-wide text-foreground group-hover:text-primary transition-colors">
                          {item.nomeFormatado}
                        </strong>

                        {/* REQUISITO 3: MARCA EM MAIÚSCULAS */}
                        {item.marca && (
                          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {item.marca}
                          </span>
                        )}
                      </div>

                      {/* Metadados adicionais do insumo */}
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        {item.quantidadeEmbalagem && item.unidadeMedida && (
                          <span>
                            Embalagem: {item.quantidadeEmbalagem}
                            {item.unidadeMedida}
                          </span>
                        )}
                        {item.gtin && (
                          <span className="font-mono flex items-center gap-0.5">
                            <Barcode className="h-2.5 w-2.5 opacity-70" />
                            {item.gtin}
                          </span>
                        )}
                        {item.precoReferencia && (
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            Ref: {formatCurrency(item.precoReferencia)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge de Origem & Autocorreção */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {item.origem === "local_instantaneo" && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-600 text-[9px] font-bold py-0"
                        >
                          <Database className="h-2.5 w-2.5 mr-0.5" />
                          LOCAL
                        </Badge>
                      )}

                      {item.origem === "autocorrecao_local" && (
                        <Badge
                          variant="warning"
                          className="text-[9px] font-bold py-0 gap-0.5"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          AUTOCORRIGIDO ({Math.round(item.scoreSimilaridade * 100)}%)
                        </Badge>
                      )}

                      {item.origem === "rcsistemas_sincronizado" && (
                        <Badge
                          variant="default"
                          className="bg-blue-500/10 text-blue-600 border border-blue-500/30 text-[9px] font-bold py-0"
                        >
                          RCSISTEMAS (SYNC)
                        </Badge>
                      )}

                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-bold">
                        Selecionar <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé informativo do PWA */}
          <div className="border-t border-border bg-secondary/30 px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>
              💡 Entrada: <code className="lowercase font-mono text-primary">{query || "..."}</code> → Retorno: <strong className="uppercase">MAIÚSCULA</strong>
            </span>
            <span>Navegue com ↑ ↓ e tecle Enter</span>
          </div>
        </div>
      )}
    </div>
  );
};
