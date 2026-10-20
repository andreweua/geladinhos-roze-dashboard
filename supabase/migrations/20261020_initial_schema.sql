-- ============================================================================
-- GELADINHOS GOURMET DA ROZE — ESTRUTURA DO BANCO DE DADOS (SUPABASE POSTGRESQL)
-- ============================================================================

-- Habilitar extensão para geração de UUID
create extension if not exists "pgcrypto";

-- 1. Insumos e Embalagens
create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text check (tipo in ('ingrediente', 'embalagem', 'outro')),
  unidade_medida text not null,
  custo_unitario numeric(10,4) not null default 0.0000,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Produtos (Sabores de Geladinho)
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco_venda numeric(10,2) not null,
  rendimento_receita int not null default 1,
  ativo boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Ficha Técnica / Receita (Insumos por Produto)
create table if not exists ficha_tecnica (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) on delete cascade,
  insumo_id uuid references insumos(id) on delete cascade,
  quantidade numeric(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Taxas Médias por Meio de Pagamento (ex: Ton Pix 0.99%, Cartão 3.50%)
create table if not exists taxas_pagamento (
  forma_pagamento text primary key,
  taxa_percentual numeric(5,2) not null default 0.00
);

-- 5. Vendas (com dados de contato e status de pagamento)
create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text,
  cliente_telefone text, -- para link direto do WhatsApp (55...)
  data_venda timestamp with time zone default timezone('utc'::text, now()),
  forma_pagamento text check (forma_pagamento in ('Pix', 'Dinheiro', 'Cartao_Credito', 'Cartao_Debito')),
  valor_total numeric(10,2) not null,
  status text default 'concluida' -- 'pendente', 'concluida', 'cancelada'
);

-- 6. Itens da Venda
create table if not exists itens_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid references vendas(id) on delete cascade,
  produto_id uuid references produtos(id),
  quantidade int not null,
  preco_unitario numeric(10,2) not null
);

-- 7. Estoque de Lotes Prontos
create table if not exists estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) on delete cascade,
  quantidade_disponivel int not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices de performance
create index if not exists idx_vendas_data on vendas(data_venda desc);
create index if not exists idx_itens_venda_venda on itens_venda(venda_id);
create index if not exists idx_ficha_tecnica_produto on ficha_tecnica(produto_id);
create index if not exists idx_estoque_produto on estoque_lotes(produto_id);

-- Inserção de Taxas Padrão da TON
insert into taxas_pagamento (forma_pagamento, taxa_percentual) values
  ('Pix', 0.99),
  ('Dinheiro', 0.00),
  ('Cartao_Debito', 1.99),
  ('Cartao_Credito', 3.50)
on conflict (forma_pagamento) do update
set taxa_percentual = excluded.taxa_percentual;
