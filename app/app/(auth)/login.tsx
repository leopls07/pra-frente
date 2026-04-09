import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';
import { PasswordInput } from '../../components/ui/PasswordInput';

type Modo = 'login' | 'cadastro';

const KAV_BEHAVIOR: 'padding' | 'height' = Platform.OS === 'ios' ? 'padding' : 'height';

async function reenviarConfirmacao(
  email: string,
  setReenviando: (v: boolean) => void,
  setReenvioSucesso: (v: boolean) => void,
): Promise<void> {
  setReenviando(true);
  setReenvioSucesso(false);
  try {
    await api.post('/auth/reenviar-confirmacao', { email: email.trim() });
  } catch {
    // Resposta genérica do servidor — não há erro real a tratar aqui
  } finally {
    setReenvioSucesso(true);
    setReenviando(false);
  }
}

type ConfirmacaoEmailBoxProps = Readonly<{
  reenviando: boolean;
  reenvioSucesso: boolean;
  onReenviar: () => void;
}>;

function ConfirmacaoEmailBox({ reenviando, reenvioSucesso, onReenviar }: ConfirmacaoEmailBoxProps) {
  return (
    <View style={confirmacaoStyles.box}>
      <Text style={confirmacaoStyles.texto}>
        Confirme seu email antes de acessar. Verifique sua caixa de entrada.
      </Text>
      {reenvioSucesso ? (
        <Text style={confirmacaoStyles.sucesso}>
          Email reenviado! Verifique sua caixa de entrada.
        </Text>
      ) : (
        <TouchableOpacity
          style={confirmacaoStyles.botao}
          onPress={onReenviar}
          activeOpacity={0.8}
          disabled={reenviando}
        >
          {reenviando ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={confirmacaoStyles.botaoTexto}>Reenviar email de confirmação</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

function validarCampos(
  email: string,
  senha: string,
  modo: Modo,
  nome: string,
  confirmarSenha: string,
): string | null {
  if (!email.trim()) return 'Informe seu email.';
  const emailParts = email.trim().split('@');
  if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1].includes('.')) return 'Email invalido.';
  if (!senha) return 'Informe sua senha.';
  if (modo === 'cadastro') {
    if (!nome.trim()) return 'Informe seu nome.';
    if (senha.length < 6) return 'Senha deve ter no minimo 6 caracteres.';
    if (senha !== confirmarSenha) return 'As senhas não coincidem.';
  }
  return null;
}

function tratarErroLogin(
  error: unknown,
  setErro: (v: string) => void,
  setEmailNaoConfirmado: (v: boolean) => void,
  tratarErroFn: (e: unknown) => string,
): void {
  const axiosError = (error as any)?.response;
  const status = axiosError?.status;
  const codigo = axiosError?.data?.codigo;
  if (status === 403 && codigo === 'EMAIL_NAO_CONFIRMADO') {
    setEmailNaoConfirmado(true);
    setErro('');
  } else if (status === 401) {
    setErro('Email ou senha incorretos.');
  } else {
    setErro(tratarErroFn(error));
  }
}

export default function LoginScreen() {
  const { setUsuario } = useAuthStore();
  const router = useRouter();

  const [modo, setModo] = useState<Modo>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // Cadastro concluído — aguardando confirmação de email
  const [cadastroRealizado, setCadastroRealizado] = useState(false);
  const [emailCadastrado, setEmailCadastrado] = useState('');

  // Login bloqueado por email não confirmado
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenvioSucesso, setReenvioSucesso] = useState(false);

  const trocarModo = (novoModo: Modo) => {
    setModo(novoModo);
    setErro('');
    setNome('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setEmailNaoConfirmado(false);
    setReenvioSucesso(false);
  };

  const handleSubmit = async () => {
    const erroValidacao = validarCampos(email, senha, modo, nome, confirmarSenha);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro('');
    setEmailNaoConfirmado(false);
    setReenvioSucesso(false);
    setLoading(true);

    try {
      if (modo === 'cadastro') {
        await api.post('/auth/register', {
          email: email.trim(),
          password: senha,
          name: nome.trim(),
        });
        setEmailCadastrado(email.trim());
        setCadastroRealizado(true);
      } else {
        const { data } = await api.post<{ jwt: string; user: { email: string; name: string } }>(
          '/auth/login',
          { email: email.trim(), password: senha }
        );
        await setUsuario(data.user, data.jwt);
      }
    } catch (error: unknown) {
      tratarErroLogin(error, setErro, setEmailNaoConfirmado, tratarErro);
    } finally {
      setLoading(false);
    }
  };


  // Tela pós-cadastro: aviso para confirmar email
  if (cadastroRealizado) {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={KAV_BEHAVIOR}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../../assets/logo_prafrente.png')}
            style={styles.logoMenor}
            resizeMode="contain"
          />
          <View style={styles.avisoBox}>
            <MaterialIcons name="email" size={64} color={Colors.primary} />
            <Text style={styles.avisoTitulo}>Cadastro realizado!</Text>
            <Text style={styles.avisoTexto}>
              Enviamos um email de confirmação para{' '}
              <Text style={styles.avisoEmail}>{emailCadastrado}</Text>.{'\n\n'}
              Confirme seu email para acessar o app.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.botao}
            onPress={() => {
              setCadastroRealizado(false);
              trocarModo('login');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.botaoTexto}>Ir para o login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={KAV_BEHAVIOR}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/logo_prafrente.png')}
          style={modo === 'login' ? styles.logo : styles.logoMenor}
          resizeMode="contain"
        />

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBotao, modo === 'login' && styles.toggleAtivo]}
            onPress={() => trocarModo('login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleTexto, modo === 'login' && styles.toggleTextoAtivo]}>
              Entrar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBotao, modo === 'cadastro' && styles.toggleAtivo]}
            onPress={() => trocarModo('cadastro')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleTexto, modo === 'cadastro' && styles.toggleTextoAtivo]}>
              Criar conta
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {modo === 'cadastro' && (
            <View style={styles.campo}>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="#9CA3AF"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={32}
              />
            </View>
          )}

          <View style={styles.campo}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailNaoConfirmado) setEmailNaoConfirmado(false);
                if (reenvioSucesso) setReenvioSucesso(false);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              maxLength={100}
            />
          </View>

          <PasswordInput
            label="Senha"
            placeholder={modo === 'cadastro' ? 'Minimo 6 caracteres' : 'Sua senha'}
            value={senha}
            onChangeText={setSenha}
            returnKeyType={modo === 'cadastro' ? 'next' : 'done'}
            onSubmitEditing={modo === 'login' ? handleSubmit : undefined}
            maxLength={32}
          />

          {modo === 'login' && (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/esqueceu-senha')}
              activeOpacity={0.6}
              style={styles.linkEsqueceuSenha}
            >
              <Text style={styles.linkEsqueceuSenhaTexto}>Esqueceu sua senha?</Text>
            </TouchableOpacity>
          )}

          {modo === 'cadastro' && (
            <PasswordInput
              label="Confirmar senha"
              placeholder="Repita a senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={32}
            />
          )}

          {erro !== '' && <Text style={styles.erro}>{erro}</Text>}

          {emailNaoConfirmado && (
            <ConfirmacaoEmailBox
              reenviando={reenviando}
              reenvioSucesso={reenvioSucesso}
              onReenviar={() => reenviarConfirmacao(email, setReenviando, setReenvioSucesso)}
            />
          )}

          <TouchableOpacity
            style={[styles.botao, loading && styles.botaoDesabilitado]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading}
            accessibilityLabel={modo === 'login' ? 'Entrar' : 'Cadastrar'}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoTexto}>{modo === 'login' ? 'Entrar' : 'Cadastrar'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingBottom: 48,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
    width: '100%',
    maxWidth: 320,
  },
  toggleBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleAtivo: { backgroundColor: Colors.card },
  toggleTexto: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  toggleTextoAtivo: { color: Colors.text },
  form: { width: '100%', maxWidth: 320, gap: 16 },
  campo: { gap: 6 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.label },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 52,
  },
  erro: {
    fontSize: 15,
    color: Colors.cost,
    textAlign: 'center',
    backgroundColor: Colors.costBg,
    borderRadius: 10,
    padding: 12,
  },
  botao: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  botaoDesabilitado: { backgroundColor: Colors.primaryDisabled },
  botaoTexto: { color: Colors.text, fontSize: 18, fontWeight: 'bold', },
  logo: { width: 160, height: 160, marginBottom: 32 },
  logoMenor: { width: 120, height: 120, marginBottom: 24 },

  linkEsqueceuSenha: { alignSelf: 'flex-end' },
  linkEsqueceuSenhaTexto: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Aviso de email não confirmado (no formulário de login)
  avisoEmailBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    padding: 16,
    gap: 12,
  },
  avisoEmailTexto: {
    fontSize: 15,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
  botaoReenviar: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  botaoReenviarTexto: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  reenvioSucesso: {
    fontSize: 14,
    color: '#16A34A',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Tela pós-cadastro
  avisoBox: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
    gap: 12,
  },
avisoTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  avisoTexto: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  avisoEmail: {
    fontWeight: 'bold',
    color: Colors.text,
  },
});

const confirmacaoStyles = StyleSheet.create({
  box: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    padding: 16,
    gap: 12,
  },
  texto: {
    fontSize: 15,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
  botao: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  botaoTexto: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  sucesso: {
    fontSize: 14,
    color: '#16A34A',
    textAlign: 'center',
    fontWeight: '600',
  },
});
