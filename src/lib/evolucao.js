// Evolução da obra (cronograma físico-financeiro): ao longo do tempo, quanto do valor do estudo
// de viabilidade DEVERIA estar feito, quanto FOI feito e, só para o sócio, quanto foi GASTO.
//
// - Previsto: o valor de cada serviço espalhado por igual nos dias úteis da linha de base
//   (o cronograma como foi planejado, a partir do início da obra, sem os atrasos).
// - Executado: cada lançamento de diário que conta para quem olha vale
//   valor do serviço × quantidade ÷ quantidade prevista, no dia do diário.
// - Gasto: os custos lançados no Financeiro, no dia do custo.
// - O item percentual (Gestão de obra) acompanha os outros: entra como um fator sobre tudo.
import { calcularCascata, ehDiaUtil, statusQueContam } from './cronograma.js'

const arred = (v) => Math.round(v * 100) / 100
const mesDe = (iso) => iso.slice(0, 7)

function proximoDia(iso) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function segundaDe(iso) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

function diasUteis(inicio, fim) {
  const dias = []
  for (let d = inicio; d <= fim; d = proximoDia(d)) if (ehDiaUtil(d)) dias.push(d)
  return dias
}

// obra:      { data_inicio, data_entrega }
// servicos:  os da cadeia (tipo Normal), com duracao, deps e prevista
// execucoes: [{ servico_id, data, quantidade, status }]
// itens:     itens do orçamento [{ id, tipo, valor }]
// custos:    [{ data, valor }]; o cliente passa lista vazia
// perfil:    decide quais diários contam (o cliente só vê o aprovado)
export function montarEvolucao({ obra, servicos, execucoes, itens, custos = [], hoje, perfil = 'socio' }) {
  const valorDe = new Map(itens.filter((i) => i.tipo !== 'Percentual').map((i) => [i.id, i.valor ?? 0]))
  const base = [...valorDe.values()].reduce((s, v) => s + v, 0)
  const percentuais = itens.filter((i) => i.tipo === 'Percentual').reduce((s, i) => s + (i.valor ?? 0), 0)
  const fator = base ? (base + percentuais) / base : 1
  const total = arred(base + percentuais)

  const previstoDia = new Map()
  const executadoDia = new Map()
  const gastoDia = new Map()
  const somar = (mapa, dia, v) => mapa.set(dia, (mapa.get(dia) ?? 0) + v)

  // Linha de base: a cascata sem nenhum lançamento, olhando do primeiro dia da obra.
  const linhaDeBase = calcularCascata({ servicos, execucoes: [], obra, hoje: obra.data_inicio }).linhas
  let fimDaBase = obra.data_entrega
  for (const l of linhaDeBase) {
    const valor = (valorDe.get(l.id) ?? 0) * fator
    const dias = diasUteis(l.inicio, l.termino)
    if (!valor || !dias.length) continue
    dias.forEach((d) => somar(previstoDia, d, valor / dias.length))
    if (l.termino > fimDaBase) fimDaBase = l.termino
  }

  const contam = statusQueContam(perfil)
  const prevista = new Map(servicos.map((s) => [s.id, s.prevista]))
  const jaContado = new Map()
  for (const e of [...execucoes].sort((a, b) => a.data.localeCompare(b.data))) {
    if (!contam.includes(e.status) || !(e.quantidade > 0) || e.data > hoje) continue
    const p = prevista.get(e.servico_id)
    if (!p) continue
    // Lançado acima do previsto não passa de 100% do serviço.
    const antes = jaContado.get(e.servico_id) ?? 0
    const conta = Math.max(0, Math.min(e.quantidade, p - antes))
    jaContado.set(e.servico_id, antes + conta)
    somar(executadoDia, e.data, (valorDe.get(e.servico_id) ?? 0) * fator * (conta / p))
  }

  for (const c of custos) if (c.data <= hoje) somar(gastoDia, c.data, c.valor)

  // Período: do início da obra até o fim do que foi planejado (ou até hoje, se a obra passou da data).
  const primeiro = [obra.data_inicio, ...custos.map((c) => c.data)].sort()[0]
  const ultimo = [fimDaBase, obra.data_entrega, hoje <= fimDaBase ? fimDaBase : hoje].sort().at(-1)

  const meses = []
  const semanas = []
  let acum = { previsto: 0, executado: 0, gasto: 0 }
  for (let d = primeiro; d <= ultimo; d = proximoDia(d)) {
    acum = {
      previsto: acum.previsto + (previstoDia.get(d) ?? 0),
      executado: acum.executado + (executadoDia.get(d) ?? 0),
      gasto: acum.gasto + (gastoDia.get(d) ?? 0),
    }
    const mes = mesDe(d)
    let m = meses.at(-1)
    if (!m || m.mes !== mes) { m = { mes, previsto: 0, executado: 0, gasto: 0 }; meses.push(m) }
    m.previsto += previstoDia.get(d) ?? 0
    m.executado += executadoDia.get(d) ?? 0
    m.gasto += gastoDia.get(d) ?? 0
    Object.assign(m, { previstoAcum: acum.previsto, executadoAcum: acum.executado, gastoAcum: acum.gasto })

    // Um ponto por semana (no domingo), mais o de hoje e o do último dia, para a curva.
    const fimDaSemana = new Date(`${d}T12:00:00Z`).getUTCDay() === 0 || d === ultimo || d === hoje
    if (fimDaSemana) {
      const passou = d <= hoje
      semanas.push({
        semana: segundaDe(d),
        ate: d,
        previsto: arred(acum.previsto),
        executado: passou ? arred(acum.executado) : null,
        gasto: passou ? arred(acum.gasto) : null,
      })
    }
  }

  const ateHoje = (mapa) => [...mapa].filter(([d]) => d <= hoje).reduce((s, [, v]) => s + v, 0)
  const previstoHoje = ateHoje(previstoDia)
  const executado = ateHoje(executadoDia)
  const gasto = ateHoje(gastoDia)
  const fracaoExecutada = total ? executado / total : 0
  // No ritmo de hoje: se gastou G para fazer F da obra, a obra inteira custa G ÷ F.
  const projecaoGasto = fracaoExecutada >= 0.05 ? gasto / fracaoExecutada : null

  return {
    total,
    previstoHoje: arred(previstoHoje),
    executado: arred(executado),
    gasto: arred(gasto),
    fracaoPrevista: total ? previstoHoje / total : 0,
    fracaoExecutada,
    fracaoGasta: total ? gasto / total : 0,
    projecaoGasto: projecaoGasto === null ? null : arred(projecaoGasto),
    diferencaProjetada: projecaoGasto === null ? null : arred(total - projecaoGasto),
    mesDeHoje: mesDe(hoje),
    meses: meses.map((m) => ({
      ...m,
      previsto: arred(m.previsto), executado: arred(m.executado), gasto: arred(m.gasto),
      previstoAcum: arred(m.previstoAcum), executadoAcum: arred(m.executadoAcum), gastoAcum: arred(m.gastoAcum),
      futuro: m.mes > mesDe(hoje),
    })),
    semanas,
  }
}

// Pontos percentuais: 43% previsto e 38% feito dão 5 pontos atrás.
export function situacaoDoAvanco(fracaoPrevista, fracaoExecutada) {
  const pp = Math.round((fracaoExecutada - fracaoPrevista) * 1000) / 10
  if (Math.abs(pp) < 1) return { pp, texto: 'no ritmo previsto', cor: 'green' }
  return pp < 0
    ? { pp, texto: `${Math.abs(pp).toLocaleString('pt-BR')} pontos atrás`, cor: 'red' }
    : { pp, texto: `${pp.toLocaleString('pt-BR')} pontos adiantada`, cor: 'green' }
}

export const nomeDoMes = (mes) => {
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`
}
