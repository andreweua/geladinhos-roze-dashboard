// ============================================================================
// SUPABASE EDGE FUNCTION: create-stone-pix
// Gera cobrança dinâmica Pix via Stone OpenBank API e salva venda pendente
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestItem {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface CreatePixRequest {
  amount: number;
  description?: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  itens: RequestItem[];
  pix_key?: string;
  merchant_name?: string;
  merchant_city?: string;
}

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreatePixRequest = await req.json();
    const {
      amount,
      description = "Geladinhos Gourmet da Roze",
      cliente_nome,
      cliente_telefone,
      itens = [],
      pix_key = "+5514988183327",
      merchant_name = "ROZANA HELENA MIGUEL",
      merchant_city = "JAU",
    } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor da cobrança inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar txid exclusivo padrão BACEN / Stone OpenBank (26-35 caracteres alfanuméricos)
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const pix_txid = `ROZE${Date.now()}${randomSuffix}`;
    const expirationSeconds = 3600; // 1 hora
    const expires_at = new Date(Date.now() + expirationSeconds * 1000).toISOString();

    // Credenciais Stone OpenBank configuradas no ambiente
    const stoneApiUrl =
      Deno.env.get("STONE_API_URL") || "https://sandbox-api.openbank.stone.com.br";
    const stoneClientId = Deno.env.get("STONE_CLIENT_ID");
    const stoneClientSecret = Deno.env.get("STONE_CLIENT_SECRET");
    const stoneAccountId = Deno.env.get("STONE_ACCOUNT_ID");

    let pix_copia_cola = "";
    let pix_qrcode = "";

    // Se houver credenciais completas da Stone OpenBank, comunica com o gateway oficial
    if (stoneClientId && stoneClientSecret && stoneAccountId) {
      try {
        // 1. Obter Token OAuth2 Stone OpenBank
        const authRes = await fetch(`${stoneApiUrl}/auth/realms/stone/protocol/openid-connect/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: stoneClientId,
            client_secret: stoneClientSecret,
            grant_type: "client_credentials",
          }),
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          const accessToken = authData.access_token;

          // 2. Criar cobrança dinâmica Pix (Stone OpenBank API v1)
          const pixRes = await fetch(`${stoneApiUrl}/api/v1/pix_payment_invoices`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Stone-Account-Id": stoneAccountId,
            },
            body: JSON.stringify({
              amount: Math.round(amount * 100), // Stone espera centavos
              due_date: expires_at,
              txid: pix_txid,
              description: description.slice(0, 50),
              payer: cliente_nome ? { name: cliente_nome } : undefined,
            }),
          });

          if (pixRes.ok) {
            const stonePixData = await pixRes.json();
            pix_copia_cola = stonePixData.emv_payload || stonePixData.brcode || "";
            pix_qrcode = stonePixData.qr_code_url || "";
          }
        }
      } catch (stoneErr) {
        console.warn("Falha de comunicação direta com Stone OpenBank API, utilizando payload EMV padrão:", stoneErr);
      }
    }

    // Se não gerou via gateway direto ou em modo sandbox/reserva, gerar EMV BR Code oficial BACEN
    if (!pix_copia_cola) {
      pix_copia_cola = generateStandardEMVPayload({
        pixKey: pix_key,
        merchantName: merchant_name,
        merchantCity: merchant_city,
        amount,
        txId: pix_txid,
        description,
      });
    }

    // 1. Inserir a venda no Supabase com status 'pendente'
    const { data: vendaInserida, error: vendaError } = await supabase
      .from("vendas")
      .insert({
        cliente_nome: cliente_nome?.trim() || null,
        cliente_telefone: cliente_telefone?.trim() || null,
        forma_pagamento: "Pix",
        valor_total: amount,
        status: "pendente",
        pix_txid,
        pix_qrcode,
        pix_copia_cola,
      })
      .select()
      .single();

    if (vendaError) {
      console.error("Erro ao registrar venda no banco:", vendaError);
      return new Response(JSON.stringify({ error: vendaError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Inserir itens da venda
    if (itens.length > 0 && vendaInserida) {
      const itemsToInsert = itens.map((item) => ({
        venda_id: vendaInserida.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      }));

      const { error: itemsError } = await supabase.from("itens_venda").insert(itemsToInsert);
      if (itemsError) {
        console.warn("Aviso ao inserir itens da venda:", itemsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        venda_id: vendaInserida.id,
        pix_txid,
        pix_qrcode,
        pix_copia_cola,
        expires_at,
        amount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper EMV BACEN
function formatEMV(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function normalizeEMV(text: string, maxLen: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, maxLen);
}

function computeCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function generateStandardEMVPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId: string;
  description?: string;
}): string {
  const cleanKey = params.pixKey.trim();
  const txId = params.txId.slice(0, 25);
  const cleanName = normalizeEMV(params.merchantName || "GELADINHOS DA ROZE", 25);
  const cleanCity = normalizeEMV(params.merchantCity || "JAU", 15);

  let sub26 = formatEMV("00", "BR.GOV.BCB.PIX") + formatEMV("01", cleanKey);
  if (params.description) {
    const cleanDesc = normalizeEMV(params.description, 35);
    if (cleanDesc) sub26 += formatEMV("02", cleanDesc);
  }

  const payloadNoCrc =
    formatEMV("00", "01") +
    formatEMV("26", sub26) +
    formatEMV("52", "0000") +
    formatEMV("53", "986") +
    formatEMV("54", params.amount.toFixed(2)) +
    formatEMV("58", "BR") +
    formatEMV("59", cleanName) +
    formatEMV("60", cleanCity) +
    formatEMV("62", formatEMV("05", txId)) +
    "6304";

  return payloadNoCrc + computeCRC16(payloadNoCrc);
}
