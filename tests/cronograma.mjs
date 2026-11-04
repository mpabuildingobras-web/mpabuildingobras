// A cascata de prazos com os dados de exemplo da AP302 (critério de aceite do PRD-FRONTEND).
import { calcularCascata, diasUteisEntre, ordenarCadeia, ordenarPorAtraso, somarDiasUteis } from '../src/lib/cronograma.js'
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

// Dias úteis
conferir('sexta + 1 dia útil = segunda', somarDiasUteis('2026-10-30', 1), '2026-11-02')
conferir('terça − 3 dias úteis = quinta anterior', somarDiasUteis('2026-11-03', -3), '2026-10-29')
conferir('dias úteis de 29/10 a 03/11', diasUteisEntre('2026-10-29', '2026-11-03'), 3)
conferir('dias úteis ao contrário dão negativo', diasUteisEntre('2026-11-05', '2026-10-29'), -5)

// Cascata da AP302, visão do sócio (Enviado + Aprovado), hoje = 03/11/2026
const obra = mock.obras.find((o) => o.codigo === 'AP302')
const servicos = mock.servicos.filter((s) => s.obra_id === obra.id && s.tipo === 'Normal')
const execucoes = mock.execucoesComStatus().filter((e) => e.obra_id === obra.id)
const c = calcularCascata({ servicos, execucoes, obra, hoje: mock.HOJE })
const linha = (nome) => c.linhas.find((l) => l.nome.startsWith(nome))

conferir('previsão de entrega da AP302', c.previsaoEntrega, '2026-12-04')
conferir('5 dias úteis de atraso na entrega', c.diasAtrasoEntrega, 5)
conferir('hidráulica: término previsto', linha('Hidráulica').termino, '2026-11-05')
conferir('hidráulica: limite de término', linha('Hidráulica').limiteTermino, '2026-10-29')
conferir('hidráulica: folga −5', linha('Hidráulica').folga, -5)
conferir('hidráulica: 3 dias de atraso', linha('Hidráulica').diasAtraso, 3)
conferir('hidráulica: meta de hoje é tudo o que falta (30%)', linha('Hidráulica').metaDia, 30)
conferir('reboco: começa quando a hidráulica termina', [linha('Reboco').inicio, linha('Reboco').termino], ['2026-11-06', '2026-11-13'])
conferir('reboco: limite para programar já passou', [linha('Reboco').limiteProgramar, linha('Reboco').limitePassouSemComecar], ['2026-10-30', true])
conferir('forro: no prazo, folga +6', [linha('Forro').termino, linha('Forro').folga, linha('Forro').cor], ['2026-11-09', 6, 'green'])
conferir('forro: meta de hoje 5 m²', linha('Forro').metaDia, 5)
conferir('pintura termina na previsão', linha('Pintura').termino, '2026-12-04')
conferir('elétrica concluída em 15/10', [linha('Infra').concluido, linha('Infra').termino], [true, '2026-10-15'])
conferir('diário devolvido não conta (hidráulica em 70%)', linha('Hidráulica').pct, 0.7)
conferir('topo do painel é a hidráulica', ordenarPorAtraso(c.linhas)[0].nome, 'Hidráulica embutida banheiros')
conferir('painel não mostra concluídos', ordenarPorAtraso(c.linhas).some((l) => l.concluido), false)

// Visão do cliente: só diários aprovados (a hidráulica fica em 60%)
const cc = calcularCascata({ servicos, execucoes, obra, hoje: mock.HOJE, contam: ['Aprovado'] })
conferir('cliente vê a hidráulica em 60%', cc.linhas.find((l) => l.nome.startsWith('Hidráulica')).pct, 0.6)

// CJF: obra diferente, no prazo
const obraB = mock.obras.find((o) => o.codigo === 'CJF')
const cb = calcularCascata({
  servicos: mock.servicos.filter((s) => s.obra_id === obraB.id && s.tipo === 'Normal'),
  execucoes: mock.execucoesComStatus().filter((e) => e.obra_id === obraB.id),
  obra: obraB, hoje: mock.HOJE,
})
conferir('CJF não atrasa a entrega', cb.diasAtrasoEntrega, 0)

// Ciclo
let erro = ''
try {
  ordenarCadeia([{ id: 'a', nome: 'Pintura', deps: ['b'] }, { id: 'b', nome: 'Reboco', deps: ['a'] }])
} catch (e) { erro = e.message }
conferir('ciclo é recusado nomeando os serviços', erro.includes('Pintura') && erro.includes('Reboco'), true)

console.log(`${ok}/${tot} — cronograma`)
process.exit(ok === tot ? 0 : 1)
