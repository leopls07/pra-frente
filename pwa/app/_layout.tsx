import { useEffect } from 'react';
import { Text, Platform } from 'react-native';
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
import { InstallBanner } from '../components/ui/InstallBanner';

SplashScreen.preventAutoHideAsync();

// Aplica Inter como fonte padrão em todos os componentes Text
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TextAny = Text as any;
TextAny.defaultProps = TextAny.defaultProps ?? {};
TextAny.defaultProps.style = [TextAny.defaultProps.style, { fontFamily: fonts.regular }];

function registrarServiceWorker() {
  if (Platform.OS !== 'web') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
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
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <InstallBanner />
      <Toast />
    </>
  );
}
