// A cascata de prazos: o coração do Painel do dia e do Gantt.
// Regras em PRD-FRONTEND.md, "Regras de cálculo". Datas sempre 'AAAA-MM-DD'.

// ---------- Dias úteis (segunda a sexta; feriados ainda não contam) ----------
const DIA = 864e5
const paraNum = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) }
const paraIso = (n) => new Date(n).toISOString().slice(0, 10)
const util = (n) => { const s = new Date(n).getUTCDay(); return s !== 0 && s !== 6 }

export const ehDiaUtil = (iso) => util(paraNum(iso))

// Anda n dias úteis a partir de iso (n negativo volta). n = 0 devolve iso.
export function somarDiasUteis(iso, n) {
  let t = paraNum(iso)
  const passo = n < 0 ? -DIA : DIA
  let falta = Math.abs(n)
  while (falta > 0) { t += passo; if (util(t)) falta-- }
  return paraIso(t)
}

// Dias úteis de a até b: positivo se b vem depois. Conta os dias úteis em (a, b].
export function diasUteisEntre(a, b) {
  if (a === b) return 0
  const sinal = paraNum(b) > paraNum(a) ? 1 : -1
  let t = paraNum(a)
  const fim = paraNum(b)
  let n = 0
  while (t !== fim) { t += sinal * DIA; if (util(t)) n++ }
  return sinal * n
}

const proximoUtil = (iso) => (ehDiaUtil(iso) ? iso : somarDiasUteis(iso, 1))
const maior = (a, b) => (paraNum(a) >= paraNum(b) ? a : b)

// ---------- Ordem da cadeia ----------
// Devolve os ids em ordem (quem é pré-requisito vem antes). Ciclo → erro com os nomes.
export function ordenarCadeia(servicos) {
  const porId = new Map(servicos.map((s) => [s.id, s]))
  const estado = new Map()
  const ordem = []
  const visitar = (id, caminho) => {
    if (estado.get(id) === 'feito') return
    if (estado.get(id) === 'visitando') {
      const ciclo = [...caminho.slice(caminho.indexOf(id)), id].map((x) => porId.get(x)?.nome ?? x)
      throw new Error(`Ciclo de dependência: ${ciclo.join(' → ')}`)
    }
    estado.set(id, 'visitando')
    for (const dep of porId.get(id)?.deps ?? []) if (porId.has(dep)) visitar(dep, [...caminho, id])
    estado.set(id, 'feito')
    ordem.push(id)
  }
  for (const s of servicos) visitar(s.id, [])
  return ordem
}

// ---------- A cascata ----------
// servicos:  [{ id, nome, frente, duracao, deps: [ids], prevista, concluido_em? }]
// execucoes: [{ servico_id, data, quantidade, status }]  (status = do diário)
// contam:    status de diário que valem para quem está vendo (sócio: Enviado+Aprovado; cliente: Aprovado)
export function calcularCascata({ servicos, execucoes, obra, hoje, contam = ['Enviado', 'Aprovado'] }) {
  const ordem = ordenarCadeia(servicos)
  const porId = new Map(servicos.map((s) => [s.id, s]))
  const sucessores = new Map(servicos.map((s) => [s.id, []]))
  servicos.forEach((s) => (s.deps ?? []).forEach((d) => sucessores.get(d)?.push(s.id)))

  // Executado, início real e término real a partir dos lançamentos que contam.
  const real = new Map()
  for (const s of servicos) {
    const lanc = execucoes
      .filter((e) => e.servico_id === s.id && contam.includes(e.status) && e.quantidade > 0)
      .sort((a, b) => a.data.localeCompare(b.data))
    let acum = 0
    let terminoReal = null
    for (const e of lanc) {
      acum += e.quantidade
      if (!terminoReal && acum >= s.prevista) terminoReal = e.data
    }
    if (s.concluido_em) terminoReal = s.concluido_em
    real.set(s.id, {
      executado: acum,
      pct: Math.min(1, s.prevista ? acum / s.prevista : 0),
      inicioReal: lanc[0]?.data ?? null,
      terminoReal,
    })
  }

  // De trás para frente: limites a partir da data de entrega.
  const limite = new Map()
  for (const id of [...ordem].reverse()) {
    const s = porId.get(id)
    const suc = sucessores.get(id)
    const lf = suc.length
      ? somarDiasUteis(suc.map((x) => limite.get(x).ls).sort()[0], -1)
      : proximoUtilAntes(obra.data_entrega)
    limite.set(id, { lf, ls: somarDiasUteis(lf, -(s.duracao - 1)) })
  }

  // De frente para trás: previsão a partir de hoje e do que já foi feito.
  const prev = new Map()
  const hojeUtil = proximoUtil(hoje)
  for (const id of ordem) {
    const s = porId.get(id)
    const r = real.get(id)
    let inicio
    if (r.inicioReal) inicio = r.inicioReal
    else {
      const base = (s.deps ?? []).length
        ? somarDiasUteis(s.deps.map((d) => prev.get(d).termino).sort().at(-1), 1)
        : proximoUtil(obra.data_inicio)
      inicio = maior(base, hojeUtil)
    }
    let termino
    if (r.terminoReal) termino = r.terminoReal
    else {
      const restante = Math.max(1, Math.ceil(s.duracao * (1 - r.pct) - 1e-9))
      termino = somarDiasUteis(maior(inicio, hojeUtil), restante - 1)
    }
    prev.set(id, { inicio, termino })
  }

  const linhas = servicos.map((s) => {
    const r = real.get(s.id)
    const l = limite.get(s.id)
    const p = prev.get(s.id)
    const concluido = !!r.terminoReal
    const folga = diasUteisEntre(p.termino, l.lf)
    const diasAtraso = !concluido && paraNum(hoje) > paraNum(l.lf) ? diasUteisEntre(l.lf, hoje) : 0
    const limitePassouSemComecar = !concluido && !r.inicioReal && paraNum(hoje) > paraNum(l.ls)
    const diasAteLimite = Math.max(1, diasUteisEntre(hoje, l.lf) + (ehDiaUtil(hoje) ? 1 : 0))
    const falta = Math.max(0, s.prevista - r.executado)
    const metaDia = concluido ? 0 : (diasAtraso > 0 ? falta : Math.ceil(falta / diasAteLimite))
    const situacao = concluido ? 'Concluído' : r.inicioReal ? 'Em andamento' : 'Não iniciado'
    const cor = concluido ? 'green'
      : diasAtraso > 0 || limitePassouSemComecar ? 'red'
      : folga <= 3 ? 'amber' : 'green'
    return {
      ...s, ...r, ...p,
      limiteTermino: l.lf, limiteProgramar: l.ls,
      folga, diasAtraso, limitePassouSemComecar, metaDia, situacao, cor, concluido,
    }
  })

  const previsao = linhas.map((x) => x.termino).sort().at(-1) ?? obra.data_entrega
  return {
    linhas,
    previsaoEntrega: previsao,
    diasAtrasoEntrega: Math.max(0, diasUteisEntre(obra.data_entrega, previsao)),
  }
}

// A entrega num sábado ou domingo vale como a sexta anterior.
function proximoUtilAntes(iso) {
  return ehDiaUtil(iso) ? iso : somarDiasUteis(iso, -1)
}

// Só serviço Normal entra na cadeia; o item percentual (Gestão de obra) acompanha os outros.
export const servicosDaCadeia = (servicos) => servicos.filter((s) => s.tipo === 'Normal')

// Quais diários contam para quem está vendo: o cliente só vê o aprovado.
export const statusQueContam = (perfil) => (perfil === 'cliente' ? ['Aprovado'] : ['Enviado', 'Aprovado'])

// Ordem do Painel do dia: menor folga primeiro; empate, a data-limite mais cedo.
export function ordenarPorAtraso(linhas) {
  return [...linhas]
    .filter((l) => !l.concluido)
    .sort((a, b) => a.folga - b.folga || a.limiteProgramar.localeCompare(b.limiteProgramar))
}
