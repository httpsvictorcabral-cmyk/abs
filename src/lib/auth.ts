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
    if (data) {
      set({ user: data as Usuario });
      return;
    }

    // Profile not found — the trigger may have failed. Retry after a delay.
    await new Promise(r => setTimeout(r, 800));
    const { data: retryData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (retryData) {
      set({ user: retryData as Usuario });
      return;
    }

    // Still not found — attempt to create it manually as a fallback.
    // Get the email from the current session.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const email = session.user.email || '';
      const nomeFromMeta = (session.user.user_metadata as any)?.nome || email.split('@')[0];
      // Check if any admin exists to determine role
      const { data: adminCheck } = await supabase
        .from('usuarios')
        .select('id')
        .eq('role', 'Administrador')
        .limit(1)
        .maybeSingle();
      const role = adminCheck ? 'Visualizador' : 'Administrador';
      const { data: created } = await supabase
        .from('usuarios')
        .insert({ id: userId, email, nome: nomeFromMeta, role })
        .select('*')
        .maybeSingle();
      if (created) {
        set({ user: created as Usuario });
      }
    }
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
    if (error) {
      // Map common Supabase auth errors to Portuguese
      const msg = error.message;
      if (msg.includes('Database error saving new user')) {
        return { error: 'Erro ao criar usuário. Tente novamente em alguns segundos.' };
      }
      if (msg.includes('User already registered')) {
        return { error: 'Este e-mail já está cadastrado. Faça login.' };
      }
      return { error: msg };
    }
    // After signup, the trigger creates the profile asynchronously.
    // If we have a session, fetch the profile. Otherwise, the onAuthStateChange
    // listener will handle it when the session is established.
    if (data.user) {
      // Small delay to let the trigger complete
      await new Promise(r => setTimeout(r, 300));
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
