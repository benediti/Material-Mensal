import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Perfil = 'supervisora' | 'compras' | 'diretoria' | null

interface AuthState {
  user: User | null
  perfil: Perfil
  supervisoraId: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  perfil: null,
  supervisoraId: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const meta = session.user.user_metadata
      set({
        user: session.user,
        perfil: meta.perfil ?? null,
        supervisoraId: meta.supervisora_id ?? null,
        loading: false,
      })
    } else {
      set({ user: null, perfil: null, supervisoraId: null, loading: false })
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const meta = data.user?.user_metadata
    set({
      user: data.user,
      perfil: meta?.perfil ?? null,
      supervisoraId: meta?.supervisora_id ?? null,
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, perfil: null, supervisoraId: null })
  },
}))
