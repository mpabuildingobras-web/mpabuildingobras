// Importação do Estudo de Viabilidade no modelo da MPA (abas ORÇAMENTO e QUANTITATIVO, layout do Vita Belle).
// Recebe as linhas já lidas da planilha (lib/xlsx.js) e devolve o orçamento pronto para conferir,
// com a lista de problemas encontrados. Nada é gravado aqui.
//
// ORÇAMENTO: cabeçalho SERVIÇOS · UNID. · TOTAL MO · TOTAL ENG. · OBSERVAÇÕES.
//   Linha com número inteiro e nome = etapa ("1 · SERVIÇOS PRELIMINARES").
//   Linha com número "1.1" = serviço. Unidade "%" = item percentual (Gestão de obra).
// QUANTITATIVO: CÔMODO · DESCRITIVO · QUANTITATIVO. O cômodo vale para as linhas de baixo até o próximo.
import { UNIDADES } from './lancamentos.js'
import { acharAba, normalizar } from './xlsx.js'

// Unidade como a planilha escreve → a que o app (e o banco) aceita. Fora disso, a importação trava.
const SINONIMOS = { m2: 'm²', 'm²': 'm²', m3: 'm³', 'm³': 'm³', m: 'm', ml: 'ml', un: 'un', und: 'un', unid: 'un', 'unid.': 'un', 'un.': 'un', pc: 'un', 'pç': 'un', vb: 'vb', verba: 'vb', kg: 'kg', '%': '%' }
export function unidadeAceita(texto) {
  const u = SINONIMOS[normalizar(texto).replace(/\s/g, '')] ?? SINONIMOS[String(texto ?? '').trim().toLowerCase()]
  return u && (u === '%' || UNIDADES.includes(u)) ? u : null
}

const arred = (v) => Math.round(v * 100) / 100
const vazio = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
const texto = (v) => (vazio(v) ? '' : String(v).replace(/\s+/g, ' ').trim())

// O Excel em português lê "12.1" como 12 de janeiro e guarda o número de série da data.
// De volta: dia.mês → "12.1".
function indiceDaCelula(v) {
  if (typeof v === 'number') {
    if (v >= 20000 && Number.isInteger(v)) {
      const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000)
      return { indice: `${d.getUTCDate()}.${d.getUTCMonth() + 1}`, eraData: true }
    }
    return { indice: String(v), eraData: false }
  }
  return { indice: texto(v), eraData: false }
}

const ehEtapa = (indice) => /^\d+$/.test(indice)
const ehItem = (indice) => /^\d+\.\d+$/.test(indice)

export function importarEstudo(abas) {
  const problemas = []
  const avisar = (linha, mensagem, grave = false) => problemas.push({ linha, mensagem, grave })

  const orc = acharAba(abas, 'ORÇAMENTO')
  if (!orc) {
    return { ok: false, problemas: [{ linha: null, mensagem: 'A planilha não tem a aba ORÇAMENTO. Use o modelo de Estudo de Viabilidade da MPA.', grave: true }] }
  }

  // Cabeçalho: a linha que tem SERVIÇOS, TOTAL MO e TOTAL ENG.
  const iCab = orc.findIndex((r) => {
    const t = (r ?? []).map(normalizar)
    return t.includes('servicos') && t.some((x) => x.startsWith('total mo')) && t.some((x) => x.startsWith('total eng'))
  })
  if (iCab < 0) {
    return { ok: false, problemas: [{ linha: null, mensagem: 'Não achei o cabeçalho SERVIÇOS · UNID. · TOTAL MO · TOTAL ENG. na aba ORÇAMENTO.', grave: true }] }
  }
  const cab = orc[iCab].map(normalizar)
  const col = {
    indice: cab.indexOf('servicos'),
    unidade: cab.findIndex((x) => x.startsWith('unid')),
    mo: cab.findIndex((x) => x.startsWith('total mo')),
    eng: cab.findIndex((x) => x.startsWith('total eng')),
    obs: cab.findIndex((x) => x.startsWith('observ')),
  }
  col.nome = col.indice + 1

  // Título e total declarado ("VALOR TOTAL"), nas linhas de cima.
  let titulo = ''
  let totalDeclarado = null
  for (const r of orc.slice(0, iCab)) {
    for (let c = 0; c < (r ?? []).length; c++) {
      if (!titulo && typeof r[c] === 'string' && normalizar(r[c]).startsWith('orcamento')) titulo = texto(r[c])
      if (normalizar(r[c]) === 'valor total') totalDeclarado = r.slice(c + 1).find((x) => typeof x === 'number') ?? null
    }
  }

  const etapas = []
  for (let i = iCab + 1; i < orc.length; i++) {
    const r = orc[i] ?? []
    const linha = i + 1
    const nome = texto(r[col.nome])
    const unidade = texto(r[col.unidade])
    const mo = r[col.mo]
    const eng = r[col.eng]
    if (vazio(r[col.indice]) && !nome) {
      // Linha de totais logo abaixo do cabeçalho: só números, sem nome.
      if (totalDeclarado === null && typeof eng === 'number' && i === iCab + 1) totalDeclarado = eng
      continue
    }
    const { indice, eraData } = indiceDaCelula(r[col.indice])
    if (!nome) { avisar(linha, `Linha ${linha}: o item ${indice} está sem descrição e ficou de fora.`); continue }

    if (ehEtapa(indice) && !unidade && vazio(mo) && vazio(eng)) {
      etapas.push({ numero: Number(indice), nome, itens: [] })
      continue
    }
    if (!ehItem(indice)) { avisar(linha, `Linha ${linha}: "${nome}" está sem número de item (ex.: 2.1) e ficou de fora.`); continue }
    const etapa = etapas.at(-1)
    if (!etapa) { avisar(linha, `Linha ${linha}: o item ${indice} aparece antes da primeira etapa e ficou de fora.`, true); continue }
    if (eraData) avisar(linha, `Linha ${linha}: o Excel tinha transformado o item ${indice} em data; foi lido como ${indice}.`)
    if (Number(indice.split('.')[0]) !== etapa.numero) {
      avisar(linha, `Linha ${linha}: o item ${indice} está dentro da etapa ${etapa.numero} (${etapa.nome}).`)
    }
    if (typeof eng !== 'number') { avisar(linha, `Linha ${linha}: "${nome}" está sem TOTAL ENG.; entrou como R$ 0,00.`, true) }

    const percentual = unidade === '%'
    const aceita = unidade ? unidadeAceita(unidade) : 'vb'
    if (!aceita) avisar(linha, `Linha ${linha}: a unidade "${unidade}" do item ${indice} não é aceita pelo app (use m², m, ml, m³, un, vb, kg ou %).`, true)
    const item = {
      numero_item: indice,
      nome,
      unidade: aceita ?? unidade,
      tipo: percentual ? 'Percentual' : 'Normal',
      total_mo: typeof mo === 'number' ? arred(mo) : 0,
      total_eng: typeof eng === 'number' ? arred(eng) : 0,
      obs: texto(r[col.obs]) || null,
    }
    if (percentual) {
      const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(nome)
      item.percentual = m ? Number(m[1].replace(',', '.')) : null
    } else if (item.total_eng < item.total_mo) {
      avisar(linha, `Linha ${linha}: no item ${indice}, o valor ao cliente (ENG.) está menor que o custo de mão de obra (MO).`)
    }
    if (etapa.itens.some((x) => x.numero_item === indice)) avisar(linha, `Linha ${linha}: o item ${indice} aparece duas vezes.`, true)
    etapa.itens.push(item)
  }

  const semItens = etapas.filter((e) => !e.itens.length)
  semItens.forEach((e) => avisar(null, `A etapa ${e.numero} (${e.nome}) não tem nenhum item e ficou de fora.`))
  const comItens = etapas.filter((e) => e.itens.length)
  comItens.forEach((e) => {
    e.total_mo = arred(e.itens.reduce((s, x) => s + x.total_mo, 0))
    e.total_eng = arred(e.itens.reduce((s, x) => s + x.total_eng, 0))
  })
  const total_mo = arred(comItens.reduce((s, e) => s + e.total_mo, 0))
  const total_eng = arred(comItens.reduce((s, e) => s + e.total_eng, 0))
  if (!comItens.length) avisar(null, 'Não achei nenhum serviço na aba ORÇAMENTO.', true)
  if (totalDeclarado !== null && Math.abs(totalDeclarado - total_eng) > 0.05) {
    avisar(null, `A soma dos serviços (${reais(total_eng)}) não bate com o VALOR TOTAL da planilha (${reais(totalDeclarado)}).`, true)
  }

  const quantitativo = lerQuantitativo(abas, avisar)

  return {
    ok: !problemas.some((p) => p.grave),
    titulo: titulo || 'Orçamento importado',
    totalDeclarado: totalDeclarado === null ? null : arred(totalDeclarado),
    etapas: comItens,
    total_mo,
    total_eng,
    qtdItens: comItens.reduce((s, e) => s + e.itens.length, 0),
    quantitativo,
    problemas,
  }
}

// "2,43 m²" → 2,43 + m² · "3 un" → 3 + un · 7.6152 → 7,62 · "Medir no local" → só texto.
export function lerQuantidade(v) {
  if (typeof v === 'number') return { quantidade: arred(v), unidade: null, texto: null }
  const t = texto(v)
  if (!t) return { quantidade: null, unidade: null, texto: null }
  const m = /^(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(.*)$/.exec(t)
  if (!m) return { quantidade: null, unidade: null, texto: t }
  const numero = /,/.test(m[1]) ? Number(m[1].replace(/\./g, '').replace(',', '.')) : Number(m[1])
  return { quantidade: arred(numero), unidade: m[2].trim() || null, texto: null }
}

function lerQuantitativo(abas, avisar) {
  const q = acharAba(abas, 'QUANTITATIVO')
  if (!q) { avisar(null, 'A planilha não tem a aba QUANTITATIVO: o orçamento entra sem a lista de materiais.'); return [] }
  const iCab = q.findIndex((r) => {
    const t = (r ?? []).map(normalizar)
    return t.includes('comodo') && t.includes('descritivo')
  })
  if (iCab < 0) { avisar(null, 'Não achei o cabeçalho CÔMODO · DESCRITIVO · QUANTITATIVO na aba QUANTITATIVO.'); return [] }
  const cab = q[iCab].map(normalizar)
  const cC = cab.indexOf('comodo')
  const cD = cab.indexOf('descritivo')
  const cQ = cab.findIndex((x) => x.startsWith('quantitativo'))
  const lista = []
  let comodo = ''
  for (let i = iCab + 1; i < q.length; i++) {
    const r = q[i] ?? []
    if (!vazio(r[cC])) comodo = texto(r[cC])
    const descricao = texto(r[cD])
    if (!descricao) continue
    lista.push({ comodo: comodo || 'Geral', descricao, ...lerQuantidade(cQ >= 0 ? r[cQ] : null) })
  }
  return lista
}

const reais = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
