export type Estacao = 'inverno' | 'verao'
export type EstacaoTipica = Estacao | 'ambas'
export type StatusDenuncia = 'aberta' | 'em_analise' | 'em_andamento' | 'resolvida' | 'rejeitada'
export type Papel = 'cidadao' | 'gestor' | 'admin'

export interface Perfil {
  id: string
  nome: string
  telefone: string | null
  bairro: string | null
  papel: Papel
}

export interface Categoria {
  id: string
  nome: string
  descricao: string
  icone: string
  cor: string
  estacao_tipica: EstacaoTipica
  ordem: number
}

/** Linha da visão `denuncias_mapa`. */
export interface Denuncia {
  id: string
  autor_id: string
  categoria_id: string
  titulo: string
  descricao: string
  status: StatusDenuncia
  lat: number
  lng: number
  endereco: string | null
  bairro: string | null
  estacao: Estacao
  created_at: string
  updated_at: string
  resolvida_em: string | null
  categoria_nome: string
  categoria_icone: string
  categoria_cor: string
  apoios: number
  foto: string | null
}

export interface HistoricoStatus {
  id: number
  status_anterior: StatusDenuncia | null
  status_novo: StatusDenuncia
  comentario: string | null
  created_at: string
}

export interface DenunciaProxima {
  id: string
  titulo: string
  categoria_id: string
  status: StatusDenuncia
  distancia_m: number
  apoios: number
  created_at: string
}
