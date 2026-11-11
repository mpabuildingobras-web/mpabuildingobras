// Regras do diário que a tela e a camada de dados usam juntas. Sem React e sem banco.
export const STATUS_DIARIO = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', devolvido: 'Devolvido' }

// Sócio mexe sempre; auxiliar, até a aprovação; cliente, nunca.
export function podeEditarDiario(perfil, status) {
  if (perfil === 'socio') return true
  return perfil === 'auxiliar' && status !== STATUS_DIARIO.aprovado
}

// Quais botões o rodapé mostra: 'decidir' (aprovar ou devolver), 'corrigir' (diário já aprovado),
// 'enviar' (salvar e enviar para aprovação) ou 'nenhuma' (só leitura).
export function acoesDoDiario(perfil, status) {
  if (!podeEditarDiario(perfil, status)) return 'nenhuma'
  if (perfil === 'socio' && status === STATUS_DIARIO.enviado) return 'decidir'
  if (status === STATUS_DIARIO.aprovado) return 'corrigir'
  return 'enviar'
}

// Item em verba (vb): o avanço é lançado por botão, e só fica liberado o que cabe no que falta.
export function botoesDePercentual(falta) {
  return [
    ...[25, 50, 75].map((n) => ({ rotulo: `+${n}%`, valor: n, liberado: n <= falta })),
    { rotulo: 'Concluído', valor: falta, liberado: falta > 0 },
  ]
}

// Antes de enviar para aprovação: pelo menos uma pessoa trabalhou na obra no dia.
export function problemaParaEnviar(diario) {
  return diario.qtd_pessoas >= 1 ? null : 'Marque pelo menos uma pessoa na equipe do dia antes de enviar.'
}
