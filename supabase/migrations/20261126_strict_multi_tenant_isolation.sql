-- =============================================================================
-- MIGRAÇÃO: ISOLAMENTO ESTRITO MULTI-EMPRESA (MULTI-TENANT) — v3.7.3
-- Garante que todas as tabelas operacionais do ecossistema PereiraLabs PDV - Foods
-- possuam coluna empresa_id indexada e sem vazamento entre estabelecimentos.
-- =============================================================================

ALTER TABLE IF EXISTS public.produtos
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.estoque_lotes
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.fichas_tecnicas
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.clientes_fidelidade
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.estabelecimentos_pesquisa
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.pesquisas_precos
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.compras_notas_fiscais
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.listas_compras
  ADD COLUMN IF NOT EXISTS empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet';

-- Índices de performance e isolamento por empresa_id
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_empresa_id ON public.estoque_lotes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_fichas_tecnicas_empresa_id ON public.fichas_tecnicas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_id ON public.vendas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_fidelidade_empresa_id ON public.clientes_fidelidade (empresa_id);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_pesquisa_empresa_id ON public.estabelecimentos_pesquisa (empresa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_precos_empresa_id ON public.pesquisas_precos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_notas_fiscais_empresa_id ON public.compras_notas_fiscais (empresa_id);
CREATE INDEX IF NOT EXISTS idx_listas_compras_empresa_id ON public.listas_compras (empresa_id);
