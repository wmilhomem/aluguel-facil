import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    'Defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY para rodar o teste.',
  );
  process.exit(2);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password = `Test-${randomUUID()}`;
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const failures = [];
const createdUserIds = [];

function assert(condition, message) {
  if (condition) {
    console.log(`PASS ${message}`);
    return;
  }
  failures.push(message);
  console.error(`FAIL ${message}`);
}

function assertEmpty(data, message) {
  assert(Array.isArray(data) && data.length === 0, message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (data) return;
    await sleep(250);
  }
  throw new Error(`Perfil não foi criado pelo trigger para ${userId}`);
}

async function createUser(label) {
  const email = `phase2-${label}-${suffix}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome: `Locador ${label.toUpperCase()}` },
  });

  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error(`createUser não retornou id para ${label}`);

  createdUserIds.push(userId);
  await waitForProfile(userId);

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: userId, email, client };
}

async function insertProperty(user) {
  const { data, error } = await user.client
    .from('imoveis')
    .insert({
      user_id: user.id,
      apelido_imovel: `Imóvel ${user.email}`,
      endereco: `Rua de Teste ${user.email}`,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function insertTenant(user, imovel) {
  const { data, error } = await user.client
    .from('inquilinos')
    .insert({
      user_id: user.id,
      imovel_id: imovel.id,
      nome_inquilino: `Inquilino ${user.email}`,
      whatsapp_inquilino: '62999999999',
      valor_aluguel: 1000,
      dia_vencimento: 10,
      data_inicio_contrato: '2026-01-01',
      multa_atraso: 2,
      juros_dia: 0.033,
      ativo: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function insertCharge(user, inquilino) {
  const { data, error } = await user.client
    .from('cobrancas')
    .insert({
      inquilino_id: inquilino.id,
      user_id: user.id,
      mes_referencia: '2026-11-01',
      data_vencimento: '2026-11-10',
      valor_original: 1000,
      status: 'pendente',
      dias_atraso: 0,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function run() {
  const userA = await createUser('a');
  const userB = await createUser('b');

  const { error: profileBError } = await userB.client
    .from('profiles')
    .update({ chave_pix_dono: '62999999999', whatsapp_dono: '62999999999' })
    .eq('id', userB.id);
  if (profileBError) throw profileBError;

  const imovelA = await insertProperty(userA);
  const imovelB = await insertProperty(userB);
  const inquilinoA = await insertTenant(userA, imovelA);
  const inquilinoB = await insertTenant(userB, imovelB);
  const cobrancaA = await insertCharge(userA, inquilinoA);
  const cobrancaB = await insertCharge(userB, inquilinoB);

  assert(Boolean(cobrancaB.public_token), 'cobrança criada recebe public_token do banco');

  const { data: imoveisDeB } = await userA.client
    .from('imoveis')
    .select('*')
    .eq('user_id', userB.id);
  assertEmpty(imoveisDeB, 'A não lista imóveis de B');

  const { data: inquilinosDeB } = await userA.client
    .from('inquilinos')
    .select('*')
    .eq('user_id', userB.id);
  assertEmpty(inquilinosDeB, 'A não lista inquilinos de B');

  const { data: cobrancasDeB } = await userA.client
    .from('cobrancas')
    .select('*')
    .eq('user_id', userB.id);
  assertEmpty(cobrancasDeB, 'A não lista cobranças de B');

  const { data: profileDeB } = await userA.client
    .from('profiles')
    .select('*')
    .eq('id', userB.id);
  assertEmpty(profileDeB, 'A não lê o perfil de B');

  const { data: templatesDeB } = await userA.client
    .from('mensagens_template')
    .select('*')
    .eq('user_id', userB.id);
  assertEmpty(templatesDeB, 'A não lê templates de B');

  const { data: cobrancaDiretaDeB } = await userA.client
    .from('cobrancas')
    .select('*')
    .eq('id', cobrancaB.id);
  assertEmpty(cobrancaDiretaDeB, 'A não lê a cobrança de B pelo ID');

  const { data: updateImovelDeB } = await userA.client
    .from('imoveis')
    .update({ apelido_imovel: 'invadido' })
    .eq('id', imovelB.id)
    .select('*');
  assertEmpty(updateImovelDeB, 'A não atualiza imóvel de B');

  const { data: deleteImovelDeB } = await userA.client
    .from('imoveis')
    .delete()
    .eq('id', imovelB.id)
    .select('*');
  assertEmpty(deleteImovelDeB, 'A não exclui imóvel de B');

  const { data: updateCobrancaDeB } = await userA.client
    .from('cobrancas')
    .update({ status: 'pago' })
    .eq('id', cobrancaB.id)
    .select('*');
  assertEmpty(updateCobrancaDeB, 'A não altera cobrança de B');

  const { error: insertForBError } = await userA.client.from('imoveis').insert({
    user_id: userB.id,
    apelido_imovel: 'Imóvel forjado',
    endereco: 'Rua forjada',
  });
  assert(Boolean(insertForBError), 'A não insere imóvel em nome de B');

  const { data: imovelBAfter, error: imovelBAfterError } = await admin
    .from('imoveis')
    .select('*')
    .eq('id', imovelB.id)
    .maybeSingle();
  assert(!imovelBAfterError && imovelBAfter?.apelido_imovel !== 'invadido', 'imóvel de B permanece intacto');

  const { data: cobrancaBAfter } = await admin
    .from('cobrancas')
    .select('status')
    .eq('id', cobrancaB.id)
    .maybeSingle();
  assert(cobrancaBAfter?.status === 'pendente', 'cobrança de B permanece pendente');

  const { data: anonCobrancas, error: anonCobrancasError } = await anon
    .from('cobrancas')
    .select('*')
    .limit(1);
  assert(
    Boolean(anonCobrancasError) || (Array.isArray(anonCobrancas) && anonCobrancas.length === 0),
    'anônimo não lê cobranças diretamente',
  );

  const { data: publicB, error: publicBError } = await anon.rpc('get_public_invoice', {
    p_token: cobrancaB.public_token,
  });
  assert(!publicBError && Boolean(publicB), 'anônimo lê a fatura pública pelo token');
  assert(publicB?.cobranca?.id === cobrancaB.id, 'fatura pública retorna a cobrança correta');
  assert(
    publicB?.inquilino?.nome_inquilino === inquilinoB.nome_inquilino,
    'fatura pública retorna o inquilino correto',
  );
  assert(
    publicB?.locador?.nome === `Locador B`,
    'fatura pública retorna o locador correto',
  );

  const serialized = JSON.stringify(publicB);
  assert(!serialized.includes('user_id'), 'fatura pública não expõe user_id');
  assert(!serialized.includes('"cpf"'), 'fatura pública não expõe CPF');
  assert(!serialized.includes('whatsapp_inquilino'), 'fatura pública não expõe WhatsApp do inquilino');
  assert(!serialized.includes('link_comprovante'), 'fatura pública não expõe link de comprovante');

  const { data: publicByWrongToken, error: publicByWrongTokenError } = await anon.rpc(
    'get_public_invoice',
    { p_token: randomUUID() },
  );
  assert(
    !publicByWrongTokenError && publicByWrongToken === null,
    'token aleatório não retorna fatura',
  );

  const { data: publicA } = await anon.rpc('get_public_invoice', {
    p_token: cobrancaA.public_token,
  });
  assert(publicA?.cobranca?.id === cobrancaA.id, 'cada token retorna somente sua própria fatura');
}

try {
  await run();
} catch (error) {
  console.error('ERRO NO TESTE:', error instanceof Error ? error.message : error);
  failures.push('erro inesperado durante o teste');
} finally {
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} verificação(ões) falharam.`);
  process.exit(1);
}

console.log('\nTodas as verificações de isolamento da Fase 2 passaram.');
