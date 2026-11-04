-- ========================================================
-- ALUGUEL FÃCIL - SCHEMA DO BANCO DE DADOS SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ========================================================

-- Habilitar extensÃµes necessÃ¡rias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 1. TABELA PROFILES (dados do locador e recebimento Pix)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nome TEXT,
    whatsapp_dono TEXT,
    chave_pix_dono TEXT,
    tipo_chave_pix TEXT DEFAULT 'CPF', -- CPF, CNPJ, Telefone, Email, AleatÃ³ria
    cidade_pix TEXT DEFAULT 'GOIANIA',
    plano TEXT DEFAULT 'ate_3_imoveis', -- 1_imovel, ate_3_imoveis, ate_10_imoveis
    onboarding_concluido BOOLEAN DEFAULT false,
    -- Stripe Subscription & Plan Control
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plano_status TEXT DEFAULT 'trial', -- trial, ativo, inativo, cancelado
    plano_nome TEXT DEFAULT 'intermediario', -- individual, intermediario, profissional
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- MigraÃ§Ã£o rÃ¡pida para quem jÃ¡ tem a tabela profiles criada:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plano_status TEXT DEFAULT 'trial';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plano_nome TEXT DEFAULT 'intermediario';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');


-- 2. TABELA IMOVEIS (kitnets, quartos, salas, casas)
CREATE TABLE IF NOT EXISTS public.imoveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    apelido_imovel TEXT NOT NULL, -- Ex: "Kitnet 01 - Setor Bueno"
    endereco TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. TABELA INQUILINOS (locatÃ¡rios informais)
CREATE TABLE IF NOT EXISTS public.inquilinos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    imovel_id UUID REFERENCES public.imoveis(id) ON DELETE CASCADE NOT NULL,
    nome_inquilino TEXT NOT NULL,
    whatsapp_inquilino TEXT NOT NULL,
    cpf TEXT,
    valor_aluguel NUMERIC(10, 2) NOT NULL,
    dia_vencimento INT NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 28),
    data_inicio_contrato DATE NOT NULL DEFAULT CURRENT_DATE,
    multa_atraso NUMERIC(5, 2) DEFAULT 2.0, -- % (ex: 2%)
    juros_dia NUMERIC(6, 4) DEFAULT 0.033, -- % ao dia (ex: 0.033%)
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. TABELA COBRANCAS (mensalidades de aluguel)
CREATE TABLE IF NOT EXISTS public.cobrancas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquilino_id UUID REFERENCES public.inquilinos(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    mes_referencia DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    valor_original NUMERIC(10, 2) NOT NULL,
    valor_com_multa NUMERIC(10, 2),
    status TEXT NOT NULL CHECK (status IN ('pendente', 'pago', 'atrasado')) DEFAULT 'pendente',
    data_pagamento DATE,
    link_comprovante TEXT,
    dias_atraso INT DEFAULT 0,
    public_token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. TABELA MENSAGENS_TEMPLATE (templates editÃ¡veis de WhatsApp)
CREATE TABLE IF NOT EXISTS public.mensagens_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('lembrete_3_dias', 'vencimento_hoje', 'atraso_1_dia', 'atraso_5_dias')),
    texto TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, tipo)
);

-- ========================================================
-- TABELA FILA_ENVIO (fila de mensagens para envio diário)
-- Armazena mensagens geradas pelo cron 08:00 com status de envio
-- ========================================================

CREATE TABLE IF NOT EXISTS public.fila_envio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    inquilino_id UUID REFERENCES public.inquilinos(id) ON DELETE CASCADE,
    cobranca_id UUID REFERENCES public.cobrancas(id) ON DELETE CASCADE,
    template_tipo TEXT NOT NULL CHECK (template_tipo IN ('lembrete_3_dias', 'vencimento_hoje', 'atraso_1_dia', 'atraso_5_dias')),
    mensagem_texto TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
    data_criacao TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    data_enviado TIMESTAMPTZ,
    chave_idempotencia UUID NOT NULL DEFAULT uuid_generate_v4(),
    UNIQUE(chave_idempotencia)
);

-- ========================================================
-- SEGURANÃ‡A TOTAL: ROW LEVEL SECURITY (RLS) RIGOROSO
-- Garante isolamento estrito entre locadores
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_template ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas para recriaÃ§Ã£o sem conflitos
DROP POLICY IF EXISTS "Donos so veem seus profiles" ON public.profiles;
DROP POLICY IF EXISTS "Donos so veem seus imoveis" ON public.imoveis;
DROP POLICY IF EXISTS "Donos so veem seus inquilinos" ON public.inquilinos;
DROP POLICY IF EXISTS "Donos so veem suas cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Inquilino pode consultar fatura publica por id" ON public.cobrancas;
DROP POLICY IF EXISTS "Donos so veem seus templates" ON public.mensagens_template;

-- 1. Profiles: Apenas o prÃ³prio locador lÃª e atualiza seu perfil
CREATE POLICY "Donos so veem seus profiles" ON public.profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. ImÃ³veis: Locador sÃ³ acessa os imÃ³veis que pertencem ao seu user_id
CREATE POLICY "Donos so veem seus imoveis" ON public.imoveis
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Inquilinos: Locador sÃ³ acessa os inquilinos que pertencem ao seu user_id
CREATE POLICY "Donos so veem seus inquilinos" ON public.inquilinos
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. CobranÃ§as: OperaÃ§Ãµes completas apenas pelo dono. O acesso pÃºblico Ã© feito
-- exclusivamente pela RPC get_public_invoice(token), nunca por SELECT direto.
CREATE POLICY "Donos so veem suas cobrancas" ON public.cobrancas
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Templates: Locador sÃ³ acessa seus prÃ³prios modelos de mensagem
CREATE POLICY "Donos so veem seus templates" ON public.mensagens_template
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Fila de envio: Locador sÃ³ gerencia sua própria fila
CREATE POLICY "Donos so gerenciam sua fila de envio" ON public.fila_envio
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Defesa em profundidade: o papel anÃ´nimo nÃ£o acessa tabelas diretamente.
-- A fatura pÃºblica Ã© servida apenas pela RPC SECURITY DEFINER abaixo.
REVOKE ALL ON TABLE public.profiles, public.imoveis, public.inquilinos,
    public.cobrancas, public.mensagens_template FROM anon;

-- ========================================================
-- TRIGGER PARA CRIAR PROFILE E TEMPLATES APÃ“S O CADASTRO
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Locador'));

    -- Inserir templates padrÃ£o de WhatsApp com as variÃ¡veis
    INSERT INTO public.mensagens_template (user_id, tipo, texto)
    VALUES 
    (NEW.id, 'lembrete_3_dias', 'OlÃ¡, {{nome}}! Tudo bem? Passando para lembrar que o aluguel do imÃ³vel {{endereco}} vence em 3 dias ({{vencimento}}), no valor de {{valor}}. Chave Pix: {{pix}}. Link da fatura com QR Code: {{link}}. Qualquer dÃºvida, estou Ã  disposiÃ§Ã£o!'),
    (NEW.id, 'vencimento_hoje', 'OlÃ¡, {{nome}}! Hoje Ã© o dia do vencimento do seu aluguel ({{endereco}}). Valor: {{valor}}. VocÃª pode pagar pela chave Pix: {{pix}}. Link para ver a fatura e comprovante: {{link}}. Obrigado!'),
    (NEW.id, 'atraso_1_dia', 'OlÃ¡, {{nome}}. Notamos que o aluguel do imÃ³vel {{endereco}} venceu ontem. O valor atualizado com multa e juros Ã© de {{valor}}. Por favor, realize o pagamento via Pix: {{pix}}. Fatura: {{link}}. Caso jÃ¡ tenha pago, por favor nos envie o comprovante!'),
    (NEW.id, 'atraso_5_dias', 'OlÃ¡, {{nome}}. Seu aluguel do imÃ³vel {{endereco}} estÃ¡ com 5 dias de atraso. O valor recalculado hoje Ã© de {{valor}}. Chave Pix: {{pix}}. Fatura: {{link}}. Pedimos que regularize com urgÃªncia ou entre em contato para alinharmos.');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================
-- AGENDAMENTO PG_CRON: ROTINA DIÁRIA DAS 08:00 BRT (11:00 UTC)
-- ========================================================
-- Para ativar no Supabase, execute este script no SQL Editor:
-- Substitua 'SEU_PROJETO' pelo ID do seu projeto Supabase e 'SUA_ANON_KEY' pela sua chave de serviço.

SELECT cron.schedule(
    'rotina-0800',
    '0 11 * * *', -- 11:00 UTC = 08:00 Horário de Brasília
    $$
    SELECT net.http_post(
        url := 'https://SEU_PROJETO.supabase.co/functions/v1/rotina-cobranca-diaria',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY'
        ),
        body := '{}'::jsonb
    );
$$;

-- ========================================================
-- ONBOARDING TRANSACIONAL (FASE 1)
-- Cria perfil, imÃ³vel, inquilino e as 12 primeiras cobranÃ§as.
-- ========================================================

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_nome text,
  p_whatsapp text,
  p_chave_pix text,
  p_tipo_chave_pix text,
  p_imovel_apelido text,
  p_imovel_endereco text,
  p_inquilino_nome text,
  p_inquilino_whatsapp text,
  p_inquilino_cpf text,
  p_valor_aluguel numeric,
  p_dia_vencimento int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_imovel public.imoveis;
  v_inquilino public.inquilinos;
  v_mes_base date := date_trunc('month', current_date)::date;
  v_dia int := least(greatest(coalesce(p_dia_vencimento, 1), 1), 28);
  v_i int;
  v_mes date;
  v_vencimento date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_nome IS NULL OR length(trim(p_nome)) = 0 THEN
    RAISE EXCEPTION 'nome_obrigatorio' USING ERRCODE = '22023';
  END IF;

  IF p_imovel_apelido IS NULL OR length(trim(p_imovel_apelido)) = 0
     OR p_imovel_endereco IS NULL OR length(trim(p_imovel_endereco)) = 0 THEN
    RAISE EXCEPTION 'imovel_obrigatorio' USING ERRCODE = '22023';
  END IF;

  IF p_inquilino_nome IS NULL OR length(trim(p_inquilino_nome)) = 0
     OR p_inquilino_whatsapp IS NULL OR length(trim(p_inquilino_whatsapp)) = 0 THEN
    RAISE EXCEPTION 'inquilino_obrigatorio' USING ERRCODE = '22023';
  END IF;

  IF p_valor_aluguel IS NULL OR p_valor_aluguel <= 0 THEN
    RAISE EXCEPTION 'valor_aluguel_invalido' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
     SET nome = trim(p_nome),
         whatsapp_dono = p_whatsapp,
         chave_pix_dono = p_chave_pix,
         tipo_chave_pix = p_tipo_chave_pix,
         onboarding_concluido = true
   WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.imoveis (user_id, apelido_imovel, endereco)
  VALUES (v_user_id, trim(p_imovel_apelido), trim(p_imovel_endereco))
  RETURNING * INTO v_imovel;

  INSERT INTO public.inquilinos (
    user_id,
    imovel_id,
    nome_inquilino,
    whatsapp_inquilino,
    cpf,
    valor_aluguel,
    dia_vencimento,
    data_inicio_contrato,
    multa_atraso,
    juros_dia,
    ativo
  )
  VALUES (
    v_user_id,
    v_imovel.id,
    trim(p_inquilino_nome),
    trim(p_inquilino_whatsapp),
    nullif(trim(coalesce(p_inquilino_cpf, '')), ''),
    p_valor_aluguel,
    v_dia,
    current_date,
    2.0,
    0.033,
    true
  )
  RETURNING * INTO v_inquilino;

  FOR v_i IN 0..11 LOOP
    v_mes := (v_mes_base + (v_i || ' month')::interval)::date;
    v_vencimento := (date_trunc('month', v_mes) + ((v_dia - 1) || ' day')::interval)::date;

    INSERT INTO public.cobrancas (
      inquilino_id,
      user_id,
      mes_referencia,
      data_vencimento,
      valor_original,
      status,
      dias_atraso
    )
    VALUES (
      v_inquilino.id,
      v_user_id,
      v_mes,
      v_vencimento,
      p_valor_aluguel,
      'pendente',
      0
    );
  END LOOP;

  RETURN jsonb_build_object(
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_user_id),
    'imovel', to_jsonb(v_imovel),
    'inquilino', to_jsonb(v_inquilino),
    'cobrancas', (
      SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.data_vencimento), '[]'::jsonb)
      FROM public.cobrancas c
      WHERE c.inquilino_id = v_inquilino.id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_onboarding(
  text, text, text, text, text, text, text, text, text, numeric, int
) FROM public;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(
  text, text, text, text, text, text, text, text, text, numeric, int
) TO authenticated;

-- ========================================================
-- FASE 2: FATURA PÃšBLICA POR TOKEN OPACO
-- Retorna somente os campos necessÃ¡rios para o inquilino pagar.
-- NÃ£o expÃµe user_id, e-mail, CPF, WhatsApp do inquilino nem IDs internos.
-- ========================================================

CREATE OR REPLACE FUNCTION public.get_public_invoice(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'cobranca', jsonb_build_object(
      'id', c.id,
      'mes_referencia', c.mes_referencia,
      'data_vencimento', c.data_vencimento,
      'valor_original', c.valor_original,
      'valor_com_multa', c.valor_com_multa,
      'status', c.status,
      'data_pagamento', c.data_pagamento,
      'dias_atraso', c.dias_atraso,
      'public_token', c.public_token
    ),
    'inquilino', jsonb_build_object(
      'nome_inquilino', i.nome_inquilino,
      'multa_atraso', i.multa_atraso,
      'juros_dia', i.juros_dia
    ),
    'imovel', jsonb_build_object(
      'apelido_imovel', im.apelido_imovel,
      'endereco', im.endereco
    ),
    'locador', jsonb_build_object(
      'nome', p.nome,
      'whatsapp_dono', p.whatsapp_dono,
      'chave_pix_dono', p.chave_pix_dono,
      'cidade_pix', p.cidade_pix
    )
  )
  FROM public.cobrancas c
  JOIN public.inquilinos i ON i.id = c.inquilino_id
  JOIN public.imoveis im ON im.id = i.imovel_id
  JOIN public.profiles p ON p.id = c.user_id
  WHERE c.public_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_invoice(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_invoice(uuid) TO anon, authenticated;
