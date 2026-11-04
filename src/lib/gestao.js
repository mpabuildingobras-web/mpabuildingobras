// Gestão de Obras: parâmetro geral de todas as obras. Comparativo explícito, só sócios.
import { calcularCascata } from './cronograma.js'
import { detectarConflitos } from './conflitos.js'
import { estaAtrasada } from './tarefas.js'

// base: uma entrada por obra { obra, servicos, execucoes, diarios, tarefas, cotacoes }
export function montarAlocacoes(base, contratados, hoje) {
  return base.flatMap(({ obra, servicos, execucoes }) => {
    if (servicos.length === 0) return []
    const { linhas } = calcularCascata({ servicos, execucoes, obra, hoje })
    return linhas.map((l) => ({
      servico_id: l.id, servico: l.nome, obra_id: obra.id, obra_codigo: obra.codigo,
      prestador_id: l.responsavel_id ?? null,
      prestador: contratados.find((c) => c.id === l.responsavel_id)?.nome ?? '',
      inicio: l.inicio, termino: l.termino, concluido: l.concluido, cor: l.cor, situacao: l.situacao,
    }))
  })
}

export function calcularGestao(base, contratados, hoje) {
  const obras = base.map(({ obra, servicos, execucoes, diarios, tarefas, cotacoes }) => {
    const c = servicos.length ? calcularCascata({ servicos, execucoes, obra, hoje }) : null
    const linhas = c?.linhas ?? []
    const pesoTotal = linhas.reduce((s, l) => s + l.duracao, 0)
    const fisico = pesoTotal ? linhas.reduce((s, l) => s + l.duracao * l.pct, 0) / pesoTotal : 0
    const atrasados = linhas.filter((l) => l.cor === 'red').length
    const atrasoEntrega = c?.diasAtrasoEntrega ?? 0
    return {
      id: obra.id, codigo: obra.codigo, nome: obra.nome, situacao: obra.situacao, foto: obra.foto ?? null,
      entrega: obra.data_entrega, previsao: c?.previsaoEntrega ?? obra.data_entrega, atrasoEntrega,
      fisico, atrasados, totalServicos: linhas.length,
      tarefasAtrasadas: tarefas.filter((t) => estaAtrasada(t, hoje)).length,
      tarefasAbertas: tarefas.filter((t) => t.status !== 'Concluída').length,
      diariosParaAprovar: diarios.filter((d) => d.status === 'Enviado').length,
      ultimoDiario: diarios.map((d) => d.data).sort().at(-1) ?? null,
      comprasAguardando: cotacoes.filter((q) => q.status === 'Aguardando cliente').length,
      saude: atrasoEntrega > 0 ? 'Atrasada' : atrasados > 0 ? 'Atenção' : 'No prazo',
    }
  })
  const conflitos = detectarConflitos(montarAlocacoes(base, contratados, hoje), hoje)
  const soma = (campo) => obras.reduce((s, o) => s + o[campo], 0)
  return {
    obras,
    conflitos,
    totais: {
      ativas: obras.filter((o) => o.situacao === 'Em andamento').length,
      atrasadas: obras.filter((o) => o.saude === 'Atrasada').length,
      servicosAtrasados: soma('atrasados'),
      tarefasAtrasadas: soma('tarefasAtrasadas'),
      diariosParaAprovar: soma('diariosParaAprovar'),
      comprasAguardando: soma('comprasAguardando'),
      conflitosEntreObras: conflitos.filter((c) => c.tipo === 'Entre obras').length,
    },
  }
}
