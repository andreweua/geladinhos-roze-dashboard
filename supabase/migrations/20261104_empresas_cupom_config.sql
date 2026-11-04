-- ============================================================================
-- MIGRACAO SUPABASE: CONFIGURACAO DO CUPOM / BILHETE DE EMBARQUE POR EMPRESA
-- Data: 04/11/2026 (v3.6.3)
-- Instrucoes: copie todo este conteudo e cole no SQL Editor do Supabase.
-- Em seguida, clique em "RUN". E seguro rodar mais de uma vez.
-- ============================================================================

-- Textos do cupom por empresa: origem, paradaNome, proximaParada, destino
alter table if exists empresas
  add column if not exists cupom_config jsonb not null default '{}'::jsonb;

-- (Opcional) Preenche a Estacao da Ro com os textos padrao do Bilhete de Embarque.
-- Campos vazios continuam usando os dados cadastrados da empresa (cidade, nome, slogan).
update empresas
set cupom_config = jsonb_build_object(
  'origem', 'Conselheiro Lafaiete - MG',
  'paradaNome', 'Estação da Rô',
  'proximaParada', 'Casa do Cliente',
  'destino', 'Cremosidade sem escalas e felicidade imediata!'
)
where id = 'emp-estacao-da-ro'
  and (cupom_config is null or cupom_config = '{}'::jsonb);

-- Atualiza o cache de schema da API (PostgREST)
notify pgrst, 'reload schema';
