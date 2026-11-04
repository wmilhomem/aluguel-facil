-- Fase 1: onboarding transacional.
-- Cria perfil, imóvel, inquilino e as 12 primeiras cobranças em uma única transação.
-- Executar depois do schema base (supabase_schema.sql).

create or replace function public.complete_onboarding(
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
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_imovel public.imoveis;
  v_inquilino public.inquilinos;
  v_mes_base date := date_trunc('month', current_date)::date;
  v_dia int := least(greatest(coalesce(p_dia_vencimento, 1), 1), 28);
  v_i int;
  v_mes date;
  v_vencimento date;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'nome_obrigatorio' using errcode = '22023';
  end if;

  if p_imovel_apelido is null or length(trim(p_imovel_apelido)) = 0
     or p_imovel_endereco is null or length(trim(p_imovel_endereco)) = 0 then
    raise exception 'imovel_obrigatorio' using errcode = '22023';
  end if;

  if p_inquilino_nome is null or length(trim(p_inquilino_nome)) = 0
     or p_inquilino_whatsapp is null or length(trim(p_inquilino_whatsapp)) = 0 then
    raise exception 'inquilino_obrigatorio' using errcode = '22023';
  end if;

  if p_valor_aluguel is null or p_valor_aluguel <= 0 then
    raise exception 'valor_aluguel_invalido' using errcode = '22023';
  end if;

  update public.profiles
     set nome = trim(p_nome),
         whatsapp_dono = p_whatsapp,
         chave_pix_dono = p_chave_pix,
         tipo_chave_pix = p_tipo_chave_pix,
         onboarding_concluido = true
   where id = v_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.imoveis (user_id, apelido_imovel, endereco)
  values (v_user_id, trim(p_imovel_apelido), trim(p_imovel_endereco))
  returning * into v_imovel;

  insert into public.inquilinos (
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
  values (
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
  returning * into v_inquilino;

  for v_i in 0..11 loop
    v_mes := (v_mes_base + (v_i || ' month')::interval)::date;
    v_vencimento := (date_trunc('month', v_mes) + ((v_dia - 1) || ' day')::interval)::date;

    insert into public.cobrancas (
      inquilino_id,
      user_id,
      mes_referencia,
      data_vencimento,
      valor_original,
      status,
      dias_atraso
    )
    values (
      v_inquilino.id,
      v_user_id,
      v_mes,
      v_vencimento,
      p_valor_aluguel,
      'pendente',
      0
    );
  end loop;

  return jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_user_id),
    'imovel', to_jsonb(v_imovel),
    'inquilino', to_jsonb(v_inquilino),
    'cobrancas', (
      select coalesce(jsonb_agg(to_jsonb(c) order by c.data_vencimento), '[]'::jsonb)
      from public.cobrancas c
      where c.inquilino_id = v_inquilino.id
    )
  );
end;
$$;

revoke all on function public.complete_onboarding(
  text, text, text, text, text, text, text, text, text, numeric, int
) from public;

grant execute on function public.complete_onboarding(
  text, text, text, text, text, text, text, text, text, numeric, int
) to authenticated;
