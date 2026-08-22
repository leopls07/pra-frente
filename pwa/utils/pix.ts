function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

interface DadosPix {
  chave: string;
  nome: string;
  cidade: string;
  descricao?: string;
}

export function gerarPayloadPix({ chave, nome, cidade, descricao }: DadosPix): string {
  const merchantAccountInfo = tlv(
    '26',
    tlv('00', 'BR.GOV.BCB.PIX') +
      tlv('01', chave) +
      (descricao ? tlv('02', descricao.slice(0, 40)) : '')
  );

  const payloadSemCrc =
    tlv('00', '01') +
    merchantAccountInfo +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('58', 'BR') +
    tlv('59', nome.slice(0, 25)) +
    tlv('60', cidade.slice(0, 15)) +
    tlv('62', tlv('05', '***')) +
    '6304';

  return payloadSemCrc + crc16(payloadSemCrc);
}
