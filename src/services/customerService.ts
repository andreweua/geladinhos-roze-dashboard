import { BRAND_CONFIG } from "@/config/brand.config";
import { getActiveCompanyId } from "@/services/companyService";

export interface ClienteRecorrente {
  empresaId: string; // Isolamento estrito multi-tenant obrigatório
  telefone: string; // Chave primária única da empresa (somente dígitos)
  telefoneFormatado: string;
  nome: string;
  endereco?: string; // Endereço de entrega cadastrado
  totalPedidos: number;
  totalGasto: number;
  ticketMedio: number;
  primeiraCompra: string;
  ultimaCompra: string;
  saboresFavoritos: Array<{ sabor: string; quantidade: number }>;
  // Fidelidade - Passaporte da Estrada Real
  selos_atuais: number; // 0 a 10 paradas carimbadas no passaporte atual
  ciclos_completos: number; // Quantidade de vezes que completou 10 paradas
  total_selos_historico: number; // Total acumulado de selos desde a primeira compra
  recompensas_disponiveis: number; // Viagens doces gratuitas disponíveis para resgate
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

export function getCompanyCustomersStorageKey(empresaId?: string): string {
  const compId = empresaId || getActiveCompanyId();
  return `${BRAND_CONFIG.storagePrefix}_customers_crm_${compId}_v2`;
}

/**
 * Retorna todos os clientes registrados com escopo restrito à empresa especificada.
 */
export function getRegisteredCustomers(empresaId?: string): ClienteRecorrente[] {
  const compId = empresaId || getActiveCompanyId();
  try {
    const key = getCompanyCustomersStorageKey(compId);
    let raw = localStorage.getItem(key);

    // Migração de dados legados exclusiva para a Matriz Roze Gourmet
    if (!raw && compId === "emp-roze-gourmet") {
      const legacyRaw = localStorage.getItem(`${BRAND_CONFIG.storagePrefix}_customers_crm_v1`);
      if (legacyRaw) {
        try {
          const legacyList = JSON.parse(legacyRaw);
          if (Array.isArray(legacyList)) {
            const migrated: ClienteRecorrente[] = legacyList.map((c: any) => ({
              ...c,
              empresaId: "emp-roze-gourmet",
            }));
            localStorage.setItem(key, JSON.stringify(migrated));
            return migrated;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!raw) return [];
    const list: ClienteRecorrente[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Isolamento Estrito: Garante que nenhum dado de outro tenant retorne
    return list
      .filter((c) => c.empresaId === compId)
      .map((c) => ({
        ...c,
        selos_atuais: Number(c.selos_atuais) || 0,
        ciclos_completos: Number(c.ciclos_completos) || 0,
        total_selos_historico: Number(c.total_selos_historico) || 0,
        recompensas_disponiveis: Number(c.recompensas_disponiveis) || 0,
      }))
      .sort(
        (a, b) => new Date(b.ultimaCompra || 0).getTime() - new Date(a.ultimaCompra || 0).getTime()
      );
  } catch (err) {
    console.warn(`Erro ao carregar clientes do CRM da empresa ${compId}:`, err);
    return [];
  }
}

/**
 * Busca de contingência em outros tenants ou base global para reaproveitamento cadastral (Nome/Telefone),
 * mas NUNCA exporta compras, totais ou preferências entre empresas.
 */
function findCustomerGloballyAcrossAllCompanies(
  phoneOrNameQuery: string
): { nome: string; telefone: string } | null {
  try {
    const cleanDigits = phoneOrNameQuery.replace(/\D/g, "");
    const cleanQuery = phoneOrNameQuery.trim().toLowerCase();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("_customers_crm_") || key.includes("customers_crm_v1"))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              for (const c of list) {
                const cDigits = (c.telefone || "").replace(/\D/g, "");
                const matchPhone = cleanDigits.length >= 8 && cDigits.includes(cleanDigits);
                const matchName = cleanQuery.length >= 3 && (c.nome || "").toLowerCase() === cleanQuery;

                if (matchPhone || matchName) {
                  return {
                    nome: c.nome || "",
                    telefone: c.telefone || cleanDigits,
                  };
                }
              }
            }
          } catch {
            // ignore JSON parse error
          }
        }
      }
    }
  } catch (err) {
    console.warn("Erro ao buscar cliente globalmente:", err);
  }
  return null;
}

/**
 * Busca estrita de cliente por telefone para a empresa atual.
 * REQUISITO MANDATÓRIO:
 * Recebe obrigatoriamente (telefone, empresaIdAtual).
 * Se o cliente existir em outra empresa, o PDV trata como NOVO CLIENTE (histórico zerado).
 */
export function buscarCliente(telefone: string, empresaIdAtual: string): ClienteRecorrente | null {
  if (!empresaIdAtual) {
    throw new Error("Parâmetro obrigatório empresaIdAtual ausente para buscarCliente.");
  }

  const cleanPhone = telefone.replace(/\D/g, "");
  if (!cleanPhone && telefone.trim().length < 3) return null;

  // 1. Busca estrita dentro da empresa atual
  const localList = getRegisteredCustomers(empresaIdAtual);
  const foundLocal = localList.find((c) => {
    const pDigits = c.telefone.replace(/\D/g, "");
    return cleanPhone.length >= 8 ? pDigits === cleanPhone : c.telefone === telefone.trim();
  });

  if (foundLocal) {
    return {
      ...foundLocal,
      selos_atuais: Number(foundLocal.selos_atuais) || 0,
      ciclos_completos: Number(foundLocal.ciclos_completos) || 0,
      total_selos_historico: Number(foundLocal.total_selos_historico) || 0,
      recompensas_disponiveis: Number(foundLocal.recompensas_disponiveis) || 0,
    };
  }

  // 2. Não existe na empresa ativa: busca no portfólio global
  const globalMatch = findCustomerGloballyAcrossAllCompanies(cleanPhone || telefone.trim());
  if (globalMatch) {
    // Retorna novo cliente para este tenant com histórico completamente zerado
    const phoneToUse = cleanPhone || globalMatch.telefone.replace(/\D/g, "");
    return {
      empresaId: empresaIdAtual,
      telefone: phoneToUse,
      telefoneFormatado: formatPhoneBr(phoneToUse),
      nome: globalMatch.nome, // Preenche apenas o nome para agilizar
      totalPedidos: 0, // ZERADO: Não vê histórico de outra empresa
      totalGasto: 0, // ZERADO
      ticketMedio: 0, // ZERADO
      primeiraCompra: "", // ZERADO
      ultimaCompra: "", // ZERADO
      saboresFavoritos: [], // ZERADO
      selos_atuais: 0,
      ciclos_completos: 0,
      total_selos_historico: 0,
      recompensas_disponiveis: 0,
    };
  }

  return null;
}

/**
 * Pesquisa para autocomplete no PDV com isolamento estrito por empresa.
 */
export function searchCustomers(query: string, empresaIdAtual?: string): ClienteRecorrente[] {
  const compId = empresaIdAtual || getActiveCompanyId();
  const q = query.trim().toLowerCase();
  const cleanDigits = q.replace(/\D/g, "");

  const companyCustomers = getRegisteredCustomers(compId);
  if (!q) {
    return companyCustomers.slice(0, 8);
  }

  const directMatches = companyCustomers.filter((c) => {
    const matchName = c.nome.toLowerCase().includes(q);
    const matchPhone = cleanDigits.length >= 3 && c.telefone.replace(/\D/g, "").includes(cleanDigits);
    return matchName || matchPhone;
  });

  if (directMatches.length > 0) {
    return directMatches.slice(0, 8);
  }

  // Se não encontrar nesta empresa, sugere como novo cliente zerado se houver match global
  if (cleanDigits.length >= 8 || q.length >= 3) {
    const globalMatch = findCustomerGloballyAcrossAllCompanies(cleanDigits || q);
    if (globalMatch) {
      const phoneToUse = cleanDigits || globalMatch.telefone.replace(/\D/g, "");
      return [
        {
          empresaId: compId,
          telefone: phoneToUse,
          telefoneFormatado: formatPhoneBr(phoneToUse),
          nome: globalMatch.nome,
          totalPedidos: 0,
          totalGasto: 0,
          ticketMedio: 0,
          primeiraCompra: "",
          ultimaCompra: "",
          saboresFavoritos: [],
          selos_atuais: 0,
          ciclos_completos: 0,
          total_selos_historico: 0,
          recompensas_disponiveis: 0,
        },
      ];
    }
  }

  return [];
}

/**
 * Retorna a grade visual textual do Passaporte da Estrada Real com 10 posições:
 * Ex: [X] [X] [X] [ ] [ ] [ ] [ ] [ ] [ ] [ ] (3/10 paradas)
 */
export function getPassaporteGrid(selos: number, completouViagemGratis: boolean = false): string {
  const displaySelos = completouViagemGratis && selos === 0 ? 10 : Math.max(0, Math.min(10, selos));
  const grid = Array.from({ length: 10 }, (_, i) => (i < displaySelos ? "[X]" : "[ ]")).join(" ");
  return `${grid} (${displaySelos}/10 paradas)`;
}

/**
 * Calcula o resumo do programa de fidelidade "Passaporte da Estrada Real"
 * Cada geladinho comprado = 1 selo/parada na Estrada Real.
 * Ciclo de 1 a 10 paradas. A cada 10 paradas ganha 1 viagem grátis (1 geladinho gratuito).
 */
export function getCustomerLoyaltySummary(
  cliente: ClienteRecorrente | null,
  adicionandoGeladinhos: number = 0
) {
  const currentStamps = cliente?.selos_atuais || 0;
  const currentRewards = cliente?.recompensas_disponiveis || 0;
  const totalWithNew = currentStamps + adicionandoGeladinhos;
  const newRewards = Math.floor(totalWithNew / 10);
  const remainingStamps = totalWithNew % 10;
  const totalRewards = currentRewards + newRewards;
  const willCompleteCycle = totalWithNew >= 10;
  const displayStamps = willCompleteCycle && remainingStamps === 0 ? 10 : remainingStamps;

  return {
    currentStamps,
    currentRewards,
    totalWithNew,
    newRewards,
    remainingStamps,
    totalRewards,
    willCompleteCycle,
    displayStamps,
    hasFreeTrip: totalRewards > 0 || willCompleteCycle,
    gridText: getPassaporteGrid(displayStamps, willCompleteCycle),
  };
}

/**
 * Salva ou atualiza os dados do cliente no CRM local da empresa ativa
 * com persistência do Passaporte da Estrada Real (Fidelização de Selos).
 */
export function saveOrUpdateCustomer(params: {
  empresaId: string;
  nome?: string;
  telefone?: string;
  endereco?: string;
  valorCompra: number;
  itens?: Array<{ produto_nome: string; quantidade: number }>;
  resgatarViagemGratis?: boolean;
}): ClienteRecorrente | null {
  const { empresaId } = params;
  if (!empresaId) {
    console.error("Tentativa de salvar cliente sem empresaId! Operação cancelada por segurança.");
    return null;
  }

  const cleanPhone = (params.telefone || "").replace(/\D/g, "");
  const rawName = (params.nome || "").trim();

  // Precisa ter pelo menos telefone válido (mínimo 8 dígitos) ou nome
  if (cleanPhone.length < 8 && !rawName) return null;

  // Se não tem telefone, gera um ID baseado no nome
  const customerId = cleanPhone.length >= 8 ? cleanPhone : `nome_${rawName.toLowerCase().replace(/\s+/g, "_")}`;

  const all = getRegisteredCustomers(empresaId);
  const existingIdx = all.findIndex((c) => c.telefone === customerId && c.empresaId === empresaId);

  const now = new Date().toISOString();
  let updatedCustomer: ClienteRecorrente;

  // Quantidade de geladinhos comprados nesta venda (1 geladinho = 1 selo/parada)
  const totalGeladinhosComprados = (params.itens || []).reduce(
    (acc, i) => acc + (Number(i.quantidade) || 0),
    0
  );

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

    // Cálculo dos Selos do Passaporte da Estrada Real
    const prevSelos = Number(existing.selos_atuais) || 0;
    const prevCiclos = Number(existing.ciclos_completos) || 0;
    let prevRecompensas = Number(existing.recompensas_disponiveis) || 0;
    const prevTotalHistorico = Number(existing.total_selos_historico) || 0;

    // Se o cliente resgatou uma viagem doce grátis nesta venda
    if (params.resgatarViagemGratis && prevRecompensas > 0) {
      prevRecompensas -= 1;
    }

    const totalAcumulado = prevSelos + totalGeladinhosComprados;
    const novosCiclosGanhos = Math.floor(totalAcumulado / 10);
    const novosSelosAtuais = totalAcumulado % 10;
    const novasRecompensas = prevRecompensas + novosCiclosGanhos;
    const novosCiclosCompletos = prevCiclos + novosCiclosGanhos;
    const novoTotalHistorico = prevTotalHistorico + totalGeladinhosComprados;

    updatedCustomer = {
      ...existing,
      empresaId,
      nome: rawName || existing.nome,
      endereco: params.endereco?.trim() || existing.endereco,
      totalPedidos: newTotalPedidos,
      totalGasto: newTotalGasto,
      ticketMedio: Number((newTotalGasto / newTotalPedidos).toFixed(2)),
      ultimaCompra: now,
      saboresFavoritos: updatedFlavors,
      selos_atuais: novosSelosAtuais,
      ciclos_completos: novosCiclosCompletos,
      total_selos_historico: novoTotalHistorico,
      recompensas_disponiveis: novasRecompensas,
    };

    all[existingIdx] = updatedCustomer;
  } else {
    const initialFlavors = (params.itens || [])
      .map((i) => ({ sabor: i.produto_nome, quantidade: i.quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    const totalAcumulado = totalGeladinhosComprados;
    const novosCiclosGanhos = Math.floor(totalAcumulado / 10);
    const novosSelosAtuais = totalAcumulado % 10;
    const novasRecompensas = novosCiclosGanhos;
    const novosCiclosCompletos = novosCiclosGanhos;
    const novoTotalHistorico = totalGeladinhosComprados;

    updatedCustomer = {
      empresaId,
      telefone: customerId,
      telefoneFormatado: cleanPhone.length >= 8 ? formatPhoneBr(cleanPhone) : rawName,
      nome: rawName || `Cliente ${cleanPhone.slice(-4)}`,
      endereco: params.endereco?.trim() || undefined,
      totalPedidos: 1,
      totalGasto: Number(params.valorCompra.toFixed(2)),
      ticketMedio: Number(params.valorCompra.toFixed(2)),
      primeiraCompra: now,
      ultimaCompra: now,
      saboresFavoritos: initialFlavors,
      selos_atuais: novosSelosAtuais,
      ciclos_completos: novosCiclosCompletos,
      total_selos_historico: novoTotalHistorico,
      recompensas_disponiveis: novasRecompensas,
    };

    all.unshift(updatedCustomer);
  }

  try {
    const key = getCompanyCustomersStorageKey(empresaId);
    localStorage.setItem(key, JSON.stringify(all.slice(0, 300)));
  } catch (err) {
    console.warn(`Erro ao salvar cliente no CRM da empresa ${empresaId}:`, err);
  }

  return updatedCustomer;
}
