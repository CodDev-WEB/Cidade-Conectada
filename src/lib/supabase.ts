import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'chave-ausente',
)

export const BUCKET_FOTOS = 'denuncias'

export function urlDaFoto(caminho: string) {
  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl
}
