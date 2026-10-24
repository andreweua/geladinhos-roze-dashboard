/**
 * Sistema de Busca, Autocorreção e Sincronização de Insumos de Confeitaria
 * Implementa Algoritmo de Levenshtein, Normalização Minúscula -> Maiúscula e Cache Híbrido
 * PereiraLabs PWA (Offline-First)
 */

import { InsumoConfeitaria, InsumoSearchResult } from "@/types/ingredients";
import {
  checkAndRehydrateCatalog,
  getAllInsumosLocais,
  saveInsumoLocal,
  sanitizarTermoParaIndexacao,
  formatarInsumoCompletamente,
} from "./ingredientStorage";
import { consultarProdutoPorGtin } from "./gtinService";

/**
 * REQUISITO 1: Entrada do Usuário (Minúscula)
 * Trata o texto digitado pelo usuário convertendo estritamente para minúsculas
 * e limpando espaços excessivos.
 */
export function normalizarEntradaUsuario(input: string): string {
  if (!input) return "";
  return input.toLowerCase().trim();
}

/**
 * Remove diacríticos e acentos para cálculo de distância
 * Ex: "moça" -> "moca", "nestlé" -> "nestle"
 */
export function removerAcentos(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * REQUISITO 2: Algoritmo de Distância de Levenshtein
 * Calcula o número mínimo de operações de inserção, remoção ou substituição
 * para transformar a string A na string B.
 */
export function calcularDistanciaLevenshtein(a: string, b: string): number {
  const s1 = removerAcentos(a);
  const s2 = removerAcentos(b);

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // remoção
        matrix[i][j - 1] + 1, // inserção
        matrix[i - 1][j - 1] + cost // substituição
      );
    }
  }

  return matrix[s1.length][s2.length];
}

/**
 * Calcula o Score de Similaridade Normalizado entre 0.0 (nada parecido) e 1.0 (idêntico)
 */
export function calcularScoreSimilaridade(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = calcularDistanciaLevenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * REQUISITO 3: Formatação do Retorno do Sistema (Maiúscula)
 * Garante que qualquer insumo retornado e exibido seja estritamente em LETRAS MAIÚSCULAS
 */
export function formatarRetornoSistema(texto: string): string {
  if (!texto) return "";
  return texto.toUpperCase().trim();
}

/**
 * Avalia se um termo de busca bate com um insumo específico, seja por
 * prefixo exato, inclusão de substring ou autocorreção por Levenshtein de tokens.
 */
function avaliarCorrespondenciaInsumo(
  termoInputMin: string,
  insumo: InsumoConfeitaria
): {
  match: boolean;
  score: number;
  foiAutocorrigido: boolean;
  distancia: number;
} {
  const termoNorm = removerAcentos(termoInputMin);
  const nomeNorm = removerAcentos(insumo.nome);
  const marcaNorm = removerAcentos(insumo.marca);
  const fullIndex = `${nomeNorm} ${marcaNorm} ${(insumo.tags || []).map(removerAcentos).join(" ")}`;

  // 1. Correspondência Exata ou Substring Direta (Instantâneo Local)
  if (fullIndex.includes(termoNorm)) {
    return {
      match: true,
      score: 1.0,
      foiAutocorrigido: false,
      distancia: 0,
    };
  }

  // 2. Correspondência por Tokens / Palavras com Tolerância a Erros de Digitação
  // Ex: "leite mosa" -> tokens: ["leite", "mosa"]
  const tokensInput = termoNorm.split(/\s+/).filter(Boolean);
  const tokensTarget = fullIndex.split(/\s+/).filter(Boolean);

  let totalDistancia = 0;
  let tokensCorrespondidos = 0;
  let teveCorrecao = false;

  for (const tokenIn of tokensInput) {
    let melhorDistToken = 999;

    for (const tokenTar of tokensTarget) {
      // Se for prefixo do alvo (ex: "cond" prefixo de "condensado")
      if (tokenTar.startsWith(tokenIn) && tokenIn.length >= 3) {
        melhorDistToken = 0;
        break;
      }

      const dist = calcularDistanciaLevenshtein(tokenIn, tokenTar);
      if (dist < melhorDistToken) {
        melhorDistToken = dist;
      }
    }

    // Tolerância: para palavras curtas (<=4 letras), tolera 1 erro. Para palavras maiores, tolera 2 erros.
    const maxErroTolerado = tokenIn.length <= 4 ? 1 : 2;

    if (melhorDistToken <= maxErroTolerado) {
      tokensCorrespondidos++;
      totalDistancia += melhorDistToken;
      if (melhorDistToken > 0) {
        teveCorrecao = true;
      }
    }
  }

  // Se todos os tokens digitados pelo usuário bateram (ou quase bateram)
  if (tokensCorrespondidos === tokensInput.length && tokensInput.length > 0) {
    const score = Math.max(0.6, 1 - totalDistancia / (termoNorm.length || 1));
    return {
      match: true,
      score,
      foiAutocorrigido: teveCorrecao,
      distancia: totalDistancia,
    };
  }

  // 3. Fallback: Levenshtein Global se a string inteira for curta e similar
  const distGlobal = calcularDistanciaLevenshtein(termoNorm, nomeNorm);
  const scoreGlobal = calcularScoreSimilaridade(termoNorm, nomeNorm);

  if (scoreGlobal >= 0.70 || distGlobal <= 3) {
    return {
      match: true,
      score: scoreGlobal,
      foiAutocorrigido: true,
      distancia: distGlobal,
    };
  }

  return { match: false, score: 0, foiAutocorrigido: false, distancia: 999 };
}

/**
 * Consulta de Fallback à API Externa (RCSistemas / Catálogo Aberto)
 * Se encontrar insumo novo, formata e salva automaticamente no IndexedDB
 * da PereiraLabs para as próximas buscas serem offline!
 */
async function buscarNaRcsistemasOuExterna(
  termoMin: string
): Promise<InsumoConfeitaria[]> {
  const isBarcode = /^\d{7,14}$/.test(termoMin.replace(/\D/g, ""));

  try {
    if (isBarcode) {
      const gtin = termoMin.replace(/\D/g, "");
      const resGtin = await consultarProdutoPorGtin(gtin);

      if (resGtin && resGtin.nome && !resGtin.nome.startsWith("Produto GTIN")) {
        const novoInsumo: InsumoConfeitaria = formatarInsumoCompletamente({
          id: `rcs-${gtin}`,
          nome: resGtin.nome,
          marca: resGtin.marca || "Marca Diversa",
          gtin,
          quantidade_embalagem: resGtin.quantidade_embalagem,
          unidade_medida: resGtin.unidade_medida,
          categoria: resGtin.categoria || "Confeitaria & Alimentos",
          origem: "rcsistemas_cache",
          atualizado_em: new Date().toISOString(),
          tags: [resGtin.nome.toLowerCase(), (resGtin.marca || "").toLowerCase()],
        });

        // CACHEIA NO BANCO LOCAL DA PEREIRALABS (INDEXEDDB)
        await saveInsumoLocal(novoInsumo);
        console.info(`[PereiraLabs Sync] Insumo "${novoInsumo.nome_formatado}" salvo no IndexedDB local com sucesso!`);
        return [novoInsumo];
      }
    }

    // Busca textual aberta na Open Food Facts Brasil / RCSistemas
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      termoMin
    )}&search_simple=1&action=process&json=1&page_size=5`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      if (data && data.products && Array.isArray(data.products)) {
        const novosInsumos: InsumoConfeitaria[] = [];

        for (const p of data.products.slice(0, 3)) {
          const nomePt = p.product_name_pt || p.product_name;
          if (!nomePt) continue;

          const novo: InsumoConfeitaria = formatarInsumoCompletamente({
            id: `rcs-off-${p.code || Date.now()}`,
            nome: nomePt,
            marca: p.brands || "Marca Diversa",
            gtin: p.code,
            quantidade_embalagem: 1,
            unidade_medida: "un",
            categoria: p.categories || "Confeitaria",
            origem: "rcsistemas_cache",
            atualizado_em: new Date().toISOString(),
            tags: [nomePt.toLowerCase(), (p.brands || "").toLowerCase()],
          });

          novosInsumos.push(novo);
          // Salva no banco local
          await saveInsumoLocal(novo);
        }

        if (novosInsumos.length > 0) {
          console.info(`[PereiraLabs Sync] ${novosInsumos.length} novos insumos cacheados no IndexedDB.`);
          return novosInsumos;
        }
      }
    }
  } catch (err) {
    console.warn("Consulta à API externa falhou ou dispositivo offline:", err);
  }

  return [];
}

/**
 * FUNÇÃO PRINCIPAL DE BUSCA, AUTOCORREÇÃO E SINCRONIZAÇÃO
 *
 * 1. Processa a entrada do usuário estritamente em minúsculas (lowercase).
 * 2. Compara primeiro no banco local PereiraLabs (IndexedDB).
 * 3. Aplica algoritmo de aproximação de Levenshtein para autocorreção de erros (ex: "leite mosa" -> "Leite Moça").
 * 4. Se não encontrar e estiver online, estende a busca para a RCSistemas / API e cacheia no IndexedDB.
 * 5. Retorna o resultado com todos os nomes formatados estritamente em MAIÚSCULAS (UPPERCASE).
 */
export async function buscarInsumosComAutocorrecao(
  termoBrutoUsuario: string
): Promise<InsumoSearchResult[]> {
  // REQUISITO 1: Entrada tratada estritamente em minúsculas
  const termoMinusculo = normalizarEntradaUsuario(termoBrutoUsuario);

  if (!termoMinusculo || termoMinusculo.length < 2) {
    return [];
  }

  // Garante que o banco local está ativo e reidratado (proteção contra evicção do iOS)
  let catalogoLocal = await checkAndRehydrateCatalog();
  if (!catalogoLocal || catalogoLocal.length === 0) {
    catalogoLocal = await getAllInsumosLocais();
  }

  const resultadosLocais: InsumoSearchResult[] = [];

  // Avalia correspondência e autocorreção em todo o banco local
  for (const insumo of catalogoLocal) {
    const avaliacao = avaliarCorrespondenciaInsumo(termoMinusculo, insumo);

    if (avaliacao.match) {
      resultadosLocais.push({
        id: insumo.id,
        nomeOriginal: insumo.nome,
        // REQUISITO 3: Retorno estritamente em MAIÚSCULAS
        nomeFormatado: formatarRetornoSistema(insumo.nome),
        marca: formatarRetornoSistema(insumo.marca),
        termoBuscado: termoMinusculo, // REQUISITO 1: Minúscula
        sugestaoCorrecao: avaliacao.foiAutocorrigido ? formatarRetornoSistema(insumo.nome) : undefined,
        foiAutocorrigido: avaliacao.foiAutocorrigido,
        scoreSimilaridade: Number(avaliacao.score.toFixed(3)),
        distanciaLevenshtein: avaliacao.distancia,
        origem: avaliacao.foiAutocorrigido ? "autocorrecao_local" : "local_instantaneo",
        gtin: insumo.gtin,
        precoReferencia: insumo.preco_medio_referencia,
        unidadeMedida: insumo.unidade_medida,
        quantidadeEmbalagem: insumo.quantidade_embalagem,
      });
    }
  }

  // Ordena os resultados locais por maior score e menor distância
  resultadosLocais.sort((a, b) => {
    if (b.scoreSimilaridade !== a.scoreSimilaridade) {
      return b.scoreSimilaridade - a.scoreSimilaridade;
    }
    return a.distanciaLevenshtein - b.distanciaLevenshtein;
  });

  // Se já encontrou correspondências fortes no banco local (score >= 0.85 ou match exato), retorna imediatamente!
  if (resultadosLocais.length > 0 && resultadosLocais[0].scoreSimilaridade >= 0.85) {
    return resultadosLocais.slice(0, 8);
  }

  // Se o dispositivo estiver online e o banco local não tiver correspondência forte, busca na RCSistemas / Externa
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (isOnline && (resultadosLocais.length === 0 || resultadosLocais[0].scoreSimilaridade < 0.70)) {
    const itensExternos = await buscarNaRcsistemasOuExterna(termoMinusculo);

    for (const novoItem of itensExternos) {
      resultadosLocais.unshift({
        id: novoItem.id,
        nomeOriginal: novoItem.nome,
        nomeFormatado: formatarRetornoSistema(novoItem.nome), // MAIÚSCULA
        marca: formatarRetornoSistema(novoItem.marca), // MAIÚSCULA
        termoBuscado: termoMinusculo,
        foiAutocorrigido: false,
        scoreSimilaridade: 1.0,
        distanciaLevenshtein: 0,
        origem: "rcsistemas_sincronizado",
        gtin: novoItem.gtin,
        precoReferencia: novoItem.preco_medio_referencia,
        unidadeMedida: novoItem.unidade_medida,
        quantidadeEmbalagem: novoItem.quantidade_embalagem,
      });
    }
  }

  return resultadosLocais.slice(0, 8);
}
