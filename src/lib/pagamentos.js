// O que o cliente tem para pagar: regra da aba Pagamentos.
// Rascunho nunca entra (o cliente nem recebe); Fechada = em aberto; Paga = pago.
export function separarPagamentos(medicoes, hoje) {
  const abertas = medicoes.filter((m) => m.status === 'Fechada')
  const vencidas = abertas.filter((m) => m.vencimento <= hoje)
  const proximas = abertas.filter((m) => m.vencimento > hoje)
  const pagas = medicoes.filter((m) => m.status === 'Paga')
  const total = (l) => Math.round(l.reduce((s, m) => s + m.valor_total, 0) * 100) / 100
  return {
    abertas, vencidas, proximas, pagas,
    totalHoje: total(vencidas), totalProximas: total(proximas), totalPago: total(pagas), totalAberto: total(abertas),
  }
}
