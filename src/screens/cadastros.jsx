import { useState } from 'react'
import { Titulo } from '../components'
import { conferirNovaSenha } from '../lib/acesso'
import { trocarSenha } from '../lib/dados'
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
      <TrocarSenha />
    </>
  )
}

const VAZIO = { senha: '', repetir: '' }

// A senha provisória que o sócio criou vira a senha da pessoa.
function TrocarSenha() {
  const [d, setD] = useState(VAZIO)
  const [erros, setErros] = useState({})
  const [falha, setFalha] = useState('')
  const [feito, setFeito] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const muda = (c) => (e) => { setFeito(false); setD({ ...d, [c]: e.target.value }) }
  const salvar = async (e) => {
    e.preventDefault()
    if (salvando) return
    const r = conferirNovaSenha(d)
    setErros(r.erros)
    setFalha('')
    if (!r.ok) return
    setSalvando(true)
    const { erro } = await trocarSenha(d.senha)
    setSalvando(false)
    if (erro) return setFalha(erro)
    setD(VAZIO)
    setFeito(true)
  }
  return (
    <div className="section">
      <form className="panel form-painel" onSubmit={salvar} noValidate>
        <h2 className="full" style={{ margin: 0, fontSize: 18 }}>Trocar senha</h2>
        <div className="field"><label className="label" htmlFor="nova-senha">Senha nova</label>
          <input id="nova-senha" type="password" autoComplete="new-password" value={d.senha} onChange={muda('senha')} />
          {erros.senha && <span className="acesso-erro">{erros.senha}</span>}</div>
        <div className="field"><label className="label" htmlFor="repetir-senha">Repita a senha nova</label>
          <input id="repetir-senha" type="password" autoComplete="new-password" value={d.repetir} onChange={muda('repetir')} />
          {erros.repetir && <span className="acesso-erro">{erros.repetir}</span>}</div>
        {falha && <p className="acesso-erro full" role="alert">{falha}</p>}
        {feito && <p className="full" role="status" style={{ margin: 0, fontWeight: 600 }}>Senha trocada. Na próxima vez, entre com a senha nova.</p>}
        <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Trocar senha'}</button>
      </form>
    </div>
  )
}
