import { BRAND_CONFIG } from "@/config/brand.config";
import { checkIsSupabaseConfigured, supabase } from "@/lib/supabase";

export const ROZE_COMPANY_ID = "emp-roze-gourmet";

export interface PurgeReport {
  cloudDeleted: string[];
  cloudErrors: string[];
  localKeysRemoved: number;
}

const CHUNK = 40;

function chunk<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Remove do armazenamento local TODAS as chaves pertencentes à empresa informada.
 */
export function purgeLocalCompanyKeys(companyId: string): number {
  const prefix = BRAND_CONFIG.storagePrefix;
  const idUnderscore = companyId.replace(/-/g, "_");
  const rozeLegacy = [
    "_dashboard_data_v3_clean_real",
    "_sales_channels_map_v1",
    "_listas_compras_v1",
    "_listas_compras_emp_roze_v2",
    "_estoque_audit_logs_v1",
    "_audit_email_recipients_v1",
    "_materia_prima_estoque_v1",
    "_tabela_cotacoes_v2",
    "_estabelecimentos_v3_simao_jau_trespontas",
    "_pesquisas_precos_v3_validade",
    "_compras_reais_v3",
    "_customers_crm_v1",
    "_ifood_fee_pct",
  ].map((s) => `${prefix}${s}`);

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) keys.push(k);
  }

  let removed = 0;
  for (const k of keys) {
    const matchesId = k.includes(companyId) || k.includes(idUnderscore);
    const isRozeLegacy = companyId === ROZE_COMPANY_ID && rozeLegacy.includes(k);
    if (matchesId || isRozeLegacy) {
      localStorage.removeItem(k);
      removed++;
    }
  }
  return removed;
}

/**
 * Apaga na nuvem (Supabase) e no aparelho todos os dados da empresa.
 * Não remove a linha da empresa em `empresas` (use includeCompanyRow para isso).
 */
export async function purgeCompanyEverywhere(
  companyId: string,
  includeCompanyRow = false
): Promise<PurgeReport> {
  const report: PurgeReport = { cloudDeleted: [], cloudErrors: [], localKeysRemoved: 0 };
  const isRoze = companyId === ROZE_COMPANY_ID;

  if (checkIsSupabaseConfigured() && supabase) {
    const db = supabase;
    const scope = (q: any) =>
      isRoze
        ? q.or(`empresa_id.eq.${companyId},empresa_id.is.null`)
        : q.eq("empresa_id", companyId);

    // 1. IDs de produtos da empresa
    let produtoIds: string[] = [];
    try {
      const { data } = await scope(db.from("produtos").select("id"));
      produtoIds = (data || []).map((r: any) => String(r.id));
    } catch {
      // ignora
    }

    // 2. Vendas e itens ligados aos produtos da empresa
    const vendaIds = new Set<string>();
    for (const ids of chunk(produtoIds)) {
      try {
        const { data } = await db.from("itens_venda").select("venda_id").in("produto_id", ids);
        (data || []).forEach((r: any) => r.venda_id && vendaIds.add(String(r.venda_id)));
      } catch {
        // ignora
      }
    }
    // Vendas marcadas diretamente com empresa_id (quando a coluna existe)
    try {
      const { data, error } = await scope(db.from("vendas").select("id"));
      if (!error) (data || []).forEach((r: any) => vendaIds.add(String(r.id)));
    } catch {
      // coluna pode não existir
    }

    const run = async (label: string, fn: () => PromiseLike<any>) => {
      try {
        const res: any = await fn();
        if (res?.error) report.cloudErrors.push(`${label}: ${res.error.message}`);
        else report.cloudDeleted.push(label);
      } catch (err) {
        report.cloudErrors.push(`${label}: ${String(err)}`);
      }
    };

    for (const ids of chunk(Array.from(vendaIds))) {
      await run("itens_venda", () => db.from("itens_venda").delete().in("venda_id", ids));
      await run("vendas", () => db.from("vendas").delete().in("id", ids));
    }
    for (const ids of chunk(produtoIds)) {
      await run("itens_venda(produtos)", () => db.from("itens_venda").delete().in("produto_id", ids));
      await run("estoque_lotes(produtos)", () => db.from("estoque_lotes").delete().in("produto_id", ids));
      await run("fichas_tecnicas(produtos)", () => db.from("fichas_tecnicas").delete().in("produto_id", ids));
      await run("produtos", () => db.from("produtos").delete().in("id", ids));
    }

    // 3. Tabelas com empresa_id
    for (const table of [
      "estoque_lotes",
      "fichas_tecnicas",
      "produtos",
      "listas_compras",
      "pesquisas_precos",
      "estabelecimentos_pesquisa",
      "compras_notas_fiscais",
      "clientes_fidelidade",
    ]) {
      await run(table, () => scope(db.from(table).delete()));
    }

    if (includeCompanyRow && !isRoze) {
      await run("empresas", () => db.from("empresas").delete().eq("id", companyId));
    }
  }

  report.localKeysRemoved = purgeLocalCompanyKeys(companyId);
  return report;
}
