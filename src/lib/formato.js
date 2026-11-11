import { STATUS_DIARIO } from './diario.js'
import { CONCLUIDA } from './obras.js'

// Formatação para a tela. Datas chegam como 'AAAA-MM-DD' (tipo date do banco).
// Não usar new Date('AAAA-MM-DD'): vira UTC e mostra o dia anterior no fuso do Brasil.
export function dataBR(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// Número para mostrar num campo: 12.5 → "12,5". Vazio continua vazio.
export const numeroBR = (v) => (v === undefined || v === null ? '' : String(v).replace('.', ','))

// Só dia e mês, para listas e gráficos: '2026-11-03' → '03/11'.
export const ddmm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—')

// Folga com sinal, como no painel: −5, 0, +6.
export const comSinal = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')

// Quantidade na unidade do serviço; itens por percentual aparecem em %.
export function qtd(valor, unidade, forma) {
  const v = Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  return forma === 'Percentual' ? `${v}%` : `${v} ${unidade}`
}

export const corDoStatusDiario = (status) => ({
  [STATUS_DIARIO.rascunho]: 'slate', [STATUS_DIARIO.enviado]: 'amber', [STATUS_DIARIO.aprovado]: 'green', [STATUS_DIARIO.devolvido]: 'red',
})[status] ?? 'slate'

// Hora local de um momento gravado pelo banco: "17h12".
export function horaBR(iso) {
  if (!iso) return ''
  const h = new Date(iso)
  return `${String(h.getHours()).padStart(2, '0')}h${String(h.getMinutes()).padStart(2, '0')}`
}

export const corDaSituacao = (situacao) =>
  ({ 'Em andamento': 'green', Parada: 'amber', [CONCLUIDA]: 'slate' })[situacao] ?? 'slate'
