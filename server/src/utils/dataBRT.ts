// Offset fixo GMT-3 (horário de Brasília — sem DST desde 2019)
const OFFSET_MS = 3 * 60 * 60 * 1000;

/** Subtrai 3h do UTC para obter a data/hora "virtual" em BRT (uso apenas para cálculos de range). */
function agoraBRT(): Date {
  return new Date(Date.now() - OFFSET_MS);
}

/** Converte uma data "virtual BRT" de volta para UTC, para uso em queries no MongoDB. */
function brtParaUTC(dataBRT: Date): Date {
  return new Date(dataBRT.getTime() + OFFSET_MS);
}

/**
 * Retorna a data no formato YYYY-MM-DD interpretada em BRT.
 * Substitui `dataUTC.toISOString().slice(0, 10)`, que usaria a data UTC — incorreto para datas
 * registradas após 21h BRT (que ficam no dia seguinte em UTC).
 */
export function dataISOBRT(dataUTC: Date): string {
  const brt = new Date(dataUTC.getTime() - OFFSET_MS);
  return brt.toISOString().slice(0, 10);
}

/**
 * Retorna { inicio, fim } em UTC para o período solicitado, com os limites calculados em BRT.
 *
 * Exemplo — "hoje" às 22h BRT (01h UTC do dia seguinte):
 *   inicio = hoje 00:00 BRT = hoje 03:00 UTC
 *   fim    = hoje 23:59:59 BRT = amanhã 02:59:59 UTC
 */
export function rangeParaPeriodoBRT(periodo: string): { inicio: Date; fim: Date } {
  const agora = agoraBRT();

  const fimBRT = new Date(agora);
  fimBRT.setHours(23, 59, 59, 999);

  if (periodo === 'hoje') {
    const inicioBRT = new Date(agora);
    inicioBRT.setHours(0, 0, 0, 0);
    return { inicio: brtParaUTC(inicioBRT), fim: brtParaUTC(fimBRT) };
  }

  if (periodo === 'semana') {
    const inicioBRT = new Date(agora);
    // getDay(): 0=Dom, 1=Seg … 6=Sab → dias desde segunda = (getDay()+6)%7
    inicioBRT.setDate(agora.getDate() - ((agora.getDay() + 6) % 7));
    inicioBRT.setHours(0, 0, 0, 0);
    return { inicio: brtParaUTC(inicioBRT), fim: brtParaUTC(fimBRT) };
  }

  // mes
  const inicioBRT = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
  return { inicio: brtParaUTC(inicioBRT), fim: brtParaUTC(fimBRT) };
}
