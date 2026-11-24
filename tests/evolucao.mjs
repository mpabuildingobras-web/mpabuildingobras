// Evolução da obra: previsto × executado × gasto. Errar aqui é dizer à sócia que a obra
// está no ritmo quando não está, ou mostrar estouro que não existe.
import { montarEvolucao, nomeDoMes, situacaoDoAvanco } from '../src/lib/evolucao.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else {
    console.log(`  ✗ ${descricao}`)
    console.log(`     esperado: ${JSON.stringify(esperado)}`)
    console.log(`     veio:     ${JSON.stringify(real)}`)
  }
}

// Obra de duas semanas úteis: A (5 dias, R$ 1.000) e depois B (5 dias, R$ 2.000), mais 10% de gestão.
const obra = { data_inicio: '2026-03-02', data_entrega: '2026-03-13' }
const servicos = [
  { id: 'A', nome: 'A', duracao: 5, deps: [], prevista: 100 },
  { id: 'B', nome: 'B', duracao: 5, deps: ['A'], prevista: 50 },
]
const itens = [
  { id: 'A', tipo: 'Normal', valor: 1000 },
  { id: 'B', tipo: 'Normal', valor: 2000 },
  { id: 'G', tipo: 'Percentual', valor: 300 },
]
const execucoes = [
  { servico_id: 'A', data: '2026-03-03', quantidade: 60, status: 'Aprovado' },
  { servico_id: 'A', data: '2026-03-05', quantidade: 60, status: 'Enviado' }, // passa do previsto: só 40 contam
  { servico_id: 'B', data: '2026-03-09', quantidade: 10, status: 'Rascunho' }, // rascunho não conta
]
const custos = [{ data: '2026-03-04', valor: 500 }, { data: '2026-03-20', valor: 999 }] // o 2º é depois de hoje
const hoje = '2026-03-06'

const s = montarEvolucao({ obra, servicos, execucoes, itens, custos, hoje, perfil: 'socio' })
conferir('total inclui a gestão percentual', s.total, 3300)
conferir('previsto até sexta da 1ª semana = só o serviço A, com a gestão', s.previstoHoje, 1100)
conferir('executado do sócio conta Enviado e Aprovado, sem passar de 100%', s.executado, 1100)
conferir('gasto só até hoje', s.gasto, 500)
conferir('projeção no ritmo de hoje: gastou 500 para 1/3 da obra', s.projecaoGasto, 1500)
conferir('economia projetada = estudo − projeção', s.diferencaProjetada, 1800)
conferir('um mês só', s.meses.map((m) => m.mes), ['2026-03'])
conferir('mês fecha com o previsto inteiro', s.meses[0].previstoAcum, 3300)
conferir('pontos da curva: hoje, domingo e último dia', s.semanas.map((w) => w.ate), ['2026-03-06', '2026-03-08', '2026-03-13'])
conferir('só até hoje tem executado', s.semanas.map((w) => w.executado !== null), [true, false, false])
conferir('o último ponto da curva prevista chega ao total', s.semanas.at(-1).previsto, 3300)

const c = montarEvolucao({ obra, servicos, execucoes, itens, custos: [], hoje, perfil: 'cliente' })
conferir('cliente: só o diário aprovado conta', c.executado, 660)
conferir('cliente: nenhum gasto', c.gasto, 0)
conferir('sem quase nada feito, não há projeção de gasto', montarEvolucao({ obra, servicos, execucoes: [], itens, custos, hoje }).projecaoGasto, null)

conferir('5 pontos atrás', situacaoDoAvanco(0.43, 0.38), { pp: -5, texto: '5 pontos atrás', cor: 'red' })
conferir('menos de 1 pp é no ritmo', situacaoDoAvanco(0.43, 0.425).texto, 'no ritmo previsto')
conferir('adiantada', situacaoDoAvanco(0.4, 0.5).cor, 'green')
conferir('nome do mês', nomeDoMes('2026-11'), 'nov/26')

console.log(`${ok}/${tot} — evolução da obra`)
process.exit(ok === tot ? 0 : 1)
