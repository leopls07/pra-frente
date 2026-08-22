/**
 * Wrapper de armazenamento local com assinatura assíncrona compatível com `expo-secure-store`.
 *
 * No app mobile (`pra-frente/app`), o JWT é guardado com `expo-secure-store`, que não tem
 * implementação para web. Nesta PWA usamos `localStorage` do navegador como substituto,
 * expondo os mesmos métodos (`getItemAsync`/`setItemAsync`/`deleteItemAsync`) para que o
 * restante do código (services/api.ts, store/useAuthStore.ts) não precise mudar.
 *
 * Atenção: no Safari iOS, o `localStorage` pode ser limpo pelo sistema após períodos de
 * inatividade do site (ver README para mais detalhes) — o JWT pode expirar de forma mais
 * agressiva no iPhone do que no Android.
 */

async function getItemAsync(key: string): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // localStorage indisponível (modo privado, quota excedida, etc.) — ignora silenciosamente
  }
}

async function deleteItemAsync(key: string): Promise<void> {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // ignora
  }
}

export const storage = { getItemAsync, setItemAsync, deleteItemAsync };
