// A cascata de prazos com os dados de exemplo da AP302 (critério de aceite do PRD-FRONTEND).
import {
  calcularCascata, diasUteisEntre, ehDiaUtil, ehFeriado, feriadosNacionais, ordenarCadeia, ordenarPorAtraso, somarDiasUteis,
} from '../src/lib/cronograma.js'
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

// Dias úteis: segunda a sexta, menos feriados nacionais (decidido em 15/11/2026).
conferir('sexta + 1 dia útil = segunda', somarDiasUteis('2026-11-06', 1), '2026-11-09')
conferir('sexta 30/10 + 1 dia útil pula Finados (seg 02/11) e cai na terça', somarDiasUteis('2026-10-30', 1), '2026-11-03')
conferir('terça 03/11 − 3 dias úteis pula Finados e cai na quarta 28/10', somarDiasUteis('2026-11-03', -3), '2026-10-28')
conferir('dias úteis de 29/10 a 03/11: só 30/10 e 03/11', diasUteisEntre('2026-10-29', '2026-11-03'), 2)
conferir('dias úteis ao contrário dão negativo', diasUteisEntre('2026-11-05', '2026-10-29'), -4)
conferir('Consciência Negra (sex 20/11) não é dia útil', ehDiaUtil('2026-11-20'), false)
conferir('sábado nunca é dia útil', ehDiaUtil('2026-11-21'), false)
conferir('Sexta-feira Santa muda com a Páscoa: 2026 em 03/04, 2027 em 26/03',
  [ehFeriado('2026-04-03'), ehFeriado('2027-03-26'), ehFeriado('2027-04-03')], [true, true, false])
conferir('feriados nacionais de 2026: 9 fixos + Sexta-feira Santa', feriadosNacionais(2026).size, 10)
conferir('Carnaval e Corpus Christi são ponto facultativo: contam como dia útil', [ehDiaUtil('2026-02-17'), ehDiaUtil('2026-06-04')], [true, true])

// Cascata da AP302, visão do sócio (Enviado + Aprovado), hoje = 03/11/2026.
// Com Finados (02/11) e Consciência Negra (20/11) fora, a entrega anda de 04/12 para 07/12.
const obra = mock.obras.find((o) => o.codigo === 'AP302')
const servicos = mock.servicos.filter((s) => s.obra_id === obra.id && s.tipo === 'Normal')
const execucoes = mock.execucoesComStatus().filter((e) => e.obra_id === obra.id)
const c = calcularCascata({ servicos, execucoes, obra, hoje: mock.HOJE })
const linha = (nome) => c.linhas.find((l) => l.nome.startsWith(nome))

conferir('previsão de entrega da AP302', c.previsaoEntrega, '2026-12-07')
conferir('6 dias úteis de atraso na entrega', c.diasAtrasoEntrega, 6)
conferir('hidráulica: término previsto', linha('Hidráulica').termino, '2026-11-05')
conferir('hidráulica: limite de término', linha('Hidráulica').limiteTermino, '2026-10-27')
conferir('hidráulica: folga −6', linha('Hidráulica').folga, -6)
conferir('hidráulica: 4 dias de atraso (28, 29, 30/10 e 03/11)', linha('Hidráulica').diasAtraso, 4)
conferir('hidráulica: meta de hoje é tudo o que falta (30%)', linha('Hidráulica').metaDia, 30)
conferir('reboco: começa quando a hidráulica termina', [linha('Reboco').inicio, linha('Reboco').termino], ['2026-11-06', '2026-11-13'])
conferir('reboco: limite para programar já passou', [linha('Reboco').limiteProgramar, linha('Reboco').limitePassouSemComecar], ['2026-10-28', true])
conferir('forro: no prazo, folga +5', [linha('Forro').termino, linha('Forro').folga, linha('Forro').cor], ['2026-11-09', 5, 'green'])
conferir('forro: meta de hoje 5 m²', linha('Forro').metaDia, 5)
conferir('pintura termina na previsão', linha('Pintura').termino, '2026-12-07')
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
