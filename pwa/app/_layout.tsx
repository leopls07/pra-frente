import { useEffect } from 'react';
import { Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { fonts } from '../constants/typography';
import { Colors } from '../constants/colors';
import { InstallBanner } from '../components/ui/InstallBanner';
import { UpdateBanner } from '../components/ui/UpdateBanner';
import { avisarUpdateDisponivel } from '../hooks/useAppUpdate';

SplashScreen.preventAutoHideAsync();

/**
 * Por padrão, o expo-router detecta o tema do sistema (claro/escuro) sozinho
 * e monta um `ThemeProvider` (do @react-navigation/native) correspondente —
 * é esse tema, não o CSS do app, que define o fundo padrão das telas/navegação
 * quando não coberto explicitamente pelos nossos próprios estilos. Em
 * aparelhos com dark mode do sistema ativado (relatado em um Samsung com
 * Samsung Internet), isso deixava áreas escurecidas mesmo com todo o design
 * do app sendo fixo em tema claro. Fornecer nosso próprio `ThemeProvider`
 * aqui sobrescreve essa detecção automática.
 */
const TEMA_CLARO_FORCADO = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.card,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.cost,
  },
};

// Aplica Inter como fonte padrão em todos os componentes Text
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TextAny = Text as any;
TextAny.defaultProps = TextAny.defaultProps ?? {};
TextAny.defaultProps.style = [TextAny.defaultProps.style, { fontFamily: fonts.regular }];

function registrarServiceWorker() {
  if (Platform.OS !== 'web') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // Se já existia um service worker controlando a página antes deste registro,
  // qualquer troca de controller depois disso é uma atualização de verdade (o
  // novo SW já assumiu via skipWaiting + clients.claim). Na primeiríssima
  // instalação (sem controller ainda), a primeira troca não conta como update.
  const jaTinhaControllerAntes = !!navigator.serviceWorker.controller;
  let avisou = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!jaTinhaControllerAntes || avisou) return;
    avisou = true;
    avisarUpdateDisponivel();
  });

  navigator.serviceWorker.register('/service-worker.js').catch((err) => {
    console.log('[PWA] Falha ao registrar service worker:', err);
  });
}

export default function RootLayout() {
  const { usuario, isLoaded, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    initialize();
    registrarServiceWorker();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!usuario && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (usuario && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, usuario, segments]);

  if (!fontsLoaded || !isLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={TEMA_CLARO_FORCADO}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} />
        <InstallBanner />
        <UpdateBanner />
        <Toast />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
