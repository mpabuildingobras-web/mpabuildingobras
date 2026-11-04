// CAMADA DE DADOS: única porta de entrada dos dados. Hoje lê o mock; na Etapa 7 o miolo
// vira Supabase e nenhuma tela muda.
//
// MULTI-OBRA: as telas não passam obra_id. A obra atual é definida aqui pelo contexto
// (definirObraAtual) e toda lista de lançamento sai recortada por ela.
// PERFIL: o recorte por perfil imita o que a RLS vai fazer no banco (auxiliar não recebe
// valor nenhum; cliente só recebe o aprovado e nunca custo).
import { conferirLogin } from './acesso.js'
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
export const enviarDiario = (id) => (podeMexerNoDiario(id) ? mudarStatus(id, 'Enviado') : recusa('Sem permissão para enviar este diário.'))
export const aprovarDiario = (id) => (ehSocio() ? mudarStatus(id, 'Aprovado') : recusa('Só sócio aprova.'))
export const devolverDiario = (id, comentario) => (ehSocio() ? mudarStatus(id, 'Devolvido', { comentario_devolucao: comentario }) : recusa('Só sócio devolve.'))

export function salvarEquipeDoDiario(id, equipe, atividades) {
  if (!podeMexerNoDiario(id)) return recusa('Sem permissão para alterar este diário.')
  const d = daObra(mock.diarios).find((x) => x.id === id)
  if (!d) return recusa('Diário não encontrado nesta obra.')
  Object.assign(d, { equipe, atividades, qtd_pessoas: equipe.length })
  return resposta(d)
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
  return resposta(ehSocio() ? daObra(mock.custos) : [])
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
