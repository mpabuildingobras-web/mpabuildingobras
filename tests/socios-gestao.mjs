// Módulos só de sócios: tarefas, conflito de prestador, gestão, ficha da obra e usuários.
import { conflitosDoServico, detectarConflitos, diasCorridos, segundaDaSemana } from '../src/lib/conflitos.js'
import {
  buscarBaseGestao, buscarDiario, comentarCotacao, criarTarefa, definirObraAtual, definirPerfil, definirPrestadorDoServico,
  enviarDiario, listarContratados, listarCotacoes, listarObras, listarTarefas, listarTarefasDeTodasAsObras, listarUsuarios, salvarDiario, salvarObra, salvarUsuario,
} from '../src/lib/dados.js'
import { calcularGestao, montarAlocacoes } from '../src/lib/gestao.js'
import { menuDoUsuario, podeAbrir, telaInicial, telasConfiguraveis } from '../src/lib/menus.js'
import { HOJE, obras, usuarios } from '../src/lib/mockData.js'
import { conferirObra } from '../src/lib/obras.js'
import { agruparTarefas, conferirTarefa, estaAtrasada } from '../src/lib/tarefas.js'
import { conferirUsuario } from '../src/lib/usuarios.js'

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

// ---------- Conflito de prestador ----------
const aloc = (id, obra, p, inicio, termino, concluido = false) =>
  ({ servico_id: id, servico: id, obra_id: obra, obra_codigo: obra, prestador_id: p, prestador: p, inicio, termino, concluido })

const entre = detectarConflitos([aloc('a', 'A', 'r', '2026-11-03', '2026-11-09'), aloc('b', 'B', 'r', '2026-11-05', '2026-11-20')], HOJE)
conferir('mesmo prestador em duas obras nas mesmas datas é conflito', entre[0].tipo, 'Entre obras')
conferir('conflito diz os dias, sem fim de semana', entre[0].dias, ['2026-11-05', '2026-11-06', '2026-11-09'])
conferir('na mesma obra é só atenção',
  detectarConflitos([aloc('a', 'A', 'r', '2026-11-03', '2026-11-05'), aloc('b', 'A', 'r', '2026-11-04', '2026-11-05')], HOJE)[0].tipo, 'Mesma obra')
conferir('datas que não se cruzam não dão conflito',
  detectarConflitos([aloc('a', 'A', 'r', '2026-11-03', '2026-11-05'), aloc('b', 'B', 'r', '2026-11-06', '2026-11-10')], HOJE).length, 0)
conferir('prestadores diferentes não dão conflito',
  detectarConflitos([aloc('a', 'A', 'r', '2026-11-03', '2026-11-05'), aloc('b', 'B', 's', '2026-11-03', '2026-11-05')], HOJE).length, 0)
conferir('serviço concluído não dá conflito',
  detectarConflitos([aloc('a', 'A', 'r', '2026-11-03', '2026-11-05', true), aloc('b', 'B', 'r', '2026-11-03', '2026-11-05')], HOJE).length, 0)
conferir('cruzamento só no passado não dá conflito',
  detectarConflitos([aloc('a', 'A', 'r', '2026-10-01', '2026-10-10'), aloc('b', 'B', 'r', '2026-10-05', '2026-10-20')], HOJE).length, 0)
conferir('cruzamento só no fim de semana não dá conflito',
  detectarConflitos([aloc('a', 'A', 'r', '2026-11-03', '2026-11-07'), aloc('b', 'B', 'r', '2026-11-07', '2026-11-08')], HOJE).length, 0)
conferir('acha os conflitos de um serviço', conflitosDoServico(entre, 'b').length, 1)
conferir('semana começa na segunda', segundaDaSemana('2026-11-08'), '2026-11-02')
conferir('janela de dias corridos', diasCorridos('2026-11-30', 2), ['2026-11-30', '2026-12-01'])

// ---------- Tarefas ----------
conferir('tarefa vencida e aberta está atrasada', estaAtrasada({ status: 'Pendente', prazo: '2026-11-01' }, HOJE), true)
conferir('tarefa concluída nunca está atrasada', estaAtrasada({ status: 'Concluída', prazo: '2026-11-01' }, HOJE), false)
conferir('tarefa sem título não passa', Object.keys(conferirTarefa({ titulo: '', obra_id: 'x', prazo: HOJE, responsavel: 'y' }).erros), ['titulo'])
conferir('concluídas vão para o último grupo', agruparTarefas([
  { status: 'Concluída', prazo: '2026-01-01' }, { status: 'Pendente', prazo: '2026-12-01' },
]).map((g) => g.chave), ['2026-12-01', 'Concluídas'])

definirPerfil('socio')
definirObraAtual('obra-cjf')
const daCjf = (await listarTarefas()).data
conferir('tarefas da obra selecionada são só dela', daCjf.length > 0 && daCjf.every((t) => t.obra_id === 'obra-cjf'), true)
conferir('"todas as obras" traz as duas e diz de qual é', new Set((await listarTarefasDeTodasAsObras()).data.map((t) => t.obra_codigo)).size, 2)
await criarTarefa({ titulo: 'Conferir telhado', prazo: HOJE, responsavel: 'Ana Exemplo', prioridade: 'Alta', obra_id: 'obra-cjf' })
conferir('tarefa nova aparece na obra', (await listarTarefas()).data.some((t) => t.titulo === 'Conferir telhado'), true)

// ---------- Gestão: AP302 e CJF têm o Rafael nas mesmas datas ----------
const contratados = (await listarContratados()).data
const base = (await buscarBaseGestao()).data
const g = calcularGestao(base, contratados, HOJE)
const rafael = g.conflitos.find((c) => c.prestador === 'Rafael' && c.tipo === 'Entre obras')
conferir('uma linha por obra', g.obras.length, 2)
conferir('Rafael em duas obras gera alerta', !!rafael, true)
conferir('alerta vale de hoje até o fim do forro', [rafael?.de, rafael?.ate], [HOJE, '2026-11-09'])
conferir('AP302 aparece atrasada', g.obras.find((o) => o.codigo === 'AP302').saude, 'Atrasada')
conferir('CJF aparece no prazo', g.obras.find((o) => o.codigo === 'CJF').saude, 'No prazo')
conferir('alocações trazem a obra', montarAlocacoes(base, contratados, HOJE).every((a) => a.obra_codigo), true)
conferir('não troca prestador de serviço de outra obra', (await definirPrestadorDoServico('s9', 'f1')).erro !== null, true)

// ---------- Só sócio chega nisso ----------
for (const perfil of ['auxiliar', 'cliente', null]) {
  definirPerfil(perfil)
  conferir(`${perfil} não recebe a base de gestão`, (await buscarBaseGestao()).data, [])
  conferir(`${perfil} não recebe tarefas`, (await listarTarefas()).data, [])
  conferir(`${perfil} não recebe tarefas de todas as obras`, (await listarTarefasDeTodasAsObras()).data, [])
  conferir(`${perfil} não recebe usuários`, (await listarUsuarios()).data, [])
}
definirPerfil('cliente')
conferir('cliente não recebe a lista de contratados', (await listarContratados()).data, [])

// ---------- Diário: nome do prestador e o que fez ----------
definirObraAtual('obra-ap302')
definirPerfil('cliente')
const aprovado = (await buscarDiario('d09')).data
conferir('cliente lê o nome do prestador no diário aprovado', aprovado.equipe[0].nome, 'Carlos')
conferir('cliente lê o que o prestador fez', aprovado.equipe[0].atividade, 'Prumadas do banheiro social')
conferir('cliente não lê diário ainda não aprovado', (await buscarDiario('d12')).data, null)

// Diário: quem pode mexer. d09 está aprovado; d12, enviado.
conferir('cliente não envia diário', (await enviarDiario('d12')).erro !== null, true)
conferir('cliente não altera equipe do diário', (await salvarDiario({ id: 'd12', data: HOJE })).erro !== null, true)
definirPerfil('auxiliar')
conferir('auxiliar não altera diário aprovado', (await salvarDiario({ id: 'd09', data: '2026-10-28' })).erro !== null, true)
conferir('auxiliar não reenvia diário aprovado', (await enviarDiario('d09')).erro !== null, true)
conferir('auxiliar altera diário ainda não aprovado', (await salvarDiario({ id: 'd12', data: HOJE, equipe: ['f2'], atividades: { f2: 'Teste' } })).erro, null)
definirPerfil('cliente')

// ---------- Compras: o cliente comenta para aprovar ----------
await comentarCotacao('q1', 'Cláudia Cliente', 'Aprovo o fornecedor B.')
conferir('cliente comenta numa cotação aguardando',
  (await listarCotacoes()).data.find((q) => q.id === 'q1').comentarios.at(-1)[2], 'Aprovo o fornecedor B.')
conferir('cliente não comenta em cotação já comprada', (await comentarCotacao('q4', 'Cláudia', 'oi')).erro !== null, true)
definirPerfil('auxiliar')
conferir('auxiliar não comenta', (await comentarCotacao('q1', 'Rita', 'oi')).erro !== null, true)
definirObraAtual('obra-cjf')
definirPerfil('socio')
conferir('não comenta em cotação de outra obra', (await comentarCotacao('q1', 'Ana', 'oi')).erro !== null, true)

// ---------- Usuários: o perfil é o teto ----------
const novo = { nome: 'Pedro Silva', email: 'pedro@exemplo.com', role: 'auxiliar', obras: ['obra-cjf'] }
conferir('usuário completo passa', conferirUsuario(novo, usuarios).ok, true)
conferir('e-mail repetido não passa', conferirUsuario({ ...novo, email: 'ANA@exemplo.com' }, usuarios).erros.email, 'Já existe um usuário com este e-mail.')
conferir('auxiliar precisa de obra', Object.keys(conferirUsuario({ ...novo, obras: [] }, usuarios).erros), ['obras'])
conferir('sócio não precisa de obra', conferirUsuario({ ...novo, role: 'socio', obras: [] }, usuarios).ok, true)
conferir('o último sócio não perde o perfil', conferirUsuario({ id: 'u1', nome: 'Ana', email: 'a@b.com', role: 'cliente', obras: ['x'] },
  [{ id: 'u1', email: 'a@b.com', role: 'socio' }]).erros.role, 'O app precisa de pelo menos um sócio.')
const salvo = (await salvarUsuario({ ...novo, telas_bloqueadas: ['meusDiarios'] })).data
conferir('usuário novo vê só as obras marcadas', (await listarObras('auxiliar', salvo.id)).data.map((o) => o.codigo), ['CJF'])

conferir('bloquear tira a tela do menu', menuDoUsuario('socio', ['financeiro']).mais.includes('financeiro'), false)
conferir('tela bloqueada não abre', podeAbrir('socio', 'financeiro', ['financeiro']), false)
conferir('bloqueio não dá acesso além do perfil', podeAbrir('cliente', 'faturamento', []), false)
conferir('bloqueada a tela inicial, abre a próxima', telaInicial('auxiliar', ['hoje']), 'meusDiarios')
conferir('subtela segue a tela de origem', podeAbrir('auxiliar', 'diarioDia', ['hoje', 'meusDiarios']), false)
conferir('"Meu perfil" não pode ser bloqueado (é onde se sai)', telasConfiguraveis('auxiliar').includes('perfil'), false)
conferir('cliente não tem Gestão para marcar', telasConfiguraveis('cliente').includes('gestao'), false)

// ---------- Ficha da obra ----------
const obraNova = { nome: 'Reforma Teste', codigo: 'TST', cliente_nome: 'Fulano', data_inicio: '2026-12-01', data_entrega: '2027-01-15', situacao: 'Em andamento' }
conferir('obra completa passa', conferirObra(obraNova, obras).ok, true)
conferir('código repetido não passa', Object.keys(conferirObra({ ...obraNova, codigo: 'ap302' }, obras).erros), ['codigo'])
conferir('entrega antes do início não passa', Object.keys(conferirObra({ ...obraNova, data_entrega: '2026-11-01' }, obras).erros), ['data_entrega'])
definirPerfil('auxiliar')
conferir('auxiliar não edita obra', (await salvarObra(obraNova)).erro !== null, true)
definirPerfil('socio')
const criada = (await salvarObra(obraNova)).data
conferir('obra nova aparece para o sócio', (await listarObras('socio')).data.some((o) => o.id === criada.id), true)
conferir('obra nova não aparece para a cliente de outra obra', (await listarObras('cliente', 'u4')).data.some((o) => o.id === criada.id), false)
await salvarObra({ ...criada, descricao: 'Texto novo' })
conferir('editar grava na mesma obra', (await listarObras('socio')).data.find((o) => o.id === criada.id).descricao, 'Texto novo')

console.log(`${ok}/${tot} — sócios e gestão`)
process.exit(ok === tot ? 0 : 1)
