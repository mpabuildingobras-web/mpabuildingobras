// Regras de obra (multi-obra). Node puro: `node tests/obras.mjs`.
import { situacaoValida, escolherObraInicial, obrasDoSeletor, somenteDaObra } from '../src/lib/obras.js'

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

const obras = [
  { id: 'a', situacao: 'Concluída' },
  { id: 'b', situacao: 'Em andamento' },
  { id: 'c', situacao: 'Parada' },
]

conferir('situação da lista é válida', situacaoValida('Parada'), true)
conferir('"Pausada" não é mais situação válida', situacaoValida('Pausada'), false)

conferir('volta na obra guardada', escolherObraInicial(obras, 'c'), 'c')
conferir('guardada que sumiu cai na primeira em andamento', escolherObraInicial(obras, 'x'), 'b')
conferir('sem nada guardado, primeira em andamento', escolherObraInicial(obras, null), 'b')
conferir('sem obra em andamento, a primeira', escolherObraInicial([{ id: 'z', situacao: 'Parada' }], null), 'z')
conferir('sem obra nenhuma, nada', escolherObraInicial([], 'a'), null)

conferir('seletor esconde a obra concluída', obrasDoSeletor(obras, false).map((o) => o.id), ['b', 'c'])
conferir('e mostra quando a pessoa pede', obrasDoSeletor(obras, true).map((o) => o.id), ['a', 'b', 'c'])

const diarios = [{ id: 1, obra_id: 'a' }, { id: 2, obra_id: 'b' }, { id: 3, obra_id: 'a' }]
conferir('recorte traz só a obra pedida', somenteDaObra(diarios, 'a').map((d) => d.id), [1, 3])
conferir('sem obra escolhida, nada (nunca tudo)', somenteDaObra(diarios, null), [])

console.log(`${ok}/${tot} — obras`)
process.exit(ok === tot ? 0 : 1)
