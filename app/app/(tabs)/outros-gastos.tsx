import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { toISOComOffsetBRT } from '../../utils/dataBRT';
import { CategoriaGasto } from '../../types';
import { Colors } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type McIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CATEGORIAS: { valor: CategoriaGasto; label: string; icone: McIcon }[] = [
  { valor: 'alimentacao', label: 'Alimentação', icone: 'food' },
  { valor: 'manutencao', label: 'Manutenção', icone: 'wrench' },
  { valor: 'caixinha', label: 'Caixinha', icone: 'piggy-bank-outline' },
  { valor: 'outros', label: 'Outros', icone: 'dots-horizontal-circle-outline' },
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

export default function OutrosGastosScreen() {
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('alimentacao');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date());
  const [salvando, setSalvando] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  useFocusEffect(
    useCallback(() => {
      setValor('');
      setCategoria('alimentacao');
      setDescricao('');
      setData(new Date());
      setShowPicker(false);
    }, [])
  );

  const handleValorChange = (text: string) => {
    setValor(text.replaceAll(/\D/g, ''));
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
      Toast.show({ type: 'error', text1: 'Informe o valor do gasto.', position: 'bottom' });
      return;
    }

    try {
      setSalvando(true);
      await api.post('/gastos', {
        valor: Number(valor) / 100,
        categoria,
        descricao: descricao.trim() || undefined,
        data: toISOComOffsetBRT(data),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Gasto registrado!', position: 'bottom' });

      setValor('');
      setCategoria('alimentacao');
      setDescricao('');
      setData(new Date());
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.primary, Colors.background]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerArea}>
          <Text style={styles.titulo}>Outros Gastos</Text>
        </View>

        <View style={styles.form}>
      <View style={styles.grupo}>
        <Text style={styles.label}>Valor gasto</Text>
        <TextInput
          style={styles.inputValor}
          value={valorFormatado}
          onChangeText={handleValorChange}
          keyboardType="numeric"
          placeholder="R$ 0,00"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Valor do gasto em reais"
        />
      </View>

      <View style={styles.grupo}>
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.grid}>
          {CATEGORIAS.map((c) => (
            <TouchableOpacity
              key={c.valor}
              style={[
                styles.botaoCategoria,
                categoria === c.valor && styles.botaoCategoriaSelecionado,
              ]}
              onPress={() => setCategoria(c.valor)}
              activeOpacity={0.7}
              accessibilityLabel={c.label}
              accessibilityRole="radio"
              accessibilityState={{ selected: categoria === c.valor }}
            >
              <MaterialCommunityIcons
                name={c.icone}
                size={26}
                color={categoria === c.valor ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoriaLabel,
                  categoria === c.valor && styles.categoriaLabelSelecionada,
                ]}
              >
                {c.label}
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
          <MaterialCommunityIcons name="calendar-month" size={28} color={Colors.primaryDisabled} />
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
        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          style={styles.inputObs}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex: troca de óleo"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
          accessibilityLabel="Descrição do gasto"
          maxLength={200}
        />
      </View>

      <TouchableOpacity
        style={[styles.botaoRegistrar, salvando && styles.botaoDesabilitado]}
        onPress={handleRegistrar}
        disabled={salvando}
        activeOpacity={0.8}
        accessibilityLabel="Registrar gasto"
        accessibilityRole="button"
        accessibilityState={{ disabled: salvando }}
      >
        <Text style={styles.botaoTexto}>
          {salvando ? 'Registrando...' : 'Registrar Gasto'}
        </Text>
      </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { flexGrow: 1 },
  headerArea: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  form: {
    padding: 20,
    gap: 24,
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '95%',
    alignSelf: 'center',
    flex: 1,
    marginBottom: 16,
  },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  grupo: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.label },
  inputValor: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.cost,
    borderWidth: 2,
    borderColor: Colors.border,
    fontVariant: ['tabular-nums'],
  },
  grid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  botaoCategoria: {
    flexBasis: '47%',
    flexGrow: 1,
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
  botaoCategoriaSelecionado: { borderColor: Colors.primary, backgroundColor: Colors.selectedBg },
  categoriaLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  categoriaLabelSelecionada: { color: Colors.primary },
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
  inputObs: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  botaoRegistrar: {
    backgroundColor: Colors.btnAcao,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 64,
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoTexto: { color: Colors.text, fontSize: 20, fontWeight: 'bold' },
});
