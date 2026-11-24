-- ==============================================================================
-- MIGRAÇÃO SUPABASE: ISOLAMENTO MULTI-EMPRESA NA TABELA DE VENDAS & REALTIME
-- Versão da Aplicação: 3.7.2 (24/11/2026)
-- ==============================================================================

-- 1. Adiciona a coluna empresa_id na tabela de vendas (evitando erro 42703)
ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'emp-roze-gourmet';

CREATE INDEX IF NOT EXISTS idx_vendas_empresa_id ON public.vendas(empresa_id);

-- 2. Garante empresa_id nas tabelas de produtos, estoque_lotes e fichas_tecnicas
ALTER TABLE IF EXISTS public.produtos
  ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.estoque_lotes
  ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'emp-roze-gourmet';

ALTER TABLE IF EXISTS public.fichas_tecnicas
  ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'emp-roze-gourmet';

-- 3. Habilita Realtime para produtos, estoque_lotes, fichas_tecnicas e vendas
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_lotes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fichas_tecnicas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 4. Recarrega o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
