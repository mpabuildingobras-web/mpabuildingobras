// Multi-obra na camada de dados: nada de uma obra pode aparecer na outra.
import * as mock from '../src/lib/mockData.js'
import { buscarObraAtual, definirObraAtual, listarDiarios, listarObras, listarServicos } from '../src/lib/dadosMock.js'
import { SITUACOES } from '../src/lib/obras.js'
import { dataBR } from '../src/lib/formato.js'

let ok = 0
let tot = 0

function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) {
    ok++
  } else {
    console.log(`  ✗ ${descricao}`)
    console.log(`     esperado: ${JSON.stringify(esperado)}`)
    console.log(`     veio:     ${JSON.stringify(real)}`)
  }
}

const idsObras = mock.obras.map((o) => o.id)

// O mock respeita as regras que o banco vai cobrar.
conferir('existem duas obras de exemplo', mock.obras.length, 2)
conferir('toda obra tem situação válida', mock.obras.every((o) => SITUACOES.includes(o.situacao)), true)
conferir('códigos de obra não se repetem', new Set(mock.obras.map((o) => o.codigo)).size, mock.obras.length)
for (const [nome, lista] of [
  ['servicos', mock.servicos], ['diarios', mock.diarios], ['membros', mock.membros],
  ['servicosValores', mock.servicosValores], ['servicosCustos', mock.servicosCustos],
  ['medicoes', mock.medicoes], ['cotacoes', mock.cotacoes], ['custos', mock.custos], ['orcamentos', mock.orcamentos],
]) {
  conferir(`todo registro de ${nome} tem obra_id de uma obra que existe`,
    lista.every((r) => idsObras.includes(r.obra_id)), true)
}
// Lançamento de um serviço da obra A dentro de um diário da obra B seria dado misturado.
conferir('toda execução é de um serviço da mesma obra do diário',
  mock.execucoesComStatus().every((e) => mock.servicos.find((s) => s.id === e.servico_id).obra_id === e.obra_id), true)
conferir('toda foto é de um serviço da mesma obra do diário',
  mock.fotos.every((f) => {
    const d = mock.diarios.find((x) => x.id === f.diario_id)
    return !f.servico_id || mock.servicos.find((s) => s.id === f.servico_id).obra_id === d.obra_id
  }), true)

// Recorte pela obra atual.
definirObraAtual(mock.OBRA_AP302)
const servA = (await listarServicos()).data
const diaA = (await listarDiarios()).data
definirObraAtual(mock.OBRA_CJF)
const servB = (await listarServicos()).data
const diaB = (await listarDiarios()).data

conferir('serviços da AP302 são só da AP302', servA.every((s) => s.obra_id === mock.OBRA_AP302), true)
conferir('serviços da CJF são só da CJF', servB.every((s) => s.obra_id === mock.OBRA_CJF), true)
conferir('as duas obras têm listas diferentes', servA.length !== servB.length, true)
conferir('diários da CJF não trazem os da AP302', diaB.every((d) => d.obra_id === mock.OBRA_CJF) && diaB.length === 4, true)
conferir('diários vêm do mais recente para o mais antigo', diaA[0].data, '2026-11-03')
conferir('obra atual é a escolhida', (await buscarObraAtual()).data.codigo, 'CJF')

definirObraAtual(null)
conferir('sem obra escolhida, nenhum serviço', (await listarServicos()).data, [])

// Quem enxerga qual obra.
conferir('sócio vê as duas obras', (await listarObras('socio')).data.length, 2)
conferir('auxiliar vê as obras em que está vinculado', (await listarObras('auxiliar', 'u3')).data.length, 2)
conferir('cliente vê só a obra dele', (await listarObras('cliente', 'u4')).data.map((o) => o.codigo), ['AP302'])

// Data do banco para a tela, sem pular dia por fuso.
conferir('data vira dd/mm/aaaa', dataBR('2026-11-27'), '27/11/2026')

console.log(`${ok}/${tot} — dados multi-obra`)
process.exit(ok === tot ? 0 : 1)
