// Quem pode o quê: o ÚNICO lugar do código que decide permissão por perfil.
// A fonte é docs/permissoes/quadro.json (cópia do QUEM-PODE-O-QUE.md, decidido pela Manuela).
// Toda tela pergunta pode('diario.reabrir', usuario, donoId); nenhuma tela decide sozinha por perfil.
// Isto só esconde botão. A barreira de verdade é a RLS do banco.
import quadro from '../../docs/permissoes/quadro.json' with { type: 'json' }

export const PERFIS_DO_QUADRO = quadro.perfis
export const VALORES = quadro.valores

// usuario = { id, perfil, situacao }. donoId = quem criou a linha (para "só os dele").
// Pendente e bloqueado não podem nada; chave que não existe no quadro é erro de programação.
export function pode(chave, usuario, donoId) {
  const acao = quadro.acoes[chave]
  if (!acao) throw new Error(`Permissão desconhecida: ${chave}. Ela precisa existir em docs/permissoes/quadro.json.`)
  if (!usuario || usuario.situacao !== 'ativo') return false
  const valor = acao[usuario.perfil]
  if (valor === 'pode' || valor === 'só ver') return true
  if (valor === 'só os dele') return donoId != null && donoId === usuario.id
  return false // '·' e 'ninguém'
}

// Todas as chaves do quadro: o teste usa para conferir que o código não pede chave inventada.
export const CHAVES = Object.keys(quadro.acoes)
