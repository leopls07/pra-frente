import { useEffect } from 'react';
import { Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Afacad_400Regular,
  Afacad_500Medium,
  Afacad_600SemiBold,
  Afacad_700Bold,
  Afacad_400Regular_Italic,
} from '@expo-google-fonts/afacad';
import { useAuthStore } from '../store/useAuthStore';
import { Fonts } from '../constants/fonts';

SplashScreen.preventAutoHideAsync();

// Aplica Afacad como fonte padrão em todos os componentes Text
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TextAny = Text as any;
TextAny.defaultProps = TextAny.defaultProps ?? {};
TextAny.defaultProps.style = [TextAny.defaultProps.style, { fontFamily: Fonts.regular }];

export default function RootLayout() {
  const { usuario, isLoaded, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    Afacad_400Regular,
    Afacad_500Medium,
    Afacad_600SemiBold,
    Afacad_700Bold,
    Afacad_400Regular_Italic,
  });

  useEffect(() => {
    initialize();
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
      <Toast />
    </>
  );
}
