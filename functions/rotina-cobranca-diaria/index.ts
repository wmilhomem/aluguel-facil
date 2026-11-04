import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for server-side operations
const supabase = createClient(
  Deno.env.get('VITE_SUPABASE_URL') || 'https://supabase-project.supabase.co',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
);

interface CobrancaCompleta {
  id: string;
  inquilino_id: string;
  user_id: string;
  mes_referencia: string;
  data_vencimento: string;
  valor_original: number;
  valor_com_multa?: number;
  status: string;
  dias_atraso: number;
  public_token: string;
  inquilino: {
    id: string;
    nome_inquilino: string;
    whatsapp_inquilino: string;
    cpf?: string;
    valor_aluguel: number;
    dia_vencimento: number;
    multa_atraso: number;
    juros_dia: number;
    ativo: boolean;
    imovel: {
      id: string;
      apelido_imovel: string;
      endereco: string;
    };
  };
}

interface FilaEnvio {
  id: string;
  user_id: string;
  inquilino_id: string;
  cobranca_id: string;
  template_tipo: 'lembrete_3_dias' | 'vencimento_hoje' | 'atraso_1_dia' | 'atraso_5_dias';
  mensagem_texto: string;
  status: 'pendente' | 'enviado' | 'erro';
  data_criacao: string;
  data_enviado?: string;
  chave_idempotencia: string;
}

// Busca cobranças pendentes e gera fila de mensagens
Deno.serve(async (req) => {
  // Verificar se já foi executado hoje (idempotência simples)
  const dataHoje = new Date();
  const hojeStr = `${dataHoje.getFullYear()}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${String(dataHoje.getDate()).padStart(2, '0')}`;

  // Verificar se já existe execução para hoje
  const { data: execucaoExistente } = await supabase
    .from('fila_envio')
    .select('data_criacao')
    .eq('status', 'pendente')
    .maybeSingle();

  // Se já há itens pendentes para hoje, não duplicate
  if (execucaoExistente) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Já existe fila de mensagens para hoje. Execução ignorada para evitar duplicatas.',
        total_fila: 0,
        items: []
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }

  // Buscar cobranças pendentes com dados completos
  const { data: cobrancas, error } = await supabase
    .from('cobrancas')
    .select(`
      *,
      inquilino (
        *,
        imovel (*)
      ),
      profiles (*)
    `)
    .eq('status', 'pendente')
    .order('data_vencimento', { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }

  const filaItens: FilaEnvio[] = [];
  const today = new Date();

  for (const cob of (cobrancas as any[]) || []) {
    const { inquilino, ...cobSemInquilino } = cob;

    // Selecionar template baseado no dias_atraso
    let templateTipo: string;
    let mensagemTexto: string;

    if (cob.dias_atraso === 0) {
      templateTipo = 'vencimento_hoje';
      mensagemTexto = `Olá, tudo bem? O aluguel do imóvel ${inquilino.imovel?.apelido_imovel || '—'} (${inquilino.nome_inquilino || '—'}) vence hoje no valor de R$ ${cob.valor_original}. Chave Pix: ${inquilino.chave_pix_dono || '—'}. Link da fatura: #fatura-${cob.public_token}.`;
    } else if (cob.dias_atraso === 1) {
      templateTipo = 'atraso_1_dia';
      const valorAtualizado = cob.valor_original * (1 + (inquilino.multa_atraso || 2) / 100 + (inquilino.juros_dia || 0.033));
      mensagemTexto = `Olá. Notamos que o aluguel do imóvel ${inquilino.imovel?.apelido_imovel || '—'} venceu ontem. O valor atualizado com multa e juros é de R$ ${valorAtualizado.toFixed(2)}. Chave Pix: ${inquilino.chave_pix_dono || '—'}. Fatura: #fatura-${cob.public_token}.`;
    } else if (cob.dias_atraso <= 3) {
      templateTipo = 'lembrete_3_dias';
      mensagemTexto = `Olá, passando para lembrar que o aluguel do imóvel ${inquilino.imovel?.apelido_imovel || '—'} vence em 3 dias no valor de R$ ${cob.valor_original}. Chave Pix: ${inquilino.chave_pix_dono || '—'}. Link da fatura: #fatura-${cob.public_token}.`;
    } else {
      templateTipo = 'atraso_5_dias';
      mensagemTexto = `Olá. Seu aluguel do imóvel ${inquilino.imovel?.apelido_imovel || '—'} está com 5 dias de atraso. O valor recalculado hoje é de R$ ${cob.valor_com_multa || cob.valor_original}. Chave Pix: ${inquilino.chave_pix_dono || '—'}. Fatura: #fatura-${cob.public_token}.`;
    }

    // Inserir na fila com chave idempotente (baseada no day + cobranca)
    const { data: filaItem, error: filaError } = await supabase
      .from('fila_envio')
      .insert({
        user_id: cob.user_id,
        inquilino_id: cob.inquilino_id,
        cobranca_id: cob.id,
        template_tipo: templateTipo,
        mensagem_texto: mensagemTexto,
        status: 'pendente',
        chave_idempotencia: `${today.getDate()}-${cob.id}`
      })
      .select()
      .single();

    if (filaError) {
      console.error('Erro ao inserir fila:', filaError);
      continue;
    }

    filaItens.push({
      id: filaItem.id,
      user_id: filaItem.user_id,
      inquilino_id: filaItem.inquilino_id,
      cobranca_id: filaItem.cobranca_id,
      template_tipo: filaItem.template_tipo,
      mensagem_texto: filaItem.mensagem_texto,
      status: filaItem.status,
      data_criacao: filaItem.data_criacao,
      data_enviado: filaItem.data_enviado,
      chave_idempotencia: filaItem.chave_idempotencia
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      total_cobrancas: (cobrancas as any[]).length,
      total_fila: filaItens.length,
      items: filaItens
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    }
  );
});