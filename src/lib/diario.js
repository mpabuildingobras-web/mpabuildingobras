// Regras do diário que as telas e a camada de dados usam juntas. Sem React e sem banco.
export const STATUS_DIARIO = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', devolvido: 'Devolvido' }

// O que o rodapé do diário oferece a quem está olhando.
export const ACOES_DIARIO = {
  decidir: 'decidir', // aprovar ou devolver
  corrigir: 'corrigir', // diário já aprovado: só salvar a correção
  enviar: 'enviar', // salvar e enviar para aprovação
  nenhuma: 'nenhuma', // só leitura
}

// Sócio mexe sempre; auxiliar, até a aprovação; cliente, nunca.
export function podeEditarDiario(perfil, status) {
  if (perfil === 'socio') return true
  return perfil === 'auxiliar' && status !== STATUS_DIARIO.aprovado
}

export function acoesDoDiario(perfil, status) {
  if (!podeEditarDiario(perfil, status)) return ACOES_DIARIO.nenhuma
  if (perfil === 'socio' && status === STATUS_DIARIO.enviado) return ACOES_DIARIO.decidir
  if (status === STATUS_DIARIO.aprovado) return ACOES_DIARIO.corrigir
  return ACOES_DIARIO.enviar
}

// Na lista, o diário que pede ação de quem está olhando vem primeiro.
export const pedeAcao = (perfil, status) =>
  (perfil === 'socio' && status === STATUS_DIARIO.enviado) || (perfil === 'auxiliar' && status === STATUS_DIARIO.devolvido)

// Item em verba (vb): o avanço é lançado por botão. Só fica liberado o passo menor do que falta;
// o que fecha o serviço é o Concluído, para nunca haver dois botões com o mesmo valor.
export function botoesDePercentual(falta) {
  return [
    ...[25, 50, 75].map((n) => ({ rotulo: `+${n}%`, valor: n, liberado: n < falta })),
    { rotulo: 'Concluído', valor: falta, liberado: falta > 0 },
  ]
}

// Pessoas na obra no dia. Diário antigo, que nunca teve equipe marcada, mantém o número que já tinha;
// quem desmarca todo mundo zera a contagem.
export function pessoasDoDia(equipe, antes) {
  if (equipe.length > 0) return equipe.length
  if ((antes?.equipe ?? []).length > 0) return 0
  return antes?.qtd_pessoas ?? 0
}

// Antes de enviar para aprovação: pelo menos uma pessoa trabalhou na obra no dia.
export function problemaParaEnviar(diario) {
  return diario.qtd_pessoas >= 1 ? null : 'Marque pelo menos uma pessoa na equipe do dia antes de enviar.'
}
