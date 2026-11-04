-- ========================================================
-- FASE 2: SEGURANÃ‡A E FATURA PÃšBLICA POR TOKEN
-- Aplicar depois da migraÃ§Ã£o 20261103000001_complete_onboarding.sql
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Token opaco e nÃ£o sequencial para o link pÃºblico da fatura.
ALTER TABLE public.cobrancas ADD COLUMN IF NOT EXISTS public_token UUID;
UPDATE public.cobrancas
   SET public_token = uuid_generate_v4()
 WHERE public_token IS NULL;
ALTER TABLE public.cobrancas ALTER COLUMN public_token SET DEFAULT uuid_generate_v4();
ALTER TABLE public.cobrancas ALTER COLUMN public_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cobrancas_public_token_key
    ON public.cobrancas (public_token);

-- RLS estrito: cada locador sÃ³ acessa os prÃ³prios dados.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_template ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Donos so veem seus profiles" ON public.profiles;
DROP POLICY IF EXISTS "Donos so veem seus imoveis" ON public.imoveis;
DROP POLICY IF EXISTS "Donos so veem seus inquilinos" ON public.inquilinos;
DROP POLICY IF EXISTS "Donos so veem suas cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Inquilino pode consultar fatura publica por id" ON public.cobrancas;
DROP POLICY IF EXISTS "Donos so veem seus templates" ON public.mensagens_template;

CREATE POLICY "Donos so veem seus profiles" ON public.profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Donos so veem seus imoveis" ON public.imoveis
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donos so veem seus inquilinos" ON public.inquilinos
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donos so veem suas cobrancas" ON public.cobrancas
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donos so veem seus templates" ON public.mensagens_template
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- O papel anÃ´nimo nÃ£o acessa tabelas diretamente. A fatura pÃºblica usa a RPC abaixo.
REVOKE ALL ON TABLE public.profiles, public.imoveis, public.inquilinos,
    public.cobrancas, public.mensagens_template FROM anon;

-- Retorna somente os campos necessÃ¡rios para o pagamento da fatura.
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

