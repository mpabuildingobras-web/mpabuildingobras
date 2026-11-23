import { useState } from 'react'
import { USAR_MOCK, entrar as entrarNoApp } from '../lib/dados'

// Porta de entrada: primeiro a pessoa diz quem é (equipe ou cliente), depois entra com o
// e-mail e a senha que um dos sócios criou. Não existe cadastro pelo app (quadro de permissões).
export default function Entrada({ onEntrar }) {
  const [porta, setPorta] = useState(null)
  return (
    <div className="acesso">
      <div className="acesso-marca">
        <img className="acesso-logo-img" src="/logo-mpa.webp" alt="MPA Building, Gestão de Obras" />
      </div>
      {!porta && <Escolha onEscolher={setPorta} />}
      {porta === 'construtor' && (
        <Cartao topo="Acesso da equipe" voltar={() => setPorta(null)}
          dica="ana@exemplo.com (sócia) · rita@exemplo.com (auxiliar)">
          <FormLogin porta="construtor" onEntrar={onEntrar} titulo="Sócios e auxiliares" />
        </Cartao>
      )}
      {porta === 'cliente' && (
        <Cartao topo="Portal do cliente" voltar={() => setPorta(null)} dica="claudia@exemplo.com (cliente)">
          <FormLogin porta="cliente" onEntrar={onEntrar} titulo="Acompanhe a sua obra" />
        </Cartao>
      )}
    </div>
  )
}

function Escolha({ onEscolher }) {
  return (
    <div className="acesso-escolha">
      <p>Por favor,<br />selecione o tipo de acesso</p>
      <button className="acesso-btn secundario" onClick={() => onEscolher('construtor')}>Acessar como construtor</button>
      <button className="acesso-btn principal" onClick={() => onEscolher('cliente')}>Acessar como cliente</button>
    </div>
  )
}

function Cartao({ topo, voltar, dica, children }) {
  return (
    <div className="acesso-cartao estreito">
      <div className="acesso-cartao-topo">{topo}</div>
      {children}
      <p className="acesso-nota">O acesso é criado por um dos sócios da MPA Building. Esqueceu a senha? Fale com eles.</p>
      {/* Só com os dados de exemplo: no banco de verdade não existe senha de teste. */}
      {USAR_MOCK && <p className="acesso-dica">Ambiente de teste · {dica} · senha <b>obra1234</b></p>}
      <button className="acesso-link" onClick={voltar}>‹ Voltar</button>
    </div>
  )
}

function Campo({ id, rotulo, ...props }) {
  return (
    <div className="acesso-campo">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} {...props} />
    </div>
  )
}

function FormLogin({ porta, onEntrar, titulo }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  const entrar = async (e) => {
    e.preventDefault()
    if (entrando) return
    setEntrando(true)
    setErro('')
    const { data, erro: falha } = await entrarNoApp({ email, senha, porta })
    setEntrando(false)
    if (falha) return setErro(falha)
    onEntrar(data)
  }
  return (
    <form className="acesso-coluna" onSubmit={entrar} noValidate>
      <h2>{titulo}</h2>
      <Campo id={`email-${porta}`} rotulo="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Campo id={`senha-${porta}`} rotulo="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      {erro && <p className="acesso-erro" role="alert">{erro}</p>}
      <button type="submit" className="acesso-btn principal" disabled={entrando}>{entrando ? 'Entrando…' : 'Acessar'}</button>
    </form>
  )
}
