// Regras da obra, a unidade principal do app. Sem React, sem banco: o teste alcança.

// Mesmo texto da tela e do CHECK do banco. Se divergir, o salvamento falha em silêncio.
export const SITUACOES = ['Em andamento', 'Parada', 'Concluída']

export const situacaoValida = (situacao) => SITUACOES.includes(situacao)

// Obra Concluída sai do seletor; volta só quando a pessoa pede para ver.
export const obrasDoSeletor = (obras, mostrarConcluidas) =>
  obras.filter((o) => mostrarConcluidas || o.situacao !== 'Concluída')

// Ao abrir o app: volta na obra guardada, se ela ainda existir para esta pessoa.
// Senão, a primeira em andamento; senão, a primeira da lista.
export function escolherObraInicial(obras, idGuardado) {
  if (!obras || obras.length === 0) return null
  const guardada = obras.find((o) => o.id === idGuardado)
  if (guardada) return guardada.id
  const emAndamento = obras.find((o) => o.situacao === 'Em andamento')
  return (emAndamento ?? obras[0]).id
}

// Recorte de uma obra. A camada de dados usa isto em toda lista: nenhuma tela filtra sozinha.
export function somenteDaObra(registros, obraId) {
  if (!obraId) return []
  return registros.filter((r) => r.obra_id === obraId)
}

// Cadastro e ficha da obra. O código aparece no seletor, então não pode repetir.
export function conferirObra(dados, existentes) {
  const erros = {}
  if (!dados.nome || dados.nome.trim().length < 3) erros.nome = 'Digite o nome da obra.'
  if (!dados.codigo || !dados.codigo.trim()) erros.codigo = 'Digite um código curto.'
  const repetido = existentes.some((o) => o.id !== dados.id && o.codigo.toLowerCase() === String(dados.codigo ?? '').trim().toLowerCase())
  if (repetido) erros.codigo = 'Já existe uma obra com este código.'
  if (!dados.cliente_nome || !dados.cliente_nome.trim()) erros.cliente_nome = 'Digite o nome do cliente.'
  if (!dados.data_inicio) erros.data_inicio = 'Escolha a data de início.'
  if (!dados.data_entrega) erros.data_entrega = 'Escolha a data-meta de entrega.'
  if (dados.data_inicio && dados.data_entrega && dados.data_entrega < dados.data_inicio) erros.data_entrega = 'A entrega não pode ser antes do início.'
  if (!situacaoValida(dados.situacao)) erros.situacao = 'Escolha a situação.'
  return { ok: Object.keys(erros).length === 0, erros }
}
