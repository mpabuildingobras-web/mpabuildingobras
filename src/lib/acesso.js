// Regras da porta de entrada. Duas portas: equipe (construtor) e cliente.
// O login de verdade é do Supabase Auth (lib/dados.js); aqui ficam só as regras puras.
// Não existe cadastro pelo app: só os sócios criam login (docs/permissoes/QUEM-PODE-O-QUE.md).

export const TIPOS_ACESSO = ['construtor', 'cliente']

// Quem entra por qual porta.
const PORTA_DO_PERFIL = { socio: 'construtor', auxiliar: 'construtor', cliente: 'cliente' }

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e ?? '').trim())

// Antes de mandar ao banco: o que dá para conferir na tela.
export function conferirCamposLogin({ email, senha }) {
  if (!emailValido(email)) return 'Digite um e-mail válido.'
  if (!senha) return 'Digite a senha.'
  return null
}

// Porta errada: a frase que a pessoa lê. Conta sem perfil (pendente) entra por qualquer porta
// e cai na tela de aguardando.
export function erroDePorta(perfil, porta) {
  if (!perfil || PORTA_DO_PERFIL[perfil] === porta) return null
  return porta === 'construtor'
    ? 'Este acesso é da equipe da obra. Clientes entram em "Acessar como cliente".'
    : 'Este é o portal do cliente. A equipe entra em "Acessar como construtor".'
}

// O que o app faz com a conta: entra, espera a liberação ou mostra que foi bloqueada.
export function estadoDaConta(usuario) {
  if (!usuario) return 'fora'
  if (usuario.situacao === 'bloqueado') return 'bloqueado'
  if (usuario.situacao !== 'ativo' || !usuario.perfil) return 'aguardando'
  return 'dentro'
}

// Usuários de exemplo (só com USAR_MOCK): confere e-mail, senha e porta.
export function conferirLogin({ email, senha, porta }, usuarios) {
  const campos = conferirCamposLogin({ email, senha })
  if (campos) return { ok: false, erro: campos }
  const u = usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
  if (!u || u.senha_teste !== senha) return { ok: false, erro: 'E-mail ou senha não conferem.' }
  const portaErrada = erroDePorta(u.perfil, porta)
  if (portaErrada) return { ok: false, erro: portaErrada }
  return { ok: true, perfil: u.perfil, usuario: u }
}

// Trocar a senha em Meu perfil.
export function conferirNovaSenha({ senha, repetir }) {
  const erros = {}
  if (!senha || senha.length < 8) erros.senha = 'A senha precisa de pelo menos 8 caracteres.'
  else if (senha !== repetir) erros.repetir = 'As duas senhas não são iguais.'
  return { ok: Object.keys(erros).length === 0, erros }
}
