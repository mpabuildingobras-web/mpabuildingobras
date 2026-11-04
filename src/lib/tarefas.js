// Tarefas ligadas à obra: o que está pendente de fazer nela. Só sócios.
export const STATUS_TAREFA = ['Pendente', 'Em andamento', 'Concluída']
export const PRIORIDADES = ['Alta', 'Média', 'Baixa']

export const estaAtrasada = (t, hoje) => t.status !== 'Concluída' && t.prazo < hoje

export function conferirTarefa({ titulo, obra_id, prazo, responsavel }) {
  const erros = {}
  if (!titulo || titulo.trim().length < 3) erros.titulo = 'Descreva a tarefa.'
  if (!obra_id) erros.obra_id = 'Escolha a obra.'
  if (!prazo) erros.prazo = 'Escolha o prazo.'
  if (!responsavel) erros.responsavel = 'Escolha o responsável.'
  return { ok: Object.keys(erros).length === 0, erros }
}

// Abertas primeiro, do prazo mais antigo para o mais novo. Concluídas no fim.
export function ordenarTarefas(tarefas) {
  return [...tarefas].sort((a, b) =>
    Number(a.status === 'Concluída') - Number(b.status === 'Concluída') || a.prazo.localeCompare(b.prazo))
}

// Grupos por prazo, como uma agenda. As concluídas ficam num grupo próprio.
export function agruparTarefas(tarefas) {
  const grupos = []
  for (const t of ordenarTarefas(tarefas)) {
    const chave = t.status === 'Concluída' ? 'Concluídas' : t.prazo
    let g = grupos.find((x) => x.chave === chave)
    if (!g) { g = { chave, tarefas: [] }; grupos.push(g) }
    g.tarefas.push(t)
  }
  return grupos
}
