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
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { tratarErro } from '../../utils/tratarErro';
import { Colors } from '../../constants/colors';

export default function EsqueceuSenhaScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErro('Informe seu email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Email inválido.');
      return;
    }

    setErro('');
    setLoading(true);

    try {
      await api.post('/auth/esqueceu-senha', { email: email.trim() });
      setEnviado(true);
    } catch (error: unknown) {
      setErro(tratarErro(error));
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../../assets/logo_prafrente.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.avisoBox}>
            <MaterialIcons name="mark-email-read" size={64} color={Colors.primary} />
            <Text style={styles.avisoTitulo}>Email enviado!</Text>
            <Text style={styles.avisoTexto}>
              Se o email <Text style={styles.avisoEmailDestaque}>{email.trim()}</Text> estiver
              cadastrado, você receberá as instruções para redefinir sua senha em instantes.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.botao}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.botaoTexto}>Voltar para o login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/logo_prafrente.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.form}>
          <Text style={styles.titulo}>Esqueceu sua senha?</Text>
          <Text style={styles.subtitulo}>
            Informe seu email e enviaremos um link para você criar uma nova senha.
          </Text>

          <View style={styles.campo}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (erro) setErro('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoFocus
            />
          </View>

          {erro !== '' && <Text style={styles.erro}>{erro}</Text>}

          <TouchableOpacity
            style={[styles.botao, loading && styles.botaoDesabilitado]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botaoTexto}>Enviar link de redefinição</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.6}
            style={styles.linkVoltar}
          >
            <Text style={styles.linkVoltarTexto}>Voltar para o login</Text>
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
  logo: { width: 120, height: 120, marginBottom: 24 },
  form: { width: '100%', maxWidth: 320, gap: 16 },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
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
    marginTop: 4,
    paddingHorizontal: 24,
  },
  botaoDesabilitado: { backgroundColor: Colors.primaryDisabled },
  botaoTexto: { color: Colors.card, fontSize: 18, fontWeight: 'bold' },
  linkVoltar: { alignItems: 'center', paddingVertical: 4 },
  linkVoltarTexto: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

  // Tela de sucesso
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
  avisoEmailDestaque: {
    fontWeight: 'bold',
    color: Colors.text,
  },
});
