import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';

type FormaPagamento = 'pix' | 'dinheiro' | 'cartao';

const FORMAS: { valor: FormaPagamento; label: string; emoji: string }[] = [
  { valor: 'pix', label: 'Pix', emoji: '💸' },
  { valor: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { valor: 'cartao', label: 'Cartão', emoji: '💳' },
];

function formatarDataHora(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NovaCorrida() {
  const router = useRouter();
  const [valor, setValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [data, setData] = useState(new Date());
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const handleValorChange = (text: string) => {
    setValor(text.replace(/[^0-9]/g, ''));
  };

  const valorFormatado = valor
    ? (Number(valor) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';

  const abrirPicker = () => {
    setPickerMode('date');
    setShowPicker(true);
  };

  const onPickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) {
      setShowPicker(false);
      return;
    }
    if (Platform.OS === 'android') {
      if (pickerMode === 'date') {
        const nova = new Date(selected);
        nova.setHours(data.getHours(), data.getMinutes());
        setData(nova);
        setPickerMode('time');
      } else {
        const nova = new Date(data);
        nova.setHours(selected.getHours(), selected.getMinutes());
        setData(nova);
        setShowPicker(false);
      }
    } else {
      setData(selected);
    }
  };

  const handleRegistrar = async () => {
    if (!valor || Number(valor) === 0) {
      Toast.show({ type: 'error', text1: 'Informe o valor da corrida.', position: 'bottom' });
      return;
    }

    try {
      setSalvando(true);
      await api.post('/corridas', {
        valor: Number(valor) / 100,
        formaPagamento,
        data: data.toISOString(),
        observacao: observacao.trim() || undefined,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Corrida registrada!', position: 'bottom' });

      router.replace('/(tabs)/');
    } catch {
      // erros de rede já tratados pelo interceptor do api.ts
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerArea}>
        <Text style={styles.titulo}>Nova Corrida</Text>
      </View>

      <View style={styles.form}>
      <View style={styles.grupo}>
        <Text style={styles.label}>Valor recebido</Text>
        <TextInput
          style={styles.inputValor}
          value={valorFormatado}
          onChangeText={handleValorChange}
          keyboardType="numeric"
          placeholder="R$ 0,00"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Valor da corrida em reais"
        />
      </View>

      <View style={styles.grupo}>
        <Text style={styles.label}>Forma de pagamento</Text>
        <View style={styles.formasPagamento}>
          {FORMAS.map((forma) => (
            <TouchableOpacity
              key={forma.valor}
              style={[
                styles.botaoForma,
                formaPagamento === forma.valor && styles.botaoFormaSelecionado,
              ]}
              onPress={() => setFormaPagamento(forma.valor)}
              activeOpacity={0.7}
              accessibilityLabel={`Pagamento por ${forma.label}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: formaPagamento === forma.valor }}
            >
              <Text style={styles.formaEmoji}>{forma.emoji}</Text>
              <Text
                style={[
                  styles.formaLabel,
                  formaPagamento === forma.valor && styles.formaLabelSelecionada,
                ]}
              >
                {forma.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.grupo}>
        <Text style={styles.label}>Data e hora</Text>
        <TouchableOpacity
          style={styles.inputData}
          onPress={abrirPicker}
          activeOpacity={0.7}
          accessibilityLabel={`Data e hora: ${formatarDataHora(data)}`}
          accessibilityRole="button"
        >
          <Text style={styles.inputDataTexto}>{formatarDataHora(data)}</Text>
          <Text style={styles.inputDataIcone}>📅</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={data}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onPickerChange}
            maximumDate={new Date()}
            locale="pt-BR"
          />
        )}
      </View>

      <View style={styles.grupo}>
        <Text style={styles.label}>Observação (opcional)</Text>
        <TextInput
          style={styles.inputObs}
          value={observacao}
          onChangeText={setObservacao}
          placeholder="Ex: corrida para o aeroporto"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          accessibilityLabel="Observação sobre a corrida"
        />
      </View>

      <TouchableOpacity
        style={[styles.botaoRegistrar, salvando && styles.botaoDesabilitado]}
        onPress={handleRegistrar}
        disabled={salvando}
        activeOpacity={0.8}
        accessibilityLabel="Registrar corrida"
        accessibilityRole="button"
        accessibilityState={{ disabled: salvando }}
      >
        <Text style={styles.botaoRegistrarTexto}>
          {salvando ? 'Registrando...' : 'Registrar Corrida'}
        </Text>
      </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  headerArea: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
  },
  form: { padding: 24, gap: 24 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  grupo: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.label },
  inputValor: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gain,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  formasPagamento: { flexDirection: 'row', gap: 12 },
  botaoForma: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 4,
    minHeight: 72,
    justifyContent: 'center',
  },
  botaoFormaSelecionado: { borderColor: Colors.primary, backgroundColor: Colors.selectedBg },
  formaEmoji: { fontSize: 24 },
  formaLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  formaLabelSelecionada: { color: Colors.primary },
  inputData: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  inputDataTexto: { fontSize: 18, color: Colors.text, fontWeight: '500' },
  inputDataIcone: { fontSize: 20 },
  inputObs: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  botaoRegistrar: {
    backgroundColor: Colors.gain,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 64,
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoRegistrarTexto: { color: Colors.card, fontSize: 20, fontWeight: 'bold' },
});
