import type { Categoria, Denuncia, Estacao, StatusDenuncia } from '../types/db'

/** Dados de exemplo exibidos enquanto o Supabase não está configurado. */
export const CATEGORIAS_DEMO: Categoria[] = [
  { id: 'alagamento', nome: 'Alagamento', descricao: 'Ruas ou casas alagadas', icone: '🌊', cor: '#2563eb', estacao_tipica: 'inverno', ordem: 1 },
  { id: 'buraco', nome: 'Buraco na rua', descricao: 'Buracos e asfalto danificado', icone: '🕳️', cor: '#b45309', estacao_tipica: 'inverno', ordem: 2 },
  { id: 'esgoto', nome: 'Esgoto a céu aberto', descricao: 'Esgoto vazando ou bueiro entupido', icone: '🚱', cor: '#65a30d', estacao_tipica: 'inverno', ordem: 3 },
  { id: 'arvore_caida', nome: 'Árvore caída', descricao: 'Árvores ou galhos caídos', icone: '🌳', cor: '#15803d', estacao_tipica: 'inverno', ordem: 4 },
  { id: 'falta_agua', nome: 'Falta d’água', descricao: 'Sem abastecimento de água', icone: '💧', cor: '#0891b2', estacao_tipica: 'verao', ordem: 5 },
  { id: 'queimada', nome: 'Queimada', descricao: 'Queima de lixo ou mato', icone: '🔥', cor: '#ea580c', estacao_tipica: 'verao', ordem: 6 },
  { id: 'incendio', nome: 'Incêndio', descricao: 'Incêndio em imóvel ou área verde', icone: '🚒', cor: '#dc2626', estacao_tipica: 'verao', ordem: 7 },
  { id: 'iluminacao', nome: 'Iluminação pública', descricao: 'Poste apagado ou danificado', icone: '💡', cor: '#ca8a04', estacao_tipica: 'ambas', ordem: 8 },
  { id: 'lixo', nome: 'Lixo acumulado', descricao: 'Coleta não realizada', icone: '🗑️', cor: '#57534e', estacao_tipica: 'ambas', ordem: 9 },
  { id: 'mobilidade', nome: 'Mobilidade e transporte', descricao: 'Ônibus, sinalização, calçadas', icone: '🚌', cor: '#7c3aed', estacao_tipica: 'ambas', ordem: 10 },
]

type Exemplo = [string, string, number, number, string, Estacao, StatusDenuncia, number, string]
const EXEMPLOS: Exemplo[] = [
  ['alagamento', 'Rua toda alagada depois da chuva', -2.4405, -54.7125, 'Aldeia', 'inverno', 'aberta', 23, '2026-03-12'],
  ['buraco', 'Cratera no meio da avenida', -2.4479, -54.7178, 'Santa Clara', 'inverno', 'em_andamento', 41, '2026-02-20'],
  ['esgoto', 'Bueiro entupido transbordando', -2.4512, -54.7068, 'Prainha', 'inverno', 'aberta', 12, '2026-04-02'],
  ['arvore_caida', 'Árvore caiu sobre a calçada', -2.4366, -54.7041, 'Centro', 'inverno', 'resolvida', 8, '2026-01-28'],
  ['alagamento', 'Água entrando nas casas', -2.4560, -54.7215, 'Caranazal', 'inverno', 'em_analise', 35, '2026-05-06'],
  ['buraco', 'Buracos em sequência na travessa', -2.4590, -54.7120, 'Liberdade', 'inverno', 'aberta', 17, '2026-03-30'],
  ['falta_agua', 'Bairro sem água há 3 dias', -2.4550, -54.7010, 'Aparecida', 'verao', 'aberta', 52, '2026-09-14'],
  ['queimada', 'Queima de lixo em terreno baldio', -2.4625, -54.7240, 'Interventoria', 'verao', 'em_analise', 9, '2026-08-22'],
  ['incendio', 'Fogo em área de mato perto das casas', -2.4680, -54.7165, 'Jardim Santarém', 'verao', 'em_andamento', 27, '2026-10-03'],
  ['falta_agua', 'Torneira seca à tarde toda semana', -2.4440, -54.7230, 'Laguinho', 'verao', 'aberta', 19, '2026-10-21'],
  ['iluminacao', 'Rua escura, três postes apagados', -2.4425, -54.7085, 'Centro', 'verao', 'aberta', 14, '2026-11-02'],
  ['lixo', 'Lixo acumulado na esquina', -2.4500, -54.7140, 'Santa Clara', 'verao', 'aberta', 6, '2026-11-10'],
  ['mobilidade', 'Parada de ônibus sem cobertura', -2.4470, -54.7095, 'Centro', 'inverno', 'aberta', 11, '2026-02-02'],
  ['iluminacao', 'Poste piscando a noite inteira', -2.4535, -54.7190, 'Caranazal', 'inverno', 'aberta', 4, '2026-04-18'],
]

export const DENUNCIAS_DEMO: Denuncia[] = EXEMPLOS.map(([cat, titulo, lat, lng, bairro, estacao, status, apoios, data], i) => {
  const c = CATEGORIAS_DEMO.find((x) => x.id === cat)!
  return {
    id: `demo-${i}`,
    autor_id: 'demo',
    categoria_id: cat,
    titulo,
    descricao: '',
    status,
    lat,
    lng,
    endereco: null,
    bairro,
    estacao,
    created_at: `${data}T12:00:00-03:00`,
    updated_at: `${data}T12:00:00-03:00`,
    resolvida_em: null,
    categoria_nome: c.nome,
    categoria_icone: c.icone,
    categoria_cor: c.cor,
    apoios,
    foto: null,
  }
})
