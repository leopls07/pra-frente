import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * Card de instalação fixo (sem botão de fechar) para a tela de login.
 * Diferente do `InstallBanner` (flutuante, dispensável, mostrado no app inteiro),
 * este aparece sempre que o app está sendo acessado pelo navegador (não instalado),
 * independente de o Chrome já ter disparado `beforeinstallprompt` ou não — nesse
 * caso sem prompt nativo disponível (desktop, outros navegadores, ou Android antes
 * do engajamento mínimo do Chrome), mostra uma chamada genérica em vez de sumir.
 */
export function InstallCardFixo() {
  const { isStandalone, isIOS, canPromptInstall, promptInstall } = useInstallPrompt();

  if (Platform.OS !== 'web') return null;
  if (isStandalone) return null;

  const mensagem = canPromptInstall
    ? 'Adicione à tela inicial para abrir mais rápido, como um app.'
    : isIOS
    ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".'
    : 'Ainda pelo navegador? Adicione o app na tela inicial.';

  return (
    <View style={styles.card}>
      <MaterialCommunityIcons name="cellphone-arrow-down" size={24} color={Colors.primary} />
      <View style={styles.textArea}>
        <Text style={styles.titulo}>Instale o Pra Frente</Text>
        <Text style={styles.texto}>{mensagem}</Text>
      </View>
      {canPromptInstall && (
        <TouchableOpacity
          style={styles.botao}
          onPress={promptInstall}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Instalar aplicativo"
        >
          <Text style={styles.botaoTexto}>Instalar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
  },
  textArea: { flex: 1, gap: 2 },
  titulo: { fontSize: 14, fontWeight: '700', color: Colors.text },
  texto: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  botao: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  botaoTexto: { color: Colors.text, fontSize: 13, fontWeight: '700' },
});
