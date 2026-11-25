import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { MapaCidade } from '../components/MapaCidade'
import { SeletorEstacao } from '../components/SeletorEstacao'
import { estacaoAtual, formatarData, NOME_ESTACAO, STATUS } from '../lib/cidade'
import { listarCategorias, listarDenuncias } from '../lib/dados'
import { CATEGORIAS_DEMO, DENUNCIAS_DEMO } from '../lib/demo'
import { supabaseConfigurado, urlDaFoto } from '../lib/supabase'
import type { Categoria, Denuncia, Estacao, StatusDenuncia } from '../types/db'

export function Mapa() {
  const [estacao, setEstacao] = useState<Estacao>(estacaoAtual())
  const [todoAno, setTodoAno] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [denuncias, setDenuncias] = useState<Denuncia[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<StatusDenuncia | 'pendentes' | null>('pendentes')
  const [selecionada, setSelecionada] = useState<Denuncia | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCategorias(CATEGORIAS_DEMO)
      setDenuncias(DENUNCIAS_DEMO)
      return
    }
    Promise.all([listarCategorias(), listarDenuncias()])
      .then(([c, d]) => {
        setCategorias(c)
        setDenuncias(d)
      })
      .catch((e: Error) => setErro(e.message))
  }, [])

  const visiveis = useMemo(
    () =>
      denuncias.filter((d) => {
        if (!todoAno && d.estacao !== estacao) return false
        if (filtroCategoria && d.categoria_id !== filtroCategoria) return false
        if (filtroStatus === 'pendentes') return d.status !== 'resolvida' && d.status !== 'rejeitada'
        if (filtroStatus && d.status !== filtroStatus) return false
        return true
      }),
    [denuncias, estacao, todoAno, filtroCategoria, filtroStatus],
  )

  // Categorias típicas da estação aparecem primeiro.
  const categoriasOrdenadas = useMemo(
    () =>
      [...categorias].sort((a, b) => {
        const pa = a.estacao_tipica === estacao ? 0 : a.estacao_tipica === 'ambas' ? 1 : 2
        const pb = b.estacao_tipica === estacao ? 0 : b.estacao_tipica === 'ambas' ? 1 : 2
        return pa - pb || a.ordem - b.ordem
      }),
    [categorias, estacao],
  )

  const resumo = useMemo(() => {
    const porCategoria = new Map<string, number>()
    visiveis.forEach((d) => porCategoria.set(d.categoria_id, (porCategoria.get(d.categoria_id) ?? 0) + 1))
    return porCategoria
  }, [visiveis])

  return (
    <div className="tela-mapa">
      <aside className="painel">
        <div className="painel-bloco">
          <SeletorEstacao valor={estacao} onChange={(e) => { setEstacao(e); setSelecionada(null) }} />
          <p className="sutil pequeno">
            {NOME_ESTACAO[estacao]}: {estacao === 'inverno'
              ? 'dezembro a junho, época de alagamentos, buracos e esgoto.'
              : 'julho a novembro, época de queimadas, incêndios e falta d’água.'}
          </p>
          <label className="checagem">
            <input type="checkbox" checked={todoAno} onChange={(e) => setTodoAno(e.target.checked)} />
            Mostrar denúncias do ano todo
          </label>
        </div>

        <div className="painel-bloco">
          <h2 className="titulo-bloco">Categorias</h2>
          <div className="chips">
            <button className={`chip ${!filtroCategoria ? 'ativo' : ''}`} onClick={() => setFiltroCategoria(null)}>
              Todas
            </button>
            {categoriasOrdenadas.map((c) => (
              <button
                key={c.id}
                className={`chip ${filtroCategoria === c.id ? 'ativo' : ''} ${c.estacao_tipica === estacao ? 'tipica' : ''}`}
                style={{ '--cor': c.cor } as CSSProperties}
                onClick={() => setFiltroCategoria(filtroCategoria === c.id ? null : c.id)}
                title={c.descricao}
              >
                {c.icone} {c.nome}
                {resumo.get(c.id) ? <span className="contador">{resumo.get(c.id)}</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="painel-bloco">
          <h2 className="titulo-bloco">Situação</h2>
          <select value={filtroStatus ?? ''} onChange={(e) => setFiltroStatus((e.target.value || null) as typeof filtroStatus)}>
            <option value="pendentes">Pendentes (não resolvidas)</option>
            <option value="">Todas</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.rotulo}</option>
            ))}
          </select>
        </div>

        <div className="painel-bloco lista">
          <h2 className="titulo-bloco">{visiveis.length} denúncia{visiveis.length === 1 ? '' : 's'}</h2>
          {erro && <p className="erro">Erro ao carregar: {erro}</p>}
          {!erro && visiveis.length === 0 && (
            <p className="sutil">Nenhuma denúncia com esses filtros.</p>
          )}
          {visiveis.slice(0, 50).map((d) => (
            <button key={d.id} className={`item ${selecionada?.id === d.id ? 'ativo' : ''}`} onClick={() => setSelecionada(d)}>
              <span className="item-icone" style={{ background: `${d.categoria_cor}26` }}>{d.categoria_icone}</span>
              <span className="item-texto">
                <strong>{d.titulo}</strong>
                <span className="sutil pequeno">
                  {d.bairro ?? 'Santarém'} · {formatarData(d.created_at)} · 👍 {d.apoios}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="area-mapa">
        <MapaCidade denuncias={visiveis} estacao={estacao} onSelecionar={setSelecionada} />
        {selecionada && (
          <div className="cartao flutuante">
            <button className="fechar" aria-label="Fechar" onClick={() => setSelecionada(null)}>×</button>
            {selecionada.foto && <img src={urlDaFoto(selecionada.foto)} alt="" className="miniatura" />}
            <span className="selo" style={{ background: STATUS[selecionada.status].cor }}>
              {STATUS[selecionada.status].rotulo}
            </span>
            <h3>{selecionada.categoria_icone} {selecionada.titulo}</h3>
            <p className="sutil pequeno">
              {selecionada.categoria_nome} · {selecionada.bairro ?? 'Santarém'} · {formatarData(selecionada.created_at)}
            </p>
            <p className="pequeno">👍 {selecionada.apoios} pessoas apoiam</p>
            {supabaseConfigurado ? (
              <Link to={`/denuncias/${selecionada.id}`} className="botao botao-primario">Ver detalhes</Link>
            ) : (
              <span className="sutil pequeno">Exemplo de demonstração</span>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
