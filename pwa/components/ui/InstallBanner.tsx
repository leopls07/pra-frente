import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * Banner de instalação exibido no app inteiro (montado no root layout).
 * No Android/Chrome oferece um botão que dispara o prompt nativo de instalação
 * capturado via `beforeinstallprompt` — não depende do mini-infobar automático
 * do Chrome, que só aparece após engajamento do usuário. No iOS Safari, que não
 * suporta instalação programática, mostra a instrução manual (Compartilhar →
 * Adicionar à Tela de Início).
 */
export function InstallBanner() {
  const { canShowAndroidBanner, canShowIOSBanner, promptInstall, dismiss } = useInstallPrompt();
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'web') return null;
  if (!canShowAndroidBanner && !canShowIOSBanner) return null;

  return (
    <View style={[styles.container, { bottom: 76 + insets.bottom }]} pointerEvents="box-none">
      <View style={styles.card}>
        <MaterialCommunityIcons name="cellphone-arrow-down" size={26} color={Colors.primary} />
        <View style={styles.textArea}>
          <Text style={styles.titulo}>Instale o Pra Frente</Text>
          <Text style={styles.texto}>
            {canShowAndroidBanner
              ? 'Adicione à tela inicial para abrir mais rápido, como um app.'
              : 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".'}
          </Text>
        </View>
        {canShowAndroidBanner && (
          <TouchableOpacity style={styles.botao} onPress={promptInstall} activeOpacity={0.8}>
            <Text style={styles.botaoTexto}>Instalar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={10}
          style={styles.fechar}
          accessibilityLabel="Fechar aviso de instalação"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color={Colors.textMuted} />
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
    paddingHorizontal: 12,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
  fechar: { padding: 2 },
});
