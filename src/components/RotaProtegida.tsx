import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth()
  const local = useLocation()
  if (carregando) return <div className="pagina centro">Carregando…</div>
  if (!sessao) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  return <>{children}</>
}
