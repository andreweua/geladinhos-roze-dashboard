-- ==============================================================================
-- MIGRAÇÃO SUPABASE: TIPO DE ENTREGA, DELIVERY, ENDEREÇO E CONFIGURAÇÕES DE CUPOM
-- Versão da Aplicação: 3.6.6
-- ==============================================================================

-- 1. Novas colunas na tabela de vendas para modalidade de entrega e rota
ALTER TABLE public.vendas 
ADD COLUMN IF NOT EXISTS tipo_entrega TEXT DEFAULT 'NA_ESTACAO',
ADD COLUMN IF NOT EXISTS plataforma_delivery TEXT,
ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
ADD COLUMN IF NOT EXISTS linha_rota TEXT;

COMMENT ON COLUMN public.vendas.tipo_entrega IS 'Modalidade de entrega da venda: NA_ESTACAO (retirada presencial) ou DELIVERY (entrega em domicílio)';
COMMENT ON COLUMN public.vendas.plataforma_delivery IS 'Plataforma/logística de entrega utilizada: Delivery Próprio, iFood, AiQFome, WhatsApp, etc.';
COMMENT ON COLUMN public.vendas.endereco_entrega IS 'Endereço de entrega informado no PDV (Próxima Parada no bilhete de embarque)';
COMMENT ON COLUMN public.vendas.linha_rota IS 'Linha de rota ferroviária calculada: Linha Origem Matriz x Cidade PDV';

-- 2. Novas colunas na tabela de empresas para plataformas de delivery e configurações avançadas
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS plataformas_delivery JSONB DEFAULT '["Delivery Próprio", "iFood", "AiQFome", "WhatsApp Delivery"]'::jsonb,
ADD COLUMN IF NOT EXISTS cupom_config JSONB DEFAULT '{"tipoCupom": "tematico_embarque", "linhaOrigemMatriz": "Conselheiro Lafaiete - MG"}'::jsonb;

COMMENT ON COLUMN public.empresas.plataformas_delivery IS 'Lista de plataformas e modalidades de delivery suportadas pela empresa';
COMMENT ON COLUMN public.empresas.cupom_config IS 'Configurações de modelo de cupom: tipoCupom (tematico_embarque vs padrao_comercial), linhaOrigemMatriz, parada, destino';

-- 3. Caso exista tabela pública de clientes, adiciona coluna de endereço para CRM
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes') THEN
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS endereco TEXT;
    COMMENT ON COLUMN public.clientes.endereco IS 'Endereço residencial/entrega do cliente para pedidos delivery';
  END IF;
END $$;

-- 4. Índices para otimização de consultas por modalidade de entrega e data
CREATE INDEX IF NOT EXISTS idx_vendas_tipo_entrega ON public.vendas (tipo_entrega);
CREATE INDEX IF NOT EXISTS idx_vendas_plataforma_delivery ON public.vendas (plataforma_delivery);

-- 5. Atualiza o cache do schema no PostgREST imediatamente
NOTIFY pgrst, 'reload schema';
