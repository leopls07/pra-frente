import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Meta } from '../../types';

interface PeriodoResumo {
  ganho_bruto: number;
  total_abastecimento: number;
  lucro_liquido: number;
  total_corridas: number;
}

interface Resumo {
  hoje: PeriodoResumo;
  semana: PeriodoResumo;
  mes: PeriodoResumo;
}

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useAuthStore();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  // undefined = ainda carregando, null = não existe, Meta = carregado
  const [meta, setMeta] = useState<Meta | null | undefined>(undefined);

  const barraAnimada = useRef(new Animated.Value(0)).current;

  const animarBarra = useCallback((progresso: number) => {
    Animated.timing(barraAnimada, {
      toValue: progresso,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [barraAnimada]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setMeta(undefined);
      barraAnimada.setValue(0);

      Promise.all([
        api.get<Resumo>('/relatorios/resumo'),
        api.get<Meta>('/metas').catch((err) => {
          if (err?.response?.status === 404) return null;
          throw err;
        }),
      ])
        .then(([resumoRes, metaRes]) => {
          setResumo(resumoRes.data);
          const metaData = metaRes ? metaRes.data : null;
          setMeta(metaData);
          if (metaData && metaData.metaDiaria > 0) {
            const ganho = resumoRes.data.hoje.ganho_bruto;
            animarBarra(Math.min(1, ganho / metaData.metaDiaria));
          }
        })
        .catch((error: unknown) => {
          Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
          setMeta(null);
        })
        .finally(() => setLoading(false));
    }, [animarBarra])
  );

  const fmt = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const hoje = resumo?.hoje;
  const semCorridas = !loading && (hoje?.total_corridas ?? 0) === 0;
  const ganhoHoje = hoje?.ganho_bruto ?? 0;
  const metaBatida = meta && ganhoHoje >= meta.metaDiaria;
  const falta = meta ? Math.max(0, meta.metaDiaria - ganhoHoje) : 0;
  const ultrapassou = meta ? Math.max(0, ganhoHoje - meta.metaDiaria) : 0;

  const barraLargura = barraAnimada.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={[ Colors.primary, Colors.background]}
      locations={[0, 0.7]}
      style={styles.container}
    >
      <View style={styles.headerArea}>
        <View style={styles.header}>
          <View style={styles.saudacaoRow}>
            <Image
              source={require('../../assets/logo_prafrente_preto.png')}
              style={styles.logoHeader}
              resizeMode="contain"
            />
            <Text style={styles.saudacao}>
              Olá{usuario?.name ? `, ${usuario.name.split(' ')[0]}` : ''}!
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/configuracoes')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Configurações"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={26} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Resumo do dia */}
        <View style={[styles.card]}>
          <Text style={styles.cardTitle}>Resumo do dia:</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 8 }} />
          ) : semCorridas ? (
            <Text style={styles.vazio}>Bora trabalhar hoje!</Text>
          ) : (
            <View style={styles.resumoLinhas}>
              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Total de corridas:</Text>
                <Text style={styles.resumoValor}>{hoje?.total_corridas}</Text>
              </View>
              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Valor ganho hoje:</Text>
                <Text style={styles.resumoValor}>{fmt(hoje?.ganho_bruto ?? 0)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Meta do dia */}
        {!loading && meta === null && (
          <TouchableOpacity
            style={styles.cardMetaVazio}
            onPress={() => router.push('/(tabs)/metas')}
            activeOpacity={0.8}
            accessibilityLabel="Definir metas nas configurações"
            accessibilityRole="button"
          >
            <Ionicons name="flag-outline" size={20} color={Colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardMetaVazioTexto}>Defina suas metas nas configurações</Text>
              <Text style={styles.cardMetaVazioLink}>Configurar agora →</Text>
            </View>
          </TouchableOpacity>
        )}

        {!loading && meta && (
          <View style={[styles.card, metaBatida && styles.cardMetaBatida]}>
            <Text style={styles.cardTitle}>Meta do dia:</Text>
            <View style={styles.barraContainer}>
              <View style={styles.barraFundo}>
                <Animated.View
                  style={[
                    styles.barraFill,
                    { width: barraLargura },
                    metaBatida ? styles.barraFillBatida : styles.barraFillNormal,
                  ]}
                />
              </View>
              <Text style={[styles.barraPct, metaBatida && { color: Colors.gain }]}>
                {Math.min(100, Math.round((ganhoHoje / meta.metaDiaria) * 100))}%
              </Text>
            </View>
            <Text style={[styles.metaMensagem, metaBatida && styles.metaMensagemBatida]}>
              {metaBatida
                ? `Você ultrapassou sua meta em ${fmt(ultrapassou)}! 🎉`
                : `Falta ${fmt(falta)} para bater sua meta`}
            </Text>
            <Text style={styles.metaValor}>Meta: {fmt(meta.metaDiaria)}</Text>
          </View>
        )}
      </View>

      <View style={styles.acoes}>
        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: Colors.btnPrimary }]}
          onPress={() => router.push('/(tabs)/nova-corrida')}
          activeOpacity={0.8}
          accessibilityLabel="Registrar nova corrida"
          accessibilityRole="button"
        >
          <Ionicons name="car-outline" size={28} color={Colors.primaryDisabled} />
          <Text style={styles.botaoTexto}>Nova Corrida</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: Colors.btnPrimary }]}
          onPress={() => router.push('/(tabs)/abastecimento')}
          activeOpacity={0.8}
          accessibilityLabel="Registrar abastecimento"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="gas-station-outline" size={28} color={Colors.primaryDisabled} />
          <Text style={styles.botaoTexto}>Abastecimento</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: Colors.btnPrimary }]}
          onPress={() => router.push('/(tabs)/relatorios')}
          activeOpacity={0.8}
          accessibilityLabel="Ver relatórios"
          accessibilityRole="button"
        >
          <Ionicons name="stats-chart-outline" size={28} color={Colors.primaryDisabled} />
          <Text style={styles.botaoTexto}>Relatórios</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    paddingTop: 56,
    paddingBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    paddingHorizontal: 24,
  },
  saudacaoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoHeader: { width: 40, height: 40, },
  saudacao: { fontSize: 26, fontWeight: 'bold', color: Colors.text },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
    minHeight: 100,
    width: '95%',
    alignSelf: 'center',
  },
  cardMetaBatida: {
    borderWidth: 2,
    borderColor: Colors.gain,
    backgroundColor: '#F0FBF4',
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '700',
  },
  vazio: { fontSize: 18, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  resumoLinhas: { gap: 8, width: '100%' },
  resumoLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumoLabel: { fontSize: 16, color: Colors.textSecondary },
  resumoValor: { fontSize: 16, fontWeight: 'bold', color: Colors.text, fontVariant: ['tabular-nums'] },

  // Barra de meta
  barraContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barraFundo: {
    flex: 1,
    height: 14,
    backgroundColor: Colors.border,
    borderRadius: 7,
    overflow: 'hidden',
  },
  barraFill: { height: '100%', borderRadius: 7 },
  barraFillNormal: { backgroundColor: Colors.primary },
  barraFillBatida: { backgroundColor: Colors.gain },
  barraPct: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  metaMensagem: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  metaMensagemBatida: {
    color: Colors.gain,
    fontWeight: '700',
    fontSize: 16,
  },
  metaValor: {
    fontSize: 13,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  cardMetaVazio: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    width: '95%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  cardMetaVazioTexto: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cardMetaVazioLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },

  acoes: { gap: 16, padding: 24, paddingTop: 16, backgroundColor: Colors.card, flex: 1, marginHorizontal: '2.5%', borderRadius: 16, marginBottom: 16 },
  botaoAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
    minHeight: 72,
    borderWidth:2,
    borderColor: Colors.primaryDisabled,
  },
  botaoTexto: { color: Colors.text, fontSize: 20, fontWeight: '700'},
});
