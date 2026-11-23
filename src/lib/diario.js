// Regras do diário que as telas e a camada de dados usam juntas. Sem React e sem banco.
import { SITUACOES } from './obras.js'

export const STATUS_DIARIO = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', devolvido: 'Devolvido' }

// O que o rodapé do diário oferece a quem está olhando.
export const ACOES_DIARIO = {
  decidir: 'decidir', // aprovar ou devolver (o conteúdo fica como foi enviado)
  enviar: 'enviar', // salvar e enviar para aprovação
  nenhuma: 'nenhuma', // só leitura
}

// Quadro (diario.criar e diario.editar): diário só nasce e só se mexe em obra Em andamento;
// obra Parada ou Concluída fica só para leitura. O banco recusa o mesmo.
export const obraAceitaDiario = (obra) => obra?.situacao === SITUACOES[0]

// Quadro (diario.editar): só Rascunho ou Devolvido, para sócio e auxiliar; cliente nunca.
// status ausente = diário que ainda não foi salvo (nasce Rascunho).
// Enviado espera a decisão do sócio; Aprovado trava tudo (o sócio reabre, decidido em 23/11/2026).
// O banco recusa o mesmo (20261123170000_regras_diario.sql e 20261123190000_trava_do_diario.sql).
export function podeEditarDiario(perfil, status) {
  const aberto = status === undefined || status === STATUS_DIARIO.rascunho || status === STATUS_DIARIO.devolvido
  return (perfil === 'socio' || perfil === 'auxiliar') && aberto
}

export function acoesDoDiario(perfil, status, obraEmAndamento = true) {
  if (perfil === 'socio' && status === STATUS_DIARIO.enviado) return ACOES_DIARIO.decidir
  if (obraEmAndamento && podeEditarDiario(perfil, status)) return ACOES_DIARIO.enviar
  return ACOES_DIARIO.nenhuma
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

// Uma pessoa da equipe como aparece no diário. O cliente vê o nome e o que ela fez, nunca a função.
export const pessoaNoDiario = (contratadoId, contratado, atividade, perfil) => ({
  id: contratadoId,
  nome: contratado?.nome ?? contratadoId,
  funcao: perfil === 'cliente' ? '' : (contratado?.funcao ?? ''),
  atividade: atividade ?? '',
})

// Antes de enviar para aprovação: pelo menos uma pessoa trabalhou na obra no dia.
export function problemaParaEnviar(diario) {
  return diario.qtd_pessoas >= 1 ? null : 'Marque pelo menos uma pessoa na equipe do dia antes de enviar.'
}
