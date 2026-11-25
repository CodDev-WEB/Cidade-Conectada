import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapaCidade } from '../components/MapaCidade'
import { useAuth } from '../contexts/AuthContext'
import { dentroDeSantarem, estacaoAtual } from '../lib/cidade'
import { listarCategorias } from '../lib/dados'
import { BUCKET_FOTOS, supabase } from '../lib/supabase'
import type { Categoria, DenunciaProxima } from '../types/db'

const MAX_FOTOS = 3
const MAX_BYTES = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']

function FotoPrevia({ arquivo, onRemover }: { arquivo: File; onRemover: () => void }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(arquivo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [arquivo])
  return (
    <figure>
      {url && <img src={url} alt={arquivo.name} />}
      <button type="button" aria-label="Remover foto" onClick={onRemover}>×</button>
    </figure>
  )
}

export function NovaDenuncia() {
  const { sessao, perfil } = useAuth()
  const navegar = useNavigate()
  const estacao = estacaoAtual()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [ponto, setPonto] = useState<{ lat: number; lng: number } | null>(null)
  const [fotos, setFotos] = useState<File[]>([])
  const [proximas, setProximas] = useState<DenunciaProxima[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarCategorias().then(setCategorias).catch((e: Error) => setErro(e.message))
  }, [])

  useEffect(() => {
    if (perfil?.bairro && !bairro) setBairro(perfil.bairro)
  }, [perfil, bairro])

  // Procura denúncias parecidas por perto para evitar duplicatas.
  useEffect(() => {
    if (!ponto || !categoriaId) return setProximas([])
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('denuncias_proximas', {
        p_lat: ponto.lat, p_lng: ponto.lng, p_categoria: categoriaId, p_raio_m: 150,
      })
      setProximas((data as DenunciaProxima[] | null) ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [ponto, categoriaId])

  function escolherPonto(lat: number, lng: number) {
    if (!dentroDeSantarem(lat, lng)) return setErro('Escolha um ponto dentro do município de Santarém.')
    setErro(null)
    setPonto({ lat, lng })
  }

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) return setErro('Seu navegador não permite localização.')
    navigator.geolocation.getCurrentPosition(
      (p) => escolherPonto(p.coords.latitude, p.coords.longitude),
      () => setErro('Não foi possível obter sua localização. Marque o ponto no mapa.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function adicionarFotos(lista: FileList | null) {
    if (!lista) return
    const novas = Array.from(lista).filter((f) => TIPOS.includes(f.type) && f.size <= MAX_BYTES)
    if (novas.length < lista.length) setErro('Algumas fotos foram ignoradas (use JPG, PNG ou WEBP de até 5 MB).')
    setFotos((atuais) => [...atuais, ...novas].slice(0, MAX_FOTOS))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!sessao) return
    if (!categoriaId) return setErro('Escolha uma categoria.')
    if (!ponto) return setErro('Marque no mapa onde fica o problema.')
    if (titulo.trim().length < 5) return setErro('O título precisa ter pelo menos 5 caracteres.')

    setEnviando(true)
    const { data, error } = await supabase
      .from('denuncias')
      .insert({
        categoria_id: categoriaId,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        lat: ponto.lat,
        lng: ponto.lng,
        endereco: endereco.trim() || null,
        bairro: bairro.trim() || null,
      })
      .select('id')
      .single()

    if (error || !data) {
      setEnviando(false)
      return setErro(error?.message ?? 'Não foi possível registrar a denúncia.')
    }

    const falhas: string[] = []
    for (const foto of fotos) {
      const ext = foto.type.split('/')[1].replace('jpeg', 'jpg')
      const caminho = `${sessao.user.id}/${data.id}/${crypto.randomUUID()}.${ext}`
      const up = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, foto, { contentType: foto.type })
      if (up.error) { falhas.push(foto.name); continue }
      const reg = await supabase.from('denuncia_fotos').insert({ denuncia_id: data.id, caminho })
      if (reg.error) falhas.push(foto.name)
    }

    setEnviando(false)
    navegar(`/denuncias/${data.id}`, {
      replace: true,
      state: falhas.length ? { aviso: `Denúncia registrada, mas ${falhas.length} foto(s) não foram enviadas.` } : undefined,
    })
  }

  const categoriasOrdenadas = [...categorias].sort((a, b) => {
    const p = (c: Categoria) => (c.estacao_tipica === estacao ? 0 : c.estacao_tipica === 'ambas' ? 1 : 2)
    return p(a) - p(b) || a.ordem - b.ordem
  })

  return (
    <div className="tela-nova">
      <form className="painel formulario" onSubmit={enviar}>
        <h1>Nova denúncia</h1>

        <fieldset className="categorias-grade">
          <legend>O que está acontecendo?</legend>
          {categoriasOrdenadas.map((c) => (
            <label key={c.id} className={`categoria-opcao ${categoriaId === c.id ? 'ativo' : ''}`} style={{ borderColor: categoriaId === c.id ? c.cor : undefined }}>
              <input type="radio" name="categoria" value={c.id} checked={categoriaId === c.id} onChange={() => setCategoriaId(c.id)} />
              <span className="categoria-icone">{c.icone}</span>
              <span>{c.nome}</span>
            </label>
          ))}
        </fieldset>

        <div className="campo-local">
          <span className="rotulo">Onde?</span>
          <p className="sutil pequeno">
            {ponto ? `📍 ${ponto.lat.toFixed(5)}, ${ponto.lng.toFixed(5)}` : 'Toque no mapa para marcar o local exato.'}
          </p>
          <button type="button" className="botao botao-secundario" onClick={usarMinhaLocalizacao}>
            Usar minha localização
          </button>
        </div>

        {proximas.length > 0 && (
          <div className="alerta">
            <strong>Já existe denúncia parecida aqui perto.</strong> Que tal apoiar em vez de criar outra?
            <ul>
              {proximas.map((p) => (
                <li key={p.id}>
                  <Link to={`/denuncias/${p.id}`}>{p.titulo}</Link>{' '}
                  <span className="sutil">({Math.round(p.distancia_m)} m · 👍 {p.apoios})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label>
          Título
          <input required maxLength={120} placeholder="Ex.: Rua alagada em frente à escola" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <label>
          <span>Descrição <span className="sutil">(opcional)</span></span>
          <textarea rows={4} maxLength={2000} placeholder="Desde quando? Qual o tamanho do problema?" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </label>
        <div className="linha">
          <label>
            Endereço / referência
            <input maxLength={200} placeholder="Rua, número, ponto de referência" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </label>
          <label>
            Bairro
            <input maxLength={80} value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </label>
        </div>
        <label>
          <span>Fotos <span className="sutil">(até {MAX_FOTOS})</span></span>
          <input type="file" accept={TIPOS.join(',')} multiple capture="environment" onChange={(e) => adicionarFotos(e.target.files)} disabled={fotos.length >= MAX_FOTOS} />
        </label>
        {fotos.length > 0 && (
          <div className="fotos-previa">
            {fotos.map((f, i) => (
              <FotoPrevia key={`${f.name}-${i}`} arquivo={f} onRemover={() => setFotos(fotos.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}

        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao botao-primario" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Registrar denúncia'}
        </button>
      </form>
      <section className="area-mapa">
        <MapaCidade estacao={estacao} ponto={ponto} onClicarMapa={escolherPonto} />
      </section>
    </div>
  )
}
