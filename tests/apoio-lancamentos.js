// Apoio do teste de lançamentos: a camada de dados, mais uma obra vazia pronta para usar.
export * from '../src/lib/dados.js'
import { salvarObra } from '../src/lib/dados.js'

export async function criarObraParaTeste() {
  const { data } = await salvarObra({
    nome: 'Obra de teste', codigo: 'TESTE', cliente_nome: 'Fulano',
    data_inicio: '2026-11-02', data_entrega: '2027-01-29', situacao: 'Em andamento',
  })
  return data
}
