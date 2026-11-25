import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { formatarData, STATUS } from '../lib/cidade'
import { listarDenuncias } from '../lib/dados'
import type { Denuncia } from '../types/db'

export function MinhasDenuncias() {
  const { sessao, perfil } = useAuth()
  const [denuncias, setDenuncias] = useState<Denuncia[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!sessao) return
    listarDenuncias({ autorId: sessao.user.id }).then(setDenuncias).catch((e: Error) => setErro(e.message))
  }, [sessao])

  const resolvidas = denuncias?.filter((d) => d.status === 'resolvida').length ?? 0

  return (
    <div className="pagina">
      <h1>Olá, {perfil?.nome?.split(' ')[0] ?? 'cidadão'} 👋</h1>
      {denuncias && (
        <div className="numeros">
          <div className="cartao"><strong>{denuncias.length}</strong><span>denúncias feitas</span></div>
          <div className="cartao"><strong>{resolvidas}</strong><span>resolvidas</span></div>
          <div className="cartao"><strong>{denuncias.reduce((s, d) => s + d.apoios, 0)}</strong><span>apoios recebidos</span></div>
        </div>
      )}
      {erro && <p className="erro">{erro}</p>}
      {denuncias === null && !erro && <p>Carregando…</p>}
      {denuncias?.length === 0 && (
        <div className="cartao centro">
          <p>Você ainda não fez nenhuma denúncia.</p>
          <Link to="/nova-denuncia" className="botao botao-primario">Fazer a primeira</Link>
        </div>
      )}
      <div className="lista-cartoes">
        {denuncias?.map((d) => (
          <Link key={d.id} to={`/denuncias/${d.id}`} className="cartao item-cartao">
            <span className="item-icone" style={{ background: d.categoria_cor }}>{d.categoria_icone}</span>
            <span className="item-texto">
              <strong>{d.titulo}</strong>
              <span className="sutil pequeno">{d.categoria_nome} · {formatarData(d.created_at)} · 👍 {d.apoios}</span>
            </span>
            <span className="selo" style={{ background: STATUS[d.status].cor }}>{STATUS[d.status].rotulo}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
