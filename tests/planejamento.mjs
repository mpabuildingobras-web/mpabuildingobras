// Planejamento: a EAP e as subatividades. Node puro: `node tests/planejamento.mjs`.
import { calcularCascata } from '../src/lib/cronograma.js'
import {
  arquivarSubatividade, carregarCronograma, definirObraAtual, definirPerfil, listarCompromissos, listarRestricoes, listarSubatividades,
  marcarSubatividade, moverAtividade, moverRestricao, resolverRestricao, salvarRestricao, salvarSubatividade,
} from '../src/lib/dadosMock.js'
import { HOJE, OBRA_AP302, OBRA_CJF } from '../src/lib/mockData.js'
import {
  atividadesDaSemana, comPrevisto, compararItem, conferirNaoRealizado, conferirRestricao, ppc, conferirSubatividade, datasPadraoSubatividade, linhaDoTempo, montarEAP,
  montarLookahead, progressoPrevisto, ritmo, semanasEntre, servicosDaSemana, servicosImpedidos, somarSemanas,
} from '../src/lib/planejamento.js'

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

// ---------- Ordem e códigos ----------
conferir('2.10 vem depois de 2.9', ['2.10', '2.9', '1.1'].sort(compararItem), ['1.1', '2.9', '2.10'])

const linhas = [
  { id: 'b', frente: 'Elétrica', numero_item: '2.1', nome: 'Fios', inicio: '2026-11-04', termino: '2026-11-10', pct: 0, duracao: 5 },
  { id: 'a', frente: 'Demolição', numero_item: '1.1', nome: 'Quebra', inicio: '2026-11-02', termino: '2026-11-03', pct: 1, duracao: 2, concluido: true },
  { id: 'c', frente: 'Demolição', numero_item: '', nome: 'Entulho', inicio: '2026-11-03', termino: '2026-11-03', pct: 0.5, duracao: 2 },
]
const subs = [
  { id: 'x2', servico_id: 'a', titulo: 'Piso', ordem: 2, arquivada: false },
  { id: 'x1', servico_id: 'a', titulo: 'Azulejo', ordem: 1, arquivada: true },
  { id: 'x3', servico_id: 'a', titulo: 'Rodapé', ordem: 3, arquivada: false },
]
const eap = montarEAP(linhas, subs)
conferir('frentes na ordem da planilha, com código 1, 2', eap.map((f) => `${f.codigo} ${f.nome}`), ['1 Demolição', '2 Elétrica'])
conferir('serviço usa o número da planilha; sem número, ganha o da posição', eap[0].servicos.map((s) => s.codigo), ['1.1', '1.2'])
conferir('arquivada some e não ocupa número', eap[0].servicos[0].subatividades.map((x) => `${x.codigo} ${x.titulo}`), ['1.1.1 Piso', '1.1.2 Rodapé'])
conferir('conta quantas estão arquivadas', eap[0].servicos[0].arquivadas, 1)
conferir('mostrando arquivadas, ela aparece sem número',
  montarEAP(linhas, subs, { mostrarArquivadas: true })[0].servicos[0].subatividades.map((x) => x.codigo), [null, '1.1.1', '1.1.2'])
conferir('frente vai do primeiro início ao último término', [eap[0].inicio, eap[0].termino], ['2026-11-02', '2026-11-03'])
conferir('avanço da frente pesa pela duração', eap[0].pct, 0.75)
conferir('obra sem serviço: EAP vazia', montarEAP([], subs), [])

// ---------- Formulário ----------
conferir('serviço que ainda não começou: subatividade nasce no início dele',
  datasPadraoSubatividade({ inicio: '2026-11-20', termino: '2026-11-27' }, '2026-11-03'), { inicio: '2026-11-20', fim: '2026-11-27' })
conferir('serviço em andamento: nasce hoje',
  datasPadraoSubatividade({ inicio: '2026-10-01', termino: '2026-11-27' }, '2026-11-03'), { inicio: '2026-11-03', fim: '2026-11-27' })
conferir('serviço já atrasado: o fim não fica antes do início',
  datasPadraoSubatividade({ inicio: '2026-10-01', termino: '2026-10-20' }, '2026-11-03'), { inicio: '2026-11-03', fim: '2026-11-03' })
const base = { titulo: 'Chapisco', servico_id: 'a', inicio: '2026-11-03', fim: '2026-11-04' }
conferir('subatividade certa passa', conferirSubatividade(base, ['a']).ok, true)
conferir('título vazio é recusado', Object.keys(conferirSubatividade({ ...base, titulo: ' ' }, ['a']).erros), ['titulo'])
conferir('fim antes do início é recusado', conferirSubatividade({ ...base, fim: '2026-11-01' }, ['a']).erros.fim, 'O fim não pode ser antes do início.')
conferir('serviço de outra obra é recusado', Object.keys(conferirSubatividade(base, ['b']).erros), ['servico_id'])

// ---------- Camada de dados (exemplo): cada obra vê a sua árvore ----------
definirPerfil('socio')
definirObraAtual(OBRA_CJF)
const daCjf = (await listarSubatividades()).data
conferir('CJF só vê as subatividades dela', daCjf.every((x) => x.obra_id === OBRA_CJF) && daCjf.length === 2, true)
const recusada = await salvarSubatividade({ titulo: 'Intrusa', servico_id: 's3', inicio: HOJE, fim: HOJE })
conferir('não dá para pôr subatividade num serviço da outra obra', recusada.erros?.servico_id, 'Escolha o serviço desta obra.')

definirObraAtual(OBRA_AP302)
const nova = (await salvarSubatividade({ titulo: 'Prumada do social', servico_id: 's3', inicio: HOJE, fim: '2026-11-05' })).data
conferir('nova vai para o fim do serviço', nova.ordem, 4)
const movida = (await salvarSubatividade({ ...nova, servico_id: 's5' })).data
conferir('trocar o serviço move para o fim do novo', [movida.servico_id, movida.ordem], ['s5', 3])
await arquivarSubatividade(nova.id, true)
const { data: cr } = await carregarCronograma()
const c = calcularCascata({ servicos: cr.servicos, execucoes: cr.execucoes, obra: cr.obra, hoje: HOJE })
const arvore = montarEAP(c.linhas, (await listarSubatividades()).data)
const reboco = arvore.flatMap((f) => f.servicos).find((s) => s.id === 's5')
conferir('arquivada sai da EAP da AP302', reboco.subatividades.map((x) => x.titulo), ['Chapisco das paredes do banheiro', 'Reboco e desempeno'])
await arquivarSubatividade(nova.id, false)
conferir('desarquivar devolve', (await listarSubatividades()).data.find((x) => x.id === nova.id).arquivada, false)

definirPerfil('auxiliar')
conferir('auxiliar não recebe o planejamento', (await listarSubatividades()).data, [])
conferir('auxiliar não grava no planejamento', (await salvarSubatividade(base)).erro, 'Só sócio mexe no planejamento.')

// ---------- Longo prazo ----------
// Serviço de segunda 09/11 a sexta 13/11 (5 dias úteis, semana sem feriado).
conferir('antes do início, previsto 0', progressoPrevisto('2026-11-09', '2026-11-13', '2026-11-06'), 0)
conferir('no 1º dia, previsto 1/5', progressoPrevisto('2026-11-09', '2026-11-13', '2026-11-09'), 0.2)
conferir('na quarta, previsto 3/5', progressoPrevisto('2026-11-09', '2026-11-13', '2026-11-11'), 0.6)
conferir('no último dia, previsto 100%', progressoPrevisto('2026-11-09', '2026-11-13', '2026-11-13'), 1)
conferir('fim de semana não conta: no sábado vale a sexta', progressoPrevisto('2026-11-23', '2026-12-04', '2026-11-28'), 0.5)
conferir('real abaixo do previsto: atrasado', ritmo(0.3, 0.6, false), 'atrasado')
conferir('5 pontos abaixo ainda é em dia', ritmo(0.56, 0.6, false), 'em_dia')
conferir('concluído vence o resto', ritmo(1, 0.2, true), 'concluido')

const lp = comPrevisto(montarEAP([
  { id: 'p1', frente: 'F', numero_item: '1.1', nome: 'A', inicio: '2026-11-02', termino: '2026-11-06', pct: 1, duracao: 5, concluido: true },
  { id: 'p2', frente: 'F', numero_item: '1.2', nome: 'B', inicio: '2026-11-09', termino: '2026-11-13', pct: 0, duracao: 5 },
]), '2026-11-11')
conferir('previsto do serviço: B na quarta deveria ter 3/5', lp[0].servicos[1].previsto, 0.6)
conferir('B sem nada feito está atrás do previsto', lp[0].servicos[1].ritmo, 'atrasado')
conferir('previsto da frente pesa pela duração: (1×5 + 0,6×5)/10', lp[0].previsto, 0.8)
conferir('frente real 50% contra previsto 80%: atrasada', lp[0].ritmo, 'atrasado')

const sem = linhaDoTempo('2026-11-04', '2026-11-17', 'semana')
conferir('semanas começam na segunda', sem.colunas.map((c) => c.rotulo), ['02/11', '09/11', '16/11'])
conferir('semanas dividem a largura por igual', sem.colunas.every((c) => Math.abs(c.largura - 1 / 3) < 1e-9), true)
conferir('início da 1ª semana fica no 0', sem.posicao('2026-11-02'), 0)
conferir('fim do último dia fica no 1', sem.posicao('2026-11-22', true), 1)
conferir('data fora da escala fica na borda', [sem.posicao('2026-10-01'), sem.posicao('2026-12-31')], [0, 1])
const mes = linhaDoTempo('2026-11-20', '2027-01-05', 'mes')
conferir('meses viram o ano', mes.colunas.map((c) => c.rotulo), ['nov/26', 'dez/26', 'jan/27'])
conferir('dezembro termina no dia 31', mes.colunas[1].fim, '2026-12-31')

// ---------- Médio prazo: restrições ----------
// "Hoje" numa terça (03/11): a semana atual começa na segunda 02/11.
const R = (id, semana, extra = {}) => ({ id, servico_id: 's1', tipo: 'Material', descricao: id, prazo: semana, responsavel: 'Ana', semana, resolvida: false, ...extra })
const restricoes = [
  R('velha-aberta', '2026-10-26', { prazo: '2026-10-30' }),
  R('velha-resolvida', '2026-10-26', { resolvida: true }),
  R('esta', '2026-11-02', { prazo: '2026-11-06' }),
  R('vencida', '2026-11-02', { prazo: '2026-11-02' }),
  R('prox', '2026-11-09', { responsavel: 'Bruno' }),
  R('resolvida', '2026-11-09', { resolvida: true }),
  R('longe', '2026-12-07'),
]
const q = montarLookahead(restricoes, '2026-11-03', { semanas: 3 })
conferir('3 semanas a partir da semana de hoje', q.colunas.map((c) => c.semana), ['2026-11-02', '2026-11-09', '2026-11-16'])
conferir('aberta de semana passada vem para a 1ª coluna, atrasada',
  q.colunas[0].restricoes.filter((r) => r.atrasada).map((r) => r.id), ['velha-aberta'])
conferir('resolvida de semana passada não volta', q.colunas.flatMap((c) => c.restricoes).some((r) => r.id === 'velha-resolvida'), false)
conferir('prazo antes de hoje e ainda aberta: vencida', q.colunas[0].restricoes.find((r) => r.id === 'vencida').vencida, true)
conferir('resolvidas ficam escondidas por padrão', q.colunas[1].restricoes.map((r) => r.id), ['prox'])
conferir('mostrando resolvidas, elas vêm depois das abertas',
  montarLookahead(restricoes, '2026-11-03', { semanas: 3, mostrarResolvidas: true }).colunas[1].restricoes.map((r) => r.id), ['prox', 'resolvida'])
conferir('fora do horizonte é contada, não mostrada', q.depois, 1)
conferir('filtro de responsável', montarLookahead(restricoes, '2026-11-03', { semanas: 6, responsavel: 'Bruno' }).colunas.flatMap((c) => c.restricoes).map((r) => r.id), ['prox'])
conferir('mover uma semana para a frente e para trás', [somarSemanas('2026-11-02', 1), somarSemanas('2026-11-02', -1)], ['2026-11-09', '2026-10-26'])
conferir('virada de ano', somarSemanas('2026-12-28', 1), '2027-01-04')
conferir('semanas entre duas datas', [semanasEntre('2026-10-26', '2026-11-04'), semanasEntre('2026-11-16', '2026-11-02')], [1, -2])
conferir('serviço com restrição aberta fica impedido', [...servicosImpedidos([R('a', '2026-11-02'), R('b', '2026-11-02', { servico_id: 's2', resolvida: true })])], ['s1'])
conferir('serviço da semana: cruza a semana e não terminou',
  servicosDaSemana([
    { id: 'a', inicio: '2026-10-28', termino: '2026-11-02' },
    { id: 'b', inicio: '2026-11-08', termino: '2026-11-20' },
    { id: 'c', inicio: '2026-11-10', termino: '2026-11-12', concluido: true },
    { id: 'd', inicio: '2026-11-16', termino: '2026-11-20' },
  ], '2026-11-09').map((s) => s.id), ['b'])
const certa = { descricao: 'Falta argamassa', tipo: 'Material', servico_id: 's1', prazo: '2026-11-06', responsavel: 'Ana' }
conferir('restrição certa passa', conferirRestricao(certa, ['s1']).ok, true)
conferir('tipo fora da lista é recusado', Object.keys(conferirRestricao({ ...certa, tipo: 'Clima' }, ['s1']).erros), ['tipo'])
conferir('sem responsável é recusada', Object.keys(conferirRestricao({ ...certa, responsavel: ' ' }, ['s1']).erros), ['responsavel'])

definirPerfil('socio')
definirObraAtual(OBRA_CJF)
conferir('CJF só vê a restrição dela', (await listarRestricoes()).data.map((r) => r.id), ['rc1'])
definirObraAtual(OBRA_AP302)
const criada = (await salvarRestricao({ descricao: 'Caçamba cheia', tipo: 'Logística', servico_id: 's5', prazo: '2026-11-12', responsavel: 'Ana Exemplo' })).data
conferir('restrição nova entra na semana do prazo', criada.semana, '2026-11-09')
conferir('mover para a próxima semana', (await moverRestricao(criada.id, 1)).data.semana, '2026-11-16')
conferir('mover de volta', (await moverRestricao(criada.id, -1)).data.semana, '2026-11-09')
conferir('resolver', (await resolverRestricao(criada.id, true)).data.resolvida, true)
definirObraAtual(OBRA_CJF)
conferir('não dá para resolver restrição de outra obra', (await resolverRestricao(criada.id, false)).erro, 'Restrição não encontrada nesta obra.')
definirPerfil('auxiliar')
conferir('auxiliar não recebe restrições', (await listarRestricoes()).data, [])

// ---------- Curto prazo: kanban e PPC ----------
const SEG = '2026-11-09'
const servs = [
  { id: 'cruza', inicio: '2026-11-05', termino: '2026-11-10', pct: 0.5, subatividades: [
    { id: 'x1', inicio: '2026-11-09', fim: '2026-11-10', concluida: false },
    { id: 'x2', inicio: '2026-11-02', fim: '2026-11-04', concluida: false },
    { id: 'x3', inicio: '2026-11-02', fim: '2026-11-04', concluida: true },
    { id: 'x4', inicio: '2026-11-20', fim: '2026-11-21', concluida: false },
    { id: 'x5', inicio: '2026-11-09', fim: '2026-11-09', concluida: false, arquivada: true },
  ] },
  { id: 'acumulada', inicio: '2026-10-20', termino: '2026-11-04', pct: 0.7 },
  { id: 'terminada-antes', inicio: '2026-10-20', termino: '2026-11-04', pct: 1, concluido: true },
  { id: 'futura', inicio: '2026-11-16', termino: '2026-11-20', pct: 0 },
  { id: 'domingo', inicio: '2026-11-15', termino: '2026-11-18', pct: 0 },
]
const ativ = atividadesDaSemana(servs, [{ servico_id: 'cruza', semana: SEG, status: 'nao_realizado', causa: 'Clima' }], SEG, new Set(['acumulada']))
conferir('entram: a que cruza, a acumulada e a que começa no domingo', ativ.map((a) => a.id), ['cruza', 'acumulada', 'domingo'])
conferir('acumulada é marcada', ativ.find((a) => a.id === 'acumulada').acumulada, true)
conferir('o status vem do compromisso da semana, com a causa', [ativ[0].status, ativ[0].causa], ['nao_realizado', 'Clima'])
conferir('sem compromisso: começou vira em andamento, não começou fica a fazer',
  ativ.slice(1).map((a) => a.status), ['em_andamento', 'a_fazer'])
conferir('serviço com restrição aberta fica impedido', ativ.find((a) => a.id === 'acumulada').impedido, true)
conferir('subtarefas: as da semana e as atrasadas abertas; nunca concluída velha, futura ou arquivada',
  ativ[0].subtarefas.map((x) => x.id), ['x1', 'x2'])
conferir('PPC conta não realizado no total', ppc([{ status: 'concluido' }, { status: 'nao_realizado' }, { status: 'em_andamento' }, { status: 'concluido' }]), { total: 4, concluidas: 2, pct: 50 })
conferir('semana sem nada planejado não tem PPC', ppc([]).pct, null)
conferir('não realizado sem causa é recusado', conferirNaoRealizado(''), 'Escolha a causa: por que não foi feito?')
conferir('causa da lista passa', conferirNaoRealizado('Clima'), null)

definirPerfil('socio')
definirObraAtual(OBRA_CJF)
conferir('CJF só vê o compromisso dela', (await listarCompromissos()).data.map((c) => c.id), ['cc1'])
definirObraAtual(OBRA_AP302)
conferir('não realizado sem causa é recusado na gravação', (await moverAtividade({ servico_id: 's5', semana: '2026-11-04', status: 'nao_realizado' })).erro, 'Escolha a causa: por que não foi feito?')
const movida2 = (await moverAtividade({ servico_id: 's5', semana: '2026-11-04', status: 'nao_realizado', causa: 'Mão de obra' })).data
conferir('grava na segunda-feira da semana e reaproveita o compromisso', [movida2.id, movida2.semana, movida2.causa], ['cp6', '2026-11-02', 'Mão de obra'])
conferir('sair de não realizado apaga a causa', (await moverAtividade({ servico_id: 's5', semana: '2026-11-02', status: 'em_andamento', causa: 'Clima' })).data.causa, null)
conferir('serviço de outra obra é recusado', (await moverAtividade({ servico_id: 'c2', semana: '2026-11-02', status: 'concluido' })).erro, 'Este serviço não é desta obra.')
conferir('subtarefa não feita exige causa', (await marcarSubatividade('sa5', { nao_realizada: true })).erro, 'Escolha a causa: por que não foi feito?')
conferir('subtarefa não feita com causa', (await marcarSubatividade('sa5', { nao_realizada: true, causa: 'Material' })).data.causa, 'Material')
conferir('marcar feita limpa o não feito', (await marcarSubatividade('sa5', { concluida: true })).data, { ...(await listarSubatividades()).data.find((x) => x.id === 'sa5'), concluida: true, nao_realizada: false, causa: null })
await marcarSubatividade('sa5', {})

console.log(`${ok}/${tot} — planejamento`)
process.exit(ok === tot ? 0 : 1)
