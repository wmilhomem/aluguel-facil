/**
 * Supabase Edge Function: rotina-cobranca-diaria
 * Executa todos os dias às 08:00 (Horário de Brasília) via pg_cron.
 * 
 * Verifica vencimentos, calcula juros e multas de atraso no banco de dados
 * e organiza a fila de cobranças automáticas para WhatsApp.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Data de referência de Brasília (UTC-3)
    const nowUtc = new Date();
    const brasiliaTime = new Date(nowUtc.getTime() - 3 * 60 * 60 * 1000);
    const todayStr = brasiliaTime.toISOString().split("T")[0];

    // 1. Busca todas as cobranças que ainda não foram pagas
    const { data: cobrancas, error: cobError } = await supabase
      .from("cobrancas")
      .select(`
        id,
        inquilino_id,
        user_id,
        mes_referencia,
        data_vencimento,
        valor_original,
        valor_com_multa,
        status,
        dias_atraso,
        inquilinos (
          id,
          nome_inquilino,
          whatsapp_inquilino,
          multa_atraso,
          juros_dia,
          ativo,
          imoveis (
            apelido_imovel
          )
        ),
        profiles (
          nome,
          chave_pix_dono,
          tipo_chave_pix
        )
      `)
      .neq("status", "pago");

    if (cobError) {
      throw cobError;
    }

    let atualizados = 0;
    let mensagensGeradas = 0;
    const filaMensagens = [];

    const todayDate = new Date(todayStr + "T00:00:00");

    for (const cob of cobrancas || []) {
      const inq = cob.inquilinos as any;
      if (!inq || !inq.ativo) continue;

      const dueDate = new Date(cob.data_vencimento + "T00:00:00");
      const diffTime = todayDate.getTime() - dueDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let novoStatus = cob.status;
      let novoValorComMulta = cob.valor_original;
      let diasAtraso = 0;
      let tipoMsg = null;

      if (diffDays === -3) {
        // Vence em 3 dias
        tipoMsg = "lembrete_3_dias";
        novoStatus = "pendente";
      } else if (diffDays === 0) {
        // Vence hoje
        tipoMsg = "vencimento_hoje";
        novoStatus = "pendente";
      } else if (diffDays >= 1) {
        // Atrasado: calcula valor_com_multa = valor_original * (1 + multa_atraso/100 + (juros_dia/100 * dias_atrasado))
        diasAtraso = diffDays;
        novoStatus = "atrasado";
        const multa = inq.multa_atraso || 2.0;
        const juros = inq.juros_dia || 0.033;
        novoValorComMulta = Number(
          (cob.valor_original * (1 + multa / 100 + (juros / 100) * diasAtraso)).toFixed(2)
        );
        tipoMsg = diffDays >= 5 ? "atraso_5_dias" : "atraso_1_dia";
      }

      // Atualiza a cobrança se houver alteração de status ou valor
      if (
        novoStatus !== cob.status ||
        diasAtraso !== cob.dias_atraso ||
        novoValorComMulta !== cob.valor_com_multa
      ) {
        await supabase
          .from("cobrancas")
          .update({
            status: novoStatus,
            dias_atraso: diasAtraso,
            valor_com_multa: novoStatus === "atrasado" ? novoValorComMulta : null,
          })
          .eq("id", cob.id);
        atualizados++;
      }

      if (tipoMsg) {
        mensagensGeradas++;
        filaMensagens.push({
          cobranca_id: cob.id,
          inquilino: inq.nome_inquilino,
          whatsapp: inq.whatsapp_inquilino,
          tipo: tipoMsg,
          valor: novoStatus === "atrasado" ? novoValorComMulta : cob.valor_original,
          vencimento: cob.data_vencimento,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data_execucao_brasilia: todayStr,
        cobrancas_processadas: cobrancas?.length || 0,
        cobrancas_atualizadas: atualizados,
        mensagens_geradas_fila: mensagensGeradas,
        fila: filaMensagens,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
