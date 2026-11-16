// Regras do módulo Planejamento (Last Planner). Sem React e sem banco.
//
// A EAP NÃO é uma lista nova: são as frentes e os serviços do Cronograma (com as datas que a
// cascata já calcula), mais as subatividades, o passo menor dentro de um serviço. Todas as abas do
// Planejamento leem esta mesma árvore.
import { segundaDaSemana } from './conflitos.js'
import { diasUteisEntre } from './cronograma.js'

// Compara números de item da planilha: "2.10" vem depois de "2.9". Serviço cadastrado à mão,
// sem número, vai para o fim, senão roubaria o código de quem veio da planilha.
export function compararItem(a, b) {
  if (!a || !b) return !a && !b ? 0 : !a ? 1 : -1
  const pa = String(a ?? '').split('.').map(Number)
  const pb = String(b ?? '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d
  }
  return 0
}

const menorData = (datas) => datas.filter(Boolean).sort()[0] ?? null
const maiorData = (datas) => datas.filter(Boolean).sort().at(-1) ?? null

// linhas: as linhas da cascata (calcularCascata(...).linhas), uma por serviço da cadeia.
// subatividades: [{ id, servico_id, titulo, inicio, fim, concluida, arquivada, ordem }]
// Devolve as frentes, cada uma com os serviços e as subatividades, já com o código da EAP:
// frente "1", serviço "1.1" (o número da planilha, quando houver), subatividade "1.1.1".
// Subatividade arquivada não ganha número: some da contagem e só aparece quando pedida.
export function montarEAP(linhas, subatividades = [], { mostrarArquivadas = false } = {}) {
  const ordenadas = [...linhas].sort((a, b) => compararItem(a.numero_item, b.numero_item))
  const frentes = []
  for (const l of ordenadas) {
    let f = frentes.find((x) => x.nome === l.frente)
    if (!f) { f = { nome: l.frente, servicos: [] }; frentes.push(f) }
    f.servicos.push(l)
  }
  return frentes.map((f, i) => {
    const codigoFrente = String(i + 1)
    const servicos = f.servicos.map((s, j) => {
      const codigo = s.numero_item || `${codigoFrente}.${j + 1}`
      const daqui = subatividades.filter((x) => x.servico_id === s.id).sort((a, b) => a.ordem - b.ordem)
      let n = 0
      const subs = daqui
        .filter((x) => mostrarArquivadas || !x.arquivada)
        .map((x) => ({ ...x, codigo: x.arquivada ? null : `${codigo}.${++n}` }))
      return {
        id: s.id, codigo, nome: s.nome, inicio: s.inicio, termino: s.termino, pct: s.pct ?? 0,
        situacao: s.situacao, concluido: !!s.concluido, responsavel_id: s.responsavel_id, duracao: s.duracao ?? 1,
        subatividades: subs, arquivadas: daqui.filter((x) => x.arquivada).length,
      }
    })
    // A frente vale o que valem os serviços dela, pesados pela duração.
    const peso = servicos.reduce((t, s) => t + s.duracao, 0)
    const feito = servicos.reduce((t, s) => t + s.pct * s.duracao, 0)
    return {
      codigo: codigoFrente, nome: f.nome, servicos,
      inicio: menorData(servicos.map((s) => s.inicio)), termino: maiorData(servicos.map((s) => s.termino)),
      pct: peso ? feito / peso : 0,
    }
  })
}

// Datas com que o formulário de subatividade nasce: começa hoje (ou no início do serviço, se
// ele ainda não começou) e termina com o serviço.
export function datasPadraoSubatividade(servico, hoje) {
  const inicio = servico?.inicio && servico.inicio > hoje ? servico.inicio : hoje
  const fim = servico?.termino && servico.termino >= inicio ? servico.termino : inicio
  return { inicio, fim }
}

export function conferirSubatividade(dados, idsServicosDaObra) {
  const erros = {}
  if (!dados.titulo || dados.titulo.trim().length < 2) erros.titulo = 'Diga o que é a subatividade.'
  if (!dados.servico_id || !idsServicosDaObra.includes(dados.servico_id)) erros.servico_id = 'Escolha o serviço desta obra.'
  if (!dados.inicio) erros.inicio = 'Escolha a data de início.'
  if (!dados.fim) erros.fim = 'Escolha a data de fim.'
  if (dados.inicio && dados.fim && dados.fim < dados.inicio) erros.fim = 'O fim não pode ser antes do início.'
  return { ok: Object.keys(erros).length === 0, erros }
}

// ---------- Longo prazo ----------
// Quanto já deveria estar feito hoje, em dias úteis (segunda a sexta, como a cascata):
// antes do início, 0; no último dia previsto ou depois, 1.
export function progressoPrevisto(inicio, termino, hoje) {
  if (!inicio || !termino || hoje < inicio) return 0
  if (hoje >= termino) return 1
  return (diasUteisEntre(inicio, hoje) + 1) / (diasUteisEntre(inicio, termino) + 1)
}

// A EAP com o previsto de hoje em cada serviço e em cada frente (pesado pela duração, como o real).
export function comPrevisto(eap, hoje) {
  return eap.map((f) => {
    const servicos = f.servicos.map((s) => {
      const previsto = progressoPrevisto(s.inicio, s.termino, hoje)
      return { ...s, previsto, ritmo: ritmo(s.pct, previsto, s.concluido) }
    })
    const peso = servicos.reduce((t, s) => t + s.duracao, 0)
    const previsto = peso ? servicos.reduce((t, s) => t + s.previsto * s.duracao, 0) / peso : 0
    return { ...f, servicos, previsto, ritmo: ritmo(f.pct, previsto, servicos.every((s) => s.concluido)) }
  })
}

// Real comparado ao previsto. Folga de 5 pontos para não acender alarme por arredondamento.
export function ritmo(real, previsto, concluido) {
  if (concluido || real >= 1) return 'concluido'
  if (real + 0.05 >= previsto) return 'em_dia'
  return 'atrasado'
}

const DIA = 864e5
const paraNum = (data) => { const [a, m, d] = data.split('-').map(Number); return Date.UTC(a, m - 1, d) }
const paraIso = (n) => new Date(n).toISOString().slice(0, 10)
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// As colunas da linha do tempo, de uma semana (segunda a domingo) ou de um mês cada, cobrindo
// de inicio a fim. posicao(data) diz onde a data cai: 0 é o começo da 1ª coluna, 1 o fim da última.
export function linhaDoTempo(inicio, fim, modo = 'semana') {
  const colunas = []
  if (modo === 'mes') {
    let [a, m] = inicio.split('-').map(Number)
    while (Date.UTC(a, m - 1, 1) <= paraNum(fim)) {
      const prox = m === 12 ? Date.UTC(a + 1, 0, 1) : Date.UTC(a, m, 1)
      colunas.push({ rotulo: `${MESES[m - 1]}/${String(a).slice(2)}`, inicio: paraIso(Date.UTC(a, m - 1, 1)), fim: paraIso(prox - DIA) })
      if (m === 12) { a++; m = 1 } else m++
    }
  } else {
    const n = paraNum(inicio)
    for (let seg = n - ((new Date(n).getUTCDay() + 6) % 7) * DIA; seg <= paraNum(fim); seg += 7 * DIA) {
      colunas.push({ rotulo: `${paraIso(seg).slice(8, 10)}/${paraIso(seg).slice(5, 7)}`, inicio: paraIso(seg), fim: paraIso(seg + 6 * DIA) })
    }
  }
  const comeco = paraNum(colunas[0].inicio)
  const total = paraNum(colunas.at(-1).fim) + DIA - comeco
  // fimDoDia: o término de uma barra ocupa o dia inteiro.
  const posicao = (data, fimDoDia = false) => Math.min(1, Math.max(0, (paraNum(data) + (fimDoDia ? DIA : 0) - comeco) / total))
  return { colunas: colunas.map((c) => ({ ...c, largura: (paraNum(c.fim) + DIA - paraNum(c.inicio)) / total })), posicao }
}

// ---------- Médio prazo (lookahead): restrições ----------
// Restrição = o que impede um serviço de começar ou andar. Mesmo texto na tela e (um dia) no CHECK do banco.
export const TIPOS_RESTRICAO = ['Material', 'Mão de obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística']
export const SEMANAS_DO_HORIZONTE = [3, 4, 5, 6]

// A segunda-feira n semanas depois (n negativo volta).
export const somarSemanas = (segunda, n) => paraIso(paraNum(segundaDaSemana(segunda)) + n * 7 * DIA)
// Quantas semanas de a até b (positivo se b vem depois).
export const semanasEntre = (a, b) => Math.round((paraNum(segundaDaSemana(b)) - paraNum(segundaDaSemana(a))) / (7 * DIA))

// O quadro do médio prazo: uma coluna por semana, a partir da semana de hoje.
// Restrição não resolvida de semana que já passou vai para a 1ª coluna, marcada como atrasada:
// ela não pode sumir do quadro só porque a semana virou.
export function montarLookahead(restricoes, hoje, { semanas = 4, responsavel = '', mostrarResolvidas = false } = {}) {
  const primeira = segundaDaSemana(hoje)
  const colunas = Array.from({ length: semanas }, (_, i) => ({ semana: somarSemanas(primeira, i), restricoes: [] }))
  const ultima = colunas.at(-1).semana
  let depois = 0
  for (const r of restricoes) {
    if (responsavel && r.responsavel !== responsavel) continue
    if (r.resolvida && !mostrarResolvidas) continue
    if (r.semana > ultima) { depois++; continue }
    if (r.semana < primeira) {
      if (r.resolvida) continue
      colunas[0].restricoes.push({ ...r, atrasada: true })
      continue
    }
    colunas.find((c) => c.semana === r.semana).restricoes.push({ ...r, atrasada: false, vencida: !r.resolvida && r.prazo < hoje })
  }
  for (const c of colunas) c.restricoes.sort((a, b) => Number(a.resolvida) - Number(b.resolvida) || a.prazo.localeCompare(b.prazo))
  return { colunas, depois }
}

// Serviço com restrição aberta está impedido: o curto prazo não deve prometê-lo para a semana.
export const servicosImpedidos = (restricoes) => new Set(restricoes.filter((r) => !r.resolvida).map((r) => r.servico_id))

// Serviços que trabalham em alguma parte da semana (segunda a domingo).
export const servicosDaSemana = (servicos, segunda) => {
  const domingo = paraIso(paraNum(segunda) + 6 * DIA)
  return servicos.filter((s) => s.inicio && s.termino && s.inicio <= domingo && s.termino >= segunda && !s.concluido)
}

export function conferirRestricao(dados, idsServicosDaObra) {
  const erros = {}
  if (!dados.descricao || dados.descricao.trim().length < 3) erros.descricao = 'Descreva o que está impedindo.'
  if (!TIPOS_RESTRICAO.includes(dados.tipo)) erros.tipo = 'Escolha o tipo.'
  if (!dados.servico_id || !idsServicosDaObra.includes(dados.servico_id)) erros.servico_id = 'Escolha o serviço desta obra.'
  if (!dados.prazo) erros.prazo = 'Escolha até quando precisa ser resolvida.'
  if (!dados.responsavel || !dados.responsavel.trim()) erros.responsavel = 'Escolha quem resolve.'
  return { ok: Object.keys(erros).length === 0, erros }
}

// ---------- Curto prazo: kanban da semana e PPC ----------
// O andamento da SEMANA mora num compromisso (servico_id + semana), não no serviço: marcar
// "Concluído" aqui quer dizer "cumpri o que prometi para esta semana", não "terminei o serviço".
export const STATUS_KANBAN = { a_fazer: 'A fazer', em_andamento: 'Em andamento', concluido: 'Concluído', nao_realizado: 'Não realizado' }
export const COLUNAS_KANBAN = ['a_fazer', 'em_andamento', 'concluido']
export const CAUSAS_NAO_REALIZADO = [
  'Material', 'Projeto', 'Mão de obra', 'Clima', 'Equipamento', 'Método', 'Segurança', 'Logística',
  'Serviço anterior não terminou', 'Outros',
]

export const domingoDa = (segunda) => paraIso(paraNum(segunda) + 6 * DIA)
const cruzaSemana = (inicio, fim, segunda) => !!inicio && !!fim && inicio <= domingoDa(segunda) && fim >= segunda

// O que entra no kanban da semana: o serviço cujo período cruza a semana, OU que deveria ter
// terminado antes dela e ainda não terminou (acumulado). Serviço já concluído antes da semana fica fora.
// servicos: os da EAP (com subatividades). compromissos: [{ servico_id, semana, status, causa }].
export function atividadesDaSemana(servicos, compromissos, segunda, impedidos = new Set()) {
  return servicos
    .filter((s) => cruzaSemana(s.inicio, s.termino, segunda) || (!s.concluido && s.termino && s.termino < segunda))
    .map((s) => {
      const c = compromissos.find((x) => x.servico_id === s.id && x.semana === segunda)
      const status = c?.status ?? (s.concluido ? 'concluido' : s.pct > 0 ? 'em_andamento' : 'a_fazer')
      const subs = (s.subatividades ?? []).filter((x) => !x.arquivada && (cruzaSemana(x.inicio, x.fim, segunda) || (!x.concluida && x.fim < segunda)))
      return {
        ...s, status, causa: c?.causa ?? null,
        acumulada: !s.concluido && s.termino < segunda,
        impedido: impedidos.has(s.id) && status !== 'concluido',
        subtarefas: subs,
      }
    })
}

// PPC = Percentual do Plano Concluído: do que foi prometido para a semana, quanto foi cumprido.
// "Não realizado" conta no total (foi prometido) e não conta como concluído.
export function ppc(atividades) {
  const total = atividades.length
  const concluidas = atividades.filter((a) => a.status === 'concluido').length
  return { total, concluidas, pct: total ? Math.round((concluidas / total) * 100) : null }
}

// Não realizado sem causa não vale: a causa é o que ensina a planejar melhor.
export function conferirNaoRealizado(causa) {
  return CAUSAS_NAO_REALIZADO.includes(causa) ? null : 'Escolha a causa: por que não foi feito?'
}
