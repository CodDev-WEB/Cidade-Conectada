import type { Estacao } from '../types/db'

export function SeletorEstacao({ valor, onChange }: { valor: Estacao; onChange: (e: Estacao) => void }) {
  return (
    <div className="seletor-estacao" role="radiogroup" aria-label="Estação">
      <button role="radio" aria-checked={valor === 'inverno'} className={valor === 'inverno' ? 'ativo' : ''} onClick={() => onChange('inverno')}>
        🌧️ Inverno
      </button>
      <button role="radio" aria-checked={valor === 'verao'} className={valor === 'verao' ? 'ativo' : ''} onClick={() => onChange('verao')}>
        ☀️ Verão
      </button>
    </div>
  )
}
