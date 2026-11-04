// Leitura no sol do canteiro: os pares de cor do app precisam de contraste. Lê as cores de src/index.css.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.css'), 'utf8')
const cor = (nome) => new RegExp(`--${nome}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)?.[1]

function luz(hex) {
  const canal = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}
const contraste = (a, b) => {
  const [c, d] = [luz(a), luz(b)].sort((x, y) => y - x)
  return (c + 0.05) / (d + 0.05)
}

// [texto, fundo, mínimo]. 4,5 para texto; 3 para letra grande e bordas de campo.
const PARES = [
  ['ink', 'white', 4.5], ['ink', 'paper', 4.5], ['ink', 'destaque', 4.5], ['ink', 'red-tint', 4.5], ['ink', 'green-tint', 4.5],
  ['slate', 'white', 4.5], ['slate', 'paper', 4.5], ['slate', 'destaque', 4.5],
  ['white', 'acao', 4.5], ['white', 'marca', 4.5], ['white', 'red', 4.5], ['white', 'grafite', 4.5],
  ['red-ink', 'white', 4.5], ['red-ink', 'paper', 4.5], ['red-ink', 'red-tint', 4.5],
  ['amber-ink', 'white', 4.5], ['amber-ink', 'amber-tint', 4.5],
  ['green-ink', 'white', 4.5], ['green-ink', 'green-tint', 4.5],
  ['linha-campo', 'white', 3],
]

let ok = 0
for (const [texto, fundo, minimo] of PARES) {
  const r = contraste(cor(texto), cor(fundo))
  if (r >= minimo) ok++
  else console.log(`  ✗ ${texto} sobre ${fundo}: ${r.toFixed(2)} (mínimo ${minimo})`)
}
console.log(`${ok}/${PARES.length} — contraste`)
process.exit(ok === PARES.length ? 0 : 1)
