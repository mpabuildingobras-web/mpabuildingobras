// Porta de entrada: equipe e cliente entram por portas diferentes.
import { conferirCadastro, conferirLogin } from '../src/lib/acesso.js'
import { usuarios } from '../src/lib/mockData.js'

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

const senha = usuarios[0].senha_teste
const entra = (email, porta, s = senha) => conferirLogin({ email, senha: s, porta }, usuarios)

conferir('sócia entra pela porta da equipe', entra('ana@exemplo.com', 'construtor').perfil, 'socio')
conferir('auxiliar entra pela porta da equipe', entra('rita@exemplo.com', 'construtor').perfil, 'auxiliar')
conferir('cliente entra pelo portal do cliente', entra('claudia@exemplo.com', 'cliente').perfil, 'cliente')
conferir('cliente NÃO entra pela porta da equipe', entra('claudia@exemplo.com', 'construtor').ok, false)
conferir('sócia NÃO entra pelo portal do cliente', entra('ana@exemplo.com', 'cliente').ok, false)
conferir('senha errada não entra', entra('ana@exemplo.com', 'construtor', 'errada').ok, false)
conferir('e-mail com maiúscula e espaço ainda entra', entra(' Ana@Exemplo.com ', 'construtor').ok, true)

const base = { tipoPessoa: 'Pessoa física', nome: 'Maria da Silva', documento: '123.456.789-09', email: 'maria@exemplo.com', senha: 'segura123', repetir: 'segura123' }
conferir('cadastro completo passa', conferirCadastro(base).ok, true)
conferir('CPF com 10 números não passa', Object.keys(conferirCadastro({ ...base, documento: '1234567890' }).erros), ['documento'])
conferir('pessoa jurídica pede CNPJ com 14', conferirCadastro({ ...base, tipoPessoa: 'Pessoa jurídica' }).erros.documento, 'O CNPJ tem 14 números.')
conferir('senhas diferentes não passam', Object.keys(conferirCadastro({ ...base, repetir: 'outra1234' }).erros), ['repetir'])
conferir('senha curta não passa', Object.keys(conferirCadastro({ ...base, senha: 'abc', repetir: 'abc' }).erros), ['senha'])

console.log(`${ok}/${tot} — acesso`)
process.exit(ok === tot ? 0 : 1)
