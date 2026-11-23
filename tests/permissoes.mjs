// Confere src/lib/permissoes.js contra docs/permissoes/quadro.json, linha por linha,
// e o quadro.json contra o QUEM-PODE-O-QUE.md. Mudar uma permissão é mudar os três juntos.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAVES, VALORES, pode } from '../src/lib/permissoes.js'

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const quadro = JSON.parse(fs.readFileSync(path.join(raiz, 'docs/permissoes/quadro.json'), 'utf8'))

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const ativo = (perfil, id = 'eu') => ({ id, perfil, situacao: 'ativo' })

// 1) Cada célula do quadro vira a resposta certa do pode().
for (const [chave, acao] of Object.entries(quadro.acoes)) {
  for (const perfil of quadro.perfis) {
    const v = acao[perfil]
    conferir(`${chave} · ${perfil}: valor conhecido`, VALORES.includes(v), true)
    const esperadoDono = v === 'pode' || v === 'só ver' || v === 'só os dele'
    const esperadoOutro = v === 'pode' || v === 'só ver'
    conferir(`${chave} · ${perfil} no que é dele`, pode(chave, ativo(perfil), 'eu'), esperadoDono)
    conferir(`${chave} · ${perfil} no que é de outro`, pode(chave, ativo(perfil), 'outro'), esperadoOutro)
  }
  // "só ver" só faz sentido em ação de ver.
  if (quadro.perfis.some((p) => acao[p] === 'só ver')) conferir(`${chave}: "só ver" só em ação de ver`, chave.split('.')[1].startsWith('ver'), true)
}

// 2) Pendente e bloqueado não podem nada, nem o sócio.
for (const situacao of ['pendente', 'bloqueado']) {
  conferir(`sócio ${situacao} não vê obra`, pode('obra.ver', { id: 'eu', perfil: 'socio', situacao }), false)
}
conferir('sem login não pode nada', pode('obra.ver', null), false)

// 3) Chave inventada é erro, não "não pode" calado.
let estourou = false
try { pode('diario.inventada', ativo('socio')) } catch { estourou = true }
conferir('chave que não está no quadro dá erro', estourou, true)

// 4) As regras que o quadro não pode perder (dinheiro e dado pessoal).
conferir('auxiliar não vê orçamento', pode('orcamento.ver', ativo('auxiliar')), false)
conferir('cliente não vê custo', pode('custo_mo.ver', ativo('cliente')), false)
conferir('auxiliar não vê dado do contratante', pode('contratante.ver', ativo('auxiliar')), false)
conferir('ninguém mexe no histórico, nem o sócio', pode('historico.mudar', ativo('socio')), false)

// 4b) Toda chave que o código pede em pode('...') existe no quadro (chave escrita errado só
// apareceria com a tela aberta).
const arquivos = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name)
  return e.isDirectory() ? arquivos(p) : /\.(js|jsx)$/.test(e.name) ? [p] : []
})
const pedidas = arquivos(path.join(raiz, 'src')).flatMap((f) =>
  [...fs.readFileSync(f, 'utf8').matchAll(/\bpode\(\s*'([^']+)'/g)].map((m) => [m[1], path.basename(f)]))
conferir('o código pergunta ao pode() em algum lugar', pedidas.length > 0, true)
for (const [chave, arquivo] of pedidas) conferir(`${arquivo} pede '${chave}', que existe no quadro`, CHAVES.includes(chave), true)

// 5) O JSON bate com o QUEM-PODE-O-QUE.md, linha por linha.
const md = fs.readFileSync(path.join(raiz, 'docs/permissoes/QUEM-PODE-O-QUE.md'), 'utf8')
const linhas = md.split('## 4. O quadro')[1].split('## 5.')[0].split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| Assunto'))
  .map((l) => l.split('|').slice(1, -1).map((s) => s.trim()).slice(-3).join(' | '))
const doJson = CHAVES.map((k) => quadro.perfis.map((p) => quadro.acoes[k][p]).join(' | '))
conferir('o .md e o JSON têm o mesmo número de linhas', linhas.length, doJson.length)
linhas.forEach((l, i) => conferir(`linha ${i + 1} do .md = ${CHAVES[i]}`, l, doJson[i]))

console.log(`${ok}/${tot} — permissões (quadro)`)
process.exit(ok === tot ? 0 : 1)
