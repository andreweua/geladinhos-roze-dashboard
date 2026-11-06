import { BRAND_CONFIG } from "@/config/brand.config";
import { getActiveCompanyId } from "@/services/companyService";
import { checkIsSupabaseConfigured, supabase } from "@/lib/supabase";

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

    // Fallback: se não encontrou pela chave padrão, busca pela chave alternativa
    if (!raw) {
      raw = localStorage.getItem(`pereiralabs_pwa_customers_crm_${compId}_v2`);
    }

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

  // Sincroniza em segundo plano com o Supabase na nuvem (se configurado)
  if (checkIsSupabaseConfigured() && supabase) {
    saveCustomerToSupabase(updatedCustomer).catch((err) => {
      console.warn("Falha no upsert em segundo plano para o Supabase:", err);
    });
  }

  return updatedCustomer;
}

/**
 * Envia ou atualiza um cliente individual no Supabase (Upsert).
 */
export async function saveCustomerToSupabase(customer: ClienteRecorrente): Promise<boolean> {
  if (!checkIsSupabaseConfigured() || !supabase) return false;

  try {
    const payload = {
      empresa_id: customer.empresaId,
      telefone: customer.telefone,
      telefone_formatado: customer.telefoneFormatado,
      nome: customer.nome,
      endereco: customer.endereco || null,
      total_pedidos: customer.totalPedidos || 0,
      total_gasto: customer.totalGasto || 0,
      ticket_medio: customer.ticketMedio || 0,
      primeira_compra: customer.primeiraCompra || null,
      ultima_compra: customer.ultimaCompra || null,
      sabores_favoritos: customer.saboresFavoritos || [],
      selos_atuais: customer.selos_atuais || 0,
      ciclos_completos: customer.ciclos_completos || 0,
      total_selos_historico: customer.total_selos_historico || 0,
      recompensas_disponiveis: customer.recompensas_disponiveis || 0,
      atualizado_em: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("clientes_fidelidade")
      .upsert(payload, { onConflict: "empresa_id,telefone" });

    if (error) {
      console.warn("Erro ao salvar cliente no Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exceção ao salvar cliente no Supabase:", err);
    return false;
  }
}

/**
 * Atualiza dados cadastrais de um cliente (Nome, Endereço, etc.) localmente e no Supabase.
 */
export async function updateCustomer(
  telefone: string,
  updates: Partial<ClienteRecorrente>,
  empresaId?: string
): Promise<boolean> {
  const compId = empresaId || getActiveCompanyId();
  const all = getRegisteredCustomers(compId);
  const idx = all.findIndex((c) => c.telefone === telefone);

  if (idx < 0) return false;

  const updated: ClienteRecorrente = {
    ...all[idx],
    ...updates,
    empresaId: compId,
    telefone,
  };

  all[idx] = updated;

  try {
    const key = getCompanyCustomersStorageKey(compId);
    localStorage.setItem(key, JSON.stringify(all));
  } catch (err) {
    console.warn("Erro ao salvar cliente atualizado no localStorage:", err);
  }

  if (checkIsSupabaseConfigured() && supabase) {
    await saveCustomerToSupabase(updated);
  }

  return true;
}

/**
 * Remove o cadastro de um cliente localmente e no Supabase (Conformidade LGPD).
 */
export async function deleteCustomer(telefone: string, empresaId?: string): Promise<boolean> {
  const compId = empresaId || getActiveCompanyId();
  const all = getRegisteredCustomers(compId);
  const filtered = all.filter((c) => c.telefone !== telefone);

  try {
    const key = getCompanyCustomersStorageKey(compId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Erro ao remover cliente do localStorage:", err);
  }

  if (checkIsSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from("clientes_fidelidade")
        .delete()
        .eq("empresa_id", compId)
        .eq("telefone", telefone);
    } catch (err) {
      console.warn("Erro ao remover cliente do Supabase:", err);
    }
  }

  return true;
}

/**
 * Sincronização Bidirecional Completa de Clientes / Passageiros com o Supabase.
 * - Puxa clientes da nuvem e mescla com a base local
 * - Envia clientes cadastrados offline para o Supabase
 */
export async function syncCustomersWithSupabase(companyId?: string): Promise<{
  success: boolean;
  totalSynced: number;
  error?: string;
}> {
  const compId = companyId || getActiveCompanyId();

  if (!checkIsSupabaseConfigured() || !supabase) {
    return {
      success: false,
      totalSynced: 0,
      error: "Supabase não configurado neste dispositivo.",
    };
  }

  try {
    // 1. Busca todos os clientes remotos da empresa no Supabase
    const { data: remoteRows, error: fetchErr } = await supabase
      .from("clientes_fidelidade")
      .select("*")
      .eq("empresa_id", compId);

    if (fetchErr) {
      // Se a tabela ainda não existir no banco, avisa com elegância
      console.warn("Aviso na sincronização de clientes com Supabase:", fetchErr.message);
      return {
        success: false,
        totalSynced: 0,
        error: fetchErr.message,
      };
    }

    // 2. Carrega lista local atual
    const localCustomers = getRegisteredCustomers(compId);
    const localMap = new Map<string, ClienteRecorrente>();
    localCustomers.forEach((c) => localMap.set(c.telefone, c));

    const remoteCustomers: ClienteRecorrente[] = (remoteRows || []).map((row: any) => ({
      empresaId: row.empresa_id,
      telefone: row.telefone,
      telefoneFormatado: row.telefone_formatado || formatPhoneBr(row.telefone),
      nome: row.nome,
      endereco: row.endereco || undefined,
      totalPedidos: Number(row.total_pedidos) || 0,
      totalGasto: Number(row.total_gasto) || 0,
      ticketMedio: Number(row.ticket_medio) || 0,
      primeiraCompra: row.primeira_compra || "",
      ultimaCompra: row.ultima_compra || "",
      saboresFavoritos: Array.isArray(row.sabores_favoritos) ? row.sabores_favoritos : [],
      selos_atuais: Number(row.selos_atuais) || 0,
      ciclos_completos: Number(row.ciclos_completos) || 0,
      total_selos_historico: Number(row.total_selos_historico) || 0,
      recompensas_disponiveis: Number(row.recompensas_disponiveis) || 0,
    }));

    // 3. Mescla: se o cliente existe localmente mas não no remoto, ou se o local tem mais pedidos, envia para a nuvem
    const remoteMap = new Map<string, ClienteRecorrente>();
    remoteCustomers.forEach((c) => remoteMap.set(c.telefone, c));

    // Clientes locais que precisam subir para o Supabase
    const toUpload: ClienteRecorrente[] = [];
    localCustomers.forEach((local) => {
      const remote = remoteMap.get(local.telefone);
      if (!remote) {
        toUpload.push(local);
      } else {
        const localTime = new Date(local.ultimaCompra || 0).getTime();
        const remoteTime = new Date(remote.ultimaCompra || 0).getTime();
        if (localTime > remoteTime || local.totalPedidos > remote.totalPedidos) {
          toUpload.push(local);
        }
      }
    });

    if (toUpload.length > 0) {
      for (const c of toUpload) {
        await saveCustomerToSupabase(c);
      }
    }

    // Clientes remotos que precisam entrar no local
    remoteCustomers.forEach((remote) => {
      const local = localMap.get(remote.telefone);
      if (!local) {
        localMap.set(remote.telefone, remote);
      } else {
        const remoteTime = new Date(remote.ultimaCompra || 0).getTime();
        const localTime = new Date(local.ultimaCompra || 0).getTime();
        if (remoteTime > localTime || remote.totalPedidos > local.totalPedidos) {
          localMap.set(remote.telefone, remote);
        }
      }
    });

    // 4. Salva o resultado mesclado no localStorage
    const mergedList = Array.from(localMap.values()).sort(
      (a, b) => new Date(b.ultimaCompra || 0).getTime() - new Date(a.ultimaCompra || 0).getTime()
    );

    const key = getCompanyCustomersStorageKey(compId);
    localStorage.setItem(key, JSON.stringify(mergedList.slice(0, 300)));

    return {
      success: true,
      totalSynced: mergedList.length,
    };
  } catch (err: any) {
    console.error("Erro na sincronização de clientes:", err);
    return {
      success: false,
      totalSynced: 0,
      error: err?.message || "Erro desconhecido na sincronização.",
    };
  }
}
