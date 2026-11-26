// CAMADA DE DADOS: única porta de entrada dos dados. As telas importam só daqui, e só este
// arquivo chama supabase.from(...).
//
// Hoje o banco (Supabase) cuida do LOGIN (auth + profiles + membros), de OBRAS, do DIÁRIO
// (diários, equipe do dia, lançamentos e fotos) e, desde 24/11/2026, dos SERVIÇOS e do ORÇAMENTO
// (frentes, serviços, dependências, valores ENG., custos MO e quantitativo do estudo importado).
// O resto (contratados, tarefas, medições, custos lançados e a tela de Usuários) ainda vem dos
// dados de exemplo em dadosMock.js, até a vez de cada módulo.
//
// MULTI-OBRA: as telas não passam obra_id; toda consulta daqui filtra pela obra atual.
// Sem obra escolhida, as listas voltam vazias, nunca com tudo.
// RESPOSTA: sempre { data, erro } (erro em português). O Supabase devolve { data, error } e
// não estoura exceção: todo resultado é conferido aqui.
import { conferirCamposLogin, erroDePorta } from './acesso.js'
import { servicosDaCadeia } from './cronograma.js'
import * as mockApi from './dadosMock.js'
import { STATUS_DIARIO, pessoaNoDiario, pessoasDoDia, podeEditarDiario, problemaParaEnviar } from './diario.js'
import { horaBR } from './formato.js'
import { conferirDiario, conferirServico, impedimentoParaExcluir, lerNumero, proximoNumeroItem } from './lancamentos.js'
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

// ---------- Entrada (Supabase Auth + tabela profiles) ----------
// A conta do app = o login (auth) + a linha dela em profiles (perfil e situação).
// `role` repete o perfil porque as telas antigas ainda leem esse nome.
async function lerMinhaConta() {
  const { data: sessao } = await supabase.auth.getSession()
  const id = sessao?.session?.user?.id
  if (!id) return resposta(null)
  const { data, error } = await supabase.from('profiles').select('id, nome, email, perfil, situacao, telas_bloqueadas').eq('id', id).maybeSingle()
  if (error) return falha(error)
  if (!data) return recusa('Sua conta ainda não foi preparada. Fale com um dos sócios.')
  return resposta({ ...data, role: data.perfil })
}

// Ao abrir o app: se a sessão existe mas a conta não pôde ser lida, sai de vez,
// para a pessoa não ficar com um login vivo e a tela de entrada na frente.
export const minhaConta = escolher(mockApi.minhaConta, async () => {
  const r = await lerMinhaConta()
  if (r.erro) await supabase.auth.signOut()
  return r
})

export const entrar = escolher(mockApi.entrar, async ({ email, senha, porta }) => {
  const campos = conferirCamposLogin({ email, senha })
  if (campos) return recusa(campos)
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) {
    if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) return recusa('E-mail ou senha não conferem.')
    return falha(error)
  }
  const r = await lerMinhaConta()
  const problema = r.erro ?? erroDePorta(r.data?.perfil, porta)
  if (problema) { await supabase.auth.signOut(); return recusa(problema) }
  return r
})

export const sair = escolher(mockApi.sair, async () => {
  const { error } = await supabase.auth.signOut()
  return error ? falha(error) : resposta(true)
})

export const trocarSenha = escolher(mockApi.trocarSenha, async (senha) => {
  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error?.code === 'same_password') return recusa('A senha nova precisa ser diferente da atual.')
  if (error?.code === 'weak_password') return recusa('Senha fraca: use pelo menos 8 caracteres, misturando letras e números.')
  return error ? falha(error) : resposta(true)
})

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

export const listarObras = escolher(mockApi.listarObras, async (perfil) => {
  // Quais obras a pessoa vê é o banco que diz (minhas_obras: sócio, todas; os outros, as liberadas).
  const { data: ids, error: erroIds } = await supabase.rpc('minhas_obras')
  if (erroIds) return falha(erroIds)
  const { data, error } = await consultaObras(perfil).in('id', ids ?? []).order('codigo')
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
  const [o, s, e] = await Promise.all([buscarObraAtual(), listarServicos(), listarExecucoes()])
  const erro = o.erro ?? s.erro ?? e.erro
  if (erro) return recusa(erro)
  return resposta({ obra: o.data, servicos: servicosDaCadeia(s.data), execucoes: e.data })
})

// Junta o diário do banco com os nomes dos serviços (banco) e dos prestadores (ainda no mock).
function montarDiario({ diarios_equipe: equipe = [], diarios_execucoes: execucoes = [], fotos = [], ...d }, servicos) {
  const pessoa = (cid) => mock.contratados.find((c) => c.id === cid)
  return {
    ...d,
    enviado_as: horaBR(d.enviado_em),
    equipe: [...equipe].sort((a, b) => a.ordem - b.ordem)
      .map((p) => pessoaNoDiario(p.contratado_id, pessoa(p.contratado_id), p.atividade, perfilAtual)),
    execucoes: execucoes.map((e) => {
      const s = servicos.find((x) => x.id === e.servico_id)
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
  const servicos = await lerServicos(obraAtual)
  if (servicos.erro) return servicos
  const { data, error } = await supabase.from('diarios')
    .select('id, obra_id, data, status, qtd_pessoas, clima_manha, clima_tarde, ocorrencias, comentario_devolucao, enviado_por, enviado_em, diarios_equipe(contratado_id, atividade, ordem), diarios_execucoes(servico_id, quantidade, qtd_pessoas, descricao), fotos(id, servico_id, url, legenda)')
    .eq('id', id).eq('obra_id', obraAtual).maybeSingle()
  if (error) return falha(error)
  return resposta(data && visivel(data) ? montarDiario(data, servicos.data) : null)
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

  const [s, e] = await Promise.all([lerServicos(obraAtual), lerExecucoes(obraAtual)])
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
  const servicos = await lerServicos(obraAtual)
  if (servicos.erro) return servicos
  const { data, error } = await supabase.from('fotos').select('id, diario_id, servico_id, url, legenda, diarios(data, status)').eq('obra_id', obraAtual)
  if (error) return falha(error)
  return resposta(data
    .filter((f) => visivel(f.diarios))
    .map(({ diarios: d, ...f }) => ({ ...f, data: d.data, servico: servicos.data.find((s) => s.id === f.servico_id)?.nome ?? '' }))
    .sort((a, b) => b.data.localeCompare(a.data)))
})

// ---------- Serviços e orçamento (banco desde 24/11/2026) ----------
// No banco: frentes, servicos, servicos_dependencias, orcamentos, servicos_valores (ENG., sócio e
// cliente), servicos_custos (MO, só sócio) e quantitativos (só sócio). A RLS já recorta quem vê o quê;
// aqui o código só não pede o que a pessoa não pode ver.
const numero = (v) => (v === null || v === undefined ? null : Number(v))
const ordemDoItem = (n) => (n ?? '').split('.').map((p) => Number(p) || 0)
function porOrdem(a, b) {
  if (a.frente_ordem !== b.frente_ordem) return a.frente_ordem - b.frente_ordem
  const [x, y] = [ordemDoItem(a.numero_item), ordemDoItem(b.numero_item)]
  return x[0] - y[0] || (x[1] ?? 0) - (y[1] ?? 0) || a.nome.localeCompare(b.nome)
}

// obraId null = todas as obras que a pessoa vê (só nas bases de sócio).
async function lerServicos(obraId) {
  let qs = supabase.from('servicos').select('id, obra_id, numero_item, nome, unidade, tipo, percentual, forma_medicao, quantidade_prevista, observacao, aditivo, duracao_dias, responsavel_id, concluido_em, frentes(nome, ordem)')
  let qd = supabase.from('servicos_dependencias').select('servico_id, depende_de_id')
  if (obraId) { qs = qs.eq('obra_id', obraId); qd = qd.eq('obra_id', obraId) }
  const [s, d] = await Promise.all([qs, qd])
  if (s.error) return falha(s.error)
  if (d.error) return falha(d.error)
  return resposta(s.data.map(({ frentes: f, forma_medicao, quantidade_prevista, observacao, duracao_dias, percentual, ...x }) => ({
    ...x,
    frente: f?.nome ?? '',
    frente_ordem: f?.ordem ?? 0,
    forma: forma_medicao,
    prevista: numero(quantidade_prevista),
    duracao: duracao_dias,
    percentual: numero(percentual),
    obs: observacao ?? undefined,
    deps: d.data.filter((k) => k.servico_id === x.id).map((k) => k.depende_de_id),
  })).sort(porOrdem))
}

// Valores (ENG.) e, só para sócio, custos (MO). obraId null = todas as obras.
async function lerValores(obraId, comCusto) {
  let qv = supabase.from('servicos_valores').select('servico_id, valor_cliente')
  let qc = comCusto ? supabase.from('servicos_custos').select('servico_id, custo_mo') : null
  if (obraId) { qv = qv.eq('obra_id', obraId); if (qc) qc = qc.eq('obra_id', obraId) }
  const [v, c] = await Promise.all([qv, qc ?? Promise.resolve({ data: [], error: null })])
  if (v.error) return falha(v.error)
  if (c.error) return falha(c.error)
  return resposta({
    valor: new Map(v.data.map((x) => [x.servico_id, Number(x.valor_cliente)])),
    custo: new Map(c.data.map((x) => [x.servico_id, Number(x.custo_mo)])),
  })
}

// Os itens do orçamento = os serviços que têm valor ao cliente (o mesmo que itensDoOrcamento do mock).
function itensComValor(servicos, valores) {
  return servicos
    .filter((s) => valores.valor.has(s.id))
    .map((s) => ({ ...s, valor: valores.valor.get(s.id), custo_mo: valores.custo.has(s.id) ? valores.custo.get(s.id) : undefined }))
}

export const listarServicos = escolher(mockApi.listarServicos, async () => {
  if (!obraAtual) return resposta([])
  return lerServicos(obraAtual)
})

export const listarValoresDosServicos = escolher(mockApi.listarValoresDosServicos, async () => {
  if (!ehSocio() || !obraAtual) return resposta([])
  const [s, v] = await Promise.all([lerServicos(obraAtual), lerValores(obraAtual, true)])
  if (s.erro || v.erro) return recusa(s.erro ?? v.erro)
  return resposta(s.data.map((x) => ({ servico_id: x.id, valor: v.data.valor.get(x.id), custo_mo: v.data.custo.get(x.id) })))
})

// O orçamento existe quando a planilha foi importada ou quando algum serviço já tem valor ao cliente.
export const buscarOrcamento = escolher(mockApi.buscarOrcamento, async () => {
  if (perfilAtual === 'auxiliar' || !obraAtual) return resposta(null)
  const [o, s, v] = await Promise.all([
    supabase.from('orcamentos').select('titulo, created_at, qtd_etapas, qtd_itens').eq('obra_id', obraAtual).maybeSingle(),
    lerServicos(obraAtual),
    lerValores(obraAtual, ehSocio()),
  ])
  if (o.error) return falha(o.error)
  if (s.erro || v.erro) return recusa(s.erro ?? v.erro)
  const itens = itensComValor(s.data, v.data)
  if (!o.data && !itens.length) return resposta(null)
  return resposta({
    titulo: o.data?.titulo ?? 'Orçamento da obra',
    importado_em: o.data ? o.data.created_at.slice(0, 10) : null,
    qtd_etapas: o.data?.qtd_etapas ?? new Set(itens.map((i) => i.frente)).size,
    qtd_itens: o.data?.qtd_itens ?? itens.length,
    itens,
  })
})

// Estudo de viabilidade conferido na tela → banco, tudo ou nada (função importar_orcamento).
export const importarOrcamento = escolher(mockApi.importarOrcamento, async (estudo) => {
  if (!ehSocio()) return recusa('Só sócio importa o orçamento.')
  if (!obraAtual) return recusa('Escolha uma obra antes de importar.')
  if (!estudo?.ok) return recusa('A planilha tem problemas que impedem a importação. Corrija e tente de novo.')
  const { data, error } = await supabase.rpc('importar_orcamento', {
    p_obra: obraAtual,
    p_titulo: estudo.titulo,
    p_total: estudo.total_eng,
    p_etapas: estudo.etapas.map((e) => ({
      numero: e.numero, nome: e.nome,
      itens: e.itens.map((i) => ({
        numero_item: i.numero_item, nome: i.nome, unidade: i.unidade, tipo: i.tipo, percentual: i.percentual ?? null,
        total_mo: i.total_mo, total_eng: i.total_eng, obs: i.obs,
      })),
    })),
    p_quantitativo: estudo.quantitativo,
  })
  if (error) return falha(error)
  return resposta(data)
})

async function servicoTemLancamento(servicoId) {
  const r = await lerExecucoes(obraAtual)
  return r.erro ? r : resposta(r.data.some((e) => e.servico_id === servicoId))
}

// Frente pelo nome; se ainda não existe nesta obra, nasce no fim da lista.
async function idDaFrente(nome) {
  const { data: achada, error } = await supabase.from('frentes').select('id').eq('obra_id', obraAtual).eq('nome', nome).maybeSingle()
  if (error) return falha(error)
  if (achada) return resposta(achada.id)
  const { data: todas, error: erroTodas } = await supabase.from('frentes').select('ordem').eq('obra_id', obraAtual)
  if (erroTodas) return falha(erroTodas)
  const ordem = Math.max(0, ...todas.map((f) => f.ordem)) + 1
  const { data: nova, error: erroNova } = await supabase.from('frentes').insert({ obra_id: obraAtual, nome, ordem }).select('id').single()
  if (erroNova) return falha(erroNova)
  return resposta(nova.id)
}

// Valor (ENG.) e custo (MO) de um serviço: campo vazio tira, campo que nem veio deixa como está.
async function gravarValorCliente(servicoId, texto) {
  const valor = lerNumero(texto)
  const { error } = valor === null
    ? await supabase.from('servicos_valores').delete().eq('servico_id', servicoId)
    : await supabase.from('servicos_valores').upsert({ obra_id: obraAtual, servico_id: servicoId, valor_cliente: valor }, { onConflict: 'servico_id' })
  return error ? falha(error) : resposta(true)
}

async function gravarCustoMo(servicoId, texto) {
  const valor = lerNumero(texto)
  const { error } = valor === null
    ? await supabase.from('servicos_custos').delete().eq('servico_id', servicoId)
    : await supabase.from('servicos_custos').upsert({ obra_id: obraAtual, servico_id: servicoId, custo_mo: valor }, { onConflict: 'servico_id' })
  return error ? falha(error) : resposta(true)
}

export const salvarServico = escolher(mockApi.salvarServico, async (dados) => {
  if (!ehSocio()) return recusa('Só sócio cadastra serviços.')
  if (!obraAtual) return recusa('Escolha uma obra antes de cadastrar serviços.')
  const lidos = await lerServicos(obraAtual)
  if (lidos.erro) return lidos
  const daObraAtual = lidos.data
  const existente = dados.id ? daObraAtual.find((x) => x.id === dados.id) : null
  if (dados.id && !existente) return recusa('Este serviço não é desta obra.')
  const r = conferirServico(dados, servicosDaCadeia(daObraAtual))
  if (!r.ok) return { data: null, erro: 'Confira os campos.', erros: r.erros }
  if (existente && existente.forma !== r.forma) {
    const t = await servicoTemLancamento(existente.id)
    if (t.erro) return t
    if (t.data) return { data: null, erro: 'Confira os campos.', erros: { unidade: 'Este serviço já tem lançamentos: não dá para trocar entre verba (vb) e quantidade.' } }
  }
  const frente = dados.frente.trim()
  const f = await idDaFrente(frente)
  if (f.erro) return f
  const linha = {
    frente_id: f.data, nome: dados.nome.trim(), unidade: dados.unidade, forma_medicao: r.forma,
    quantidade_prevista: r.prevista, duracao_dias: r.duracao, responsavel_id: dados.responsavel_id || null,
    observacao: (dados.obs ?? '').trim() || null,
  }
  // O número do item vem da planilha e é o que a medição guarda: trocar de frente não renumera.
  const { data: salvo, error } = existente
    ? await supabase.from('servicos').update(linha).eq('id', existente.id).eq('obra_id', obraAtual).select('id').single()
    : await supabase.from('servicos').insert({ ...linha, obra_id: obraAtual, tipo: 'Normal', numero_item: proximoNumeroItem(daObraAtual, frente) }).select('id').single()
  if (error) return falha(error)

  // Dependências: tira as que saíram, põe as que entraram (o banco recusa ciclo).
  const antes = existente?.deps ?? []
  const depois = dados.deps ?? []
  const sair = antes.filter((d) => !depois.includes(d))
  const entrar = depois.filter((d) => !antes.includes(d))
  if (sair.length) {
    const { error: e1 } = await supabase.from('servicos_dependencias').delete().eq('servico_id', salvo.id).in('depende_de_id', sair)
    if (e1) return recusa(`O serviço foi salvo, mas as dependências não (${traduzirErro(e1)}). Abra e salve de novo.`)
  }
  if (entrar.length) {
    const { error: e2 } = await supabase.from('servicos_dependencias').insert(entrar.map((d) => ({ obra_id: obraAtual, servico_id: salvo.id, depende_de_id: d })))
    if (e2) return recusa(`O serviço foi salvo, mas as dependências não (${traduzirErro(e2)}). Abra e salve de novo.`)
  }
  if ('valor' in dados) {
    const g = await gravarValorCliente(salvo.id, dados.valor)
    if (g.erro) return recusa(`O serviço foi salvo, mas o valor ao cliente não (${g.erro}). Abra e salve de novo.`)
  }
  if ('custo_mo' in dados) {
    const g = await gravarCustoMo(salvo.id, dados.custo_mo)
    if (g.erro) return recusa(`O serviço foi salvo, mas o custo de mão de obra não (${g.erro}). Abra e salve de novo.`)
  }
  const atualizados = await lerServicos(obraAtual)
  if (atualizados.erro) return atualizados
  return resposta(atualizados.data.find((x) => x.id === salvo.id))
})

export const excluirServico = escolher(mockApi.excluirServico, async (id) => {
  if (!ehSocio()) return recusa('Só sócio exclui serviços.')
  if (!obraAtual) return recusa('Escolha uma obra.')
  const [s, e] = await Promise.all([lerServicos(obraAtual), lerExecucoes(obraAtual)])
  if (s.erro || e.erro) return recusa(s.erro ?? e.erro)
  const servico = s.data.find((x) => x.id === id)
  if (!servico) return recusa('Serviço não encontrado nesta obra.')
  const impedimento = impedimentoParaExcluir(servico, s.data, e.data)
  if (impedimento) return recusa(impedimento)
  // Valor, custo e dependências dele saem junto (on delete cascade no banco).
  const { error } = await supabase.from('servicos').delete().eq('id', id).eq('obra_id', obraAtual)
  return error ? falha(error) : resposta(true)
})

export const definirPrestadorDoServico = escolher(mockApi.definirPrestadorDoServico, async (servicoId, contratadoId) => {
  if (!ehSocio()) return recusa('Só sócio escolhe o prestador.')
  if (!contratadoId) return recusa('Todo serviço precisa de um prestador.')
  const { data, error } = await supabase.from('servicos').update({ responsavel_id: contratadoId })
    .eq('id', servicoId).eq('obra_id', obraAtual).select('id')
  if (error) return falha(error)
  if (!data.length) return recusa('Serviço não encontrado nesta obra.')
  return resposta(true)
})

// ---------- Consultas que juntam obras: só sócio, uma consulta por tabela (nunca obra a obra) ----------
export const buscarBaseFaturamento = escolher(mockApi.buscarBaseFaturamento, async () => {
  if (!ehSocio()) return resposta([])
  const [o, e, s, v] = await Promise.all([listarObras('socio'), lerExecucoes(null), lerServicos(null), lerValores(null, true)])
  const erro = o.erro ?? e.erro ?? s.erro ?? v.erro
  if (erro) return recusa(erro)
  return resposta(o.data.map((obra) => ({
    obra,
    itens: itensComValor(s.data.filter((x) => x.obra_id === obra.id), v.data),
    servicos: servicosDaCadeia(s.data.filter((x) => x.obra_id === obra.id)),
    execucoes: e.data.filter((x) => x.obra_id === obra.id),
    medicoes: mock.medicoes.filter((m) => m.obra_id === obra.id),
    custos: mock.custos.filter((k) => k.obra_id === obra.id),
  })))
})

export const buscarBaseGestao = escolher(mockApi.buscarBaseGestao, async () => {
  if (!ehSocio()) return resposta([])
  const [o, e, d, s] = await Promise.all([
    listarObras('socio'), lerExecucoes(null),
    supabase.from('diarios').select('id, obra_id, data, status, qtd_pessoas'),
    lerServicos(null),
  ])
  if (d.error) return falha(d.error)
  if (o.erro || e.erro || s.erro) return recusa(o.erro ?? e.erro ?? s.erro)
  return resposta(o.data.map((obra) => ({
    obra,
    servicos: servicosDaCadeia(s.data.filter((x) => x.obra_id === obra.id)),
    execucoes: e.data.filter((x) => x.obra_id === obra.id),
    diarios: d.data.filter((x) => x.obra_id === obra.id),
    tarefas: mock.tarefas.filter((t) => t.obra_id === obra.id),
    cotacoes: mock.cotacoes.filter((q) => q.obra_id === obra.id),
  })))
})
