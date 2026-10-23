import { BRAND_CONFIG } from "@/config/brand.config";

const CUSTOMERS_STORAGE_KEY = `${BRAND_CONFIG.storagePrefix}_customers_crm_v1`;

export interface ClienteRecorrente {
  telefone: string; // Chave primária única (somente dígitos)
  telefoneFormatado: string;
  nome: string;
  totalPedidos: number;
  totalGasto: number;
  ticketMedio: number;
  primeiraCompra: string;
  ultimaCompra: string;
  saboresFavoritos: Array<{ sabor: string; quantidade: number }>;
}

export function formatPhoneBr(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export function getRegisteredCustomers(): ClienteRecorrente[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) return [];
    const list: ClienteRecorrente[] = JSON.parse(raw);
    return list.sort(
      (a, b) => new Date(b.ultimaCompra).getTime() - new Date(a.ultimaCompra).getTime()
    );
  } catch {
    return [];
  }
}

export function searchCustomers(query: string): ClienteRecorrente[] {
  const q = query.trim().toLowerCase();
  if (!q) return getRegisteredCustomers().slice(0, 10);

  const cleanDigits = q.replace(/\D/g, "");
  const all = getRegisteredCustomers();

  return all
    .filter((c) => {
      const matchName = c.nome.toLowerCase().includes(q);
      const matchPhone = cleanDigits.length > 0 && c.telefone.includes(cleanDigits);
      return matchName || matchPhone;
    })
    .slice(0, 8);
}

export function saveOrUpdateCustomer(params: {
  nome?: string;
  telefone?: string;
  valorCompra: number;
  itens?: Array<{ produto_nome: string; quantidade: number }>;
}): ClienteRecorrente | null {
  const cleanPhone = (params.telefone || "").replace(/\D/g, "");
  const rawName = (params.nome || "").trim();

  // Precisa ter pelo menos telefone válido (mínimo 8 dígitos) ou nome
  if (cleanPhone.length < 8 && !rawName) return null;

  // Se não tem telefone, gera um ID baseado no nome
  const customerId = cleanPhone.length >= 8 ? cleanPhone : `nome_${rawName.toLowerCase().replace(/\s+/g, "_")}`;

  const all = getRegisteredCustomers();
  const existingIdx = all.findIndex((c) => c.telefone === customerId);

  const now = new Date().toISOString();
  let updatedCustomer: ClienteRecorrente;

  if (existingIdx >= 0) {
    const existing = all[existingIdx];
    const newTotalPedidos = existing.totalPedidos + 1;
    const newTotalGasto = Number((existing.totalGasto + params.valorCompra).toFixed(2));

    // Atualizar sabores favoritos
    const flavorsMap = new Map<string, number>();
    existing.saboresFavoritos.forEach((f) => flavorsMap.set(f.sabor, f.quantidade));
    (params.itens || []).forEach((i) => {
      flavorsMap.set(i.produto_nome, (flavorsMap.get(i.produto_nome) || 0) + i.quantidade);
    });

    const updatedFlavors = Array.from(flavorsMap.entries())
      .map(([sabor, quantidade]) => ({ sabor, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    updatedCustomer = {
      ...existing,
      nome: rawName || existing.nome,
      totalPedidos: newTotalPedidos,
      totalGasto: newTotalGasto,
      ticketMedio: Number((newTotalGasto / newTotalPedidos).toFixed(2)),
      ultimaCompra: now,
      saboresFavoritos: updatedFlavors,
    };

    all[existingIdx] = updatedCustomer;
  } else {
    const initialFlavors = (params.itens || [])
      .map((i) => ({ sabor: i.produto_nome, quantidade: i.quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    updatedCustomer = {
      telefone: customerId,
      telefoneFormatado: cleanPhone.length >= 8 ? formatPhoneBr(cleanPhone) : rawName,
      nome: rawName || `Cliente ${cleanPhone.slice(-4)}`,
      totalPedidos: 1,
      totalGasto: Number(params.valorCompra.toFixed(2)),
      ticketMedio: Number(params.valorCompra.toFixed(2)),
      primeiraCompra: now,
      ultimaCompra: now,
      saboresFavoritos: initialFlavors,
    };

    all.unshift(updatedCustomer);
  }

  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(all.slice(0, 200)));
  } catch (err) {
    console.warn("Erro ao salvar cliente no CRM local:", err);
  }

  return updatedCustomer;
}
