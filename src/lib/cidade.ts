import type { Estacao, StatusDenuncia } from '../types/db'

/** Centro de visão inicial: da orla do Tapajós aos bairros ao sul. */
export const CENTRO_SANTAREM: [number, number] = [-54.7130, -2.4480]

/** Limites aceitos pelo banco (município com folga). */
export const LIMITES = { latMin: -4.0, latMax: -1.7, lngMin: -55.6, lngMax: -53.9 }

export function dentroDeSantarem(lat: number, lng: number) {
  return lat >= LIMITES.latMin && lat <= LIMITES.latMax && lng >= LIMITES.lngMin && lng <= LIMITES.lngMax
}

/** Inverno amazônico: dezembro a junho. Verão: julho a novembro. */
export function estacaoAtual(data = new Date()): Estacao {
  const mes = Number(
    new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'America/Santarem' }).format(data),
  )
  return mes >= 7 && mes <= 11 ? 'verao' : 'inverno'
}

export const NOME_ESTACAO: Record<Estacao, string> = {
  inverno: 'Inverno (chuvas)',
  verao: 'Verão (estiagem)',
}

export const STATUS: Record<StatusDenuncia, { rotulo: string; cor: string }> = {
  aberta: { rotulo: 'Aberta', cor: '#dc2626' },
  em_analise: { rotulo: 'Em análise', cor: '#d97706' },
  em_andamento: { rotulo: 'Em andamento', cor: '#2563eb' },
  resolvida: { rotulo: 'Resolvida', cor: '#16a34a' },
  rejeitada: { rotulo: 'Rejeitada', cor: '#64748b' },
}

export function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Santarem',
  })
}

export function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'
  if (m.includes('user already registered')) return 'Já existe uma conta com esse e-mail.'
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  if (m.includes('failed to fetch')) return 'Sem conexão com o servidor. Verifique sua internet.'
  return mensagem
}
