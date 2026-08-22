import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const EVENT_NAME = 'pra-frente-update-available';

/**
 * Ponte simples entre o registro do service worker (fora do React, em
 * `app/_layout.tsx`) e qualquer componente que precise saber "há uma versão
 * nova disponível" — via CustomEvent no `window`, sem precisar de um estado
 * global/contexto para isso.
 */
export function avisarUpdateDisponivel(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function useAppUpdate() {
  const [updateDisponivel, setUpdateDisponivel] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function handler() {
      setUpdateDisponivel(true);
    }

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const atualizarAgora = () => {
    window.location.reload();
  };

  return { updateDisponivel, atualizarAgora };
}
