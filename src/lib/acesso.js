// Regras da porta de entrada. Duas portas: equipe (construtor) e cliente.
// Até a Etapa 7 o login confere contra os usuários de exemplo; depois vira Supabase Auth.

export const TIPOS_ACESSO = ['construtor', 'cliente']

// Quem entra por qual porta.
const PORTA_DO_PERFIL = { socio: 'construtor', auxiliar: 'construtor', cliente: 'cliente', pendente: 'cliente' }

const soDigitos = (s) => String(s ?? '').replace(/\D/g, '')
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e ?? '').trim())

// Devolve { ok, perfil } ou { ok: false, erro } com a frase que a pessoa lê.
export function conferirLogin({ email, senha, porta }, usuarios) {
  if (!emailValido(email)) return { ok: false, erro: 'Digite um e-mail válido.' }
  if (!senha) return { ok: false, erro: 'Digite a senha.' }
  const u = usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
  if (!u || u.senha_teste !== senha) return { ok: false, erro: 'E-mail ou senha não conferem.' }
  if (PORTA_DO_PERFIL[u.role] !== porta) {
    return { ok: false, erro: porta === 'construtor'
      ? 'Este acesso é da equipe da obra. Clientes entram em "Acessar como cliente".'
      : 'Este é o portal do cliente. A equipe entra em "Acessar como construtor".' }
  }
  return { ok: true, perfil: u.role, usuario: u }
}

// Cadastro do cliente no primeiro acesso. A conta nasce "pendente" até o sócio liberar.
export function conferirCadastro({ tipoPessoa, nome, documento, email, senha, repetir }) {
  const erros = {}
  if (!nome || nome.trim().length < 3) erros.nome = 'Digite o nome completo.'
  const doc = soDigitos(documento)
  if (tipoPessoa === 'Pessoa física' && doc.length !== 11) erros.documento = 'O CPF tem 11 números.'
  if (tipoPessoa === 'Pessoa jurídica' && doc.length !== 14) erros.documento = 'O CNPJ tem 14 números.'
  if (!emailValido(email)) erros.email = 'Digite um e-mail válido.'
  if (!senha || senha.length < 8) erros.senha = 'A senha precisa de pelo menos 8 caracteres.'
  if (senha !== repetir) erros.repetir = 'As duas senhas não são iguais.'
  return { ok: Object.keys(erros).length === 0, erros }
}
