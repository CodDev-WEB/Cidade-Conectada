import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { MapaCidade } from '../components/MapaCidade'
import { useAuth } from '../contexts/AuthContext'
import { formatarData, NOME_ESTACAO, STATUS } from '../lib/cidade'
import { supabase, urlDaFoto } from '../lib/supabase'
import type { Denuncia, HistoricoStatus, StatusDenuncia } from '../types/db'

export function DenunciaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const { sessao, perfil } = useAuth()
  const navegar = useNavigate()
  const aviso = (useLocation().state as { aviso?: string } | null)?.aviso
  const [denuncia, setDenuncia] = useState<Denuncia | null>(null)
  const [fotos, setFotos] = useState<string[]>([])
  const [historico, setHistorico] = useState<HistoricoStatus[]>([])
  const [apoiei, setApoiei] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [novoStatus, setNovoStatus] = useState<StatusDenuncia>('em_analise')
  const [comentario, setComentario] = useState('')

  const carregar = useCallback(async () => {
    if (!id) return
    const [d, f, h] = await Promise.all([
      supabase.from('denuncias_mapa').select('*').eq('id', id).maybeSingle(),
      supabase.from('denuncia_fotos').select('caminho').eq('denuncia_id', id).order('created_at'),
      supabase.from('historico_status').select('id, status_anterior, status_novo, comentario, created_at').eq('denuncia_id', id).order('created_at'),
    ])
    if (d.error) setErro(d.error.message)
    setDenuncia(d.data as Denuncia | null)
    setFotos(((f.data ?? []) as { caminho: string }[]).map((x) => x.caminho))
    setHistorico((h.data ?? []) as HistoricoStatus[])
    if (sessao) {
      const a = await supabase.from('apoios').select('denuncia_id').eq('denuncia_id', id).eq('usuario_id', sessao.user.id).maybeSingle()
      setApoiei(Boolean(a.data))
    }
    setCarregando(false)
  }, [id, sessao])

  useEffect(() => { void carregar() }, [carregar])

  if (carregando) return <div className="pagina centro">Carregando…</div>
  if (!denuncia) return <div className="pagina centro">{erro ?? 'Denúncia não encontrada.'} <Link to="/">Voltar ao mapa</Link></div>

  const souAutor = sessao?.user.id === denuncia.autor_id
  const souGestor = perfil?.papel === 'gestor' || perfil?.papel === 'admin'

  async function alternarApoio() {
    if (!sessao) return navegar('/entrar', { state: { de: `/denuncias/${id}` } })
    const r = apoiei
      ? await supabase.from('apoios').delete().eq('denuncia_id', id!).eq('usuario_id', sessao.user.id)
      : await supabase.from('apoios').insert({ denuncia_id: id })
    if (r.error) return setErro(r.error.message)
    await carregar()
  }

  async function excluir() {
    if (!confirm('Excluir esta denúncia? Essa ação não pode ser desfeita.')) return
    const caminhos = fotos
    const r = await supabase.from('denuncias').delete().eq('id', id!)
    if (r.error) return setErro(r.error.message)
    if (caminhos.length) await supabase.storage.from('denuncias').remove(caminhos)
    navegar('/minhas-denuncias', { replace: true })
  }

  async function atualizarStatus() {
    const r = await supabase.rpc('atualizar_status', {
      p_denuncia_id: id, p_status: novoStatus, p_comentario: comentario || null,
    })
    if (r.error) return setErro(r.error.message)
    setComentario('')
    await carregar()
  }

  const status = STATUS[denuncia.status]

  return (
    <div className="pagina detalhe">
      <div className="detalhe-conteudo">
        <Link to="/" className="sutil">← Voltar ao mapa</Link>
        {aviso && <p className="alerta">{aviso}</p>}
        <span className="selo" style={{ background: status.cor }}>{status.rotulo}</span>
        <h1>{denuncia.categoria_icone} {denuncia.titulo}</h1>
        <p className="sutil">
          {denuncia.categoria_nome} · {denuncia.bairro ?? 'Santarém'} · {formatarData(denuncia.created_at)} ·{' '}
          {NOME_ESTACAO[denuncia.estacao]}
        </p>
        {denuncia.endereco && <p>📍 {denuncia.endereco}</p>}
        {denuncia.descricao && <p className="descricao">{denuncia.descricao}</p>}

        {fotos.length > 0 && (
          <div className="galeria">
            {fotos.map((c) => (
              <a key={c} href={urlDaFoto(c)} target="_blank" rel="noreferrer">
                <img src={urlDaFoto(c)} alt="Foto da denúncia" loading="lazy" />
              </a>
            ))}
          </div>
        )}

        <div className="acoes">
          <button className={`botao ${apoiei ? 'botao-secundario' : 'botao-primario'}`} onClick={alternarApoio}>
            👍 {apoiei ? 'Você apoia' : 'Eu também tenho esse problema'} ({denuncia.apoios})
          </button>
          {souAutor && denuncia.status === 'aberta' && (
            <button className="botao botao-perigo" onClick={excluir}>Excluir</button>
          )}
        </div>

        {erro && <p className="erro" role="alert">{erro}</p>}

        {souGestor && (
          <div className="cartao formulario">
            <h2>Atualizar andamento</h2>
            <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as StatusDenuncia)}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </select>
            <textarea rows={2} placeholder="Comentário para o cidadão (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
            <button className="botao botao-primario" onClick={atualizarStatus}>Salvar</button>
          </div>
        )}

        <h2>Andamento</h2>
        <ol className="linha-tempo">
          {historico.map((h) => (
            <li key={h.id} style={{ '--cor': STATUS[h.status_novo].cor } as CSSProperties}>
              <strong>{STATUS[h.status_novo].rotulo}</strong>
              <span className="sutil pequeno"> · {formatarData(h.created_at)}</span>
              {h.comentario && <p>{h.comentario}</p>}
            </li>
          ))}
        </ol>
      </div>
      <div className="detalhe-mapa">
        <MapaCidade estacao={denuncia.estacao} denuncias={[denuncia]} centro={[denuncia.lng, denuncia.lat]} />
      </div>
    </div>
  )
}
