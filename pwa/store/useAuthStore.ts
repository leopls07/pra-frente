import { create } from 'zustand';
import { storage } from '../lib/storage';
import { Usuario } from '../types';

const JWT_KEY = 'pra_frente_jwt';

interface AuthState {
  usuario: Usuario | null;
  isLoaded: boolean;
  sessionExpiredMessage: string | null;
  initialize: () => Promise<void>;
  setUsuario: (usuario: Usuario, jwt: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutSessionExpired: () => Promise<void>;
  clearSessionExpiredMessage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  isLoaded: false,
  sessionExpiredMessage: null,

  initialize: async () => {
    const jwt = await storage.getItemAsync(JWT_KEY);
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        set({ usuario: { email: payload.email, name: payload.name }, isLoaded: true });
      } catch {
        await storage.deleteItemAsync(JWT_KEY);
        set({ usuario: null, isLoaded: true });
      }
    } else {
      set({ usuario: null, isLoaded: true });
    }
  },

  setUsuario: async (usuario, jwt) => {
    await storage.setItemAsync(JWT_KEY, jwt);
    set({ usuario });
  },

  logout: async () => {
    await storage.deleteItemAsync(JWT_KEY);
    set({ usuario: null });
  },

  logoutSessionExpired: async () => {
    await storage.deleteItemAsync(JWT_KEY);
    set({ usuario: null, sessionExpiredMessage: 'Sua sessão expirou. Faça login novamente.' });
  },

  clearSessionExpiredMessage: () => {
    set({ sessionExpiredMessage: null });
  },
}));
