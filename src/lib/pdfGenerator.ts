import jsPDF from 'jspdf';
import { Inquilino, Imovel, Cobranca, Profile } from '../types/database';
import { formatCurrency, formatDate, getMonthName } from './billingEngine';

/**
 * Gera PDF de Contrato de Locação Residencial Simples
 */
export function generateContractPDF(inquilino: Inquilino, imovel: Imovel, profile: Profile): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [15, 23, 42]; // Slate-900
  const indigoColor = [79, 70, 229]; // Indigo-600
  const textColor = [51, 65, 85]; // Slate-700

  // Header Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CONTRATO SIMPLIFICADO DE LOCAÇÃO RESIDENCIAL', 105, 15, { align: 'center' });

  // Reset text color
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  let y = 36;

  // Seção 1: Partes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
  doc.text('1. DAS PARTES CONTRATANTES', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const locadorTxt = `LOCADOR(A): ${profile.nome || 'Proprietário'}, WhatsApp: ${profile.whatsapp_dono || 'Não informado'}, Chave Pix: ${profile.chave_pix_dono || 'Não informada'}.`;
  const locatarioTxt = `LOCATÁRIO(A): ${inquilino.nome_inquilino}, CPF: ${inquilino.cpf || 'Não informado'}, WhatsApp: ${inquilino.whatsapp_inquilino}.`;

  const splitLocador = doc.splitTextToSize(locadorTxt, 170);
  doc.text(splitLocador, 20, y);
  y += splitLocador.length * 5 + 3;

  const splitLocatario = doc.splitTextToSize(locatarioTxt, 170);
  doc.text(splitLocatario, 20, y);
  y += splitLocatario.length * 5 + 6;

  // Seção 2: Imóvel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
  doc.text('2. DO OBJETO E IMÓVEL LOCADO', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const imovelTxt = `O presente contrato tem como objeto a locação para fins estritamente residenciais da unidade denominada "${imovel.apelido_imovel}", situada no seguinte endereço: ${imovel.endereco}.`;
  const splitImovel = doc.splitTextToSize(imovelTxt, 170);
  doc.text(splitImovel, 20, y);
  y += splitImovel.length * 5 + 6;

  // Seção 3: Valores e Vencimento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
  doc.text('3. DO VALOR DO ALUGUEL, VENCIMENTO E ENCARGOS', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const valorTxt = `O valor mensal do aluguel ajustado é de ${formatCurrency(inquilino.valor_aluguel)}, devendo ser pago impreterivelmente até o dia ${inquilino.dia_vencimento} de cada mês.`;
  const splitValor = doc.splitTextToSize(valorTxt, 170);
  doc.text(splitValor, 20, y);
  y += splitValor.length * 5 + 3;

  const penalidadeTxt = `Em caso de atraso no pagamento, incidirá multa moratória de ${inquilino.multa_atraso}% sobre o valor do aluguel, acrescida de juros de mora diários de ${inquilino.juros_dia}% ao dia até a efetiva quitação.`;
  const splitPenalidade = doc.splitTextToSize(penalidadeTxt, 170);
  doc.text(splitPenalidade, 20, y);
  y += splitPenalidade.length * 5 + 3;

  const formaPagtoTxt = `O pagamento será efetuado preferencialmente via PIX na chave: ${profile.chave_pix_dono || 'Informada pelo locador'} (${profile.tipo_chave_pix || 'Chave cadastrada'}).`;
  const splitForma = doc.splitTextToSize(formaPagtoTxt, 170);
  doc.text(splitForma, 20, y);
  y += splitForma.length * 5 + 6;

  // Seção 4: Prazo e Obrigações
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
  doc.text('4. DO PRAZO E REGRAS BÁSICAS', 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const regras = [
    `• Início da locação: ${formatDate(inquilino.data_inicio_contrato)}, por prazo indeterminado ou pelo período acordado entre as partes.`,
    '• O locatário declara receber o imóvel em perfeito estado de conservação e limpeza, comprometendo-se a mantê-lo e devolvê-lo nas mesmas condições.',
    '• Fica proibida a sublocação, empréstimo ou cessão do imóvel a terceiros sem prévia autorização por escrito do locador.',
    '• Contas de consumo individuais (energia, água ou rateio de condomínio/taxas) devem ser pagas pontualmente pelo locatário.',
    '• A rescisão imotivada por qualquer das partes deverá ser avisada com antecedência mínima de 30 (trinta) dias.',
  ];

  for (const regra of regras) {
    const splitRegra = doc.splitTextToSize(regra, 170);
    doc.text(splitRegra, 20, y);
    y += splitRegra.length * 4.8;
  }

  y += 12;
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Data do documento: ${dataHoje}.`, 20, y);

  // Assinaturas
  y += 24;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, y, 90, y);
  doc.line(120, y, 190, y);

  doc.setFontSize(9);
  doc.text('LOCADOR(A)', 55, y + 5, { align: 'center' });
  doc.text(profile.nome || 'Proprietário', 55, y + 10, { align: 'center' });

  doc.text('LOCATÁRIO(A)', 155, y + 5, { align: 'center' });
  doc.text(inquilino.nome_inquilino, 155, y + 10, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Gerado digitalmente via Aluguel Fácil • Sistema Simplificado de Cobrança e Gestão de Aluguéis', 105, 287, {
    align: 'center',
  });

  doc.save(`Contrato_${inquilino.nome_inquilino.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Gera PDF de Recibo de Pagamento de Aluguel
 */
export function generateReceiptPDF(cobranca: Cobranca, inquilino: Inquilino, imovel: Imovel, profile: Profile): void {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a5',
    orientation: 'landscape',
  });

  const primaryColor = [15, 23, 42]; // Slate-900
  const emeraldColor = [16, 185, 129]; // Emerald-500
  const textColor = [51, 65, 85]; // Slate-700

  // Top header badge
  doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.rect(0, 0, 210, 16, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RECIBO FORMAL DE QUITAÇÃO DE ALUGUEL', 105, 11, { align: 'center' });

  // Card background
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, 22, 186, 110, 3, 3, 'FD');

  // Value highlight box
  doc.setFillColor(241, 245, 249);
  doc.rect(140, 26, 54, 18, 'F');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR PAGO', 167, 32, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129);
  const valorFinal = cobranca.valor_com_multa || cobranca.valor_original;
  doc.text(formatCurrency(valorFinal), 167, 40, { align: 'center' });

  // Receipt Number & Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nº Recibo: #${cobranca.id.slice(-8).toUpperCase()}`, 18, 32);
  const dataPagto = cobranca.data_pagamento ? formatDate(cobranca.data_pagamento) : formatDate(new Date().toISOString());
  doc.text(`Data do Pagamento: ${dataPagto}`, 18, 38);

  // Main declaration text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  const mesExtenso = getMonthName(cobranca.mes_referencia);
  const declaracao = `Recebi de ${inquilino.nome_inquilino}${inquilino.cpf ? ` (CPF: ${inquilino.cpf})` : ''} a importância de ${formatCurrency(valorFinal)}, correspondente à quitação integral do aluguel residencial referente ao mês de ${mesExtenso}, referente à locação do imóvel: "${imovel.apelido_imovel}" situado em: ${imovel.endereco}.`;

  const splitDeclaracao = doc.splitTextToSize(declaracao, 174);
  doc.text(splitDeclaracao, 18, 52);

  // Details footer
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Vencimento original: ${formatDate(cobranca.data_vencimento)}`, 18, 76);
  if (cobranca.dias_atraso > 0) {
    doc.text(`Status: Pago com regularização de ${cobranca.dias_atraso} dia(s) de atraso.`, 18, 82);
  } else {
    doc.text('Status: Pago pontualmente. Quitação plena dada pelo locador.', 18, 82);
  }

  // Signature line
  doc.setDrawColor(203, 213, 225);
  doc.line(110, 108, 188, 108);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(profile.nome || 'Locador(a)', 149, 114, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Pix: ${profile.chave_pix_dono || 'Cadastrada'}`, 149, 119, { align: 'center' });

  // System Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Recibo autenticado pelo Aluguel Fácil • www.aluguelfacil.com.br', 105, 142, { align: 'center' });

  doc.save(`Recibo_${inquilino.nome_inquilino.replace(/\s+/g, '_')}_${mesExtenso.replace(/\s+/g, '_')}.pdf`);
}
