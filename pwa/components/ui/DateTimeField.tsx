import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export type DateTimeFieldMode = 'date' | 'date+time';

type DateTimeFieldProps = Readonly<{
  value: Date;
  onChange: (date: Date) => void;
  mode?: DateTimeFieldMode;
  maximumDate?: Date;
  accessibilityLabel?: string;
}>;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// yyyy-MM-dd usando os getters locais do navegador (equivalente ao comportamento de
// toISOComOffsetBRT usado no restante do app: sempre local, nunca UTC).
function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// HH:mm local
function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Substituto web de `@react-native-community/datetimepicker` (sem implementação web).
 * Usa `<input type="date">` / `<input type="time">` nativos do navegador, estilizados
 * para combinar com o restante do formulário. Este projeto roda apenas na web (PWA), então
 * não há necessidade de suportar `Platform.OS !== 'web'` aqui — os 3 pontos de uso originais
 * (nova-corrida, abastecimento, registros) já ficam guardados por serem telas web-only.
 *
 * `mode="date"` renderiza só o seletor de data (usado no filtro de histórico de registros).
 * `mode="date+time"` renderiza data + hora lado a lado, combinando os dois em um único
 * objeto Date no onChange (usado em nova-corrida, abastecimento e no modal de edição).
 */
export function DateTimeField({
  value,
  onChange,
  mode = 'date+time',
  maximumDate,
  accessibilityLabel,
}: DateTimeFieldProps) {
  const maxDateStr = maximumDate ? toDateInputValue(maximumDate) : undefined;

  function handleDateChange(dateStr: string) {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const novo = new Date(value);
    novo.setFullYear(y, m - 1, d);
    onChange(novo);
  }

  function handleTimeChange(timeStr: string) {
    if (!timeStr) return;
    const [h, min] = timeStr.split(':').map(Number);
    const novo = new Date(value);
    novo.setHours(h, min, 0, 0);
    onChange(novo);
  }

  return (
    <View style={styles.row}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(
        <input
          type="date"
          value={toDateInputValue(value)}
          max={maxDateStr}
          onChange={(e) => handleDateChange((e.target as HTMLInputElement).value)}
          aria-label={accessibilityLabel ?? 'Data'}
          style={inputStyle}
        />
      )}
      {mode === 'date+time' && (
        <input
          type="time"
          value={toTimeInputValue(value)}
          onChange={(e) => handleTimeChange((e.target as HTMLInputElement).value)}
          aria-label="Hora"
          style={inputStyle}
        />
      )}
    </View>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: Colors.card,
  borderRadius: 12,
  padding: 14,
  border: `2px solid ${Colors.border}`,
  fontSize: 16,
  color: Colors.text,
  fontFamily: 'inherit',
  minHeight: 52,
  flex: 1,
  minWidth: 0,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});
