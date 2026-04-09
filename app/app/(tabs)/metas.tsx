import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { Colors } from '../../constants/colors';
import { Meta } from '../../types';

interface RelatorioResumo {
  ganho_bruto: number;
  total_corridas: number;
}
interface ResumoGeral {
  semana: RelatorioResumo;
  mes: RelatorioResumo;
}

function formatarMoeda(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCentavos(raw: string): number {
  const digits = raw.replaceAll(/\D/g, '');
  return Number.parseInt(digits || '0', 10);
}

function formatarInput(centavos: number): string {
  if (centavos === 0) return '';
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function MetasScreen() {
  const router = useRouter();

  const [metaExistente, setMetaExistente] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Valores em centavos
  const [metaDiaria, setMetaDiaria] = useState(0);
  const [dias, setDias] = useState(5);
  const [metaSemanal, setMetaSemanal] = useState(0);
  const [metaMensal, setMetaMensal] = useState(0);
  const [metaSemanalEditada, setMetaSemanalEditada] = useState(false);
  const [metaMensalEditada, setMetaMensalEditada] = useState(false);

  // Resumo do período atual
  const [resumo, setResumo] = useState<ResumoGeral | null>(null);

  const prevDiaria = useRef(0);
  const prevDias = useRef(5);

  useEffect(() => {
    Promise.all([
      api.get<Meta>('/metas').catch((err) => {
        if (err?.response?.status === 404) return null;
        throw err;
      }),
      api.get<ResumoGeral>('/relatorios/resumo'),
    ])
      .then(([metaRes, resumoRes]) => {
        if (metaRes) {
          const m = metaRes.data;
          setMetaExistente(m);
          const diariaCents = Math.round(m.metaDiaria * 100);
          const semanalCents = Math.round(m.metaSemanal * 100);
          const mensalCents = Math.round(m.metaMensal * 100);
          setMetaDiaria(diariaCents);
          setDias(m.diasTrabalhoSemana);
          setMetaSemanal(semanalCents);
          setMetaMensal(mensalCents);
          setMetaSemanalEditada(m.metaSemanalEditada);
          setMetaMensalEditada(m.metaMensalEditada);
          prevDiaria.current = diariaCents;
          prevDias.current = m.diasTrabalhoSemana;
        }
        setResumo(resumoRes.data);
      })
      .catch((error: unknown) => {
        Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMetaDiariaChange = (raw: string) => {
    const val = parseCentavos(raw);
    setMetaDiaria(val);
    if (!metaSemanalEditada) setMetaSemanal(val * dias);
    if (!metaMensalEditada) setMetaMensal(val * dias * 4);
  };

  const handleDiasChange = (novosDias: number) => {
    setDias(novosDias);
    if (!metaSemanalEditada) setMetaSemanal(metaDiaria * novosDias);
    if (!metaMensalEditada) setMetaMensal(metaDiaria * novosDias * 4);
  };

  const handleMetaSemanalChange = (raw: string) => {
    const val = parseCentavos(raw);
    setMetaSemanal(val);
    setMetaSemanalEditada(true);
  };

  const handleMetaMensalChange = (raw: string) => {
    const val = parseCentavos(raw);
    setMetaMensal(val);
    setMetaMensalEditada(true);
  };

  const handleSalvar = async () => {
    if (metaDiaria <= 0) {
      Toast.show({ type: 'error', text1: 'Informe a meta diária.', position: 'bottom' });
      return;
    }

    try {
      setSalvando(true);
      const body = {
        metaDiaria: metaDiaria / 100,
        diasTrabalhoSemana: dias,
        metaSemanal: metaSemanal / 100,
        metaMensal: metaMensal / 100,
        metaSemanalEditada,
        metaMensalEditada,
      };

      if (metaExistente) {
        await api.put('/metas', body);
      } else {
        await api.post('/metas', body);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Metas salvas com sucesso!', position: 'bottom' });
      router.back();
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
    } finally {
      setSalvando(false);
    }
  };

  const progresso = (atual: number, meta: number) => {
    if (meta <= 0) return 0;
    return Math.min(1, atual / meta);
  };

  const fmt = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <LinearGradient colors={[Colors.primary, Colors.background]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headerArea}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Voltar"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={26} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.titulo}>Metas financeiras</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.text} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.body}>
              {/* Formulário */}
              <Text style={styles.secaoTitulo}>Configurar metas</Text>

              <View style={styles.campo}>
                <Text style={styles.label}>Meta diária (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={formatarInput(metaDiaria)}
                  onChangeText={handleMetaDiariaChange}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel="Meta diária"
                  maxLength={12}
                />
              </View>

              <View style={styles.campo}>
                <Text style={styles.label}>Dias a trabalhar por semana</Text>
                <View style={styles.diasRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.diaBtn, dias === d && styles.diaBtnAtivo]}
                      onPress={() => handleDiasChange(d)}
                      activeOpacity={0.7}
                      accessibilityLabel={`${d} dia${d > 1 ? 's' : ''}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: dias === d }}
                    >
                      <Text style={[styles.diaBtnTexto, dias === d && styles.diaBtnTextoAtivo]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.campo}>
                <Text style={styles.label}>Meta semanal (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={formatarInput(metaSemanal)}
                  onChangeText={handleMetaSemanalChange}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel="Meta semanal"
                  maxLength={12}
                />
                <Text style={styles.dica}>Calculado automaticamente. Você pode ajustar manualmente.</Text>
              </View>

              <View style={styles.campo}>
                <Text style={styles.label}>Meta mensal (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={formatarInput(metaMensal)}
                  onChangeText={handleMetaMensalChange}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel="Meta mensal"
                  maxLength={12}
                />
                <Text style={styles.dica}>Calculado automaticamente. Você pode ajustar manualmente.</Text>
              </View>

              <TouchableOpacity
                style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
                onPress={handleSalvar}
                disabled={salvando}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ disabled: salvando }}
              >
                {salvando ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.botaoSalvarTexto}>Salvar metas</Text>
                )}
              </TouchableOpacity>

              {/* Resumo do progresso atual */}
              {resumo && metaExistente && (
                <>
                  <Text style={[styles.secaoTitulo, { marginTop: 28 }]}>Progresso atual</Text>

                  <View style={styles.progressoCard}>
                    <Text style={styles.progressoTitulo}>Esta semana</Text>
                    <View style={styles.barraContainer}>
                      <View style={styles.barraFundo}>
                        <View
                          style={[
                            styles.barraFill,
                            {
                              width: `${progresso(resumo.semana.ganho_bruto, metaExistente.metaSemanal) * 100}%`,
                              backgroundColor:
                                resumo.semana.ganho_bruto >= metaExistente.metaSemanal
                                  ? Colors.gain
                                  : Colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barraPct}>
                        {Math.min(100, Math.round(progresso(resumo.semana.ganho_bruto, metaExistente.metaSemanal) * 100))}%
                      </Text>
                    </View>
                    <Text style={styles.progressoValores}>
                      {fmt(resumo.semana.ganho_bruto)} de {fmt(metaExistente.metaSemanal)}
                    </Text>
                  </View>

                  <View style={[styles.progressoCard, { marginTop: 12 }]}>
                    <Text style={styles.progressoTitulo}>Este mês</Text>
                    <View style={styles.barraContainer}>
                      <View style={styles.barraFundo}>
                        <View
                          style={[
                            styles.barraFill,
                            {
                              width: `${progresso(resumo.mes.ganho_bruto, metaExistente.metaMensal) * 100}%`,
                              backgroundColor:
                                resumo.mes.ganho_bruto >= metaExistente.metaMensal
                                  ? Colors.gain
                                  : Colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barraPct}>
                        {Math.min(100, Math.round(progresso(resumo.mes.ganho_bruto, metaExistente.metaMensal) * 100))}%
                      </Text>
                    </View>
                    <Text style={styles.progressoValores}>
                      {fmt(resumo.mes.ganho_bruto)} de {fmt(metaExistente.metaMensal)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 40 },
  headerArea: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  body: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '95%',
    alignSelf: 'center',
    padding: 20,
    marginBottom: 16,
    gap: 4,
  },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  campo: { marginBottom: 16 },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.label,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    color: Colors.text,
    backgroundColor: Colors.background,
    fontVariant: ['tabular-nums'],
  },
  dica: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  diasRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diaBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  diaBtnAtivo: {
    borderColor: Colors.primary,
    backgroundColor: Colors.selectedBg,
  },
  diaBtnTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  diaBtnTextoAtivo: {
    color: Colors.text,
  },
  botaoSalvar: {
    backgroundColor: Colors.btnAcao,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 58,
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoSalvarTexto: { color: Colors.text, fontSize: 17, fontWeight: 'bold' },
  progressoCard: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  progressoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  barraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barraFundo: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    borderRadius: 6,
  },
  barraPct: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  progressoValores: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
