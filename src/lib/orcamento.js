// Orçamento do cliente: quanto já foi executado, pelo valor. Regras no PLANO, módulo 8.

// itens: [{ id, frente, numero_item, nome, tipo, percentual?, valor, custo_mo? }]
// pct:   Map servico_id → fração executada (0 a 1), na visão de quem olha.
export function resumirOrcamento(itens, pct) {
  const normais = itens.filter((i) => i.tipo !== 'Percentual')
  const base = normais.reduce((s, i) => s + i.valor, 0)
  const execBase = normais.reduce((s, i) => s + i.valor * (pct.get(i.id) ?? 0), 0)
  const fracaoBase = base ? execBase / base : 0

  const linhas = itens.map((i) => {
    const fracao = i.tipo === 'Percentual' ? fracaoBase : (pct.get(i.id) ?? 0)
    return { ...i, fracao, executado: arred(i.valor * fracao) }
  })

  const etapas = []
  for (const l of linhas) {
    let e = etapas.find((x) => x.frente === l.frente)
    if (!e) { e = { frente: l.frente, numero: l.numero_item.split('.')[0], itens: [], valor: 0, executado: 0, custo_mo: 0 }; etapas.push(e) }
    e.itens.push(l)
    e.valor += l.valor
    e.executado += l.executado
    e.custo_mo += l.custo_mo ?? 0
  }
  etapas.forEach((e) => { e.fracao = e.valor ? e.executado / e.valor : 0 })

  const total = arred(etapas.reduce((s, e) => s + e.valor, 0))
  const executado = arred(etapas.reduce((s, e) => s + e.executado, 0))
  const custoMo = arred(etapas.reduce((s, e) => s + e.custo_mo, 0))
  return { etapas, total, executado, saldo: arred(total - executado), fracao: total ? executado / total : 0, custoMo, margem: arred(total - custoMo) }
}

const arred = (v) => Math.round(v * 100) / 100

export const reais = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const porcento = (fracao) => `${(Math.round(fracao * 1000) / 10).toLocaleString('pt-BR')}%`
