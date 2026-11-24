// Leitor de .xlsx sem biblioteca: o arquivo é um .zip com XMLs dentro.
// Lê o VALOR que o Excel guardou em cada célula (o resultado da fórmula, não a fórmula),
// que é o que a pessoa vê na tela. Funciona no navegador e no Node (testes).
//
// lerPlanilha(bytes) → { abas: { 'ORÇAMENTO': [[A, B, C, …], …], … } }
// Linha e coluna começam em 0: abas.X[10][2] é a célula C11. Célula vazia = null.

export async function lerPlanilha(bytes) {
  const arquivos = await descompactar(new Uint8Array(bytes))
  const texto = (nome) => (arquivos[nome] ? new TextDecoder('utf-8').decode(arquivos[nome]) : null)

  const workbook = texto('xl/workbook.xml')
  if (!workbook) throw new Error('Este arquivo não é uma planilha do Excel (.xlsx).')
  const rels = texto('xl/_rels/workbook.xml.rels') ?? ''
  const alvo = {}
  for (const r of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = atributo(r[0], 'Id')
    const destino = atributo(r[0], 'Target')
    if (id && destino) alvo[id] = destino.startsWith('/') ? destino.slice(1) : `xl/${destino.replace(/^\.\//, '')}`
  }

  const compartilhados = []
  for (const si of (texto('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    compartilhados.push(juntarTextos(si[1]))
  }

  const abas = {}
  for (const s of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const nome = decodificar(atributo(s[0], 'name') ?? '')
    const caminho = alvo[atributo(s[0], 'r:id')]
    const xml = caminho && texto(caminho)
    if (xml) abas[nome] = lerAba(xml, compartilhados)
  }
  return { abas }
}

// Aba pelo nome, sem ligar para maiúscula, acento ou espaço sobrando ("ORÇAMENTO " = "orcamento").
export function acharAba(abas, nome) {
  const chave = normalizar(nome)
  const achada = Object.keys(abas).find((n) => normalizar(n) === chave)
  return achada ? abas[achada] : null
}

export const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

function lerAba(xml, compartilhados) {
  const linhas = []
  for (const row of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const n = Number(atributo(row[1], 'r')) - 1
    const celulas = []
    for (const c of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = atributo(c[1], 'r')
      const tipo = atributo(c[1], 't')
      const dentro = c[2] ?? ''
      const v = /<v>([\s\S]*?)<\/v>/.exec(dentro)?.[1]
      let valor = null
      if (tipo === 's') valor = v === undefined ? null : compartilhados[Number(v)] ?? null
      else if (tipo === 'inlineStr') valor = juntarTextos(dentro)
      else if (tipo === 'str') valor = v === undefined ? null : decodificar(v)
      else if (tipo === 'b') valor = v === '1'
      else if (tipo === 'e') valor = null
      else if (v !== undefined && v !== '') valor = Number(v)
      if (ref) celulas[colunaDe(ref)] = valor
    }
    linhas[n] = Array.from(celulas, (x) => (x === undefined ? null : x))
  }
  return Array.from(linhas, (x) => x ?? [])
}

function colunaDe(ref) {
  let n = 0
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function juntarTextos(xml) {
  // Texto com partes formatadas (<r><t>…</t></r>) vira um texto só; <rPh> é guia de pronúncia, fica de fora.
  const semFonetica = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '')
  return decodificar([...semFonetica.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''))
}

function atributo(tag, nome) {
  const m = new RegExp(`\\s${nome.replace(':', '\\:')}="([^"]*)"`).exec(tag)
  return m ? m[1] : null
}

function decodificar(t) {
  return t
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

// ---------- .zip ----------
async function descompactar(dados) {
  const dv = new DataView(dados.buffer, dados.byteOffset, dados.byteLength)
  let fim = -1
  for (let i = dados.length - 22; i >= Math.max(0, dados.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fim = i; break }
  }
  if (fim < 0) throw new Error('Este arquivo não é uma planilha do Excel (.xlsx).')
  const total = dv.getUint16(fim + 10, true)
  let p = dv.getUint32(fim + 16, true)
  const arquivos = {}
  for (let k = 0; k < total; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const metodo = dv.getUint16(p + 10, true)
    const tamanho = dv.getUint32(p + 20, true)
    const nNome = dv.getUint16(p + 28, true)
    const nExtra = dv.getUint16(p + 30, true)
    const nComent = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const nome = new TextDecoder('utf-8').decode(dados.subarray(p + 46, p + 46 + nNome))
    p += 46 + nNome + nExtra + nComent
    if (!/^(xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/worksheets\/[^/]+\.xml)$/.test(nome)) continue
    const inicio = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true)
    const bruto = dados.subarray(inicio, inicio + tamanho)
    if (metodo === 0) arquivos[nome] = bruto
    else if (metodo === 8) arquivos[nome] = await inflar(bruto)
  }
  return arquivos
}

async function inflar(bruto) {
  const fluxo = new Blob([bruto]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(fluxo).arrayBuffer())
}
