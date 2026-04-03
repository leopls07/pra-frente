import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
        .catch((error: unknown) => {
          Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
        })
        .finally(() => setLoading(false));
    }, [])
  );

  const fmt = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const hoje = resumo?.hoje;
  const semCorridas = !loading && (hoje?.total_corridas ?? 0) === 0;

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
            onPress={handleLogout}
            disabled={saindo}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Sair do aplicativo"
            accessibilityRole="button"
          >
            <Text style={[styles.logout, saindo && { opacity: 0.4 }]}>Sair</Text>
          </TouchableOpacity>
        </View>

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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  saudacaoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoHeader: { width: 40, height: 40, },
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
    gap: 12,
    minHeight: 100,
    width: '95%',
    alignSelf: 'center',
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
  resumoValor: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  acoes: { gap: 16, padding: 24, paddingTop: 28, backgroundColor: Colors.card, flex: 1, marginHorizontal: '2.5%', borderRadius: 16, marginBottom: 16 },
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
