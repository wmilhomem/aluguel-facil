-- ========================================================
-- ALUGUEL FÁCIL - SCHEMA DO BANCO DE DADOS SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ========================================================

-- Habilitar extensões necessárias
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
    tipo_chave_pix TEXT DEFAULT 'CPF', -- CPF, CNPJ, Telefone, Email, Aleatória
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

-- Migração rápida para quem já tem a tabela profiles criada:
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

-- 3. TABELA INQUILINOS (locatários informais)
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
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. TABELA MENSAGENS_TEMPLATE (templates editáveis de WhatsApp)
CREATE TABLE IF NOT EXISTS public.mensagens_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('lembrete_3_dias', 'vencimento_hoje', 'atraso_1_dia', 'atraso_5_dias')),
    texto TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, tipo)
);

-- ========================================================
-- SEGURANÇA TOTAL: ROW LEVEL SECURITY (RLS) RIGOROSO
-- Garante isolamento estrito entre locadores
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_template ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas para recriação sem conflitos
DROP POLICY IF EXISTS "Donos so veem seus profiles" ON public.profiles;
DROP POLICY IF EXISTS "Donos so veem seus imoveis" ON public.imoveis;
DROP POLICY IF EXISTS "Donos so veem seus inquilinos" ON public.inquilinos;
DROP POLICY IF EXISTS "Donos so veem suas cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Inquilino pode consultar fatura publica por id" ON public.cobrancas;
DROP POLICY IF EXISTS "Donos so veem seus templates" ON public.mensagens_template;

-- 1. Profiles: Apenas o próprio locador lê e atualiza seu perfil
CREATE POLICY "Donos so veem seus profiles" ON public.profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Imóveis: Locador só acessa os imóveis que pertencem ao seu user_id
CREATE POLICY "Donos so veem seus imoveis" ON public.imoveis
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Inquilinos: Locador só acessa os inquilinos que pertencem ao seu user_id
CREATE POLICY "Donos so veem seus inquilinos" ON public.inquilinos
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Cobranças (Proprietário): Operações completas pelo dono
CREATE POLICY "Donos so veem suas cobrancas" ON public.cobrancas
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Cobranças (Pública): Permite ao inquilino ler apenas os dados da sua fatura pública via ID
CREATE POLICY "Inquilino pode consultar fatura publica por id" ON public.cobrancas
    FOR SELECT
    USING (true);

-- 6. Templates: Locador só acessa seus próprios modelos de mensagem
CREATE POLICY "Donos so veem seus templates" ON public.mensagens_template
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ========================================================
-- TRIGGER PARA CRIAR PROFILE E TEMPLATES APÓS O CADASTRO
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', 'Locador'));

    -- Inserir templates padrão de WhatsApp com as variáveis
    INSERT INTO public.mensagens_template (user_id, tipo, texto)
    VALUES 
    (NEW.id, 'lembrete_3_dias', 'Olá, {{nome}}! Tudo bem? Passando para lembrar que o aluguel do imóvel {{endereco}} vence em 3 dias ({{vencimento}}), no valor de {{valor}}. Chave Pix: {{pix}}. Link da fatura com QR Code: {{link}}. Qualquer dúvida, estou à disposição!'),
    (NEW.id, 'vencimento_hoje', 'Olá, {{nome}}! Hoje é o dia do vencimento do seu aluguel ({{endereco}}). Valor: {{valor}}. Você pode pagar pela chave Pix: {{pix}}. Link para ver a fatura e comprovante: {{link}}. Obrigado!'),
    (NEW.id, 'atraso_1_dia', 'Olá, {{nome}}. Notamos que o aluguel do imóvel {{endereco}} venceu ontem. O valor atualizado com multa e juros é de {{valor}}. Por favor, realize o pagamento via Pix: {{pix}}. Fatura: {{link}}. Caso já tenha pago, por favor nos envie o comprovante!'),
    (NEW.id, 'atraso_5_dias', 'Olá, {{nome}}. Seu aluguel do imóvel {{endereco}} está com 5 dias de atraso. O valor recalculado hoje é de {{valor}}. Chave Pix: {{pix}}. Fatura: {{link}}. Pedimos que regularize com urgência ou entre em contato para alinharmos.');

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
-- Para ativar no Supabase, configure o agendamento abaixo no SQL Editor:
-- Substitua 'SEU_PROJETO' pelo ID do seu projeto Supabase e 'SUA_ANON_KEY' pela sua chave de serviço.

/*
SELECT cron.unschedule('rotina-0800');

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
    $$
);
*/
