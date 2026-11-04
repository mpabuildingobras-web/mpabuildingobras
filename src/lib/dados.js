// CAMADA DE DADOS: única porta de entrada dos dados. Hoje lê o mock; na Etapa 7 o miolo
// vira Supabase e nenhuma tela muda.
//
// MULTI-OBRA: as telas não passam obra_id. A obra atual é definida aqui pelo contexto
// (definirObraAtual) e toda lista de lançamento sai recortada por ela.
// PERFIL: o recorte por perfil imita o que a RLS vai fazer no banco (auxiliar não recebe
// valor nenhum; cliente só recebe o aprovado e nunca custo).
import { conferirLogin } from './acesso.js'
import { conferirCusto, conferirDiario, conferirServico, impedimentoParaExcluir, lerNumero, proximoNumeroItem } from './lancamentos.js'
import * as mock from './mockData.js'
import { conferirObra, somenteDaObra } from './obras.js'
import { conferirTarefa } from './tarefas.js'
import { conferirUsuario } from './usuarios.js'

let obraAtual = null
let perfilAtual = null
let proximoId = 1
const novoId = (prefixo) => `${prefixo}-novo-${proximoId++}`

export function definirObraAtual(obraId) { obraAtual = obraId }
export function definirPerfil(perfil) { perfilAtual = perfil }

// Mesmo formato que o Supabase vai devolver depois: { data, erro }.
const resposta = (data) => Promise.resolve({ data, erro: null })
const recusa = (erro) => Promise.resolve({ data: null, erro })
const daObra = (lista) => somenteDaObra(lista, obraAtual)
const ehSocio = () => perfilAtual === 'socio'
const ehCliente = () => perfilAtual === 'cliente'

// ---------- Entrada ----------
const semSenha = ({ senha_teste: _, ...u }) => u

export function entrar({ email, senha, porta }) {
  const r = conferirLogin({ email, senha, porta }, mock.usuarios)
  return r.ok ? resposta(semSenha(r.usuario)) : recusa(r.erro)
}

// Primeiro acesso do cliente: a conta nasce pendente, sem obra, até um sócio liberar.
export function cadastrarCliente({ nome, email, documento, tipoPessoa, senha }) {
  if (mock.usuarios.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return recusa('Já existe uma conta com este e-mail. Use "Já sou cadastrado".')
  }
  const u = { id: novoId('u'), nome: nome.trim(), email: email.trim(), role: 'pendente', tipo_pessoa: tipoPessoa, documento, telas_bloqueadas: [], senha_teste: senha }
  mock.usuarios.push(u)
  return resposta(semSenha(u))
}

// ---------- Obras ----------
export function listarObras(perfil, usuarioId) {
  if (perfil === 'socio') return resposta([...mock.obras])
  const minhas = mock.membros.filter((m) => m.usuario_id === usuarioId).map((m) => m.obra_id)
  return resposta(mock.obras.filter((o) => minhas.includes(o.id)))
}

export function buscarObraAtual() {
  return resposta(mock.obras.find((o) => o.id === obraAtual) ?? null)
}

export function salvarObra(dados) {
  if (!ehSocio()) return recusa('Só sócio edita obra.')
  const r = conferirObra(dados, mock.obras)
  if (!r.ok) return Promise.resolve({ data: null, erro: 'Confira os campos.', erros: r.erros })
  const existente = mock.obras.find((o) => o.id === dados.id)
  if (existente) { Object.assign(existente, dados); return resposta(existente) }
  const nova = { documentos: [], foto: null, ...dados, id: novoId('obra') }
  mock.obras.push(nova)
  return resposta(nova)
}

// ---------- Serviços, diários e execuções ----------
export function listarServicos() {
  return resposta(daObra(mock.servicos))
}

const diariosVisiveis = () => daObra(mock.diarios).filter((d) => !ehCliente() || d.status === 'Aprovado')

export function listarDiarios() {
  const lista = diariosVisiveis().map((d) => ({
    ...d,
    qtd_servicos: mock.execucoes.filter((e) => e.diario_id === d.id).length,
    qtd_fotos: mock.fotos.filter((f) => f.diario_id === d.id).length,
  }))
  return resposta(lista.sort((a, b) => b.data.localeCompare(a.data)))
}

export function listarExecucoes() {
  const visiveis = new Set(diariosVisiveis().map((d) => d.id))
  return resposta(mock.execucoesComStatus().filter((e) => visiveis.has(e.diario_id)))
}

// Tudo o que a cascata precisa, de uma vez (no banco: três consultas filtradas pela obra).
export async function carregarCronograma() {
  const [{ data: obra }, { data: servicos }, { data: execucoes }] =
    await Promise.all([buscarObraAtual(), listarServicos(), listarExecucoes()])
  return { data: { obra, servicos: servicos.filter((s) => s.tipo === 'Normal'), execucoes }, erro: null }
}

export function buscarDiario(id) {
  const d = diariosVisiveis().find((x) => x.id === id)
  if (!d) return resposta(null)
  const pessoa = (cid) => mock.contratados.find((c) => c.id === cid)
  return resposta({
    ...d,
    // Nome de cada prestador e o que fez no dia: aparece para quem lê o diário, inclusive o cliente.
    equipe: (d.equipe ?? []).map((cid) => ({ id: cid, nome: pessoa(cid)?.nome ?? cid, funcao: pessoa(cid)?.funcao ?? '', atividade: d.atividades?.[cid] ?? '' })),
    execucoes: mock.execucoes.filter((e) => e.diario_id === id).map((e) => {
      const s = mock.servicos.find((x) => x.id === e.servico_id)
      return { ...e, servico: s.nome, frente: s.frente, unidade: s.unidade, forma: s.forma, prestador: pessoa(s.responsavel_id)?.nome ?? '' }
    }),
    fotos: mock.fotos.filter((f) => f.diario_id === id),
  })
}

export function buscarDiarioDoDia(data) {
  const d = daObra(mock.diarios).find((x) => x.data === data)
  return d ? buscarDiario(d.id) : resposta(null)
}

// Mudam o mock em memória; na Etapa 7 viram update no banco.
function mudarStatus(id, status, extra = {}) {
  const d = daObra(mock.diarios).find((x) => x.id === id)
  if (!d) return recusa('Diário não encontrado nesta obra.')
  Object.assign(d, { status, ...extra })
  return resposta(d)
}
// Auxiliar só mexe até a aprovação; depois disso, só sócio.
const podeMexerNoDiario = (id) => {
  if (ehSocio()) return true
  if (perfilAtual !== 'auxiliar') return false
  return daObra(mock.diarios).find((x) => x.id === id)?.status !== 'Aprovado'
}
export const enviarDiario = (id) => (podeMexerNoDiario(id) ? mudarStatus(id, 'Enviado', { comentario_devolucao: null }) : recusa('Sem permissão para enviar este diário.'))
export const aprovarDiario = (id) => (ehSocio() ? mudarStatus(id, 'Aprovado') : recusa('Só sócio aprova.'))
export function devolverDiario(id, comentario) {
  if (!ehSocio()) return recusa('Só sócio devolve.')
  if (!comentario || !comentario.trim()) return recusa('Escreva o motivo da devolução.')
  return mudarStatus(id, 'Devolvido', { comentario_devolucao: comentario.trim() })
}

// Grava o diário inteiro: clima, equipe, o que cada um fez, ocorrências e as quantidades lançadas.
// Cria o diário se ainda não existir nesse dia nesta obra. O status não muda aqui.
export function salvarDiario({ id, data, clima_manha, clima_tarde, ocorrencias, equipe = [], atividades = {}, lancamentos = [] }) {
  if (!ehSocio() && perfilAtual !== 'auxiliar') return recusa('Cliente só visualiza o diário.')
  if (!obraAtual) return recusa('Escolha uma obra antes de lançar o diário.')
  let d = daObra(mock.diarios).find((x) => (id ? x.id === id : x.data === data))
  if (d && !podeMexerNoDiario(d.id)) return recusa('Sem permissão para alterar este diário.')
  const r = conferirDiario({ data, lancamentos, diarioId: d?.id ?? null }, daObra(mock.servicos).filter((s) => s.tipo === 'Normal'), mock.execucoesComStatus())
  if (!r.ok) return Promise.resolve({ data: null, erro: 'Confira os campos.', erros: r.erros })
  if (!d) {
    d = { id: novoId('d'), obra_id: obraAtual, data, status: 'Rascunho' }
    mock.diarios.push(d)
  }
  Object.assign(d, { clima_manha, clima_tarde, ocorrencias, equipe, atividades, qtd_pessoas: equipe.length })
  for (let i = mock.execucoes.length - 1; i >= 0; i--) {
    if (mock.execucoes[i].diario_id === d.id) mock.execucoes.splice(i, 1)
  }
  r.lancamentos.forEach((l) => mock.execucoes.push({ ...l, diario_id: d.id }))
  return resposta(d)
}

// ---------- Cronograma: cadastro de serviços (só sócios) ----------
function gravarValor(lista, campo, servicoId, valor) {
  const i = lista.findIndex((v) => v.servico_id === servicoId)
  if (valor === null) { if (i >= 0) lista.splice(i, 1); return }
  if (i >= 0) lista[i][campo] = valor
  else lista.push({ obra_id: obraAtual, servico_id: servicoId, [campo]: valor })
}

export function salvarServico(dados) {
  if (!ehSocio()) return recusa('Só sócio cadastra serviços.')
  if (!obraAtual) return recusa('Escolha uma obra antes de cadastrar serviços.')
  const daObraAtual = daObra(mock.servicos)
  const normais = daObraAtual.filter((s) => s.tipo === 'Normal')
  const r = conferirServico(dados, normais)
  if (!r.ok) return Promise.resolve({ data: null, erro: 'Confira os campos.', erros: r.erros })
  const frente = dados.frente.trim()
  const campos = {
    nome: dados.nome.trim(), frente, unidade: dados.unidade, prevista: r.prevista, forma: r.forma, duracao: r.duracao,
    deps: dados.deps ?? [], responsavel_id: dados.responsavel_id || null, obs: (dados.obs ?? '').trim() || undefined,
  }
  let s = daObraAtual.find((x) => x.id === dados.id)
  if (s) {
    if (s.frente !== frente) campos.numero_item = proximoNumeroItem(daObraAtual.filter((x) => x.id !== s.id), frente)
    Object.assign(s, campos)
  } else {
    s = { ...campos, id: novoId('s'), obra_id: obraAtual, tipo: 'Normal', numero_item: proximoNumeroItem(daObraAtual, frente) }
    mock.servicos.push(s)
  }
  // Campo vazio tira o valor; campo que nem veio deixa como está.
  if ('valor' in dados) gravarValor(mock.servicosValores, 'valor_cliente', s.id, lerNumero(dados.valor))
  if ('custo_mo' in dados) gravarValor(mock.servicosCustos, 'custo_mo', s.id, lerNumero(dados.custo_mo))
  if (lerNumero(dados.valor) !== null && !daObra(mock.orcamentos)[0]) {
    mock.orcamentos.push({ obra_id: obraAtual, titulo: 'Orçamento da obra', importado_em: null })
  }
  return resposta(s)
}

export function excluirServico(id) {
  if (!ehSocio()) return recusa('Só sócio exclui serviços.')
  const s = daObra(mock.servicos).find((x) => x.id === id)
  if (!s) return recusa('Serviço não encontrado nesta obra.')
  const impedimento = impedimentoParaExcluir(s, daObra(mock.servicos), mock.execucoesComStatus())
  if (impedimento) return recusa(impedimento)
  mock.servicos.splice(mock.servicos.indexOf(s), 1)
  gravarValor(mock.servicosValores, 'valor_cliente', id, null)
  gravarValor(mock.servicosCustos, 'custo_mo', id, null)
  return resposta(true)
}

// ---------- Contratados (a equipe circula entre obras: sem obra_id) ----------
// O cliente não recebe a lista: vê só os nomes dentro do diário aprovado.
export function listarContratados() {
  return resposta(ehCliente() ? [] : mock.contratados.filter((c) => c.ativo !== false))
}

export function salvarContratado(dados) {
  if (!ehSocio()) return recusa('Só sócio cadastra contratados.')
  if (!dados.nome || dados.nome.trim().length < 2) return recusa('Digite o nome.')
  const existente = mock.contratados.find((c) => c.id === dados.id)
  if (existente) { Object.assign(existente, dados); return resposta(existente) }
  const novo = { ...dados, nome: dados.nome.trim(), id: novoId('c') }
  mock.contratados.push(novo)
  return resposta(novo)
}

export function definirPrestadorDoServico(servicoId, contratadoId) {
  if (!ehSocio()) return recusa('Só sócio escolhe o prestador.')
  const s = daObra(mock.servicos).find((x) => x.id === servicoId)
  if (!s) return recusa('Serviço não encontrado nesta obra.')
  s.responsavel_id = contratadoId || null
  return resposta(s)
}

// ---------- Tarefas (só sócios) ----------
export function listarTarefas() {
  return resposta(ehSocio() ? daObra(mock.tarefas) : [])
}

// Comparativo explícito: a pessoa pediu para ver todas as obras, e cada tarefa diz de qual é.
export function listarTarefasDeTodasAsObras() {
  if (!ehSocio()) return resposta([])
  return resposta(mock.tarefas.map((t) => ({ ...t, obra_codigo: mock.obras.find((o) => o.id === t.obra_id)?.codigo ?? '' })))
}

export function criarTarefa(dados) {
  if (!ehSocio()) return recusa('Só sócio cria tarefa.')
  const r = conferirTarefa(dados)
  if (!r.ok) return Promise.resolve({ data: null, erro: 'Confira os campos.', erros: r.erros })
  const nova = { status: 'Pendente', prioridade: 'Média', ...dados, titulo: dados.titulo.trim(), id: novoId('t') }
  mock.tarefas.push(nova)
  return resposta(nova)
}

export function mudarStatusTarefa(id, status) {
  if (!ehSocio()) return recusa('Só sócio altera tarefa.')
  const t = mock.tarefas.find((x) => x.id === id)
  if (!t) return recusa('Tarefa não encontrada.')
  t.status = status
  return resposta(t)
}

// ---------- Fotos ----------
export function listarFotos() {
  const visiveis = diariosVisiveis()
  const lista = mock.fotos
    .filter((f) => visiveis.some((d) => d.id === f.diario_id))
    .map((f) => ({
      ...f,
      data: visiveis.find((d) => d.id === f.diario_id).data,
      servico: mock.servicos.find((s) => s.id === f.servico_id)?.nome ?? '',
    }))
  return resposta(lista.sort((a, b) => b.data.localeCompare(a.data)))
}

// ---------- Dinheiro ----------
export function buscarOrcamento() {
  if (perfilAtual === 'auxiliar') return resposta(null)
  const cab = daObra(mock.orcamentos)[0]
  if (!cab) return resposta(null)
  const itens = mock.itensDoOrcamento(obraAtual).map((i) => (ehSocio() ? i : { ...i, custo_mo: undefined }))
  return resposta({ ...cab, itens })
}

export function listarMedicoes() {
  if (perfilAtual === 'auxiliar') return resposta([])
  const lista = daObra(mock.medicoes).filter((m) => !ehCliente() || m.status !== 'Rascunho')
  return resposta([...lista].sort((a, b) => b.numero - a.numero))
}

export function listarCotacoes() {
  if (perfilAtual === 'auxiliar') return resposta([])
  return resposta(daObra(mock.cotacoes).filter((q) => !ehCliente() || q.status !== 'Em cotação'))
}

// O comentário é o registro da aprovação do cliente: ninguém edita nem apaga depois.
export function comentarCotacao(id, autor, texto) {
  if (perfilAtual !== 'socio' && perfilAtual !== 'cliente') return recusa('Sem permissão para comentar.')
  const q = daObra(mock.cotacoes).find((x) => x.id === id)
  if (!q) return recusa('Cotação não encontrada nesta obra.')
  if (ehCliente() && q.status !== 'Aguardando cliente' && q.status !== 'Escolhido') return recusa('Esta cotação não está aberta para comentário.')
  if (!texto || !texto.trim()) return recusa('Escreva o comentário.')
  q.comentarios.push([autor, mock.HOJE.slice(8, 10) + '/' + mock.HOJE.slice(5, 7), texto.trim()])
  return resposta(q)
}

export function listarCustos() {
  return resposta(ehSocio() ? [...daObra(mock.custos)].sort((a, b) => b.data.localeCompare(a.data)) : [])
}

export function salvarCusto(dados) {
  if (!ehSocio()) return recusa('Só sócio lança custo.')
  if (!obraAtual) return recusa('Escolha uma obra antes de lançar custo.')
  const r = conferirCusto(dados)
  if (!r.ok) return Promise.resolve({ data: null, erro: 'Confira os campos.', erros: r.erros })
  const campos = { data: dados.data, descricao: dados.descricao.trim(), categoria: dados.categoria, valor: r.valor, pago: !!dados.pago }
  const existente = daObra(mock.custos).find((k) => k.id === dados.id)
  if (existente) { Object.assign(existente, campos); return resposta(existente) }
  const novo = { ...campos, id: novoId('k'), obra_id: obraAtual }
  mock.custos.push(novo)
  return resposta(novo)
}

export function excluirCusto(id) {
  if (!ehSocio()) return recusa('Só sócio exclui custo.')
  const k = daObra(mock.custos).find((x) => x.id === id)
  if (!k) return recusa('Custo não encontrado nesta obra.')
  mock.custos.splice(mock.custos.indexOf(k), 1)
  return resposta(true)
}

// ---------- Consultas que juntam obras: só sócio ----------
// Uma entrada por obra, de uma vez: no banco viram funções agregadas, nunca um laço obra a obra.
export function buscarBaseFaturamento() {
  if (!ehSocio()) return resposta([])
  const execucoes = mock.execucoesComStatus()
  return resposta(mock.obras.map((obra) => ({
    obra,
    itens: mock.itensDoOrcamento(obra.id),
    servicos: mock.servicos.filter((s) => s.obra_id === obra.id && s.tipo === 'Normal'),
    execucoes: execucoes.filter((e) => e.obra_id === obra.id),
    medicoes: mock.medicoes.filter((m) => m.obra_id === obra.id),
    custos: mock.custos.filter((k) => k.obra_id === obra.id),
  })))
}

export function buscarBaseGestao() {
  if (!ehSocio()) return resposta([])
  const execucoes = mock.execucoesComStatus()
  return resposta(mock.obras.map((obra) => ({
    obra,
    servicos: mock.servicos.filter((s) => s.obra_id === obra.id && s.tipo === 'Normal'),
    execucoes: execucoes.filter((e) => e.obra_id === obra.id),
    diarios: mock.diarios.filter((d) => d.obra_id === obra.id),
    tarefas: mock.tarefas.filter((t) => t.obra_id === obra.id),
    cotacoes: mock.cotacoes.filter((q) => q.obra_id === obra.id),
  })))
}

// ---------- Usuários (só sócios) ----------
export function listarUsuarios() {
  if (!ehSocio()) return resposta([])
  return resposta(mock.usuarios.map((u) => ({
    ...semSenha(u),
    obras: mock.membros.filter((m) => m.usuario_id === u.id).map((m) => m.obra_id),
  })))
}

export function salvarUsuario({ obras = [], ...dados }) {
  if (!ehSocio()) return recusa('Só sócio cadastra usuários.')
  const r = conferirUsuario({ ...dados, obras }, mock.usuarios)
  if (!r.ok) return Promise.resolve({ data: null, erro: 'Confira os campos.', erros: r.erros })
  let u = mock.usuarios.find((x) => x.id === dados.id)
  if (u) Object.assign(u, dados)
  else {
    // Senha de teste até a Etapa 7; depois o usuário recebe um convite por e-mail.
    u = { telas_bloqueadas: [], senha_teste: 'obra1234', ...dados, id: novoId('u') }
    mock.usuarios.push(u)
  }
  for (let i = mock.membros.length - 1; i >= 0; i--) {
    if (mock.membros[i].usuario_id === u.id) mock.membros.splice(i, 1)
  }
  if (u.role !== 'socio') obras.forEach((obra_id) => mock.membros.push({ obra_id, usuario_id: u.id, papel: u.role }))
  return resposta(semSenha(u))
}
