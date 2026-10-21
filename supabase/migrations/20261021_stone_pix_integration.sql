-- ============================================================================
-- GELADINHOS GOURMET DA ROZE — STONE OPENBANK PIX INTEGRATION & REALTIME MIGRATION
-- ============================================================================

-- 1. Certificar colunas e constraints na tabela de Vendas
alter table if exists vendas 
  add column if not exists pix_txid text,
  add column if not exists pix_qrcode text,
  add column if not exists pix_copia_cola text,
  alter column status set default 'pendente';

-- Garantir constraint de status
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'vendas_status_check'
  ) then
    alter table vendas 
      add constraint vendas_status_check 
      check (status in ('pendente', 'concluida', 'cancelada'));
  end if;
end $$;

-- Índice para busca rápida de conciliação por txid do Pix
create index if not exists idx_vendas_pix_txid on vendas(pix_txid);

-- 2. Habilitar Supabase Realtime para a tabela vendas
-- Isso permite que o frontend escute confirmações bancárias via WebSocket instantaneamente
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'vendas'
  ) then
    alter publication supabase_realtime add table vendas;
  end if;
exception
  when undefined_object then
    -- Em ambientes onde a publicação ainda não existe, cria-se
    create publication supabase_realtime for table vendas;
end $$;

-- 3. Função RPC para liquidação de pagamento e baixa automática de estoque
-- Utilizada pelo Webhook da Stone OpenBank para garantir atomicidade
create or replace function settle_stone_pix_sale(txid_param text)
returns json
language plpgsql
security definer
as $$
declare
  venda_rec record;
  item_rec record;
begin
  -- 1. Buscar a venda pendente pelo pix_txid
  select * into venda_rec 
  from vendas 
  where pix_txid = txid_param 
  for update;

  if not found then
    return json_build_object(
      'success', false, 
      'message', 'Venda não encontrada para o pix_txid fornecido'
    );
  end if;

  if venda_rec.status = 'concluida' then
    return json_build_object(
      'success', true, 
      'message', 'Venda já estava liquidada anteriormente',
      'venda_id', venda_rec.id
    );
  end if;

  -- 2. Atualizar status da venda para 'concluida'
  update vendas 
  set status = 'concluida'
  where id = venda_rec.id;

  -- 3. Baixar estoque dos produtos da venda
  for item_rec in (
    select produto_id, quantidade 
    from itens_venda 
    where venda_id = venda_rec.id
  ) loop
    update estoque_lotes
    set 
      quantidade_disponivel = greatest(0, quantidade_disponivel - item_rec.quantidade),
      updated_at = timezone('utc'::text, now())
    where produto_id = item_rec.produto_id;
  end loop;

  return json_build_object(
    'success', true, 
    'message', 'Pagamento liquidado e estoque deduzido com sucesso',
    'venda_id', venda_rec.id,
    'valor_total', venda_rec.valor_total
  );
end;
$$;
