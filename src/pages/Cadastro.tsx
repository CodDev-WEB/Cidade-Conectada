import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { traduzirErro } from '../lib/cidade'
import { useAuth } from '../contexts/AuthContext'

export function Cadastro() {
  const { sessao } = useAuth()
  const navegar = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', bairro: '', senha: '', confirmar: '' })
  const [erro, setErro] = useState<string | null>(null)
  const [confirmarEmail, setConfirmarEmail] = useState(false)
  const [enviando, setEnviando] = useState(false)

  if (sessao) return <Navigate to="/" replace />

  const campo = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (form.nome.trim().length < 2) return setErro('Informe seu nome.')
    if (form.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (form.senha !== form.confirmar) return setErro('As senhas não conferem.')

    setEnviando(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.senha,
      options: {
        data: { nome: form.nome.trim(), telefone: form.telefone.trim(), bairro: form.bairro.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    setEnviando(false)
    if (error) return setErro(traduzirErro(error.message))
    if (data.session) navegar('/', { replace: true })
    else setConfirmarEmail(true)
  }

  if (confirmarEmail) {
    return (
      <div className="pagina pagina-estreita">
        <div className="cartao formulario">
          <h1>Quase lá! 📬</h1>
          <p>
            Enviamos um link de confirmação para <strong>{form.email}</strong>. Abra o e-mail e clique no
            link para ativar sua conta.
          </p>
          <Link to="/entrar" className="botao botao-primario">Ir para o login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pagina pagina-estreita">
      <form className="cartao formulario" onSubmit={enviar}>
        <h1>Criar conta</h1>
        <p className="sutil">Cadastre-se para denunciar problemas e acompanhar as soluções no seu bairro.</p>
        <label>
          Nome completo
          <input autoComplete="name" required {...campo('nome')} />
        </label>
        <label>
          E-mail
          <input type="email" autoComplete="email" required {...campo('email')} />
        </label>
        <div className="linha">
          <label>
            <span>Telefone <span className="sutil">(opcional)</span></span>
            <input type="tel" autoComplete="tel" placeholder="(93) 9…" {...campo('telefone')} />
          </label>
          <label>
            <span>Bairro <span className="sutil">(opcional)</span></span>
            <input placeholder="Ex.: Aldeia" {...campo('bairro')} />
          </label>
        </div>
        <div className="linha">
          <label>
            Senha
            <input type="password" autoComplete="new-password" required minLength={6} {...campo('senha')} />
          </label>
          <label>
            Confirmar senha
            <input type="password" autoComplete="new-password" required {...campo('confirmar')} />
          </label>
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao botao-primario" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
        <p className="sutil centro">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
