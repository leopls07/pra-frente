import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';

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
  const { usuario, logout } = useAuthStore();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saindo, setSaindo] = useState(false);

  const handleLogout = async () => {
    setSaindo(true);
    await logout();
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.get<Resumo>('/relatorios/resumo')
        .then(({ data }) => setResumo(data))
        .catch(() => {
          Toast.show({
            type: 'error',
            text1: 'Não foi possível carregar o resumo',
            position: 'bottom',
          });
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const fmt = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const hoje = resumo?.hoje;
  const semCorridas = !loading && (hoje?.total_corridas ?? 0) === 0;

  return (
    <View style={styles.container}>
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
            onPress={handleLogout}
            disabled={saindo}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Sair do aplicativo"
            accessibilityRole="button"
          >
            <Text style={[styles.logout, saindo && { opacity: 0.4 }]}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hoje</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="large" />
          ) : semCorridas ? (
            <Text style={styles.vazio}>Bora trabalhar hoje!</Text>
          ) : (
            <>
              <Text style={styles.resumoLinha}>
                {hoje?.total_corridas} corrida{hoje?.total_corridas !== 1 ? 's' : ''}
                {'  ·  '}
                {fmt(hoje?.ganho_bruto ?? 0)}
              </Text>
              {(hoje?.total_abastecimento ?? 0) > 0 && (
                <Text style={styles.abastecimento}>
                  ⛽ {fmt(hoje!.total_abastecimento)} em combustível
                </Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.acoes}>
        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: Colors.gain }]}
          onPress={() => router.push('/(tabs)/nova-corrida')}
          activeOpacity={0.8}
          accessibilityLabel="Registrar nova corrida"
          accessibilityRole="button"
        >
          <Text style={styles.botaoIcon}>🚕</Text>
          <Text style={styles.botaoTexto}>Nova Corrida</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: Colors.cost }]}
          onPress={() => router.push('/(tabs)/abastecimento')}
          activeOpacity={0.8}
          accessibilityLabel="Registrar abastecimento"
          accessibilityRole="button"
        >
          <Text style={styles.botaoIcon}>⛽</Text>
          <Text style={styles.botaoTexto}>Abastecimento</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botaoAcao, { backgroundColor: Colors.primary }]}
          onPress={() => router.push('/(tabs)/relatorios')}
          activeOpacity={0.8}
          accessibilityLabel="Ver relatórios"
          accessibilityRole="button"
        >
          <Text style={styles.botaoIcon}>📊</Text>
          <Text style={styles.botaoTexto}>Relatórios</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerArea: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  saudacaoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoHeader: { width: 40, height: 40, borderRadius: 20 },
  saudacao: { fontSize: 26, fontWeight: 'bold', color: Colors.text },
  logout: { fontSize: 16, color: Colors.text },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    gap: 6,
    minHeight: 120,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vazio: { fontSize: 18, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  resumoLinha: { fontSize: 22, fontWeight: 'bold', color: Colors.gain, textAlign: 'center' },
  abastecimento: { fontSize: 14, color: Colors.cost, marginTop: 2 },
  acoes: { gap: 16, padding: 24, paddingTop: 28 },
  botaoAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
    minHeight: 72,
  },
  botaoIcon: { fontSize: 28 },
  botaoTexto: { color: Colors.card, fontSize: 20, fontWeight: '700' },
});
