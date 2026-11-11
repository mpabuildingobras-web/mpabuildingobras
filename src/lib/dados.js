// CAMADA DE DADOS: única porta de entrada dos dados. As telas importam só daqui, e só este
// arquivo chama supabase.from(...).
//
// Hoje o banco (Supabase) cuida de OBRAS e do DIÁRIO (diários, equipe do dia, lançamentos e fotos).
// O resto (serviços, contratados, tarefas, dinheiro, usuários e login) ainda vem dos dados de
// exemplo em dadosMock.js, até a vez de cada módulo. As duas obras de exemplo têm o mesmo id
// no mock e no banco (OBRA_AP302, OBRA_CJF), por isso as duas metades conversam.
//
// MULTI-OBRA: as telas não passam obra_id; toda consulta daqui filtra pela obra atual.
// Sem obra escolhida, as listas voltam vazias, nunca com tudo.
// RESPOSTA: sempre { data, erro } (erro em português). O Supabase devolve { data, error } e
// não estoura exceção: todo resultado é conferido aqui.
import { servicosDaCadeia } from './cronograma.js'
import * as mockApi from './dadosMock.js'
import { STATUS_DIARIO, pessoaNoDiario, pessoasDoDia, podeEditarDiario, problemaParaEnviar } from './diario.js'
import { horaBR } from './formato.js'
import { conferirDiario, medeEmPercentual } from './lancamentos.js'
import * as mock from './mockData.js'
import { conferirObra } from './obras.js'
import { supabase } from './supabase.js'

export * from './dadosMock.js'

// true = Obras e Diário voltam a ler os dados de exemplo (sem internet). false = banco.
export const USAR_MOCK = false
// Sem .env.local o cliente do banco não existe: cada função recusa com aviso claro, em vez de travar.
const semBanco = () => Promise.resolve({ data: null, erro: 'O app não achou o banco: falta o arquivo .env.local com o endereço e a chave do Supabase.' })
const escolher = (doMock, doBanco) => (USAR_MOCK ? doMock : supabase ? doBanco : semBanco)

let obraAtual = null
let perfilAtual = null
let nomeAtual = null

// A metade de exemplo também precisa saber a obra e o perfil: avisamos as duas.
export function definirObraAtual(obraId) { obraAtual = obraId; mockApi.definirObraAtual(obraId) }
export function definirPerfil(perfil, nome = null) { perfilAtual = perfil; nomeAtual = nome; mockApi.definirPerfil(perfil) }

const resposta = (data) => ({ data, erro: null })
const recusa = (erro) => ({ data: null, erro })
const ehSocio = () => perfilAtual === 'socio'
const ehCliente = () => perfilAtual === 'cliente'
const visivel = (d) => !ehCliente() || d?.status === STATUS_DIARIO.aprovado

// O erro do banco em português, dizendo sempre se gravou ou não.
function traduzirErro(error) {
  const msg = error?.message ?? ''
  if (/fetch|network|Load failed/i.test(msg)) return 'Sem conexão com o banco: nada foi salvo. Confira a internet e tente de novo.'
  if (error?.code === 'P0001') return msg
  if (error?.code === '23514') return 'O banco recusou um valor fora da lista permitida. Nada foi salvo.'
  if (error?.code === '23505') return 'Já existe um registro igual (mesmo dia ou mesmo código). Nada foi salvo.'
  if (error?.code === '42501') return 'Sem permissão no banco para isso. Nada foi salvo.'
  return `O banco não aceitou: ${msg}`
}
const falha = (error) => recusa(traduzirErro(error))

// ---------- Obras ----------
// Dados pessoais do contratante (obras_clientes) só vão para sócio.
function consultaObras(perfil) {
  return perfil === 'socio'
    ? supabase.from('obras').select('id, codigo, nome, cliente_nome, endereco, data_inicio, data_entrega, situacao, descricao, informacoes, foto, documentos, obras_clientes(telefone, email, documento)')
    : supabase.from('obras').select('id, codigo, nome, cliente_nome, endereco, data_inicio, data_entrega, situacao, descricao, informacoes, foto, documentos')
}

function achatarObra({ obras_clientes: c, ...obra }) {
  const cli = Array.isArray(c) ? c[0] : c
  return { ...obra, cliente_telefone: cli?.telefone ?? '', cliente_email: cli?.email ?? '', cliente_documento: cli?.documento ?? '' }
}

export const listarObras = escolher(mockApi.listarObras, async (perfil, usuarioId) => {
  let consulta = consultaObras(perfil)
  // Quem é membro de qual obra ainda mora no mock (o login é de exemplo até o passo 10).
  if (perfil !== 'socio') consulta = consulta.in('id', mock.membros.filter((m) => m.usuario_id === usuarioId).map((m) => m.obra_id))
  const { data, error } = await consulta.order('codigo')
  if (error) return falha(error)
  return resposta(data.map(achatarObra))
})

export const buscarObraAtual = escolher(mockApi.buscarObraAtual, async () => {
  if (!obraAtual) return resposta(null)
  const { data, error } = await consultaObras(perfilAtual).eq('id', obraAtual).maybeSingle()
  if (error) return falha(error)
  return resposta(data ? achatarObra(data) : null)
})

export const salvarObra = escolher(mockApi.salvarObra, async (dados) => {
  if (!ehSocio()) return recusa('Só sócio edita obra.')
  const { data: existentes, erro } = await listarObras('socio')
  if (erro) return recusa(erro)
  const r = conferirObra(dados, existentes)
  if (!r.ok) return { data: null, erro: 'Confira os campos.', erros: r.erros }
  const vazio = (v) => (String(v ?? '').trim() || null)
  const linha = {
    codigo: dados.codigo.trim(), nome: dados.nome.trim(), cliente_nome: dados.cliente_nome.trim(), endereco: vazio(dados.endereco),
    data_inicio: dados.data_inicio, data_entrega: dados.data_entrega, situacao: dados.situacao,
    descricao: vazio(dados.descricao), informacoes: vazio(dados.informacoes), foto: dados.foto ?? null, documentos: dados.documentos ?? [],
  }
  const jaExiste = existentes.some((o) => o.id === dados.id)
  const { data: obra, error } = jaExiste
    ? await supabase.from('obras').update(linha).eq('id', dados.id).select('id').single()
    : await supabase.from('obras').insert(linha).select('id').single()
  if (error) return falha(error)
  const { error: erroCliente } = await supabase.from('obras_clientes').upsert(
    { obra_id: obra.id, telefone: vazio(dados.cliente_telefone), email: vazio(dados.cliente_email), documento: vazio(dados.cliente_documento) },
    { onConflict: 'obra_id' },
  )
  // A obra já foi gravada: a mensagem não pode dizer "nada foi salvo".
  if (erroCliente) return recusa(`A obra foi salva, mas os contatos do cliente não (${traduzirErro(erroCliente)}). Abra a ficha e salve de novo.`)
  return resposta({ ...dados, ...linha, id: obra.id })
})

// ---------- Diários ----------
export const listarDiarios = escolher(mockApi.listarDiarios, async () => {
  if (!obraAtual) return resposta([])
  let consulta = supabase.from('diarios')
    .select('id, obra_id, data, status, qtd_pessoas, comentario_devolucao, diarios_execucoes(count), fotos(count)')
    .eq('obra_id', obraAtual)
  if (ehCliente()) consulta = consulta.eq('status', STATUS_DIARIO.aprovado)
  const { data, error } = await consulta.order('data', { ascending: false })
  if (error) return falha(error)
  return resposta(data.map(({ diarios_execucoes: ex, fotos, ...d }) => ({
    ...d, qtd_servicos: ex?.[0]?.count ?? 0, qtd_fotos: fotos?.[0]?.count ?? 0,
  })))
})

// Lançamentos com a data e o status do diário. obraId null = todas as obras (só nas bases de sócio).
async function lerExecucoes(obraId) {
  let consulta = supabase.from('diarios_execucoes').select('obra_id, diario_id, servico_id, quantidade, qtd_pessoas, descricao, diarios(data, status)')
  if (obraId) consulta = consulta.eq('obra_id', obraId)
  const { data, error } = await consulta
  if (error) return falha(error)
  return resposta(data.map(({ diarios: d, ...e }) => ({
    ...e, quantidade: Number(e.quantidade), descricao: e.descricao ?? '', data: d.data, status: d.status,
  })))
}

export const listarExecucoes = escolher(mockApi.listarExecucoes, async () => {
  if (!obraAtual) return resposta([])
  const r = await lerExecucoes(obraAtual)
  return r.erro ? r : resposta(r.data.filter(visivel))
})

export const carregarCronograma = escolher(mockApi.carregarCronograma, async () => {
  const [o, s, e] = await Promise.all([buscarObraAtual(), mockApi.listarServicos(), listarExecucoes()])
  const erro = o.erro ?? s.erro ?? e.erro
  if (erro) return recusa(erro)
  return resposta({ obra: o.data, servicos: servicosDaCadeia(s.data), execucoes: e.data })
})

// Junta o que veio do banco com os nomes de serviço e de prestador, que ainda moram no mock.
function montarDiario({ diarios_equipe: equipe = [], diarios_execucoes: execucoes = [], fotos = [], ...d }) {
  const pessoa = (cid) => mock.contratados.find((c) => c.id === cid)
  return {
    ...d,
    enviado_as: horaBR(d.enviado_em),
    equipe: [...equipe].sort((a, b) => a.ordem - b.ordem)
      .map((p) => pessoaNoDiario(p.contratado_id, pessoa(p.contratado_id), p.atividade, perfilAtual)),
    execucoes: execucoes.map((e) => {
      const s = mock.servicos.find((x) => x.id === e.servico_id)
      return {
        ...e, diario_id: d.id, quantidade: Number(e.quantidade), descricao: e.descricao ?? '',
        servico: s?.nome ?? e.servico_id, frente: s?.frente ?? '', unidade: s?.unidade ?? '', forma: s?.forma,
        prestador: pessoa(s?.responsavel_id)?.nome ?? '',
      }
    }),
    fotos: fotos.map((f) => ({ ...f, diario_id: d.id })),
  }
}

export const buscarDiario = escolher(mockApi.buscarDiario, async (id) => {
  if (!obraAtual) return resposta(null)
  const { data, error } = await supabase.from('diarios')
    .select('id, obra_id, data, status, qtd_pessoas, clima_manha, clima_tarde, ocorrencias, comentario_devolucao, enviado_por, enviado_em, diarios_equipe(contratado_id, atividade, ordem), diarios_execucoes(servico_id, quantidade, qtd_pessoas, descricao), fotos(id, servico_id, url, legenda)')
    .eq('id', id).eq('obra_id', obraAtual).maybeSingle()
  if (error) return falha(error)
  return resposta(data && visivel(data) ? montarDiario(data) : null)
})

export const buscarDiarioDoDia = escolher(mockApi.buscarDiarioDoDia, async (data) => {
  if (!obraAtual) return resposta(null)
  const { data: achado, error } = await supabase.from('diarios').select('id').eq('obra_id', obraAtual).eq('data', data).maybeSingle()
  if (error) return falha(error)
  return achado ? buscarDiario(achado.id) : resposta(null)
})

async function lerCabecalho(id) {
  return supabase.from('diarios').select('id, status, qtd_pessoas').eq('id', id).eq('obra_id', obraAtual).maybeSingle()
}

// Só muda se o diário ainda estiver no status esperado: dois sócios aprovando juntos não se atropelam.
async function mudarStatus(id, statusEsperado, campos) {
  const { data, error } = await supabase.from('diarios').update(campos)
    .eq('id', id).eq('obra_id', obraAtual).eq('status', statusEsperado)
    .select('id, obra_id, data, status').maybeSingle()
  if (error) return falha(error)
  return data ? resposta(data) : recusa('O diário mudou enquanto você olhava. Recarregue a tela.')
}

export const enviarDiario = escolher(mockApi.enviarDiario, async (id) => {
  const { data: d, error } = await lerCabecalho(id)
  if (error) return falha(error)
  if (!d || !podeEditarDiario(perfilAtual, d.status)) return recusa('Sem permissão para enviar este diário.')
  const problema = problemaParaEnviar(d)
  if (problema) return recusa(problema)
  return mudarStatus(id, d.status, { status: STATUS_DIARIO.enviado, comentario_devolucao: null, enviado_em: new Date().toISOString(), enviado_por: nomeAtual })
})

export const aprovarDiario = escolher(mockApi.aprovarDiario, async (id) => {
  if (!ehSocio()) return recusa('Só sócio aprova.')
  const { data: d, error } = await lerCabecalho(id)
  if (error) return falha(error)
  if (d?.status !== STATUS_DIARIO.enviado) return recusa('Só dá para aprovar um diário enviado.')
  return mudarStatus(id, STATUS_DIARIO.enviado, { status: STATUS_DIARIO.aprovado, aprovado_em: new Date().toISOString() })
})

export const devolverDiario = escolher(mockApi.devolverDiario, async (id, comentario) => {
  if (!ehSocio()) return recusa('Só sócio devolve.')
  const { data: d, error } = await lerCabecalho(id)
  if (error) return falha(error)
  if (d?.status !== STATUS_DIARIO.enviado) return recusa('Só dá para devolver um diário enviado.')
  if (!comentario || !comentario.trim()) return recusa('Escreva o motivo da devolução.')
  return mudarStatus(id, STATUS_DIARIO.enviado, { status: STATUS_DIARIO.devolvido, comentario_devolucao: comentario.trim() })
})

// Grava o diário inteiro de uma vez (função salvar_diario no banco): cabeçalho, equipe e lançamentos.
// Cria o diário se ainda não existir nesse dia nesta obra. O status não muda aqui.
export const salvarDiario = escolher(mockApi.salvarDiario, async ({ id, data, clima_manha, clima_tarde, ocorrencias, equipe = [], atividades = {}, lancamentos = [] }) => {
  if (!ehSocio() && perfilAtual !== 'auxiliar') return recusa('Cliente só visualiza o diário.')
  if (!obraAtual) return recusa('Escolha uma obra antes de lançar o diário.')
  let consulta = supabase.from('diarios').select('id, status, qtd_pessoas, diarios_equipe(contratado_id)').eq('obra_id', obraAtual)
  consulta = id ? consulta.eq('id', id) : consulta.eq('data', data)
  const { data: antes, error } = await consulta.maybeSingle()
  if (error) return falha(error)
  if (id && !antes) return recusa('Este diário não é desta obra.')
  if (antes && !podeEditarDiario(perfilAtual, antes.status)) return recusa('Sem permissão para alterar este diário.')

  const [s, e] = await Promise.all([mockApi.listarServicos(), lerExecucoes(obraAtual)])
  if (s.erro || e.erro) return recusa(s.erro ?? e.erro)
  const r = conferirDiario({ data, lancamentos, diarioId: antes?.id ?? null }, servicosDaCadeia(s.data), e.data)
  if (!r.ok) return { data: null, erro: 'Confira os campos.', erros: r.erros }

  const comoEstava = antes ? { equipe: antes.diarios_equipe.map((p) => p.contratado_id), qtd_pessoas: antes.qtd_pessoas } : null
  const { data: salvo, error: erroSalvar } = await supabase.rpc('salvar_diario', {
    p_obra_id: obraAtual, p_id: antes?.id ?? null, p_status_lido: antes?.status ?? null, p_data: data,
    p_clima_manha: clima_manha, p_clima_tarde: clima_tarde, p_ocorrencias: ocorrencias ?? '',
    p_qtd_pessoas: pessoasDoDia(equipe, comoEstava),
    p_equipe: equipe.map((cid) => ({ contratado_id: cid, atividade: atividades[cid] ?? '' })),
    p_execucoes: r.lancamentos,
  })
  if (erroSalvar) return falha(erroSalvar)
  return resposta(salvo)
})

// ---------- Fotos ----------
export const listarFotos = escolher(mockApi.listarFotos, async () => {
  if (!obraAtual) return resposta([])
  const { data, error } = await supabase.from('fotos').select('id, diario_id, servico_id, url, legenda, diarios(data, status)').eq('obra_id', obraAtual)
  if (error) return falha(error)
  return resposta(data
    .filter((f) => visivel(f.diarios))
    .map(({ diarios: d, ...f }) => ({ ...f, data: d.data, servico: mock.servicos.find((s) => s.id === f.servico_id)?.nome ?? '' }))
    .sort((a, b) => b.data.localeCompare(a.data)))
})

// ---------- Serviços: as travas que dependem de lançamento leem o banco ----------
async function servicoTemLancamento(servicoId) {
  const r = await lerExecucoes(obraAtual)
  return r.erro ? r : resposta(r.data.some((e) => e.servico_id === servicoId))
}

export const salvarServico = escolher(mockApi.salvarServico, async (dados) => {
  if (ehSocio() && obraAtual && dados.id) {
    const s = await mockApi.listarServicos()
    if (s.erro) return s
    const existente = s.data.find((x) => x.id === dados.id)
    const forma = medeEmPercentual(dados.unidade) ? 'Percentual' : 'Quantidade'
    if (existente && existente.forma !== forma) {
      const r = await servicoTemLancamento(dados.id)
      if (r.erro) return r
      if (r.data) return { data: null, erro: 'Confira os campos.', erros: { unidade: 'Este serviço já tem lançamentos: não dá para trocar entre verba (vb) e quantidade.' } }
    }
  }
  return mockApi.salvarServico(dados)
})

export const excluirServico = escolher(mockApi.excluirServico, async (id) => {
  if (ehSocio() && obraAtual) {
    const r = await servicoTemLancamento(id)
    if (r.erro) return r
    if (r.data) return recusa('Este serviço já tem lançamentos no diário e não pode ser excluído.')
  }
  return mockApi.excluirServico(id)
})

// ---------- Consultas que juntam obras: só sócio, uma consulta por tabela (nunca obra a obra) ----------
export const buscarBaseFaturamento = escolher(mockApi.buscarBaseFaturamento, async () => {
  if (!ehSocio()) return resposta([])
  const [o, e] = await Promise.all([listarObras('socio'), lerExecucoes(null)])
  const erro = o.erro ?? e.erro
  if (erro) return recusa(erro)
  return resposta(o.data.map((obra) => ({
    obra,
    itens: mock.itensDoOrcamento(obra.id),
    servicos: servicosDaCadeia(mock.servicos.filter((s) => s.obra_id === obra.id)),
    execucoes: e.data.filter((x) => x.obra_id === obra.id),
    medicoes: mock.medicoes.filter((m) => m.obra_id === obra.id),
    custos: mock.custos.filter((k) => k.obra_id === obra.id),
  })))
})

export const buscarBaseGestao = escolher(mockApi.buscarBaseGestao, async () => {
  if (!ehSocio()) return resposta([])
  const [o, e, d] = await Promise.all([
    listarObras('socio'), lerExecucoes(null),
    supabase.from('diarios').select('id, obra_id, data, status, qtd_pessoas'),
  ])
  if (d.error) return falha(d.error)
  if (o.erro || e.erro) return recusa(o.erro ?? e.erro)
  return resposta(o.data.map((obra) => ({
    obra,
    servicos: servicosDaCadeia(mock.servicos.filter((s) => s.obra_id === obra.id)),
    execucoes: e.data.filter((x) => x.obra_id === obra.id),
    diarios: d.data.filter((x) => x.obra_id === obra.id),
    tarefas: mock.tarefas.filter((t) => t.obra_id === obra.id),
    cotacoes: mock.cotacoes.filter((q) => q.obra_id === obra.id),
  })))
})
