# Plano de Linha de Base — Aluguel Fácil

> Objetivo: concluir a base técnica do produto sem alterar design, componentes ou
> cores. Cada fase termina com validação e atualização do repositório no GitHub.

## Restrições

- Não alterar layout, componentes visuais, tipografia ou paleta.
- Netlify: `https://aluguel.reflexsus.com`.
- Supabase: schema aplicado em 04/11/2026; RLS e fatura pública validados com `npm run test:rls`.
- Modo demo deve continuar funcional até a virada para produção.

## Decisões pendentes

1. Stripe apenas cartão ou fluxo separado para Pix/Boleto.
2. ~~Link público da fatura por UUID ou por `public_token`.~~ **Resolvido na Fase 2:**
   link por `public_token` UUID opaco, servido pela RPC `get_public_invoice`.
3. Demo via `VITE_DEMO_MODE` ou build separado.
4. Texto jurídico atual ou revisão especializada.
5. Realtime agora ou refetch on focus.

## Fase 0 — Fundação e build

- Corrigir conflito `esbuild`/`vite` e gerar um único lockfile.
- Remover dependências não usadas.
- Adicionar scripts de `typecheck` e limpeza.
- Adicionar testes de caracterização para `billingEngine.ts` e `pixEmv.ts`.

**Aceite:** `npm ci`, `npm run typecheck` e `npm run build` passam em ambiente limpo.

## Fase 1 — Camada de dados real (concluída)

- Repositórios por entidade (`profiles`, `imoveis`, `inquilinos`, `cobrancas`,
  `mensagens_template`).
- Hidratação real a partir do Supabase no login e no `onAuthStateChange`.
- CRUD do contexto usando o banco em modo conectado.
- IDs gerados pelo Postgres (UUID); nunca prefixos locais.
- Onboarding transacional via RPC `complete_onboarding`.
- Erros de dados exibidos ao usuário; nada de `console.warn` silencioso.
- Logout limpa todo o estado local.
- `VITE_DEMO_MODE` explícito; demo automático quando o Supabase não está configurado.

**Aceite:** usuário autenticado lê exatamente o que gravou; onboarding cria perfil,
imóvel, inquilino e 12 cobranças de forma atômica; demo continua funcionando.

## Fase 2 — Segurança e fatura pública (concluída)

- RLS por `auth.uid()` em todas as tabelas.
- Remover `USING (true)` de `cobrancas`.
- Fatura pública via RPC/token seguro, sem fallback local.
- Testes de isolamento entre dois usuários.
- `public_token` UUID opaco por cobrança; a RPC `get_public_invoice` retorna
  somente os campos necessários ao pagamento (sem `user_id`, e-mail, CPF ou
  WhatsApp do inquilino).
- O papel `anon` não lê tabelas diretamente; só executa a RPC da fatura.
- Script `npm run test:rls` valida isolamento entre dois usuários reais; executado com sucesso em 04/11/2026.

**Aceite:** usuário A não acessa dados de B por API nem por URL.

## Fase 3 — Autenticação e onboarding

- Fluxo de confirmação de e-mail.
- Guardas de rota para páginas protegidas.
- Recuperação de senha e estados de erro.
- Onboarding idempotente e retomável.

**Aceite:** rotas protegidas inacessíveis sem sessão; onboarding pode ser refeito sem duplicar dados.

## Fase 4 — Cobrança e rotina diária

- Persistir fila de mensagens e status de cobrança no servidor.
- Edge Function com templates renderizados e idempotência.
- Agendamento diário das 08:00 ativo.
- Painel de execução manual usando o servidor.

**Aceite:** rotina executada duas vezes no mesmo dia não duplica mensagens.

## Fase 5 — Stripe

- Checkout com trial e métodos compatíveis.
- Webhook com validação de assinatura obrigatória.
- Persistir `stripe_customer_id`, `stripe_subscription_id` e status.
- Portal do cliente funcional.
- Mapeamento por `price_id`, não por `includes`.

**Aceite:** assinatura criada, renovada e cancelada refletem no banco e na UI.

## Fase 6 — Documentos, Pix e polimento

- PDFs com paginação e sem overflow.
- Pix EMV com normalização de chave e testes de CRC16.
- Revisão de textos e acessibilidade.
- Observabilidade mínima (erros e eventos críticos).

**Aceite:** documentos gerados corretamente para todos os formatos suportados.

## Definition of Done por fase

- `npm run typecheck` e `npm run build` verdes.
- Testes da fase verdes.
- Nenhuma alteração visual não autorizada.
- Commit e push no GitHub ao final da fase.
