-- Migração Supabase: Tabela de Clientes e Passageiros do CRM com Fidelidade Multi-tenant
-- Criação da tabela para sincronização em tempo real entre PWA, Android App e Desktop

CREATE TABLE IF NOT EXISTS public.clientes_fidelidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id TEXT NOT NULL,
  telefone TEXT NOT NULL,
  telefone_formatado TEXT,
  nome TEXT NOT NULL,
  endereco TEXT,
  total_pedidos INTEGER DEFAULT 0,
  total_gasto NUMERIC(10,2) DEFAULT 0,
  ticket_medio NUMERIC(10,2) DEFAULT 0,
  primeira_compra TIMESTAMPTZ,
  ultima_compra TIMESTAMPTZ,
  sabores_favoritos JSONB DEFAULT '[]'::jsonb,
  selos_atuais INTEGER DEFAULT 0,
  ciclos_completos INTEGER DEFAULT 0,
  total_selos_historico INTEGER DEFAULT 0,
  recompensas_disponiveis INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_empresa_telefone UNIQUE (empresa_id, telefone)
);

-- Índices para alta performance de busca por empresa e telefone
CREATE INDEX IF NOT EXISTS idx_clientes_fidelidade_empresa ON public.clientes_fidelidade (empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_fidelidade_telefone ON public.clientes_fidelidade (empresa_id, telefone);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.clientes_fidelidade ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para leitura, inserção, atualização e exclusão
DROP POLICY IF EXISTS "Permitir select para clientes_fidelidade" ON public.clientes_fidelidade;
CREATE POLICY "Permitir select para clientes_fidelidade"
  ON public.clientes_fidelidade
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert para clientes_fidelidade" ON public.clientes_fidelidade;
CREATE POLICY "Permitir insert para clientes_fidelidade"
  ON public.clientes_fidelidade
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update para clientes_fidelidade" ON public.clientes_fidelidade;
CREATE POLICY "Permitir update para clientes_fidelidade"
  ON public.clientes_fidelidade
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete para clientes_fidelidade" ON public.clientes_fidelidade;
CREATE POLICY "Permitir delete para clientes_fidelidade"
  ON public.clientes_fidelidade
  FOR DELETE
  USING (true);
