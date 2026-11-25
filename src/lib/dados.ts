import { supabase } from './supabase'
import type { Categoria, Denuncia } from '../types/db'

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('ordem')
  if (error) throw error
  return data as Categoria[]
}

export async function listarDenuncias(filtro: { autorId?: string } = {}): Promise<Denuncia[]> {
  let q = supabase.from('denuncias_mapa').select('*').order('created_at', { ascending: false }).limit(1000)
  if (filtro.autorId) q = q.eq('autor_id', filtro.autorId)
  const { data, error } = await q
  if (error) throw error
  return data as Denuncia[]
}
