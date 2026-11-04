-- ============================================================================
-- MIGRAÇÃO SUPABASE: FICHAS TÉCNICAS ESTRUTURADAS & DRE MULTI-TENANT
-- Data: 03/11/2026
-- Instruções: Copie todo este conteúdo e cole no SQL Editor do seu Supabase.
-- Em seguida, clique em "RUN".
-- ============================================================================

-- 1. Garante colunas necessárias na tabela de produtos
alter table if exists produtos 
  add column if not exists empresa_id text default 'emp-roze-gourmet',
  add column if not exists custo_estimado numeric(10,2) default 0.00,
  add column if not exists preco_ifood numeric(10,2) default 0.00,
  add column if not exists categoria text default 'Confeitaria & Sobremesas',
  add column if not exists unidade text default 'un',
  add column if not exists gtin text;

-- 2. Cria a tabela oficial de Fichas Técnicas Estruturadas (com ingredientes em JSONB)
create table if not exists fichas_tecnicas (
  id text primary key,
  produto_id text not null,
  empresa_id text not null default 'emp-roze-gourmet',
  subtitulo_receita text,
  rendimento_unidades numeric not null default 10,
  volume_unitario_ml numeric not null default 150,
  tempo_preparo_min numeric default 30,
  custo_embalagem_un numeric(10,2) default 0.10,
  custo_operacional_un numeric(10,2) default 0.35,
  preco_ifood_sugerido numeric(10,2) default 0.00,
  lucro_ifood_estimado numeric(10,2) default 0.00,
  modo_preparo text,
  ingredientes jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Índices para busca rápida
create index if not exists idx_fichas_tecnicas_produto on fichas_tecnicas(produto_id);
create index if not exists idx_fichas_tecnicas_empresa on fichas_tecnicas(empresa_id);

-- 4. Habilita Row Level Security (RLS) e libera acesso público para o app
alter table fichas_tecnicas enable row level security;

drop policy if exists "Permitir leitura anonima fichas_tecnicas" on fichas_tecnicas;
create policy "Permitir leitura anonima fichas_tecnicas"
  on fichas_tecnicas for select
  using (true);

drop policy if exists "Permitir insercao anonima fichas_tecnicas" on fichas_tecnicas;
create policy "Permitir insercao anonima fichas_tecnicas"
  on fichas_tecnicas for insert
  with check (true);

drop policy if exists "Permitir atualizacao anonima fichas_tecnicas" on fichas_tecnicas;
create policy "Permitir atualizacao anonima fichas_tecnicas"
  on fichas_tecnicas for update
  using (true)
  with check (true);

drop policy if exists "Permitir delecao anonima fichas_tecnicas" on fichas_tecnicas;
create policy "Permitir delecao anonima fichas_tecnicas"
  on fichas_tecnicas for delete
  using (true);
