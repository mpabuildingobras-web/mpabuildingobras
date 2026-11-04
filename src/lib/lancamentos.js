// Regras de quem lança: diário, serviço e custo. Sem React e sem banco.
import { ordenarCadeia } from './cronograma.js'

export const UNIDADES = ['m²', 'm', 'ml', 'm³', 'un', 'vb', 'kg']
export const CATEGORIAS_CUSTO = ['Mão de obra', 'Material', 'Equipamento', 'Terceirizado', 'Outros']

// Número como a pessoa digita: "12", "12,5", "1.340,50". Vazio ou inválido vira null.
export function lerNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  const t = String(valor ?? '').trim()
  if (!t) return null
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) ? n : null
}

const arred = (v) => Math.round(v * 1000) / 1000

// O que ainda falta de um serviço, sem contar o que este mesmo diário já lançou.
// Diário devolvido ou em rascunho não conta: ainda não vale como executado.
export function faltaDoServico(servico, execucoes, diarioId) {
  const feito = execucoes
    .filter((e) => e.servico_id === servico.id && e.diario_id !== diarioId && (e.status === 'Enviado' || e.status === 'Aprovado'))
    .reduce((s, e) => s + e.quantidade, 0)
  return arred(Math.max(0, servico.prevista - feito))
}

// lancamentos: [{ servico_id, quantidade, qtd_pessoas, descricao }] como vieram da tela.
export function conferirDiario({ data, lancamentos = [], diarioId = null }, servicos, execucoes) {
  const erros = {}
  const limpos = []
  if (!data) erros.data = 'Escolha a data do diário.'
  for (const l of lancamentos) {
    const textoVazio = String(l.quantidade ?? '').trim() === ''
    if (textoVazio) continue
    const quantidade = lerNumero(l.quantidade)
    const servico = servicos.find((s) => s.id === l.servico_id)
    if (!servico) { erros[l.servico_id] = 'Este serviço não é desta obra.'; continue }
    if (quantidade === null || quantidade < 0) { erros[l.servico_id] = 'Digite só números, como 12 ou 12,5.'; continue }
    if (quantidade === 0) continue
    const falta = faltaDoServico(servico, execucoes, diarioId)
    if (quantidade > falta) { erros[l.servico_id] = `Faltam só ${String(falta).replace('.', ',')} neste serviço.`; continue }
    const pessoas = lerNumero(l.qtd_pessoas)
    if (!pessoas || pessoas < 1 || !Number.isInteger(pessoas)) { erros[l.servico_id] = 'Diga quantas pessoas trabalharam neste serviço.'; continue }
    limpos.push({ servico_id: l.servico_id, quantidade, qtd_pessoas: pessoas, descricao: (l.descricao ?? '').trim() })
  }
  return { ok: Object.keys(erros).length === 0, erros, lancamentos: limpos }
}

// Serviço do cronograma. Recusa a dependência que fecha um ciclo, nomeando os serviços.
export function conferirServico(dados, servicosDaObra) {
  const erros = {}
  if (!dados.nome || dados.nome.trim().length < 2) erros.nome = 'Digite o nome do serviço.'
  if (!dados.frente || !dados.frente.trim()) erros.frente = 'Digite a frente de serviço.'
  if (!UNIDADES.includes(dados.unidade)) erros.unidade = 'Escolha a unidade.'
  const duracao = lerNumero(dados.duracao)
  if (!duracao || duracao < 1 || !Number.isInteger(duracao)) erros.duracao = 'Digite a duração em dias úteis, como 5.'
  const porPercentual = dados.unidade === 'vb'
  const prevista = porPercentual ? 100 : lerNumero(dados.prevista)
  if (!prevista || prevista <= 0) erros.prevista = 'Digite a quantidade prevista.'
  for (const campo of ['valor', 'custo_mo']) {
    const texto = String(dados[campo] ?? '').trim()
    if (texto && (lerNumero(texto) === null || lerNumero(texto) < 0)) erros[campo] = 'Digite um valor, como 1.340,50.'
  }
  if (!erros.duracao && !erros.prevista) {
    const id = dados.id ?? '__novo__'
    const lista = [...servicosDaObra.filter((s) => s.id !== id), { ...dados, id, nome: dados.nome ?? 'Este serviço' }]
    try { ordenarCadeia(lista) } catch (e) { erros.deps = `Não dá para salvar. ${e.message}` }
  }
  return { ok: Object.keys(erros).length === 0, erros, duracao, prevista, forma: porPercentual ? 'Percentual' : 'Quantidade' }
}

// Número do item quando a pessoa não informa: etapa.próximo, como na planilha.
export function proximoNumeroItem(todosDaObra, frente) {
  const daFrente = todosDaObra.filter((s) => s.frente === frente)
  const etapa = daFrente[0]?.numero_item?.split('.')[0]
    ?? String(Math.max(0, ...todosDaObra.map((s) => Number(s.numero_item?.split('.')[0]) || 0)) + 1)
  const ultimo = Math.max(0, ...daFrente.map((s) => Number(s.numero_item?.split('.')[1]) || 0))
  return `${etapa}.${ultimo + 1}`
}

// O que impede apagar um serviço. Devolve a frase, ou null se pode apagar.
export function impedimentoParaExcluir(servico, servicosDaObra, execucoes) {
  if (execucoes.some((e) => e.servico_id === servico.id)) return 'Este serviço já tem lançamentos no diário e não pode ser excluído.'
  const dependente = servicosDaObra.find((s) => (s.deps ?? []).includes(servico.id))
  if (dependente) return `"${dependente.nome}" depende deste serviço. Tire a dependência antes de excluir.`
  return null
}

export function conferirCusto({ data, descricao, categoria, valor }) {
  const erros = {}
  if (!data) erros.data = 'Escolha a data.'
  if (!descricao || !descricao.trim()) erros.descricao = 'Descreva o custo.'
  if (!CATEGORIAS_CUSTO.includes(categoria)) erros.categoria = 'Escolha a categoria.'
  const numero = lerNumero(valor)
  if (numero === null || numero <= 0) erros.valor = 'Digite um valor, como 1.340,50.'
  return { ok: Object.keys(erros).length === 0, erros, valor: numero }
}
