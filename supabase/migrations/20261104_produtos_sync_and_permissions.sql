-- ============================================================================
-- MIGRAÇÃO SUPABASE: PERMISSÕES E ESTRUTURA PARA CADASTRO DE PRODUTOS
-- Data: 04/11/2026 (v3.6.5)
-- Instruções: Copie todo este conteúdo, cole no SQL Editor do seu Supabase e clique em RUN.
-- É totalmente seguro executar múltiplas vezes.
-- ============================================================================

-- 1. Garante que todas as colunas necessárias existam na tabela 'produtos'
ALTER TABLE IF EXISTS produtos
  ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'emp-roze-gourmet',
  ADD COLUMN IF NOT EXISTS preco_ifood NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS custo_estimado NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Confeitaria & Sobremesas',
  ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS gtin TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- 2. Garante coluna empresa_id na tabela 'estoque_lotes'
ALTER TABLE IF EXISTS estoque_lotes
  ADD COLUMN IF NOT EXISTS empresa_id TEXT DEFAULT 'emp-roze-gourmet';

-- 3. Habilita RLS e cria políticas completas de permissão (SELECT, INSERT, UPDATE, DELETE)
-- para produtos e estoque_lotes (Chave anon do PWA/App)
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público anônimo produtos" ON produtos;
DROP POLICY IF EXISTS "Permitir tudo produtos" ON produtos;
CREATE POLICY "Permitir tudo produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso público anônimo estoque_lotes" ON estoque_lotes;
DROP POLICY IF EXISTS "Permitir tudo estoque_lotes" ON estoque_lotes;
CREATE POLICY "Permitir tudo estoque_lotes" ON estoque_lotes FOR ALL USING (true) WITH CHECK (true);

-- 4. Habilita Realtime para propagar produtos novos instantaneamente para outros aparelhos
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE estoque_lotes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 5. Atualiza o cache da API PostgREST
NOTIFY pgrst, 'reload schema';
