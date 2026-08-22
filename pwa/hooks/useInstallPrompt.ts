import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { storage } from '../lib/storage';

const DISMISSED_KEY = 'pra_frente_install_banner_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function detectStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/**
 * Chrome só dispara `beforeinstallprompt` automaticamente após um sinal de
 * engajamento do usuário (não no primeiro carregamento). Capturamos o evento
 * para poder oferecer nosso próprio botão de instalação a qualquer momento,
 * em vez de depender do mini-infobar nativo do navegador.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    setIsIOS(detectIOS());
    setIsStandalone(detectStandalone());
    storage.getItemAsync(DISMISSED_KEY).then((v) => setDismissed(v === '1'));

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    storage.setItemAsync(DISMISSED_KEY, '1');
  }, []);

  return {
    isStandalone,
    isIOS,
    canPromptInstall: !!deferredPrompt,
    canShowAndroidBanner: !!deferredPrompt && !isStandalone && !dismissed,
    canShowIOSBanner: isIOS && !isStandalone && !dismissed,
    promptInstall,
    dismiss,
  };
}
