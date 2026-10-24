/**
 * Tipos e Modelos para o Sistema de Busca, Autocorreção e Sincronização de Insumos
 * PereiraLabs PWA Offline-First
 */

export interface InsumoConfeitaria {
  id: string;
  nome: string;
  nome_formatado: string; // STRICTLY UPPERCASE
  marca: string;
  gtin?: string;
  quantidade_embalagem?: number;
  unidade_medida: "g" | "kg" | "ml" | "l" | "un";
  categoria: string;
  preco_medio_referencia?: number;
  origem: "pereiralabs_local" | "rcsistemas_cache" | "custom_user";
  atualizado_em: string;
  termo_busca_lowercase: string; // Termo sanitizado em minúsculas para indexação
  tags?: string[];
}

export interface InsumoSearchResult {
  id: string;
  nomeOriginal: string;
  nomeFormatado: string; // STRICTLY UPPERCASE (Ex: "LEITE MOÇA TRADICIONAL 395G")
  marca: string; // STRICTLY UPPERCASE (Ex: "NESTLÉ")
  termoBuscado: string; // STRICTLY LOWERCASE (Ex: "leite mosa")
  sugestaoCorrecao?: string; // STRICTLY UPPERCASE (Ex: "LEITE MOÇA")
  foiAutocorrigido: boolean;
  scoreSimilaridade: number; // 0.0 a 1.0
  distanciaLevenshtein: number;
  origem: "local_instantaneo" | "autocorrecao_local" | "rcsistemas_sincronizado";
  gtin?: string;
  precoReferencia?: number;
  unidadeMedida?: string;
  quantidadeEmbalagem?: number;
}

export interface StorageSyncMeta {
  chave: string;
  versaoCatalogo: number;
  ultimoSync: string;
  totalInsumos: number;
  origemSincronizacao: "seed_offline" | "rcsistemas_online" | "recuperacao_ios";
}
