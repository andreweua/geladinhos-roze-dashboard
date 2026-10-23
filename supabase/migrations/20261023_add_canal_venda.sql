-- Migration 20261023: Adiciona coluna canal_venda e campos auxiliares na tabela vendas
ALTER TABLE IF EXISTS vendas ADD COLUMN IF NOT EXISTS canal_venda text DEFAULT 'Balcao';
ALTER TABLE IF EXISTS vendas ADD COLUMN IF NOT EXISTS pix_txid text;
ALTER TABLE IF EXISTS vendas ADD COLUMN IF NOT EXISTS pix_qrcode text;
ALTER TABLE IF EXISTS vendas ADD COLUMN IF NOT EXISTS pix_copia_cola text;
ALTER TABLE IF EXISTS vendas ADD COLUMN IF NOT EXISTS cancelada_em timestamp with time zone;
ALTER TABLE IF EXISTS vendas ADD COLUMN IF NOT EXISTS motivo_cancelamento text;
