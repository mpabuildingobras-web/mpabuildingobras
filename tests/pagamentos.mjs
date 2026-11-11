// Aba Pagamentos do cliente.
import { separarPagamentos } from '../src/lib/pagamentos.js'
import * as mock from '../src/lib/mockData.js'

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

const doAp = mock.medicoes.filter((m) => m.obra_id === mock.OBRA_AP302)
const p = separarPagamentos(doAp, mock.HOJE)

conferir('medição 1 está paga', p.totalPago, 8145.5)
conferir('medição 2 vence 05/11: próxima, não "hoje"', [p.totalHoje, p.totalProximas], [0, 6028])
conferir('rascunho não entra em nada', [...p.abertas, ...p.pagas].some((m) => m.status === 'Rascunho'), false)
conferir('no dia do vencimento, vira "para pagar hoje"', separarPagamentos(doAp, '2026-11-05').totalHoje, 6028)
conferir('sem medição, tudo zero', separarPagamentos([], mock.HOJE).totalAberto, 0)

console.log(`${ok}/${tot} — pagamentos`)
process.exit(ok === tot ? 0 : 1)
