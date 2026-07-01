import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export type Perfil = 'ti' | 'compras' | 'diretoria' | 'supervisora' | 'pendente' | null

interface AuthState {
  user: User | null
  perfil: Perfil
  perfilAtivo: boolean
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

async function fetchPerfil(userId: string): Promise<{ perfil: Perfil; ativo: boolean }> {
  const { data } = await supabase
    .from('usuarios_perfis')
    .select('perfil, ativo')
    .eq('user_id', userId)
    .single()
  return { perfil: (data?.perfil as Perfil) ?? null, ativo: data?.ativo ?? false }
}

// Garante que o listener de auth é registrado uma única vez
let listenerRegistrado = false

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  perfil: null,
  perfilAtivo: false,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      if (!session.user.email?.endsWith('@equippe.com.br')) {
        await supabase.auth.signOut()
        set({ user: null, perfil: null, perfilAtivo: false, loading: false })
        return
      }
      const { perfil, ativo } = await fetchPerfil(session.user.id)
      set({ user: session.user, perfil, perfilAtivo: ativo, loading: false })
    } else {
      set({ user: null, perfil: null, perfilAtivo: false, loading: false })
    }

    if (!listenerRegistrado) {
      listenerRegistrado = true
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          if (!session.user.email?.endsWith('@equippe.com.br')) {
            await supabase.auth.signOut()
            set({ user: null, perfil: null, perfilAtivo: false, loading: false })
            return
          }
          const { perfil, ativo } = await fetchPerfil(session.user.id)
          set({ user: session.user, perfil, perfilAtivo: ativo, loading: false })
        } else {
          set({ user: null, perfil: null, perfilAtivo: false, loading: false })
        }
      })
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, perfil: null, perfilAtivo: false })
  },
}))
