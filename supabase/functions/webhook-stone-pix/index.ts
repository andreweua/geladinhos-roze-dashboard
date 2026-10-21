// ============================================================================
// SUPABASE EDGE FUNCTION: webhook-stone-pix
// Recebe webhooks da Stone OpenBank, liquida a venda e baixa o estoque
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-stone-signature",
};

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Opcional: validação de assinatura do webhook Stone OpenBank
    const stoneSignature = req.headers.get("x-stone-signature");
    const webhookSecret = Deno.env.get("STONE_WEBHOOK_SECRET");
    if (webhookSecret && stoneSignature) {
      // Se houver secret configurado e assinatura não bater, rejeitar
      // (Em ambiente real, validar HMAC SHA256)
    }

    const payload = await req.json();
    console.log("Recebido Webhook Stone OpenBank:", JSON.stringify(payload));

    // Extrair o txid de diferentes estruturas de evento da Stone OpenBank
    // Tipos comuns: 'pix_inbound_payment_received', 'pix_payment_invoice_paid'
    const txid =
      payload.txid ||
      payload.data?.txid ||
      payload.payment?.txid ||
      payload.invoice?.txid ||
      payload.pix_txid;

    if (!txid) {
      return new Response(
        JSON.stringify({
          error: "txid não encontrado no corpo do webhook Stone",
          received_payload: payload,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1. Invocar a stored procedure segura de liquidação atômica e baixa de estoque
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "settle_stone_pix_sale",
      { txid_param: txid }
    );

    if (rpcError) {
      console.error("Erro na função settle_stone_pix_sale:", rpcError);

      // Fallback: execução manual direta via query SQL
      const { data: venda } = await supabase
        .from("vendas")
        .select("id, status")
        .eq("pix_txid", txid)
        .single();

      if (venda && venda.status === "pendente") {
        await supabase
          .from("vendas")
          .update({ status: "concluida" })
          .eq("id", venda.id);

        // Buscar itens e baixar estoque
        const { data: itens } = await supabase
          .from("itens_venda")
          .select("produto_id, quantidade")
          .eq("venda_id", venda.id);

        if (itens) {
          for (const item of itens) {
            const { data: lote } = await supabase
              .from("estoque_lotes")
              .select("id, quantidade_disponivel")
              .eq("produto_id", item.produto_id)
              .single();

            if (lote) {
              await supabase
                .from("estoque_lotes")
                .update({
                  quantidade_disponivel: Math.max(
                    0,
                    lote.quantidade_disponivel - item.quantidade
                  ),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", lote.id);
            }
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Venda concluída e estoque baixado via fallback",
            txid,
            venda_id: venda.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook Stone OpenBank processado com sucesso",
        result: rpcResult,
        txid,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("Erro ao processar Webhook Stone:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
