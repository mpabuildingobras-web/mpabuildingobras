// Importação do Estudo de Viabilidade (modelo Vita Belle: abas ORÇAMENTO e QUANTITATIVO).
// A planilha de exemplo é uma obra real com nomes trocados por fictícios.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { importarEstudo, lerQuantidade } from '../src/lib/importarEstudo.js'
import { lerPlanilha } from '../src/lib/xlsx.js'

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

const pasta = path.dirname(fileURLToPath(import.meta.url))
const { abas } = await lerPlanilha(fs.readFileSync(path.join(pasta, 'fixtures/estudo-exemplo.xlsx')))
const r = importarEstudo(abas)

conferir('lê as duas abas', Object.keys(abas), ['QUANTITATIVO', 'ORÇAMENTO'])
conferir('importação sem problema grave', r.ok, true)
conferir('título da planilha', r.titulo, 'ORÇAMENTO - APTO 101 - EDIFÍCIO EXEMPLO')
conferir('13 etapas', r.etapas.length, 13)
conferir('20 serviços', r.qtdItens, 20)
conferir('total ENG. bate com o VALOR TOTAL', [r.total_eng, r.totalDeclarado], [40994.45, 40994.45])
conferir('total MO', r.total_mo, 25179.79)
conferir('valor da fórmula, não a fórmula (1.2 = MO × 1,4)', r.etapas[0].itens[1].total_eng, 1022)
conferir('item que o Excel virou data volta a ser 12.1', r.etapas[11].itens[0].numero_item, '12.1')
conferir('avisa a data, sem ser grave', r.problemas.filter((p) => /virou|transformado/.test(p.mensagem)).map((p) => p.grave), [false, false])
conferir('avisa ENG. menor que MO no 1.1', r.problemas.some((p) => p.linha === 11 && /menor que o custo/.test(p.mensagem)), true)
const gestao = r.etapas.at(-1).itens[0]
conferir('gestão é item percentual de 10%', [gestao.tipo, gestao.percentual, gestao.total_eng], ['Percentual', 10, 3726.77])
conferir('observação do item', r.etapas[1].itens[0].obs, 'considerado remoção com martelete')
conferir('quantitativo: 101 linhas', r.quantitativo.length, 101)
conferir('quantitativo: cômodo desce para as linhas de baixo', r.quantitativo[1].comodo, 'GERAL / APARTAMENTO')
conferir('quantitativo: 10 cômodos', new Set(r.quantitativo.map((q) => q.comodo)).size, 10)
conferir('quantitativo: fórmula vira número', r.quantitativo.find((q) => q.comodo === 'BANHEIRO SOCIAL' && /parede$/.test(q.descricao)).quantidade, 7.62)

conferir('quantidade "2,43 m²"', lerQuantidade('2,43 m²'), { quantidade: 2.43, unidade: 'm²', texto: null })
conferir('quantidade "3 un"', lerQuantidade('3 un'), { quantidade: 3, unidade: 'un', texto: null })
conferir('quantidade "1.250,5 kg"', lerQuantidade('1.250,5 kg'), { quantidade: 1250.5, unidade: 'kg', texto: null })
conferir('quantidade "Medir no local"', lerQuantidade('Medir no local'), { quantidade: null, unidade: null, texto: 'Medir no local' })

// Planilha montada à mão: os erros que precisam travar a importação.
const cab = [null, 'SERVIÇOS', null, 'UNID.', 'TOTAL MO', 'TOTAL ENG.', 'OBSERVAÇÕES']
const comTotal = (total, linhas) => ({ 'ORÇAMENTO': [[null, 'ORÇAMENTO - TESTE', null, null, null, 'VALOR TOTAL', total], cab, ...linhas] })
const base = [[null, 1, 'ETAPA UM'], [null, '1.1', 'Serviço A', 'vb', 100, 150]]
conferir('sem aba ORÇAMENTO trava', importarEstudo({ Outra: [] }).ok, false)
conferir('soma que não bate com o VALOR TOTAL trava', importarEstudo(comTotal(999, base)).ok, false)
conferir('soma que bate passa', importarEstudo(comTotal(150, base)).ok, true)
conferir('item antes da primeira etapa trava', importarEstudo(comTotal(150, [[null, '1.1', 'Serviço A', 'vb', 100, 150]])).ok, false)
conferir('item repetido trava', importarEstudo(comTotal(300, [...base, [null, '1.1', 'Serviço B', 'vb', 100, 150]])).ok, false)
conferir('sem aba QUANTITATIVO só avisa', importarEstudo(comTotal(150, base)).problemas.map((p) => p.grave), [false])

// Gravar (dados de exemplo): obra nova recebe orçamento, cronograma e quantitativo.
const mock = await import('../src/lib/mockData.js')
const api = await import('../src/lib/dadosMock.js')
const OBRA = 'obra-teste-importacao'
mock.obras.push({ id: OBRA, codigo: 'TST', nome: 'Obra de teste', data_inicio: '2026-11-02', data_entrega: '2027-03-31', situacao: 'Em andamento' })
api.definirPerfil('cliente'); api.definirObraAtual(OBRA)
conferir('cliente não importa', (await api.importarOrcamento(r)).erro, 'Só sócio importa o orçamento.')
api.definirPerfil('socio')
conferir('planilha com problema grave não grava', (await api.importarOrcamento({ ...r, ok: false })).erro !== null, true)
conferir('grava 20 serviços e 101 linhas do quantitativo', (await api.importarOrcamento(r)).data, { qtd_itens: 20, qtd_quantitativo: 101 })
const orc = (await api.buscarOrcamento()).data
conferir('orçamento com o título da planilha', orc.titulo, r.titulo)
conferir('ENG. e MO de cada item, como na planilha', orc.itens.slice(0, 2).map((i) => [i.numero_item, i.valor, i.custo_mo]), [['1.1', 1000, 1100], ['1.2', 1022, 730]])
const cr = (await api.carregarCronograma()).data
conferir('cronograma: 19 serviços (a gestão percentual fica fora da cadeia)', cr.servicos.length, 19)
conferir('cronograma: um depois do outro', cr.servicos[1].deps, [cr.servicos[0].id])
conferir('reimportar com a obra ainda sem diário substitui, sem duplicar', (await api.importarOrcamento(r)).data.qtd_itens, 20)
conferir('depois de reimportar continuam 20 itens', (await api.buscarOrcamento()).data.itens.length, 20)
api.definirObraAtual(mock.OBRA_AP302)
conferir('obra com diário lançado não reimporta', /já tem serviços lançados/.test((await api.importarOrcamento(r)).erro), true)

console.log(`${ok}/${tot} — importação do estudo de viabilidade`)
process.exit(ok === tot ? 0 : 1)
