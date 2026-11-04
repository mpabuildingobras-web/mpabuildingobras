import { useState } from 'react'
import { Carregando, Titulo, useAviso, useCarregar, useOcupado } from '../components'
import { listarUsuarios, salvarUsuario } from '../lib/dados'
import { TELAS, telasConfiguraveis } from '../lib/menus'
import { useObra } from '../lib/ObraContext'
import { ROLES, ROTULO_ROLE } from '../lib/usuarios'

const VAZIO = { nome: '', email: '', role: 'auxiliar', obras: [], telas_bloqueadas: [] }

// Quem entra no app, em quais obras e em quais telas. Só sócios.
export function Usuarios({ usuario: eu }) {
  const estado = useCarregar(listarUsuarios)
  const { obras } = useObra()
  const [editando, setEditando] = useState(null)
  const [aviso, avisar] = useAviso()
  const lista = [...(estado.data ?? [])].sort((a, b) => Number(b.role === 'pendente') - Number(a.role === 'pendente'))
  const codigos = (ids) => ids.map((id) => obras.find((o) => o.id === id)?.codigo).filter(Boolean).join(', ')
  const editar = (u) => setEditando({ ...u, role: u.role === 'pendente' ? 'cliente' : u.role, obras: u.obras ?? [] })
  return (
    <>
      <Titulo rotulo="Usuários" titulo="Quem acessa o app">
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setEditando(editando ? null : VAZIO)}>{editando ? 'Fechar' : '+ Novo usuário'}</button>
      </Titulo>
      {editando && (
        <div className="section">
          <FormUsuario inicial={editando} obras={obras} eu={eu}
            onCancelar={() => setEditando(null)}
            onSalvo={() => { setEditando(null); avisar('Acesso salvo.'); estado.recarregar() }} />
        </div>
      )}
      <Carregando estado={estado}>
        <div className="section">
          {lista.map((u) => (
            <div key={u.id} className="item" style={{ cursor: 'default' }}>
              <span className={`sq ${u.role === 'pendente' ? 'amber' : 'green'}`}></span>
              <span>
                <span className="item-title">{u.nome}</span>
                <span className="label item-meta" style={{ display: 'block' }}>{u.email}</span>
                <span className="tags">
                  <span className={`tag ${u.role === 'pendente' ? 'amber' : 'slate'}`}>{ROTULO_ROLE[u.role]}</span>
                  {u.role === 'socio' ? <span className="tag slate">Todas as obras</span> : u.obras.length > 0 && <span className="tag slate">{codigos(u.obras)}</span>}
                  {u.telas_bloqueadas.length > 0 && <span className="tag amber">{u.telas_bloqueadas.length === 1 ? '1 tela bloqueada' : `${u.telas_bloqueadas.length} telas bloqueadas`}</span>}
                </span>
              </span>
              <button className="btn" onClick={() => editar(u)}>{u.role === 'pendente' ? 'Liberar' : 'Editar'}</button>
            </div>
          ))}
        </div>
      </Carregando>
      {aviso}
    </>
  )
}

function FormUsuario({ inicial, obras, eu, onSalvo, onCancelar }) {
  const [d, setD] = useState(inicial)
  const [erros, setErros] = useState({})
  const [falha, setFalha] = useState('')
  const [salvando, rodar] = useOcupado()
  const muda = (c) => (e) => setD({ ...d, [c]: e.target.value })
  // Trocar de perfil zera os bloqueios: as telas de um perfil não valem para o outro.
  const mudaPerfil = (e) => setD({ ...d, role: e.target.value, telas_bloqueadas: [] })
  const alternar = (lista, valor) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor])
  const salvar = async (e) => {
    e.preventDefault()
    const r = await salvarUsuario(d)
    if (r.erros) return setErros(r.erros)
    if (r.erro) return setFalha(r.erro)
    onSalvo()
  }
  // Ninguém tira de si mesmo o acesso a esta tela: ficaria sem como desfazer.
  const travada = (t) => d.id === eu.id && t === 'usuarios'
  return (
    <form className="panel form-painel" onSubmit={(e) => rodar(() => salvar(e))} noValidate>
      <div className="field"><label className="label" htmlFor="u-nome">Nome</label>
        <input id="u-nome" value={d.nome} onChange={muda('nome')} />{erros.nome && <span className="acesso-erro">{erros.nome}</span>}</div>
      <div className="field"><label className="label" htmlFor="u-email">E-mail</label>
        <input id="u-email" type="email" value={d.email} onChange={muda('email')} />{erros.email && <span className="acesso-erro">{erros.email}</span>}</div>
      <div className="field full"><label className="label" htmlFor="u-role">Perfil</label>
        <select id="u-role" value={d.role} onChange={mudaPerfil}>{ROLES.map((r) => <option key={r} value={r}>{ROTULO_ROLE[r]}</option>)}</select>
        {erros.role && <span className="acesso-erro">{erros.role}</span>}</div>

      {d.role !== 'socio' && (
        <fieldset className="full form-grupo">
          <legend className="label">Obras que pode ver</legend>
          {obras.map((o) => (
            <label key={o.id} className="check">
              <input type="checkbox" checked={d.obras.includes(o.id)} onChange={() => setD({ ...d, obras: alternar(d.obras, o.id) })} />
              <span>{o.codigo}, {o.nome}</span>
            </label>
          ))}
          {erros.obras && <span className="acesso-erro">{erros.obras}</span>}
        </fieldset>
      )}

      <fieldset className="full form-grupo">
        <legend className="label">Telas que pode acessar</legend>
        <p className="form-nota">As opções são as do perfil {ROTULO_ROLE[d.role]}. Para dar mais acesso, troque o perfil.</p>
        <div className="equipe-grid">
          {telasConfiguraveis(d.role).map((t) => (
            <label key={t} className="check">
              <input type="checkbox" disabled={travada(t)} checked={!d.telas_bloqueadas.includes(t)}
                onChange={() => setD({ ...d, telas_bloqueadas: alternar(d.telas_bloqueadas, t) })} />
              <span>{TELAS[t].titulo}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {falha && <p className="acesso-erro full" role="alert">{falha}</p>}
      <button type="button" className="btn" onClick={onCancelar}>Cancelar</button>
      <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : inicial.id ? 'Salvar acesso' : 'Cadastrar usuário'}</button>
    </form>
  )
}
