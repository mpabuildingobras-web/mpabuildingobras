import { Icon } from '../components'
import { TELAS } from '../lib/menus'

// Só aparece no celular: no computador estes itens já estão no menu lateral.
export function Mais({ menu, goto }) {
  return (
    <>
      <div className="pagina">
        <span className="label">Mais</span>
        <h1>Outras áreas</h1>
      </div>
      <div className="pagina lista-mais">
        {menu.mais.map((tela) => (
          <button key={tela} onClick={() => goto(tela)}>
            <Icon nome={TELAS[tela].icone} />
            {TELAS[tela].titulo}
          </button>
        ))}
      </div>
    </>
  )
}
