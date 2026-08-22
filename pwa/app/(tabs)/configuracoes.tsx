import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { confirmar } from '../../utils/confirmar';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { gerarPayloadPix } from '../../utils/pix';
import { PIX_APOIO } from '../../constants/pix';

const PAYLOAD_PIX = gerarPayloadPix(PIX_APOIO);

export default function ConfiguracoesScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [apoiarVisivel, setApoiarVisivel] = useState(false);

  const copiarChave = async () => {
    await Clipboard.setStringAsync(PIX_APOIO.chave);
    Toast.show({ type: 'success', text1: 'Chave Pix copiada!', position: 'bottom' });
  };

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
    if (confirmar('Sair', 'Tem certeza que deseja sair?')) {
      logout();
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
          {/* Seção Metas */}
          <Text style={styles.secaoTitulo}>Metas</Text>

          <View style={styles.secao}>
            <TouchableOpacity
              style={styles.opcao}
              onPress={() => router.push('/(tabs)/metas')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Definir metas financeiras"
            >
              <View style={styles.opcaoEsquerda}>
                <Ionicons name="flag-outline" size={22} color={Colors.text} />
                <Text style={styles.opcaoTexto}>Definir metas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Seção Histórico */}
          <Text style={[styles.secaoTitulo, { marginTop: 24 }]}>Histórico</Text>

          <View style={styles.secao}>
            <TouchableOpacity
              style={styles.opcao}
              onPress={() => router.push('/(tabs)/registros')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Ver registros"
            >
              <View style={styles.opcaoEsquerda}>
                <Ionicons name="list-outline" size={22} color={Colors.text} />
                <Text style={styles.opcaoTexto}>Ver registros</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Seção Segurança */}
          <Text style={[styles.secaoTitulo, { marginTop: 24 }]}>Segurança</Text>

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
                  maxLength={32}
                />
                <PasswordInput
                  label="Nova senha"
                  value={novaSenha}
                  onChangeText={setNovaSenha}
                  placeholder="Mínimo 6 caracteres"
                  returnKeyType="next"
                  maxLength={32}
                />
                <PasswordInput
                  label="Confirmar nova senha"
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                  placeholder="Repita a nova senha"
                  returnKeyType="done"
                  onSubmitEditing={handleAlterarSenha}
                  maxLength={32}
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
              onPress={() => setApoiarVisivel(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Apoiar o desenvolvedor"
            >
              <View style={styles.opcaoEsquerda}>
                <Ionicons name="heart-outline" size={22} color={Colors.primary} />
                <Text style={styles.opcaoTexto}>Apoiar o desenvolvedor</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

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
      </KeyboardAvoidingView>

      {/* Modal Apoiar */}
      <Modal
        visible={apoiarVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setApoiarVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalFundo}
            activeOpacity={1}
            onPress={() => setApoiarVisivel(false)}
          />
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalHeader}>
                <View style={{ width: 24 }} />
                <Text style={styles.modalTitulo}>Apoiar o desenvolvedor</Text>
                <TouchableOpacity onPress={() => setApoiarVisivel(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Ionicons name="heart" size={40} color={Colors.cost} style={{ alignSelf: 'center' }} />

                <Text style={styles.apoiarTexto}>
                  Pra usar é de graça mas para manter de pé não!
                </Text>
                <Text style={styles.apoiarTexto}>
                  Apoie o desenvolvedor com o que puder, a caixinha é do coração
                </Text>

                <View style={styles.qrContainer}>
                  <QRCode value={PAYLOAD_PIX} size={220} backgroundColor={Colors.card} color={Colors.text} />
                </View>

                <Text style={styles.chavePixLabel}>Chave Pix</Text>
                <Text style={styles.chavePixTexto} selectable>
                  {PIX_APOIO.chave}
                </Text>

                <TouchableOpacity
                  style={styles.botaoCopiar}
                  onPress={copiarChave}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Copiar chave Pix"
                >
                  <Ionicons name="copy-outline" size={20} color={Colors.text} />
                  <Text style={styles.botaoCopiarTexto}>Copiar chave Pix</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // Modal Apoiar
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalFundo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 6,
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalBody: {
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  apoiarTexto: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: 4,
  },
  chavePixLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  chavePixTexto: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  botaoCopiar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  botaoCopiarTexto: { fontSize: 16, fontWeight: '700', color: Colors.text },
});
