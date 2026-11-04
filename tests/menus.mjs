// Quem vê o quê no menu. Errar aqui é mostrar dinheiro para quem não pode.
import { MENUS, PERFIS, TELAS, TELAS_COM_DINHEIRO, TELAS_SO_SOCIO, itensDaBarra, podeAbrir } from '../src/lib/menus.js'

let ok = 0
let tot = 0

function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) {
    ok++
  } else {
    console.log(`  ✗ ${descricao}`)
    console.log(`     esperado: ${JSON.stringify(esperado)}`)
    console.log(`     veio:     ${JSON.stringify(real)}`)
  }
}

const telasDe = (perfil) => [...MENUS[perfil].barra, ...MENUS[perfil].mais]

conferir('auxiliar não abre nenhuma tela com dinheiro',
  telasDe('auxiliar').filter((t) => TELAS_COM_DINHEIRO.includes(t)), [])
conferir('cliente não abre tela só de sócio',
  telasDe('cliente').filter((t) => TELAS_SO_SOCIO.includes(t)), [])
conferir('auxiliar não abre tela só de sócio',
  telasDe('auxiliar').filter((t) => TELAS_SO_SOCIO.includes(t)), [])
conferir('só o sócio abre o Faturamento',
  Object.keys(MENUS).filter((p) => podeAbrir(p, 'faturamento')), ['socio'])

for (const perfil of Object.keys(MENUS)) {
  conferir(`${perfil}: barra do celular tem no máximo 5 itens`, itensDaBarra(perfil).length <= 5, true)
  conferir(`${perfil}: tela inicial está no menu dele`, podeAbrir(perfil, PERFIS[perfil].inicio), true)
  conferir(`${perfil}: toda tela do menu tem título`, telasDe(perfil).every((t) => TELAS[t]), true)
}

conferir('auxiliar sem "Mais" na barra', itensDaBarra('auxiliar').includes('mais'), false)
conferir('auxiliar abre o diário do dia (pelo "Meus diários")', podeAbrir('auxiliar', 'diarioDia'), true)
conferir('auxiliar NÃO abre o detalhe de medição', podeAbrir('auxiliar', 'medicao'), false)
conferir('cliente abre o detalhe de medição (pelos Pagamentos)', podeAbrir('cliente', 'medicao'), true)
conferir('perfil desconhecido não abre nada', podeAbrir('pendente', 'painel'), false)

console.log(`${ok}/${tot} — menus`)
process.exit(ok === tot ? 0 : 1)
