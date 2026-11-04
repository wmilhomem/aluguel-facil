# Fase 2 — Segurança e fatura pública

## O que mudou

- `cobrancas` ganhou `public_token UUID NOT NULL UNIQUE` com default
  `uuid_generate_v4()`.
- A policy pública `USING (true)` foi removida. Cada locador só acessa linhas
  com `auth.uid() = user_id`.
- O papel `anon` perdeu acesso direto às tabelas do domínio.
- A fatura pública é lida pela RPC `get_public_invoice(p_token uuid)`,
  `SECURITY DEFINER`, com `search_path` fixo e retorno mínimo.
- O link público usa `#fatura-<public_token>`. O ID interno da cobrança não
  aparece mais na URL.
- Em modo conectado não existe fallback local: token inválido retorna
  "Fatura não encontrada". O modo demo continua usando o seed local.

## Aplicação no Supabase

Banco novo: execute `supabase_schema.sql` no SQL Editor.

Banco existente: aplique as migrações em ordem:

1. `supabase/migrations/20261103000001_complete_onboarding.sql`
2. `supabase/migrations/20261103000002_phase2_security_public_invoice.sql`

A migração da Fase 2 preenche `public_token` nas cobranças antigas. Links
antigos no formato `#fatura-<uuid-da-cobranca>` deixam de funcionar; gere os
links novamente a partir do painel/WhatsApp.

## Teste de isolamento

O script cria dois usuários reais, dados independentes e verifica leitura,
update, delete, insert forjado, acesso anônimo direto e a RPC pública.

Defina no ambiente local:

```powershell
$env:SUPABASE_URL="https://SEU_PROJETO.supabase.co"
$env:SUPABASE_ANON_KEY="SUA_ANON_KEY"
$env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
npm run test:rls
```

A `SUPABASE_SERVICE_ROLE_KEY` é usada apenas para criar/remover os usuários de
teste e nunca deve ser exposta no frontend ou na Netlify.

## Critérios de aceite

- Usuário A não lista, lê, altera nem exclui dados de B.
- Usuário A não insere linha com `user_id` de B.
- Anônimo não lê `cobrancas` diretamente.
- Anônimo lê somente a fatura correspondente ao token informado.
- A fatura pública não expõe `user_id`, e-mail, CPF nem WhatsApp do inquilino.
- `npm run typecheck` e `npm run build` passam.
