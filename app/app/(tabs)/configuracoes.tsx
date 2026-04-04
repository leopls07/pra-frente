import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';
import { PasswordInput } from '../../components/ui/PasswordInput';

export default function ConfiguracoesScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  const limparFormSenha = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
  };

  const handleAlterarSenha = async () => {
    if (!senhaAtual) {
      Toast.show({ type: 'error', text1: 'Informe a senha atual.', position: 'bottom' });
      return;
    }
    if (novaSenha.length < 6) {
      Toast.show({ type: 'error', text1: 'A nova senha deve ter no mínimo 6 caracteres.', position: 'bottom' });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      Toast.show({ type: 'error', text1: 'As senhas não coincidem.', position: 'bottom' });
      return;
    }

    try {
      setSalvando(true);
      await api.post('/auth/alterar-senha', { senhaAtual, novaSenha });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: 'Senha alterada com sucesso!', position: 'bottom' });
      setAlterandoSenha(false);
      limparFormSenha();
    } catch (error: unknown) {
      Toast.show({ type: 'error', text1: tratarErro(error), position: 'bottom' });
    } finally {
      setSalvando(false);
    }
  };

  const handleSair = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <LinearGradient colors={[Colors.primary, Colors.background]} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerArea}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Voltar"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={26} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.titulo}>Configurações</Text>
        </View>

        <View style={styles.body}>
          {/* Seção Segurança */}
          <Text style={styles.secaoTitulo}>Segurança</Text>

          <View style={styles.secao}>
            <TouchableOpacity
              style={styles.opcao}
              onPress={() => {
                if (alterandoSenha) limparFormSenha();
                setAlterandoSenha((v) => !v);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.opcaoEsquerda}>
                <Ionicons name="lock-closed-outline" size={22} color={Colors.text} />
                <Text style={styles.opcaoTexto}>Alterar senha</Text>
              </View>
              <Ionicons
                name={alterandoSenha ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {alterandoSenha && (
              <View style={styles.formSenha}>
                <PasswordInput
                  label="Senha atual"
                  value={senhaAtual}
                  onChangeText={setSenhaAtual}
                  placeholder="Digite sua senha atual"
                  returnKeyType="next"
                />
                <PasswordInput
                  label="Nova senha"
                  value={novaSenha}
                  onChangeText={setNovaSenha}
                  placeholder="Mínimo 6 caracteres"
                  returnKeyType="next"
                />
                <PasswordInput
                  label="Confirmar nova senha"
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                  placeholder="Repita a nova senha"
                  returnKeyType="done"
                  onSubmitEditing={handleAlterarSenha}
                />
                <TouchableOpacity
                  style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
                  onPress={handleAlterarSenha}
                  disabled={salvando}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: salvando }}
                >
                  {salvando ? (
                    <ActivityIndicator color={Colors.text} />
                  ) : (
                    <Text style={styles.botaoSalvarTexto}>Salvar nova senha</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Seção Conta */}
          <Text style={[styles.secaoTitulo, { marginTop: 24 }]}>Conta</Text>

          <View style={styles.secao}>
            <TouchableOpacity
              style={styles.opcao}
              onPress={handleSair}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.opcaoEsquerda}>
                <Ionicons name="log-out-outline" size={22} color={Colors.cost} />
                <Text style={[styles.opcaoTexto, { color: Colors.cost }]}>Sair</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    flex: 1,
    marginBottom: 16,
    gap: 8,
  },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  secao: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    minHeight: 60,
  },
  opcaoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  opcaoTexto: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.text,
  },
  formSenha: {
    gap: 16,
    padding: 18,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  botaoSalvar: {
    backgroundColor: Colors.btnAcao,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 58,
    justifyContent: 'center',
  },
  botaoDesabilitado: { opacity: 0.6 },
  botaoSalvarTexto: { color: Colors.text, fontSize: 17, fontWeight: 'bold' },
});
