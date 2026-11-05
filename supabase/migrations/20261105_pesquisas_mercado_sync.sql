-- ==============================================================================
-- MIGRAÇÃO SUPABASE: SINCRONIZAÇÃO EM NUVEM DE PESQUISA DE MERCADOS & PREÇOS PAGOS
-- Versão da Aplicação: 3.6.8
-- Tabelas: estabelecimentos_pesquisa, pesquisas_precos, compras_notas_fiscais, listas_compras
-- ==============================================================================

-- 1. TABELA DE ESTABELECIMENTOS (Supermercados, Atacarejos, Distribuidoras)
CREATE TABLE IF NOT EXISTS public.estabelecimentos_pesquisa (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet',
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Atacado e Varejo',
  cidade TEXT NOT NULL,
  bairro TEXT,
  endereco_fisico TEXT,
  endereco_eletronico TEXT,
  telefone TEXT,
  contato_responsavel TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.estabelecimentos_pesquisa IS 'Estabelecimentos comerciais, fornecedores e atacarejos cadastrados para pesquisa de preços';

-- 2. TABELA DE PESQUISAS DE PREÇO (Cotações com validade e histórico)
CREATE TABLE IF NOT EXISTS public.pesquisas_precos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet',
  estabelecimento_id TEXT,
  estabelecimento_nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  insumo_nome TEXT NOT NULL,
  marca TEXT,
  gtin TEXT,
  quantidade_embalagem NUMERIC NOT NULL DEFAULT 1,
  unidade_medida TEXT NOT NULL DEFAULT 'un',
  preco_pesquisado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  preco_varejo NUMERIC(10,2),
  preco_atacado NUMERIC(10,2),
  qtd_minima_atacado NUMERIC,
  preco_por_kg_ou_l NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  preco_atacado_por_kg_ou_l NUMERIC(10,2),
  data_pesquisa TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  data_validade DATE,
  em_promocao BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  foto_comprovante TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.pesquisas_precos IS 'Pesquisas de preços e cotações de insumos em estabelecimentos físicos e virtuais';

-- 3. TABELA DE COMPRAS E NOTAS FISCAIS REAIS (NFC-e, NF-e, Cupons Fiscais)
CREATE TABLE IF NOT EXISTS public.compras_notas_fiscais (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet',
  estabelecimento_id TEXT,
  estabelecimento_nome TEXT NOT NULL,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_cupom_ou_nfe TEXT,
  chave_acesso TEXT,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  origem TEXT NOT NULL DEFAULT 'manual',
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.compras_notas_fiscais IS 'Histórico de compras reais comprovadas por Nota Fiscal com itens e custos unitários';

-- 4. TABELA DE LISTAS DE COMPRAS
CREATE TABLE IF NOT EXISTS public.listas_compras (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL DEFAULT 'emp-roze-gourmet',
  titulo TEXT NOT NULL,
  data_criacao TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  data_alvo DATE,
  status TEXT NOT NULL DEFAULT 'aberta',
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  valor_total_estimado NUMERIC(10,2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.listas_compras IS 'Listas de compras geradas e sincronizadas entre dispositivos';

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_empresa ON public.estabelecimentos_pesquisa (empresa_id);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_cidade ON public.estabelecimentos_pesquisa (cidade);

CREATE INDEX IF NOT EXISTS idx_pesquisas_empresa ON public.pesquisas_precos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_insumo ON public.pesquisas_precos (insumo_nome);
CREATE INDEX IF NOT EXISTS idx_pesquisas_estab ON public.pesquisas_precos (estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_data ON public.pesquisas_precos (data_pesquisa DESC);

CREATE INDEX IF NOT EXISTS idx_compras_empresa ON public.compras_notas_fiscais (empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_data ON public.compras_notas_fiscais (data_compra DESC);

CREATE INDEX IF NOT EXISTS idx_listas_empresa ON public.listas_compras (empresa_id);
CREATE INDEX IF NOT EXISTS idx_listas_status ON public.listas_compras (status);

-- 6. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) E POLÍTICAS PÚBLICAS/ANÔNIMAS
ALTER TABLE public.estabelecimentos_pesquisa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_compras ENABLE ROW LEVEL SECURITY;

-- Políticas para estabelecimentos_pesquisa
DROP POLICY IF EXISTS "Permitir leitura anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa;
CREATE POLICY "Permitir leitura anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa;
CREATE POLICY "Permitir insercao anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa;
CREATE POLICY "Permitir atualizacao anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delecao anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa;
CREATE POLICY "Permitir delecao anonima estabelecimentos_pesquisa" ON public.estabelecimentos_pesquisa FOR DELETE USING (true);

-- Políticas para pesquisas_precos
DROP POLICY IF EXISTS "Permitir leitura anonima pesquisas_precos" ON public.pesquisas_precos;
CREATE POLICY "Permitir leitura anonima pesquisas_precos" ON public.pesquisas_precos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao anonima pesquisas_precos" ON public.pesquisas_precos;
CREATE POLICY "Permitir insercao anonima pesquisas_precos" ON public.pesquisas_precos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao anonima pesquisas_precos" ON public.pesquisas_precos;
CREATE POLICY "Permitir atualizacao anonima pesquisas_precos" ON public.pesquisas_precos FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delecao anonima pesquisas_precos" ON public.pesquisas_precos;
CREATE POLICY "Permitir delecao anonima pesquisas_precos" ON public.pesquisas_precos FOR DELETE USING (true);

-- Políticas para compras_notas_fiscais
DROP POLICY IF EXISTS "Permitir leitura anonima compras_notas_fiscais" ON public.compras_notas_fiscais;
CREATE POLICY "Permitir leitura anonima compras_notas_fiscais" ON public.compras_notas_fiscais FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao anonima compras_notas_fiscais" ON public.compras_notas_fiscais;
CREATE POLICY "Permitir insercao anonima compras_notas_fiscais" ON public.compras_notas_fiscais FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao anonima compras_notas_fiscais" ON public.compras_notas_fiscais;
CREATE POLICY "Permitir atualizacao anonima compras_notas_fiscais" ON public.compras_notas_fiscais FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delecao anonima compras_notas_fiscais" ON public.compras_notas_fiscais;
CREATE POLICY "Permitir delecao anonima compras_notas_fiscais" ON public.compras_notas_fiscais FOR DELETE USING (true);

-- Políticas para listas_compras
DROP POLICY IF EXISTS "Permitir leitura anonima listas_compras" ON public.listas_compras;
CREATE POLICY "Permitir leitura anonima listas_compras" ON public.listas_compras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao anonima listas_compras" ON public.listas_compras;
CREATE POLICY "Permitir insercao anonima listas_compras" ON public.listas_compras FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao anonima listas_compras" ON public.listas_compras;
CREATE POLICY "Permitir atualizacao anonima listas_compras" ON public.listas_compras FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delecao anonima listas_compras" ON public.listas_compras;
CREATE POLICY "Permitir delecao anonima listas_compras" ON public.listas_compras FOR DELETE USING (true);

-- 7. RECARREGA CACHE DO SCHEMA NO POSTGREST
NOTIFY pgrst, 'reload schema';
