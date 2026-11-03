/**
 * Gerador de Payload Pix EMV (BR Code) Padrão Banco Central do Brasil
 * Produz o código "Pix Copia e Cola" oficial compatível com qualquer banco brasileiro.
 */

function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Cálculo do Checksum CRC16-CCITT (Polinômio 0x1021, Init 0xFFFF)
 */
function crc16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Remove acentos e caracteres especiais para compatibilidade com o padrão EMV
 */
function sanitizeText(text: string, maxLength: number): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, maxLength)
    .toUpperCase();
}

export interface PixEMVOptions {
  chave: string;
  nomeRecebedor: string;
  cidade?: string;
  valor?: number;
  txId?: string;
  mensagem?: string;
}

/**
 * Gera a string Pix Copia e Cola oficial (EMV BR Code)
 */
export function generatePixEMV(options: PixEMVOptions): string {
  const { chave, nomeRecebedor, cidade = 'GOIANIA', valor, txId, mensagem } = options;

  if (!chave) {
    return '';
  }

  // 00: Payload Format Indicator (01)
  let payload = formatTLV('00', '01');

  // 26: Merchant Account Information (Pix)
  // Sub-campos: 00: GUI ("br.gov.bcb.pix"), 01: Chave Pix, 02: Descrição (opcional)
  let merchantAccount = formatTLV('00', 'br.gov.bcb.pix');
  merchantAccount += formatTLV('01', chave.trim());
  if (mensagem) {
    const cleanMsg = sanitizeText(mensagem, 40);
    if (cleanMsg) {
      merchantAccount += formatTLV('02', cleanMsg);
    }
  }
  payload += formatTLV('26', merchantAccount);

  // 52: Merchant Category Code (0000)
  payload += formatTLV('52', '0000');

  // 53: Transaction Currency (986 = BRL)
  payload += formatTLV('53', '986');

  // 54: Transaction Amount (opcional se for chave aberta, mas obrigatório para fatura com valor fixo)
  if (valor && valor > 0) {
    payload += formatTLV('54', valor.toFixed(2));
  }

  // 58: Country Code (BR)
  payload += formatTLV('58', 'BR');

  // 59: Merchant Name (Max 25 chars)
  const cleanName = sanitizeText(nomeRecebedor || 'LOCADOR', 25) || 'LOCADOR';
  payload += formatTLV('59', cleanName);

  // 60: Merchant City (Max 15 chars)
  const cleanCity = sanitizeText(cidade || 'BRASIL', 15) || 'BRASIL';
  payload += formatTLV('60', cleanCity);

  // 62: Additional Data Field Template (TxID)
  // Sub-campo 05: Reference Label (TxId max 25 chars alfanumérico, ou '***')
  const cleanTxId = (txId || 'ALUGUEL')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 25) || '***';
  const additionalData = formatTLV('05', cleanTxId);
  payload += formatTLV('62', additionalData);

  // 63: CRC16 (Calculado sobre a string incluindo "6304")
  const payloadToCRC = `${payload}6304`;
  const checksum = crc16(payloadToCRC);

  return `${payloadToCRC}${checksum}`;
}
