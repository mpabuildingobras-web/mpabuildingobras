// Executado pelo valor do orçamento: o número que o cliente vê na aba Orçamento.
import { resumirOrcamento } from '../src/lib/orcamento.js'
import { calcularCascata } from '../src/lib/cronograma.js'
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

const obra = mock.obras.find((o) => o.codigo === 'AP302')
const itens = mock.itensDoOrcamento(obra.id)
const normais = mock.servicos.filter((s) => s.obra_id === obra.id && s.tipo === 'Normal')
const execucoes = mock.execucoesComStatus().filter((e) => e.obra_id === obra.id)
const fracoes = (contam) => {
  const c = calcularCascata({ servicos: normais, execucoes, obra, hoje: mock.HOJE, contam })
  return new Map(c.linhas.map((l) => [l.id, l.pct]))
}

const cliente = resumirOrcamento(itens, fracoes(['Aprovado']))
const socio = resumirOrcamento(itens, fracoes(['Enviado', 'Aprovado']))

conferir('contrato da AP302', cliente.total, 43307)
conferir('cliente: executado só com aprovados', cliente.executado, 16307.5)
conferir('sócio: conta também o diário aguardando', socio.executado, 17352.5)
conferir('gestão de obra acompanha os outros itens (cliente)',
  cliente.etapas.find((e) => e.frente === 'Gestão de obra').executado, 1482.5)
conferir('9 etapas, na ordem da planilha', cliente.etapas.map((e) => e.numero).join(''), '123456789')
conferir('margem prevista (sócio)', Math.round(socio.margem), 17060)
conferir('saldo a executar (cliente)', cliente.saldo, 26999.5)

console.log(`${ok}/${tot} — orçamento`)
process.exit(ok === tot ? 0 : 1)
