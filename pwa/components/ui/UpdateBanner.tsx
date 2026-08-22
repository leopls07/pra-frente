import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAppUpdate } from '../../hooks/useAppUpdate';

/**
 * Avisa quando o service worker detecta uma versão nova do app já instalada
 * em segundo plano (ver `registrarServiceWorker` em `app/_layout.tsx`).
 * Diferente do `InstallBanner`, não depende de dispensar — some sozinho ao
 * clicar em "Atualizar" (recarrega a página, pegando a versão nova).
 */
export function UpdateBanner() {
  const { updateDisponivel, atualizarAgora } = useAppUpdate();

  if (Platform.OS !== 'web') return null;
  if (!updateDisponivel) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.card}>
        <Ionicons name="refresh-circle" size={28} color={Colors.primary} />
        <View style={styles.textArea}>
          <Text style={styles.titulo}>Nova versão disponível</Text>
          <Text style={styles.texto}>Atualize para pegar as últimas novidades e correções.</Text>
        </View>
        <TouchableOpacity
          style={styles.botao}
          onPress={atualizarAgora}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Atualizar aplicativo"
        >
          <Text style={styles.botaoTexto}>Atualizar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    zIndex: 1001,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 14,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  textArea: { flex: 1, gap: 2 },
  titulo: { fontSize: 15, fontWeight: '700', color: Colors.text },
  texto: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  botao: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  botaoTexto: { color: Colors.text, fontSize: 14, fontWeight: '700' },
});
