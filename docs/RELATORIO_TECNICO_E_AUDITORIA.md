# Relatório Técnico e Auditoria — Aluguel Fácil

> Documento de referência do handover. Consolida o relatório recebido e a auditoria
> realizada diretamente no repositório em 03/11/2026.
>
> **Status em 03/11/2026:** Fase 1 (camada de dados real) e Fase 2 (RLS e fatura
> pública por token) concluídas. Os itens abaixo permanecem como registro do
> estado encontrado na auditoria inicial; as correções aplicadas estão descritas
> em `docs/PLANO_LINHA_DE_BASE.md` e `docs/FASE_2_SEGURANCA_E_FATURA.md`.

## 1. Contexto do produto

- Produto: gestão de aluguéis residenciais para pequenos locadores.
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind CSS v4.
- Backend previsto: Supabase (Postgres, Auth, Edge Functions).
- Pagamentos: Stripe.
- Hospedagem do frontend: Netlify — `https://aluguel.reflexsus.com`.
- Banco: Supabase (conta criada, schema ainda não aplicado).
- Credenciais serão fornecidas em momento oportuno.
- Restrição de produto: **não alterar design, componentes ou cores** sem autorização.

## 2. Estado real do repositório

- 1 commit inicial; working tree limpo no início da auditoria.
- `npm install` padrão falhava com `ERESOLVE` por conflito entre `esbuild@^0.25.0`
  e `vite@8.3.5` (peer `^0.27 || ^0.28`).
- `npm install --legacy-peer-deps` instalava 207 pacotes.
- `npx tsc --noEmit` passava.
- `npm run build` passava; bundle principal ~1.085 kB.
- Nenhum teste automatizado encontrado.
- Frontend não executava nenhum `select` no Supabase: o modo conectado era
  somente escrita.
- IDs locais (`imo_...`, `inq_...`, `cob_...`) não são UUID e violam o schema.
- `user_id` caía em `usr_local` / `usr_demo_dona_maria`.
- Erros de banco eram engolidos com `console.warn`.
- RLS de `cobrancas` usava `USING (true)` e expunha faturas de todos os usuários.
- Fatura pública dependia de estado local e tinha fallback para cobrança arbitrária.
- Stripe Checkout não enviava `trial_period_days` e usava `pix`/`boleto` com
  `mode: 'subscription'` (combinação incompatível).
- Portal do cliente nunca recebia `stripe_customer_id`.
- Webhook falhava aberto sem segredo configurado.
- Cron das 08:00 estava comentado no SQL; Edge Function não persistia fila nem
  renderizava templates.

## 3. Confronto alegação × código

| Alegação do relatório | Situação | Evidência |
| --- | --- | --- |
| App funcional em modo demo | Confere | Seed local em `src/context/AppContext.tsx` |
| Dados reais no Supabase | Parcial | Escritas existem; leituras não |
| IDs compatíveis com o schema | Falso | Prefixos `imo_`, `inq_`, `cob_` |
| Onboarding transacional | Falso | Inserções sequenciais sem rollback |
| RLS protege cobranças | Inseguro | `USING (true)` em `supabase_schema.sql` |
| Fatura pública segura | Inseguro | Fallback local em `FaturaPublicaView.tsx` |
| Stripe com trial | Falso | Checkout sem `trial_period_days` |
| Pix/Boleto na assinatura | Inseguro | Métodos incompatíveis com `subscription` |
| Portal do cliente funcional | Parcial | Falta `stripe_customer_id` |
| Webhook seguro | Inseguro | Fail-open sem segredo |
| Cron diário ativo | Falso | Agendamento comentado |
| PDFs e Pix EMV prontos | Parcial | Sem testes; paginação/overflow pendentes |

## 4. Riscos principais

1. Vazamento de faturas entre locadores por RLS permissiva.
2. Perda de dados por erros silenciosos e onboarding não transacional.
3. Cobrança indevida ou assinatura quebrada no Stripe.
4. Fatura pública exibindo dados de outra cobrança.
5. Build/deploy frágil por conflito de dependências e lockfile ambíguo.

## 5. Conclusão

O produto tem boa cobertura de UI e regras de negócio no cliente, mas a camada de
dados real, a segurança e a integração financeira ainda não estão prontas para
produção. A Linha de Base deve priorizar dados, segurança e cobrança antes de
qualquer evolução visual.
