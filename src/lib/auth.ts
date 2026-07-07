import { create } from 'zustand';
import { supabase } from './supabase';
import type { Usuario, UserRole } from '@/types';

interface AuthState {
  user: Usuario | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchUsuario: (userId: string) => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  canEdit: () => boolean;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ session });
      await get().fetchUsuario(session.user.id);
    }
    set({ initialized: true });

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_IN' && session) {
          set({ session });
          await get().fetchUsuario(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null });
        }
      })();
    });
  },

  fetchUsuario: async (userId: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return;
    }
    set({ user: data as Usuario });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  signUp: async (email, password, nome) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    set({ loading: false });
    if (error) return { error: error.message };
    if (data.user) {
      await get().fetchUsuario(data.user.id);
    }
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  hasRole: (...roles) => {
    const user = get().user;
    if (!user) return false;
    return roles.includes(user.role);
  },

  canEdit: () => {
    const user = get().user;
    if (!user) return false;
    return user.role === 'Administrador' || user.role === 'RH';
  },
}));
