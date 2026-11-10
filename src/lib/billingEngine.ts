import { Cobranca, Inquilino, Imovel, Profile, MensagemTemplate, FilaEnvioItem, TipoMensagem } from '../types/database';

/**
 * Formata moeda no padrão brasileiro R$ 1.250,00
 */
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
}

/**
 * Formata data no formato DD/MM/AAAA
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

/**
 * Retorna o nome do mês por extenso
 */
export function getMonthName(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * Calcula os dias de diferença entre hoje e a data de vencimento.
 * Retorno:
 * < 0: faltam X dias para vencer
 * 0: vence hoje
 * > 0: está X dias atrasado
 */
export function getDaysDifference(dueDateStr: string, referenceDate: Date = new Date()): number {
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const [y, m, d] = dueDateStr.split('T')[0].split('-').map(Number);
  const due = new Date(y, m - 1, d);

  const diffTime = ref.getTime() - due.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula o valor com multa e juros diários caso haja atraso:
 * valor_com_multa = valor_original + (valor_original * multa_atraso%) + (valor_original * juros_dia% * dias_atraso)
 */
export function calculateUpdatedAmount(
  valorOriginal: number,
  multaAtrasoPercent: number,
  jurosDiaPercent: number,
  diasAtraso: number
): { valorFinal: number; valorMulta: number; valorJuros: number } {
  if (diasAtraso <= 0) {
    return { valorFinal: valorOriginal, valorMulta: 0, valorJuros: 0 };
  }

  const valorMulta = valorOriginal * (multaAtrasoPercent / 100);
  const valorJuros = valorOriginal * (jurosDiaPercent / 100) * diasAtraso;
  const valorFinal = Number((valorOriginal + valorMulta + valorJuros).toFixed(2));

  return {
    valorFinal,
    valorMulta: Number(valorMulta.toFixed(2)),
    valorJuros: Number(valorJuros.toFixed(2)),
  };
}

/**
 * Gera as próximas 12 cobranças a partir da data de início do contrato
 */
export function generate12Charges(inquilino: Inquilino, userId: string): Cobranca[] {
  const cobrancas: Cobranca[] = [];
  const [startYear, startMonth] = inquilino.data_inicio_contrato.split('-').map(Number);
  const diaVenc = Math.min(Math.max(1, inquilino.dia_vencimento), 28);
  const today = new Date();

  for (let i = 0; i < 12; i++) {
    const chargeDate = new Date(startYear, startMonth - 1 + i, 1);
    const y = chargeDate.getFullYear();
    const m = String(chargeDate.getMonth() + 1).padStart(2, '0');
    const d = String(diaVenc).padStart(2, '0');
    const dueDateStr = `${y}-${m}-${d}`;
    const mesRefStr = `${y}-${m}-01`;

    const diffDays = getDaysDifference(dueDateStr, today);
    let status: Cobranca['status'] = 'pendente';
    let valorComMulta = inquilino.valor_aluguel;

    if (diffDays > 0) {
      status = 'atrasado';
      const calc = calculateUpdatedAmount(
        inquilino.valor_aluguel,
        inquilino.multa_atraso,
        inquilino.juros_dia,
        diffDays
      );
      valorComMulta = calc.valorFinal;
    }

    cobrancas.push({
      id: `cob_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      inquilino_id: inquilino.id,
      user_id: userId,
      mes_referencia: mesRefStr,
      data_vencimento: dueDateStr,
      valor_original: inquilino.valor_aluguel,
      valor_com_multa: status === 'atrasado' ? valorComMulta : undefined,
      status,
      dias_atraso: diffDays > 0 ? diffDays : 0,
      public_token: createPublicToken(),
      created_at: new Date().toISOString(),
    });
  }

  return cobrancas;
}

/**
 * Substitui variáveis no template de mensagem
 */
export function renderTemplate(
  templateText: string,
  variables: {
    nome: string;
    valor: string;
    pix: string;
    endereco: string;
    vencimento: string;
    mes: string;
    link: string;
  }
): string {
  let result = templateText;
  result = result.replace(/\{\{nome\}\}/g, variables.nome);
  result = result.replace(/\{\{valor\}\}/g, variables.valor);
  result = result.replace(/\{\{pix\}\}/g, variables.pix);
  result = result.replace(/\{\{endereco\}\}/g, variables.endereco);
  result = result.replace(/\{\{vencimento\}\}/g, variables.vencimento);
  result = result.replace(/\{\{mes\}\}/g, variables.mes);
  result = result.replace(/\{\{link\}\}/g, variables.link);
  return result;
}

/**
 * Limpa número de WhatsApp e garante DDI 55
 */
export function cleanWhatsAppNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  return `55${digits}`;
}

/**
 * Gera link oficial wa.me para disparo
 */
export function createWhatsAppUrl(phone: string, text: string): string {
  const clean = cleanWhatsAppNumber(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

/**
 * Gera um token opaco (UUID v4) para o link público da fatura.
 * O token não expõe o ID interno da cobrança e pode ser revogado no banco.
 */
export function createPublicToken(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Monta o link público da fatura usando o token opaco.
 * Em modo conectado, o token é obrigatório para que a RPC encontre a cobrança.
 */
export function buildPublicInvoiceUrl(cobranca: Pick<Cobranca, 'public_token'>): string {
  if (!cobranca.public_token) return '';
  const configured = import.meta.env.VITE_APP_URL as string | undefined;
  const appOrigin =
    configured ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://aluguelfacil.app');
  return `${appOrigin.replace(/\/$/, '')}/#fatura-${cobranca.public_token}`;
}

/**
 * Executa a lógica da rotina de cobrança das 08:00
 * Verifica cobranças pendentes e gera a fila de envio
 */
export function runCronBillingCheck(
  cobrancas: Cobranca[],
  inquilinos: Inquilino[],
  imoveis: Imovel[],
  profile: Profile,
  templates: MensagemTemplate[],
  referenceDate: Date = new Date()
): { fila: FilaEnvioItem[]; cobrancasAtualizadas: Cobranca[] } {
  const fila: FilaEnvioItem[] = [];
  const cobrancasAtualizadas: Cobranca[] = [];

  const templatesMap = new Map<TipoMensagem, string>();
  templates.forEach((t) => templatesMap.set(t.tipo, t.texto));

  const inquilinosMap = new Map<string, Inquilino>();
  inquilinos.forEach((inq) => inquilinosMap.set(inq.id, inq));

  const imoveisMap = new Map<string, Imovel>();
  imoveis.forEach((imo) => imoveisMap.set(imo.id, imo));

  for (const cob of cobrancas) {
    if (cob.status === 'pago') {
      cobrancasAtualizadas.push(cob);
      continue;
    }

    const inquilino = inquilinosMap.get(cob.inquilino_id);
    if (!inquilino || !inquilino.ativo) {
      cobrancasAtualizadas.push(cob);
      continue;
    }

    const imovel = imoveisMap.get(inquilino.imovel_id);
    const diffDays = getDaysDifference(cob.data_vencimento, referenceDate);

    let updatedCob = { ...cob };
    let tipoMsg: TipoMensagem | null = null;
    let tituloMsg = '';
    let valorCobranca = cob.valor_original;

    if (diffDays === -3) {
      // Falta exatamente 3 dias para vencer
      tipoMsg = 'lembrete_3_dias';
      tituloMsg = '⏰ Lembrete: Vence em 3 dias';
      updatedCob.status = 'pendente';
      updatedCob.dias_atraso = 0;
    } else if (diffDays === 0) {
      // Vence hoje!
      tipoMsg = 'vencimento_hoje';
      tituloMsg = '📅 Vence Hoje';
      updatedCob.status = 'pendente';
      updatedCob.dias_atraso = 0;
    } else if (diffDays >= 1) {
      // Atrasado
      updatedCob.status = 'atrasado';
      updatedCob.dias_atraso = diffDays;
      const { valorFinal } = calculateUpdatedAmount(
        cob.valor_original,
        inquilino.multa_atraso || 2.0,
        inquilino.juros_dia || 0.033,
        diffDays
      );
      updatedCob.valor_com_multa = valorFinal;
      valorCobranca = valorFinal;

      if (diffDays >= 5) {
        tipoMsg = 'atraso_5_dias';
        tituloMsg = `🚨 Atraso Crítico (${diffDays} dias)`;
      } else {
        tipoMsg = 'atraso_1_dia';
        tituloMsg = `⚠️ Atraso (${diffDays} ${diffDays === 1 ? 'dia' : 'dias'})`;
      }
    } else {
      updatedCob.status = 'pendente';
      updatedCob.dias_atraso = 0;
    }

    cobrancasAtualizadas.push(updatedCob);

    if (tipoMsg) {
      const templateRaw = templatesMap.get(tipoMsg) || getDefaultTemplateText(tipoMsg);
      const faturaUrl = buildPublicInvoiceUrl(cob);

      const texto = renderTemplate(templateRaw, {
        nome: inquilino.nome_inquilino,
        valor: formatCurrency(valorCobranca),
        pix: profile.chave_pix_dono || 'Chave Pix a definir',
        endereco: imovel?.apelido_imovel || 'Imóvel residencial',
        vencimento: formatDate(cob.data_vencimento),
        mes: getMonthName(cob.mes_referencia),
        link: faturaUrl,
      });

      const linkWa = createWhatsAppUrl(inquilino.whatsapp_inquilino, texto);

      fila.push({
        id: `msg_${cob.id}_${tipoMsg}`,
        cobranca_id: cob.id,
        inquilino_id: inquilino.id,
        tipo: tipoMsg,
        titulo: tituloMsg,
        nome_inquilino: inquilino.nome_inquilino,
        whatsapp_inquilino: inquilino.whatsapp_inquilino,
        apelido_imovel: imovel?.apelido_imovel || 'Imóvel',
        valor: valorCobranca,
        data_vencimento: cob.data_vencimento,
        dias_diferenca: diffDays,
        texto_mensagem: texto,
        link_wa: linkWa,
        fatura_url: faturaUrl,
        fatura_token: cob.public_token,
        horario_agendado: '08:00 (Brasília)',
      });
    }
  }

  // Ordenar fila: primeiro vencimentos de hoje, depois lembretes, depois atrasos
  fila.sort((a, b) => {
    const prioridade = {
      vencimento_hoje: 1,
      atraso_1_dia: 2,
      atraso_5_dias: 3,
      lembrete_3_dias: 4,
    };
    return (prioridade[a.tipo] || 99) - (prioridade[b.tipo] || 99);
  });

  return { fila, cobrancasAtualizadas };
}

export function getDefaultTemplateText(tipo: TipoMensagem): string {
  switch (tipo) {
    case 'lembrete_3_dias':
      return 'Olá, {{nome}}! Tudo bem? Passando para lembrar que o aluguel do imóvel {{endereco}} vence em 3 dias ({{vencimento}}), no valor de {{valor}}. Chave Pix: {{pix}}. Link da fatura: {{link}}. Qualquer dúvida, estou à disposição!';
    case 'vencimento_hoje':
      return 'Olá, {{nome}}! Hoje é o dia do vencimento do seu aluguel ({{endereco}}). Valor: {{valor}}. Você pode pagar pela chave Pix: {{pix}}. Link da fatura: {{link}}. Obrigado!';
    case 'atraso_1_dia':
      return 'Olá, {{nome}}. Notamos que o aluguel de {{endereco}} está pendente. O valor recalculado com multa e juros é de {{valor}}. Chave Pix para quitação: {{pix}}. Link da fatura: {{link}}. Caso já tenha pago, por favor nos envie o comprovante!';
    case 'atraso_5_dias':
      return 'Olá, {{nome}}. Seu aluguel de {{endereco}} consta com atraso. O valor recalculado hoje é {{valor}}. Chave Pix: {{pix}}. Fatura: {{link}}. Pedimos que regularize com urgência ou entre em contato para alinharmos.';
  }
}
