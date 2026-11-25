import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabaseConfigurado } from '../lib/supabase'

export function Layout() {
  const { sessao, perfil, sair } = useAuth()
  const navegar = useNavigate()

  return (
    <div className="app">
      <header className="topo">
        <NavLink to="/" className="marca">
          <span className="marca-icone" aria-hidden>📍</span>
          <span>
            Cidade Conectada <small>Santarém · PA</small>
          </span>
        </NavLink>
        <nav className="menu">
          <NavLink to="/" end>Mapa</NavLink>
          {sessao ? (
            <>
              <NavLink to="/minhas-denuncias">Minhas denúncias</NavLink>
              <NavLink to="/nova-denuncia" className="botao botao-primario">+ Denunciar</NavLink>
              <button
                className="botao botao-fantasma"
                onClick={async () => {
                  await sair()
                  navegar('/')
                }}
                title={perfil?.nome}
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <NavLink to="/entrar">Entrar</NavLink>
              <NavLink to="/cadastro" className="botao botao-primario">Cadastre-se</NavLink>
            </>
          )}
        </nav>
      </header>
      {!supabaseConfigurado && (
        <div className="aviso">
          Modo demonstração: as denúncias no mapa são exemplos. Para ativar cadastro e denúncias de verdade,
          configure o Supabase (veja o README).
        </div>
      )}
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  )
}
