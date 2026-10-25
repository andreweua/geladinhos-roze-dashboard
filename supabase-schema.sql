-- ============================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS — GELADINHOS GOURMET DA ROZE
-- Executar no SQL Editor do Supabase (supabase.com -> Project -> SQL Editor)
-- ============================================================================

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Produtos (Sabores de Geladinhos Gourmet 150ml)
CREATE TABLE IF NOT EXISTS produtos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  preco_venda NUMERIC(10,2) NOT NULL,
  preco_ifood NUMERIC(10,2),
  custo_estimado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  categoria TEXT DEFAULT 'Gourmet',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  data_venda TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  forma_pagamento TEXT CHECK (forma_pagamento IN ('Pix', 'Dinheiro', 'Cartao_Credito', 'Cartao_Debito')),
  valor_total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'concluida' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
  pix_txid TEXT,
  pix_qrcode TEXT,
  pix_copia_cola TEXT,
  cancelada_em TIMESTAMP WITH TIME ZONE,
  motivo_cancelamento TEXT
);

-- 4. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS itens_venda (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  venda_id TEXT REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id TEXT REFERENCES produtos(id),
  quantidade INT NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL
);

-- 5. Tabela de Estoque de Lotes Prontos (Congelador)
CREATE TABLE IF NOT EXISTS estoque_lotes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  produto_id TEXT REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade_disponivel INT NOT NULL DEFAULT 0 CHECK (quantidade_disponivel >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Auditoria de Estoque (Admin Trail)
CREATE TABLE IF NOT EXISTS auditoria_estoque (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tipo TEXT CHECK (tipo IN ('geladinho', 'materia_prima')),
  item_nome TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantidade_anterior NUMERIC(10,2) NOT NULL,
  quantidade_nova NUMERIC(10,2) NOT NULL,
  delta NUMERIC(10,2) NOT NULL,
  unidade TEXT NOT NULL,
  motivo TEXT NOT NULL,
  admin_nome TEXT NOT NULL,
  observacoes TEXT,
  destinatarios_notificados TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabela de Empresas (Multi-Tenant SaaS PereiraLabs)
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT,
  nicho TEXT,
  cor_tema TEXT DEFAULT 'dourado',
  chave_pix TEXT,
  chave_pix_tipo TEXT DEFAULT 'telefone',
  whatsapp TEXT,
  cidade TEXT,
  responsavel TEXT,
  admin_email TEXT NOT NULL,
  admin_senha TEXT,
  cashier_pin TEXT DEFAULT '1234',
  status_assinatura TEXT DEFAULT 'ativo',
  status_lifecycle TEXT DEFAULT 'ativa',
  cortesia_validade_ate TIMESTAMP WITH TIME ZONE,
  valor_mensalidade NUMERIC(10,2) DEFAULT 79.90,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Permite leitura e escrita via Chave Anônima (anon)
-- ============================================================================
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público anônimo produtos" ON produtos;
CREATE POLICY "Acesso público anônimo produtos" ON produtos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público anônimo vendas" ON vendas;
CREATE POLICY "Acesso público anônimo vendas" ON vendas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público anônimo itens_venda" ON itens_venda;
CREATE POLICY "Acesso público anônimo itens_venda" ON itens_venda FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público anônimo estoque_lotes" ON estoque_lotes;
CREATE POLICY "Acesso público anônimo estoque_lotes" ON estoque_lotes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público anônimo auditoria_estoque" ON auditoria_estoque;
CREATE POLICY "Acesso público anônimo auditoria_estoque" ON auditoria_estoque FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso público anônimo empresas" ON empresas;
CREATE POLICY "Acesso público anônimo empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime nas tabelas para sincronização instantânea (Idempotente)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE itens_venda;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE estoque_lotes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE auditoria_estoque;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE empresas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================================
-- SEED INICIAL DOS 8 SABORES OFICIAIS (COM ESTOQUE PRONTO PARA REGISTRO REAL)
-- ============================================================================
INSERT INTO produtos (id, nome, preco_venda, preco_ifood, custo_estimado, ativo)
VALUES
  ('prod-doce-de-leite', 'Doce de Leite (Itambé)', 6.50, 8.81, 2.74, true),
  ('prod-ninho-nutella', 'Ninho com Nutella', 7.50, 10.16, 3.44, true),
  ('prod-ninho-brigadeiro', 'Ninho com Brigadeiro 50%', 7.50, 10.16, 2.85, true),
  ('prod-mousse-maracuja', 'Mousse de Maracujá c/ Geleia', 6.50, 8.81, 2.64, true),
  ('prod-delicia-ovomaltine', 'Delícia de Ovomaltine', 6.50, 8.81, 2.60, true),
  ('prod-romeu-julieta', 'Romeu e Julieta', 7.50, 10.16, 2.95, true),
  ('prod-cheesecake-frutas-vermelhas', 'Cheesecake Frutas Vermelhas', 8.00, 10.84, 3.50, true),
  ('prod-ninho-morango', 'Mousse de Morango c/ Geleia', 7.00, 9.49, 2.89, true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  preco_venda = EXCLUDED.preco_venda,
  preco_ifood = EXCLUDED.preco_ifood,
  custo_estimado = EXCLUDED.custo_estimado,
  ativo = EXCLUDED.ativo;

-- Seed de Lotes de Estoque Inicial (Iniciando com 0 para teste e auditoria real)
INSERT INTO estoque_lotes (id, produto_id, quantidade_disponivel)
VALUES
  ('est-1', 'prod-doce-de-leite', 0),
  ('est-2', 'prod-ninho-nutella', 0),
  ('est-3', 'prod-ninho-brigadeiro', 0),
  ('est-4', 'prod-mousse-maracuja', 0),
  ('est-5', 'prod-delicia-ovomaltine', 0),
  ('est-6', 'prod-romeu-julieta', 0),
  ('est-7', 'prod-cheesecake-frutas-vermelhas', 0),
  ('est-8', 'prod-ninho-morango', 0)
ON CONFLICT (id) DO UPDATE SET
  produto_id = EXCLUDED.produto_id;
