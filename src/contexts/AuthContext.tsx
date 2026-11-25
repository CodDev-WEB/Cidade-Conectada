import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import type { Perfil } from '../types/db'

interface AuthValor {
  sessao: Session | null
  perfil: Perfil | null
  carregando: boolean
  recarregarPerfil: () => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthValor | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(supabaseConfigurado)

  const buscarPerfil = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setPerfil(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, telefone, bairro, papel')
      .eq('id', userId)
      .maybeSingle()
    setPerfil((data as Perfil | null) ?? null)
  }, [])

  useEffect(() => {
    if (!supabaseConfigurado) return
    let ativo = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      await buscarPerfil(data.session?.user.id)
      if (ativo) setCarregando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      // Fora do callback para não travar o cliente de auth.
      setTimeout(() => void buscarPerfil(novaSessao?.user.id), 0)
    })

    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [buscarPerfil])

  const valor: AuthValor = {
    sessao,
    perfil,
    carregando,
    recarregarPerfil: () => buscarPerfil(sessao?.user.id),
    sair: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
