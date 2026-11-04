// Faturamento de todas as obras: a única conta do app que junta obras. Só sócios.
//
// Bruto    = medições Fechada + Paga (o que foi cobrado do cliente).
// Custo    = tudo o que foi lançado como custo da obra, inclusive mão de obra (custo de verdade,
//            decisão da sócia em 04/11/2026). Custo não lançado não entra: o líquido aparece maior.
// Líquido  = bruto − custo. Impostos ainda não são descontados.
import { calcularCascata } from './cronograma.js'
import { resumirOrcamento } from './orcamento.js'

const arred = (v) => Math.round(v * 100) / 100
const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0)

// base: uma entrada por obra { obra, itens, servicos, execucoes, medicoes, custos }
export function calcularFaturamento(base, hoje) {
  const obras = base.map(({ obra, itens, servicos, execucoes, medicoes, custos }) => {
    const cobradas = medicoes.filter((m) => m.status === 'Fechada' || m.status === 'Paga')
    const bruto = arred(soma(cobradas, (m) => m.valor_total))
    const recebido = arred(soma(cobradas.filter((m) => m.status === 'Paga'), (m) => m.valor_total))

    const custo = arred(soma(custos, (k) => k.valor))

    let contrato = 0
    let executado = 0
    let fracao = null
    if (itens.length > 0) {
      const c = calcularCascata({ servicos, execucoes, obra, hoje })
      const r = resumirOrcamento(itens, new Map(c.linhas.map((l) => [l.id, l.pct])))
      contrato = r.total
      executado = r.executado
      fracao = r.fracao
    }

    const liquido = arred(bruto - custo)
    return {
      id: obra.id, codigo: obra.codigo, nome: obra.nome, situacao: obra.situacao,
      contrato, executado, fracao, bruto, recebido, aReceber: arred(bruto - recebido), custo, liquido,
      margem: bruto > 0 ? liquido / bruto : null,
    }
  })

  const total = (campo) => arred(soma(obras, (o) => o[campo]))
  const contrato = total('contrato')
  const bruto = total('bruto')
  const liquido = total('liquido')
  return {
    obras,
    totais: {
      contrato, bruto, liquido, recebido: total('recebido'), aReceber: total('aReceber'),
      executado: total('executado'), custo: total('custo'),
      fracao: contrato > 0 ? total('executado') / contrato : 0,
      margem: bruto > 0 ? liquido / bruto : null,
    },
  }
}
