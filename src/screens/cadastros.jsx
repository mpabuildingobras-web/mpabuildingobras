import { Titulo } from '../components'
import { PERFIS } from '../lib/menus'

export function Perfil({ perfil, usuario, onSair }) {
  return (
    <>
      <Titulo rotulo="Meu perfil" titulo={usuario.nome} />
      <div className="section">
        <div className="panel" style={{ padding: 16 }}>
          <span className="label">Perfil</span>
          <p style={{ margin: '4px 0 12px', fontSize: 18, fontWeight: 500 }}>{PERFIS[perfil].rotulo}</p>
          <span className="label">E-mail</span>
          <p style={{ margin: '4px 0 16px', fontSize: 18, fontWeight: 500 }}>{usuario.email}</p>
          <button className="btn btn-block" onClick={onSair}>Sair</button>
        </div>
      </div>
    </>
  )
}
