// Prestador em dois serviços ao mesmo tempo. Só sócios veem.
// Entre obras = conflito (a pessoa não está em dois lugares). Mesma obra = atenção (pode ser possível).
import { ehDiaUtil, somarDiasUteis } from './cronograma.js'

const maior = (a, b) => (a > b ? a : b)
const menor = (a, b) => (a < b ? a : b)

function diasDoIntervalo(de, ate) {
  const dias = []
  let d = ehDiaUtil(de) ? de : somarDiasUteis(de, 1)
  while (d <= ate) { dias.push(d); d = somarDiasUteis(d, 1) }
  return dias
}

// alocacoes: [{ servico_id, servico, obra_id, obra_codigo, prestador_id, prestador, inicio, termino, concluido }]
// Só conta de hoje em diante: conflito que já passou não tem mais o que resolver.
export function detectarConflitos(alocacoes, hoje) {
  const validas = alocacoes.filter((a) => a.prestador_id && !a.concluido && a.termino >= hoje)
  const conflitos = []
  for (let i = 0; i < validas.length; i++) {
    for (let j = i + 1; j < validas.length; j++) {
      const a = validas[i]
      const b = validas[j]
      if (a.prestador_id !== b.prestador_id) continue
      const de = maior(maior(a.inicio, b.inicio), hoje)
      const ate = menor(a.termino, b.termino)
      if (de > ate) continue
      const dias = diasDoIntervalo(de, ate)
      if (dias.length === 0) continue
      conflitos.push({
        prestador_id: a.prestador_id, prestador: a.prestador,
        tipo: a.obra_id === b.obra_id ? 'Mesma obra' : 'Entre obras',
        a, b, de: dias[0], ate: dias.at(-1), dias,
      })
    }
  }
  return conflitos.sort((x, y) => Number(x.tipo === 'Mesma obra') - Number(y.tipo === 'Mesma obra') || x.de.localeCompare(y.de))
}

export const conflitosDoServico = (conflitos, servicoId) =>
  conflitos.filter((c) => c.a.servico_id === servicoId || c.b.servico_id === servicoId)

// Segunda-feira da semana de uma data.
export function segundaDaSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(a, m - 1, d))
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7))
  return t.toISOString().slice(0, 10)
}

// n dias corridos a partir de iso (janela do quadro de Serviços).
export function diasCorridos(iso, n) {
  const [a, m, d] = iso.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10))
}
