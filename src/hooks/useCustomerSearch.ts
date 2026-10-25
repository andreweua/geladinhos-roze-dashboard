import { useState, useMemo, useCallback } from "react";
import {
  ClienteRecorrente,
  buscarCliente,
  searchCustomers,
} from "@/services/customerService";

export interface UseCustomerSearchResult {
  query: string;
  setQuery: (q: string) => void;
  cliente: ClienteRecorrente | null;
  setCliente: (c: ClienteRecorrente | null) => void;
  sugestoes: ClienteRecorrente[];
  buscarPorTelefone: (telefone: string) => ClienteRecorrente | null;
  limparBusca: () => void;
}

/**
 * Hook de Busca de Clientes do PDV com isolamento estrito de Multi-Tenancy.
 * Garante que a empresa atual nunca acesse históricos de compras ou preferências de outras empresas.
 */
export function useCustomerSearch(empresaIdAtual: string): UseCustomerSearchResult {
  const [query, setQuery] = useState("");
  const [cliente, setCliente] = useState<ClienteRecorrente | null>(null);

  // Sugestões de clientes filtradas estritamente pela empresa atual
  const sugestoes = useMemo(() => {
    if (!query.trim() || !empresaIdAtual) return [];
    return searchCustomers(query, empresaIdAtual);
  }, [query, empresaIdAtual]);

  // Busca estrita por telefone
  const buscarPorTelefone = useCallback(
    (telefone: string) => {
      if (!empresaIdAtual) return null;
      const found = buscarCliente(telefone, empresaIdAtual);
      if (found) {
        setCliente(found);
      }
      return found;
    },
    [empresaIdAtual]
  );

  const limparBusca = useCallback(() => {
    setQuery("");
    setCliente(null);
  }, []);

  return {
    query,
    setQuery,
    cliente,
    setCliente,
    sugestoes,
    buscarPorTelefone,
    limparBusca,
  };
}
