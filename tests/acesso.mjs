// Porta de entrada: equipe e cliente entram por portas diferentes; não existe cadastro pelo app.
import { conferirCamposLogin, conferirLogin, conferirNovaSenha, erroDePorta, estadoDaConta } from '../src/lib/acesso.js'
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

// Usuários de exemplo (USAR_MOCK)
conferir('sócia entra pela porta da equipe', entra('ana@exemplo.com', 'construtor').perfil, 'socio')
conferir('auxiliar entra pela porta da equipe', entra('rita@exemplo.com', 'construtor').perfil, 'auxiliar')
conferir('cliente entra pelo portal do cliente', entra('claudia@exemplo.com', 'cliente').perfil, 'cliente')
conferir('cliente NÃO entra pela porta da equipe', entra('claudia@exemplo.com', 'construtor').ok, false)
conferir('sócia NÃO entra pelo portal do cliente', entra('ana@exemplo.com', 'cliente').ok, false)
conferir('senha errada não entra', entra('ana@exemplo.com', 'construtor', 'errada').ok, false)
conferir('e-mail com maiúscula e espaço ainda entra', entra(' Ana@Exemplo.com ', 'construtor').ok, true)
conferir('conta pendente entra por qualquer porta (e cai no aguardando)', entra('novo@exemplo.com', 'construtor').ok, true)

// Campos e porta (valem também para o login do banco)
conferir('e-mail inválido é barrado antes do banco', conferirCamposLogin({ email: 'ana', senha: 'x' }), 'Digite um e-mail válido.')
conferir('senha vazia é barrada antes do banco', conferirCamposLogin({ email: 'ana@b.com', senha: '' }), 'Digite a senha.')
conferir('porta certa não dá erro', erroDePorta('auxiliar', 'construtor'), null)
conferir('cliente na porta da equipe dá erro', typeof erroDePorta('cliente', 'construtor'), 'string')
conferir('sem perfil ainda não dá erro de porta', erroDePorta(null, 'cliente'), null)

// O que o app faz com a conta
conferir('sem conta: fora', estadoDaConta(null), 'fora')
conferir('ativo com perfil: dentro', estadoDaConta({ perfil: 'socio', situacao: 'ativo' }), 'dentro')
conferir('pendente com perfil: aguardando', estadoDaConta({ perfil: 'auxiliar', situacao: 'pendente' }), 'aguardando')
conferir('ativo sem perfil: aguardando', estadoDaConta({ perfil: null, situacao: 'ativo' }), 'aguardando')
conferir('bloqueado: bloqueado, mesmo sendo sócio', estadoDaConta({ perfil: 'socio', situacao: 'bloqueado' }), 'bloqueado')

// Trocar senha
conferir('senha nova com 8 e repetida passa', conferirNovaSenha({ senha: 'segura123', repetir: 'segura123' }).ok, true)
conferir('senha curta não passa', Object.keys(conferirNovaSenha({ senha: 'abc', repetir: 'abc' }).erros), ['senha'])
conferir('senhas diferentes não passam', Object.keys(conferirNovaSenha({ senha: 'segura123', repetir: 'segura124' }).erros), ['repetir'])

console.log(`${ok}/${tot} — acesso`)
process.exit(ok === tot ? 0 : 1)
