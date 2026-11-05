# Aluguel Fácil

Sistema de cobrança e gestão de aluguéis para locadores informais.

## Rodar localmente

Pré-requisitos: Node.js 20+.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

O app abre em `http://localhost:3000`.

## Modos de execução

- **Demo:** sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` configurados, ou com
  `VITE_DEMO_MODE=true`, o app usa o seed local (Dona Maria Helena).
- **Conectado:** configure as variáveis do Supabase e `VITE_DEMO_MODE=false`.

## Banco de dados

Banco novo: execute `supabase_schema.sql` no SQL Editor do Supabase.

Banco existente: aplique as migrações de `supabase/migrations/` em ordem.

Validação em 04/11/2026: schema aplicado no Supabase e `npm run test:rls` passou
com 24 verificações de isolamento.

## Scripts

```powershell
npm run dev        # servidor de desenvolvimento
npm run typecheck  # TypeScript sem emitir
npm run build      # build de produção
npm run preview    # preview do build
npm run test:rls   # teste de isolamento entre dois usuários (Supabase real)
```

Para `test:rls`, defina `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` no ambiente. A chave de serviço nunca deve ir para o
frontend ou para a Netlify.

## Deploy

- Frontend: Netlify (`https://aluguelfacil.netlify.app`).
- Variáveis públicas: `VITE_APP_URL`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_DEMO_MODE` e `VITE_STRIPE_PUBLISHABLE_KEY`.
- Segredos de Stripe e service role ficam apenas nas Edge Functions/ambiente
  local.
