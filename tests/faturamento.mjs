// Faturamento: a única conta que junta obras, e a única porta é a do sócio.
import { buscarBaseFaturamento, definirObraAtual, definirPerfil } from '../src/lib/dados.js'
import { calcularFaturamento } from '../src/lib/faturamento.js'
import { HOJE } from '../src/lib/mockData.js'

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

definirPerfil('socio')
definirObraAtual('obra-ap302')
const f = calcularFaturamento((await buscarBaseFaturamento()).data, HOJE)
const ap = f.obras.find((o) => o.codigo === 'AP302')
const cjf = f.obras.find((o) => o.codigo === 'CJF')

conferir('uma linha por obra', f.obras.length, 2)
conferir('bruto da AP302 = medições 1 e 2; rascunho não entra', ap.bruto, 14173.5)
conferir('recebido = só a paga', ap.recebido, 8145.5)
conferir('a receber = fechada', ap.aReceber, 6028)
// Custo de verdade: 6.200 + 5.800 + 1.340 + 980 + 450.
conferir('custo é tudo o que foi lançado na obra', ap.custo, 14770)
conferir('líquido da AP302 pode ser negativo', ap.liquido, -596.5)
conferir('contrato e executado vêm do orçamento', [ap.contrato, ap.executado], [43307, 17352.5])
conferir('obra sem orçamento: sem contrato e sem % executado', [cjf.contrato, cjf.fracao], [0, null])
conferir('obra sem medição: bruto zero e líquido só com o custo dela', [cjf.bruto, cjf.liquido], [0, -310])
conferir('obra sem bruto não tem margem', cjf.margem, null)
conferir('totais somam as obras', [f.totais.bruto, f.totais.liquido], [14173.5, -906.5])

// Não depende da obra selecionada.
definirObraAtual('obra-cjf')
const g = calcularFaturamento((await buscarBaseFaturamento()).data, HOJE)
conferir('trocar de obra não muda o faturamento', g.totais.bruto, f.totais.bruto)

// Só sócio.
for (const perfil of ['auxiliar', 'cliente', 'pendente', null]) {
  definirPerfil(perfil)
  conferir(`${perfil} não recebe a base do faturamento`, (await buscarBaseFaturamento()).data, [])
}

console.log(`${ok}/${tot} — faturamento`)
process.exit(ok === tot ? 0 : 1)
