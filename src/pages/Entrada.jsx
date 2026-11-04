import { useState } from 'react'
import { conferirCadastro } from '../lib/acesso'
import { cadastrarCliente, entrar as entrarNoApp } from '../lib/dados'

// Porta de entrada: primeiro a pessoa diz quem é (equipe ou cliente), depois entra.
// Até a Etapa 7 o login confere contra os usuários de exemplo; depois vira Supabase Auth.
export default function Entrada({ onEntrar }) {
  const [porta, setPorta] = useState(null)
  return (
    <div className="acesso">
      <div className="acesso-marca">
        <img className="acesso-logo-img" src="/logo-mpa.webp" alt="MPA Building, Gestão de Obras" />
      </div>
      {!porta && <Escolha onEscolher={setPorta} />}
      {porta === 'construtor' && <LoginEquipe onEntrar={onEntrar} voltar={() => setPorta(null)} />}
      {porta === 'cliente' && <PortalCliente onEntrar={onEntrar} voltar={() => setPorta(null)} />}
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

function Campo({ id, rotulo, erro, ...props }) {
  return (
    <div className="acesso-campo">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} aria-invalid={!!erro} {...props} />
      {erro && <span className="acesso-erro">{erro}</span>}
    </div>
  )
}

function FormLogin({ porta, onEntrar, titulo }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const entrar = async (e) => {
    e.preventDefault()
    const { data, erro: falha } = await entrarNoApp({ email, senha, porta })
    if (falha) return setErro(falha)
    onEntrar(data)
  }
  return (
    <form className="acesso-coluna" onSubmit={entrar} noValidate>
      <h2>{titulo}</h2>
      <Campo id={`email-${porta}`} rotulo="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Campo id={`senha-${porta}`} rotulo="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      {erro && <p className="acesso-erro" role="alert">{erro}</p>}
      <button type="submit" className="acesso-btn principal">Acessar</button>
      <button type="button" className="acesso-link">Esqueci minha senha</button>
    </form>
  )
}

function LoginEquipe({ onEntrar, voltar }) {
  return (
    <div className="acesso-cartao estreito">
      <div className="acesso-cartao-topo">Acesso da equipe</div>
      <FormLogin porta="construtor" onEntrar={onEntrar} titulo="Sócios e auxiliares" />
      <p className="acesso-nota">Conta nova da equipe é liberada por um dos sócios.</p>
      <DicaTeste emails="ana@exemplo.com (sócia) · rita@exemplo.com (auxiliar)" />
      <button className="acesso-link" onClick={voltar}>‹ Voltar</button>
    </div>
  )
}

const VAZIO = { tipoPessoa: 'Pessoa física', nome: '', documento: '', email: '', senha: '', repetir: '' }

function PortalCliente({ onEntrar, voltar }) {
  const [dados, setDados] = useState(VAZIO)
  const [erros, setErros] = useState({})
  const muda = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value })
  const cadastrar = async (e) => {
    e.preventDefault()
    const r = conferirCadastro(dados)
    setErros(r.erros)
    if (!r.ok) return
    const { data, erro } = await cadastrarCliente(dados)
    if (erro) return setErros({ email: erro })
    onEntrar(data)
  }
  const pj = dados.tipoPessoa === 'Pessoa jurídica'
  return (
    <div className="acesso-cartao">
      <div className="acesso-cartao-topo">Portal do cliente</div>
      <div className="acesso-colunas">
        <form className="acesso-coluna" onSubmit={cadastrar} noValidate>
          <h2>Primeiro acesso?</h2>
          <div className="acesso-radios" role="radiogroup" aria-label="Tipo de pessoa">
            {['Pessoa física', 'Pessoa jurídica'].map((t) => (
              <label key={t}><input type="radio" name="tipoPessoa" value={t} checked={dados.tipoPessoa === t} onChange={muda('tipoPessoa')} />{t}</label>
            ))}
          </div>
          <Campo id="c-nome" rotulo={pj ? 'Razão social' : 'Nome completo'} value={dados.nome} onChange={muda('nome')} erro={erros.nome} />
          <Campo id="c-doc" rotulo={pj ? 'CNPJ' : 'CPF'} inputMode="numeric" value={dados.documento} onChange={muda('documento')} erro={erros.documento} />
          <Campo id="c-email" rotulo="E-mail" type="email" value={dados.email} onChange={muda('email')} erro={erros.email} />
          <Campo id="c-senha" rotulo="Crie uma senha" type="password" autoComplete="new-password" value={dados.senha} onChange={muda('senha')} erro={erros.senha} />
          <Campo id="c-repetir" rotulo="Repita a senha" type="password" autoComplete="new-password" value={dados.repetir} onChange={muda('repetir')} erro={erros.repetir} />
          <button type="submit" className="acesso-btn secundario">Cadastrar dados de acesso</button>
        </form>
        <div className="acesso-divisor" aria-hidden="true" />
        <FormLogin porta="cliente" onEntrar={onEntrar} titulo="Já sou cadastrado" />
      </div>
      <DicaTeste emails="claudia@exemplo.com (cliente)" />
      <button className="acesso-link" onClick={voltar}>‹ Voltar</button>
    </div>
  )
}

// Só no ambiente de exemplo: some quando o login virar Supabase (Etapa 7).
function DicaTeste({ emails }) {
  return <p className="acesso-dica">Ambiente de teste · {emails} · senha <b>obra1234</b></p>
}
