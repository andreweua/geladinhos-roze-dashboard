/**
 * Storage Helper Offline-First (IndexedDB + Fallback)
 * Armazenamento Híbrido e Sincronização de Insumos da Confeitaria PereiraLabs
 * Compatível com Android, iOS e Desktop PWAs.
 */

import { InsumoConfeitaria, StorageSyncMeta } from "@/types/ingredients";

const DB_NAME = "pereiralabs_insumos_pwa_v1";
const DB_VERSION = 1;
const STORE_INSUMOS = "insumos_confeitaria";
const STORE_META = "sync_metadata";
const LOCAL_STORAGE_FALLBACK_KEY = "pereiralabs_insumos_fallback_v1";

/**
 * Catálogo offline pré-carregado PereiraLabs
 * Garante reconhecimento instantâneo mesmo sem internet (offline absoluto)
 */
export const SEED_CATALOG_INSUMOS: Omit<InsumoConfeitaria, "termo_busca_lowercase" | "nome_formatado">[] = [
  // Leites Condensados
  {
    id: "ins-moca-395g",
    nome: "Leite Condensado Moça Tradicional 395g",
    marca: "Nestlé",
    gtin: "7891000100103",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios / Confeitaria",
    preco_medio_referencia: 7.49,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["leite condensado", "moca", "nestle", "lata"],
  },
  {
    id: "ins-piracanjuba-cond-395g",
    nome: "Leite Condensado Semidesnatado TP 395g",
    marca: "Piracanjuba",
    gtin: "7898215150018",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios",
    preco_medio_referencia: 5.69,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["leite condensado", "piracanjuba", "tp"],
  },
  {
    id: "ins-itambe-cond-395g",
    nome: "Leite Condensado Semidesnatado TP 395g",
    marca: "Itambé",
    gtin: "7896051110026",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios",
    preco_medio_referencia: 5.59,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["leite condensado", "itambe"],
  },
  {
    id: "ins-italac-cond-395g",
    nome: "Leite Condensado Semidesnatado TP 395g",
    marca: "Italac",
    gtin: "7898080640010",
    quantidade_embalagem: 395,
    unidade_medida: "g",
    categoria: "Laticínios",
    preco_medio_referencia: 5.29,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["leite condensado", "italac"],
  },

  // Cremes de Leite
  {
    id: "ins-nestle-creme-200g",
    nome: "Creme de Leite Leve TP 200g",
    marca: "Nestlé",
    gtin: "7891000248706",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Laticínios",
    preco_medio_referencia: 3.99,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["creme de leite", "nestle"],
  },
  {
    id: "ins-piracanjuba-creme-200g",
    nome: "Creme de Leite TP 200g",
    marca: "Piracanjuba",
    gtin: "7898215151015",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Laticínios",
    preco_medio_referencia: 3.39,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["creme de leite", "piracanjuba"],
  },
  {
    id: "ins-itambe-creme-200g",
    nome: "Creme de Leite Tradicional TP 200g",
    marca: "Itambé",
    gtin: "7896051111016",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Laticínios",
    preco_medio_referencia: 3.49,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["creme de leite", "itambe"],
  },

  // Chocolates e Coberturas Gourmet
  {
    id: "ins-harald-melken-barra-1kg",
    nome: "Chocolate em Barra Melken Nobre Meio Amargo 1.01kg",
    marca: "Harald",
    gtin: "7897077810332",
    quantidade_embalagem: 1010,
    unidade_medida: "g",
    categoria: "Chocolates Nobres",
    preco_medio_referencia: 42.9,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["chocolate", "harald", "melken", "nobre", "meio amargo"],
  },
  {
    id: "ins-harald-melken-ao-leite-1kg",
    nome: "Chocolate em Barra Melken Nobre ao Leite 1.01kg",
    marca: "Harald",
    gtin: "7897077810318",
    quantidade_embalagem: 1010,
    unidade_medida: "g",
    categoria: "Chocolates Nobres",
    preco_medio_referencia: 42.9,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["chocolate", "harald", "melken", "ao leite"],
  },
  {
    id: "ins-harald-top-fracionado-1kg",
    nome: "Cobertura Fracionada Top Meio Amargo em Gotas 1.01kg",
    marca: "Harald",
    gtin: "7897077820102",
    quantidade_embalagem: 1010,
    unidade_medida: "g",
    categoria: "Coberturas",
    preco_medio_referencia: 31.9,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["cobertura", "harald", "top", "fracionada"],
  },
  {
    id: "ins-nutella-ferrero-650g",
    nome: "Creme de Avelã com Cacau Nutella Pote 650g",
    marca: "Ferrero",
    gtin: "7898024394184",
    quantidade_embalagem: 650,
    unidade_medida: "g",
    categoria: "Recheios & Cremes",
    preco_medio_referencia: 38.5,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["nutella", "ferrero", "avela"],
  },

  // Confeitaria & Insumos Estruturais
  {
    id: "ins-liga-neutra-selecta-100g",
    nome: "Liga Neutra Estabilizante para Gelados e Doces 100g",
    marca: "Selecta",
    gtin: "7896411500010",
    quantidade_embalagem: 100,
    unidade_medida: "g",
    categoria: "Insumos Técnicos",
    preco_medio_referencia: 4.8,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["liga neutra", "selecta", "estabilizante"],
  },
  {
    id: "ins-emulsificante-selecta-200g",
    nome: "Emulsificante e Emulsor para Sorvetes e Bolos 200g",
    marca: "Selecta",
    gtin: "7896411500058",
    quantidade_embalagem: 200,
    unidade_medida: "g",
    categoria: "Insumos Técnicos",
    preco_medio_referencia: 6.9,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["emulsificante", "emustab", "selecta"],
  },
  {
    id: "ins-cacau-100-sicao-500g",
    nome: "Cacau em Pó 100% Puro Solúvel Alcalino 500g",
    marca: "Sicao / Barry Callebaut",
    gtin: "7898950275018",
    quantidade_embalagem: 500,
    unidade_medida: "g",
    categoria: "Chocolates & Cacau",
    preco_medio_referencia: 29.9,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["cacau em po", "sicao", "barry callebaut", "100%"],
  },
  {
    id: "ins-leite-po-ninho-380g",
    nome: "Leite em Pó Integral Ninho Forti+ Lata 380g",
    marca: "Nestlé",
    gtin: "7891000053508",
    quantidade_embalagem: 380,
    unidade_medida: "g",
    categoria: "Laticínios",
    preco_medio_referencia: 18.9,
    origem: "pereiralabs_local",
    atualizado_em: "2026-10-24T00:00:00.000Z",
    tags: ["leite em po", "ninho", "nestle"],
  },
];

/**
 * Função utilitária para sanitizar termos em minúsculas sem acentos
 */
export function sanitizarTermoParaIndexacao(texto: string): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formata um insumo bruto gerando as propriedades normatizadas:
 * - termo_busca_lowercase: string em minúsculas sem acentos
 * - nome_formatado: STRICTLY UPPERCASE
 */
export function formatarInsumoCompletamente(
  raw: Omit<InsumoConfeitaria, "termo_busca_lowercase" | "nome_formatado">
): InsumoConfeitaria {
  const nomeLimpo = raw.nome.trim();
  const indexKey = sanitizarTermoParaIndexacao(`${nomeLimpo} ${raw.marca} ${(raw.tags || []).join(" ")}`);
  return {
    ...raw,
    nome: nomeLimpo,
    nome_formatado: nomeLimpo.toUpperCase(), // STRICTLY UPPERCASE
    termo_busca_lowercase: indexKey, // STRICTLY LOWERCASE INDEX
  };
}

/**
 * Abre ou cria o banco de dados IndexedDB
 */
export function openIngredientDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB não disponível no ambiente atual."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store principal de Insumos
      if (!db.objectStoreNames.contains(STORE_INSUMOS)) {
        const store = db.createObjectStore(STORE_INSUMOS, { keyPath: "id" });
        store.createIndex("termo_busca_lowercase", "termo_busca_lowercase", { unique: false });
        store.createIndex("gtin", "gtin", { unique: false });
        store.createIndex("marca", "marca", { unique: false });
        store.createIndex("categoria", "categoria", { unique: false });
      }

      // Store de Metadados de Sincronização
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "chave" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Salva ou atualiza um insumo no IndexedDB (ou fallback para localStorage)
 */
export async function saveInsumoLocal(insumo: InsumoConfeitaria): Promise<void> {
  const norm = insumo.nome_formatado ? insumo : formatarInsumoCompletamente(insumo);

  try {
    const db = await openIngredientDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_INSUMOS, "readwrite");
      const store = tx.objectStore(STORE_INSUMOS);
      const req = store.put(norm);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB indisponível, usando fallback de localStorage:", err);
    saveInsumoLocalStorageFallback(norm);
  }
}

/**
 * Salva uma coleção de insumos em lote no IndexedDB
 */
export async function saveInsumosBatch(insumos: InsumoConfeitaria[]): Promise<void> {
  if (!insumos || insumos.length === 0) return;

  try {
    const db = await openIngredientDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_INSUMOS, "readwrite");
      const store = tx.objectStore(STORE_INSUMOS);

      insumos.forEach((item) => {
        const formatted = item.nome_formatado ? item : formatarInsumoCompletamente(item);
        store.put(formatted);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Erro ao salvar lote no IndexedDB, usando fallback:", err);
    insumos.forEach(saveInsumoLocalStorageFallback);
  }
}

/**
 * Lê todos os insumos armazenados localmente
 */
export async function getAllInsumosLocais(): Promise<InsumoConfeitaria[]> {
  try {
    const db = await openIngredientDB();
    return await new Promise<InsumoConfeitaria[]>((resolve, reject) => {
      const tx = db.transaction(STORE_INSUMOS, "readonly");
      const store = tx.objectStore(STORE_INSUMOS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB falhou na leitura, usando fallback:", err);
    return getInsumosLocalStorageFallback();
  }
}

/**
 * Conta a quantidade de insumos locais
 */
export async function getInsumosCount(): Promise<number> {
  try {
    const db = await openIngredientDB();
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_INSUMOS, "readonly");
      const store = tx.objectStore(STORE_INSUMOS);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return getInsumosLocalStorageFallback().length;
  }
}

/**
 * ESTRATÉGIA DE SINCRONIZAÇÃO & RECUPERAÇÃO CONTRA EVIÇÃO DO iOS
 *
 * No iOS Safari (PWA), após 7 dias de inatividade ou sob pressão de armazenamento,
 * o WebKit limpa o IndexedDB.
 * Esta função verifica se o cache local foi zerado e, caso positivo, reidrata
 * instantaneamente o catálogo PereiraLabs e agenda/executa sync com a RCSistemas.
 */
export async function checkAndRehydrateCatalog(): Promise<InsumoConfeitaria[]> {
  try {
    const count = await getInsumosCount();

    if (count === 0) {
      console.info("Cache local vazio ou evitado pelo SO (iOS). Reidratando catálogo oficial PereiraLabs...");
      const seeded = SEED_CATALOG_INSUMOS.map((raw) => formatarInsumoCompletamente(raw));
      await saveInsumosBatch(seeded);

      // Salva metadados da reidratação
      await setSyncMetadata({
        chave: "catalogo_status",
        versaoCatalogo: 2,
        ultimoSync: new Date().toISOString(),
        totalInsumos: seeded.length,
        origemSincronizacao: "recuperacao_ios",
      });

      return seeded;
    }

    return await getAllInsumosLocais();
  } catch (err) {
    console.warn("Erro ao verificar/reidratar catálogo:", err);
    return SEED_CATALOG_INSUMOS.map((raw) => formatarInsumoCompletamente(raw));
  }
}

/**
 * Salva metadados de sincronização no IndexedDB
 */
export async function setSyncMetadata(meta: StorageSyncMeta): Promise<void> {
  try {
    const db = await openIngredientDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_META, "readwrite");
      const store = tx.objectStore(STORE_META);
      const req = store.put(meta);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.setItem("pereiralabs_sync_meta", JSON.stringify(meta));
    } catch {
      // ignore
    }
  }
}

/**
 * Fallback seguro usando localStorage para navegadores que bloqueiam IndexedDB
 */
function saveInsumoLocalStorageFallback(insumo: InsumoConfeitaria): void {
  try {
    const current = getInsumosLocalStorageFallback();
    const idx = current.findIndex((i) => i.id === insumo.id);
    if (idx >= 0) {
      current[idx] = insumo;
    } else {
      current.push(insumo);
    }
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

function getInsumosLocalStorageFallback(): InsumoConfeitaria[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return SEED_CATALOG_INSUMOS.map((raw) => formatarInsumoCompletamente(raw));
}
