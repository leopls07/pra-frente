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
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';
import { PasswordInput } from '../../components/ui/PasswordInput';

type Modo = 'login' | 'cadastro';

export default function LoginScreen() {
  const { setUsuario } = useAuthStore();

  const [modo, setModo] = useState<Modo>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const trocarModo = (novoModo: Modo) => {
    setModo(novoModo);
    setErro('');
    setNome('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
  };

  const validar = (): string | null => {
    if (!email.trim()) return 'Informe seu email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email invalido.';
    if (!senha) return 'Informe sua senha.';
    if (modo === 'cadastro') {
      if (!nome.trim()) return 'Informe seu nome.';
      if (senha.length < 6) return 'Senha deve ter no minimo 6 caracteres.';
      if (senha !== confirmarSenha) return 'As senhas nao coincidem.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const erroValidacao = validar();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro('');
    setLoading(true);

    try {
      const endpoint = modo === 'login' ? '/auth/login' : '/auth/register';
      const body =
        modo === 'login'
          ? { email: email.trim(), password: senha }
          : { email: email.trim(), password: senha, name: nome.trim() };

      const { data } = await api.post<{ jwt: string; user: { email: string; name: string } }>(
        endpoint,
        body
      );
      await setUsuario(data.user, data.jwt);
    } catch (error: any) {
      const mensagem = error?.response?.data?.error;
      setErro(mensagem ?? 'Erro de conexao. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <PasswordInput
            label="Senha"
            placeholder={modo === 'cadastro' ? 'Minimo 6 caracteres' : 'Sua senha'}
            value={senha}
            onChangeText={setSenha}
            returnKeyType={modo === 'cadastro' ? 'next' : 'done'}
            onSubmitEditing={modo === 'login' ? handleSubmit : undefined}
          />

          {modo === 'cadastro' && (
            <PasswordInput
              label="Confirmar senha"
              placeholder="Repita a senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          )}

          {erro !== '' && <Text style={styles.erro}>{erro}</Text>}

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
  },
  botaoDesabilitado: { backgroundColor: Colors.primaryDisabled },
  botaoTexto: { color: Colors.card, fontSize: 18, fontWeight: 'bold' },
  logo: { width: 160, height: 160, marginBottom: 32 },
  logoMenor: { width: 120, height: 120, marginBottom: 24 },
});
