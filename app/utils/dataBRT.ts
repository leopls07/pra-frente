/**
 * Produz uma string ISO 8601 com offset BRT explícito (-03:00).
 *
 * Usa os getters locais do dispositivo (getFullYear, getHours, etc.), que em um
 * telefone brasileiro estão em BRT. Appenda o offset fixo -03:00 para que o
 * backend possa parsear corretamente sem ambiguidade de fuso.
 *
 * Exemplo: dispositivo em 06/04/2026 às 21:20 BRT →
 *   retorna "2026-04-06T21:20:00.000-03:00"
 *   backend faz new Date("2026-04-06T21:20:00.000-03:00") → 2026-04-07T00:20:00.000Z (UTC correto)
 */
export function toISOComOffsetBRT(date: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}.` +
    `${p(date.getMilliseconds(), 3)}-03:00`
  );
}
