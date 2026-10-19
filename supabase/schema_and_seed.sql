-- ============================================================================
-- GELADINHOS GOURMET DA ROZE - SUPABASE SCHEMA & SEED DATA
-- Compatível com replicação White-Label para outros negócios de varejo/alimentação
-- ============================================================================

-- 1. Products (Flavors)
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco_venda numeric(10,2) not null,
  custo_estimado numeric(10,2) not null default 0.00,
  ativo boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Sales transactions
create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  data_venda timestamp with time zone default timezone('utc'::text, now()),
  forma_pagamento text check (forma_pagamento in ('Pix', 'Dinheiro', 'Cartao_Credito', 'Cartao_Debito')),
  valor_total numeric(10,2) not null,
  status text default 'concluida'
);

-- 3. Sale items
create table if not exists itens_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid references vendas(id) on delete cascade,
  produto_id uuid references produtos(id),
  quantidade int not null,
  preco_unitario numeric(10,2) not null
);

-- 4. Inventory / Stock batches
create table if not exists estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references produtos(id) on delete cascade,
  quantidade_disponivel int not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security) - Leitura e Escrita para o Dashboard
-- ============================================================================
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table itens_venda enable row level security;
alter table estoque_lotes enable row level security;

create policy "Permitir acesso publico produtos" on produtos for all using (true) with check (true);
create policy "Permitir acesso publico vendas" on vendas for all using (true) with check (true);
create policy "Permitir acesso publico itens_venda" on itens_venda for all using (true) with check (true);
create policy "Permitir acesso publico estoque_lotes" on estoque_lotes for all using (true) with check (true);

-- ============================================================================
-- SEED INICIAL DE SABORES GOURMET E ESTOQUE
-- ============================================================================
insert into produtos (id, nome, preco_venda, custo_estimado, ativo) values
  ('11111111-1111-4111-8111-111111111101', 'Ninho com Nutella', 8.50, 3.20, true),
  ('11111111-1111-4111-8111-111111111102', 'Morango com Calda Artesanal', 8.00, 2.90, true),
  ('11111111-1111-4111-8111-111111111103', 'Maracujá Trufado', 8.50, 3.10, true),
  ('11111111-1111-4111-8111-111111111104', 'Pistache Real', 10.00, 4.50, true),
  ('11111111-1111-4111-8111-111111111105', 'Oreo com Creme Branco', 8.50, 3.00, true),
  ('11111111-1111-4111-8111-111111111106', 'Coco Queimado Cremoso', 7.50, 2.40, true),
  ('11111111-1111-4111-8111-111111111107', 'Ferrero Rocher Gourmet', 10.00, 4.30, true),
  ('11111111-1111-4111-8111-111111111108', 'Limão Siciliano com Suspiro', 8.00, 2.75, true)
on conflict (id) do nothing;

insert into estoque_lotes (produto_id, quantidade_disponivel) values
  ('11111111-1111-4111-8111-111111111101', 6),
  ('11111111-1111-4111-8111-111111111102', 8),
  ('11111111-1111-4111-8111-111111111103', 24),
  ('11111111-1111-4111-8111-111111111104', 5),
  ('11111111-1111-4111-8111-111111111105', 19),
  ('11111111-1111-4111-8111-111111111106', 32),
  ('11111111-1111-4111-8111-111111111107', 9),
  ('11111111-1111-4111-8111-111111111108', 15);
