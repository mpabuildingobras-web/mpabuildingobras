// Cadastro de quem entra no app e o que cada um acessa. Só sócios.
export const ROLES = ['socio', 'auxiliar', 'cliente']
export const ROTULO_ROLE = { socio: 'Sócio', auxiliar: 'Auxiliar', cliente: 'Cliente', pendente: 'Aguardando liberação' }

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e ?? '').trim())

// O perfil é o teto de acesso; as telas só restringem dentro dele (ver lib/menus.js).
export function conferirUsuario(dados, existentes) {
  const erros = {}
  if (!dados.nome || dados.nome.trim().length < 3) erros.nome = 'Digite o nome.'
  if (!emailValido(dados.email)) erros.email = 'Digite um e-mail válido.'
  const repetido = existentes.some((u) => u.id !== dados.id && u.email.toLowerCase() === String(dados.email).trim().toLowerCase())
  if (repetido) erros.email = 'Já existe um usuário com este e-mail.'
  if (!ROLES.includes(dados.role)) erros.role = 'Escolha o perfil.'
  if (dados.role !== 'socio' && (dados.obras ?? []).length === 0) erros.obras = 'Escolha pelo menos uma obra.'
  const outroSocio = existentes.some((u) => u.id !== dados.id && u.role === 'socio')
  const eraSocio = existentes.some((u) => u.id === dados.id && u.role === 'socio')
  if (eraSocio && dados.role !== 'socio' && !outroSocio) erros.role = 'O app precisa de pelo menos um sócio.'
  return { ok: Object.keys(erros).length === 0, erros }
}
