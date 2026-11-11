// O ciclo completo: criar serviço, lançar no diário, aprovar, ver a cascata e lançar custo.
import { calcularCascata } from '../src/lib/cronograma.js'
import {
  aprovarDiario, buscarBaseFaturamento, buscarDiario, buscarDiarioDoDia, buscarOrcamento, carregarCronograma, criarObraParaTeste,
  definirObraAtual, definirPerfil, definirPrestadorDoServico, devolverDiario, enviarDiario, excluirCusto, excluirServico, listarCustos, salvarCusto, salvarDiario, salvarServico,
} from './apoio-lancamentos.js'
import { acoesDoDiario, botoesDePercentual, pedeAcao, pessoasDoDia, podeEditarDiario, problemaParaEnviar } from '../src/lib/diario.js'
import { calcularFaturamento } from '../src/lib/faturamento.js'
import {
  conferirCusto, conferirDiario, conferirServico, faltaDoServico, impedimentoParaExcluir, lerNumero, proximoNumeroItem,
} from '../src/lib/lancamentos.js'
import { telaPrecisaDeObra } from '../src/lib/menus.js'
import { HOJE } from '../src/lib/mockData.js'

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

// ---------- Número digitado ----------
conferir('vírgula decimal', lerNumero('12,5'), 12.5)
conferir('milhar com ponto e vírgula', lerNumero('1.340,50'), 1340.5)
conferir('inteiro', lerNumero('20'), 20)
conferir('milhar sem centavos não vira 1,34', lerNumero('1.340'), 1340)
conferir('milhões com pontos', lerNumero('1.340.000'), 1340000)
conferir('ponto decimal continua decimal', lerNumero('1.5'), 1.5)
conferir('vazio vira nada', lerNumero(''), null)
conferir('texto vira nada', lerNumero('abc'), null)

// ---------- Regras do diário ----------
const servico = { id: 'a', prevista: 65 }
const execs = [
  { servico_id: 'a', diario_id: 'x', quantidade: 18, status: 'Aprovado' },
  { servico_id: 'a', diario_id: 'y', quantidade: 10, status: 'Devolvido' },
  { servico_id: 'a', diario_id: 'z', quantidade: 5, status: 'Enviado' },
]
conferir('falta ignora diário devolvido', faltaDoServico(servico, execs, null), 42)
conferir('falta não conta o próprio diário', faltaDoServico(servico, execs, 'z'), 47)
const lancar = (quantidade, qtd_pessoas = '2') => conferirDiario({ data: HOJE, lancamentos: [{ servico_id: 'a', quantidade, qtd_pessoas }] }, [servico], execs)
conferir('lançamento certo passa', lancar('20').lancamentos[0].quantidade, 20)
conferir('não passa do que falta', lancar('43').erros.a, 'Faltam só 42 neste serviço.')
conferir('quantidade pede pessoas', lancar('20', '').erros.a, 'Diga quantas pessoas trabalharam neste serviço.')
conferir('texto na quantidade é recusado', lancar('muito').ok, false)
conferir('campo vazio é ignorado', lancar('').lancamentos, [])

// Item em verba: botões no lugar do campo, só os que cabem no que falta
conferir('faltando 30%, só +25% e Concluído', botoesDePercentual(30).map((b) => b.liberado), [true, false, false, true])
conferir('Concluído lança exatamente o que falta', botoesDePercentual(30)[3].valor, 30)
conferir('serviço já concluído não tem botão', botoesDePercentual(0).some((b) => b.liberado), false)
conferir('faltando 25%, só o Concluído (nunca dois botões iguais)', botoesDePercentual(25).map((b) => b.liberado), [false, false, false, true])

// Pessoas do dia
conferir('equipe marcada conta as pessoas', pessoasDoDia(['a', 'b'], null), 2)
conferir('desmarcar todo mundo zera', pessoasDoDia([], { equipe: ['a', 'b'], qtd_pessoas: 2 }), 0)
conferir('diário antigo sem equipe marcada mantém o número', pessoasDoDia([], { qtd_pessoas: 3 }), 3)
conferir('pedir ação: sócio no enviado, auxiliar no devolvido', [pedeAcao('socio', 'Enviado'), pedeAcao('auxiliar', 'Devolvido'), pedeAcao('auxiliar', 'Enviado')], [true, true, false])

// Quem mexe no diário e quais botões aparecem
conferir('auxiliar edita até aprovar', [podeEditarDiario('auxiliar', 'Enviado'), podeEditarDiario('auxiliar', 'Aprovado')], [true, false])
conferir('cliente nunca edita', podeEditarDiario('cliente', 'Rascunho'), false)
conferir('sócio decide o enviado', acoesDoDiario('socio', 'Enviado'), 'decidir')
conferir('sócio corrige o aprovado', acoesDoDiario('socio', 'Aprovado'), 'corrigir')
conferir('auxiliar envia o devolvido', acoesDoDiario('auxiliar', 'Devolvido'), 'enviar')
conferir('auxiliar não tem botão no aprovado', acoesDoDiario('auxiliar', 'Aprovado'), 'nenhuma')

// Enviar pede pelo menos uma pessoa na obra
conferir('sem ninguém não envia', problemaParaEnviar({ qtd_pessoas: 0 }), 'Marque pelo menos uma pessoa na equipe do dia antes de enviar.')
conferir('com uma pessoa envia', problemaParaEnviar({ qtd_pessoas: 1 }), null)

// ---------- Regras do serviço ----------
const base = { nome: 'Reboco', frente: 'Alvenaria', unidade: 'm²', duracao: '5', prevista: '60', deps: [], valor: '1.000', responsavel_id: 'f4' }
conferir('serviço completo passa', conferirServico(base, []).ok, true)
conferir('sem valor ao cliente é recusado', conferirServico({ ...base, valor: '' }, []).erros.valor, 'Digite o valor ao cliente.')
conferir('sem prestador é recusado', conferirServico({ ...base, responsavel_id: '' }, []).erros.responsavel_id, 'Escolha o prestador.')
conferir('segundo serviço sem anterior é recusado', conferirServico(base, [{ id: 'x', deps: [] }]).erros.deps?.startsWith('Escolha de qual serviço'), true)
conferir('o primeiro serviço continua sem anterior ao ser editado', conferirServico({ ...base, id: 'x' }, [{ id: 'x', deps: [] }, { id: 'y', deps: ['x'] }]).ok, true)
conferir('vb é medido por percentual', [conferirServico({ ...base, unidade: 'vb', prevista: '' }, []).forma, conferirServico({ ...base, unidade: 'vb', prevista: '' }, []).prevista], ['Percentual', 100])
conferir('duração quebrada é recusada', Object.keys(conferirServico({ ...base, duracao: '2,5' }, []).erros), ['duracao'])
conferir('ciclo é recusado nomeando os serviços',
  conferirServico({ ...base, id: 'a', nome: 'Pintura', deps: ['b'] }, [{ id: 'a', nome: 'Pintura', deps: [] }, { id: 'b', nome: 'Reboco', deps: ['a'] }]).erros.deps.includes('Reboco'), true)
conferir('próximo item na mesma frente', proximoNumeroItem([{ frente: 'Gesso', numero_item: '7.1' }], 'Gesso'), '7.2')
conferir('frente nova abre etapa nova', proximoNumeroItem([{ frente: 'Gesso', numero_item: '7.1' }], 'Pintura'), '8.1')
conferir('primeiro serviço da obra', proximoNumeroItem([], 'Demolição'), '1.1')
conferir('com lançamento não exclui', impedimentoParaExcluir({ id: 'a' }, [], [{ servico_id: 'a' }]) !== null, true)
conferir('com dependente não exclui', impedimentoParaExcluir({ id: 'a' }, [{ nome: 'B', deps: ['a'] }], []).includes('B'), true)
conferir('sem nada pode excluir', impedimentoParaExcluir({ id: 'a' }, [], []), null)

// ---------- Regras do custo ----------
conferir('custo completo passa', conferirCusto({ data: HOJE, descricao: 'Areia', categoria: 'Material', valor: '1.340,50' }).valor, 1340.5)
conferir('custo sem valor é recusado', Object.keys(conferirCusto({ data: HOJE, descricao: 'Areia', categoria: 'Material', valor: '' }).erros), ['valor'])

// ---------- Primeiro uso: telas que precisam de obra ----------
conferir('Cronograma precisa de obra', telaPrecisaDeObra('cronograma', {}), true)
conferir('Obras não precisa', telaPrecisaDeObra('obras', {}), false)
conferir('Nova obra não precisa', telaPrecisaDeObra('fichaObra', { nova: true }), false)
conferir('Ficha de obra existente precisa', telaPrecisaDeObra('fichaObra', {}), true)

// ---------- O ciclo: quantidade lançada muda o avanço ----------
definirPerfil('socio')
definirObraAtual('obra-ap302')
const pctForro = async (contam) => {
  const { data } = await carregarCronograma()
  const c = calcularCascata({ ...data, hoje: HOJE, contam })
  return c.linhas.find((l) => l.nome === 'Forro de gesso').executado
}
conferir('forro começa em 18', await pctForro(['Enviado', 'Aprovado']), 18)
const d12 = (await buscarDiarioDoDia(HOJE)).data
await salvarDiario({ id: d12.id, data: HOJE, clima_manha: 'Chuva', clima_tarde: 'Sol', ocorrencias: 'Teste', equipe: ['f6'], atividades: { f6: 'Forro' },
  lancamentos: [{ servico_id: 's3', quantidade: '10', qtd_pessoas: '2' }, { servico_id: 's9', quantidade: '20', qtd_pessoas: '2' }] })
conferir('lançamento no diário enviado conta para o sócio', await pctForro(['Enviado', 'Aprovado']), 38)
conferir('e não conta para o cliente antes de aprovar', await pctForro(['Aprovado']), 18)
const relido = (await buscarDiario(d12.id)).data
conferir('clima e ocorrência ficam gravados', [relido.clima_manha, relido.ocorrencias, relido.qtd_pessoas], ['Chuva', 'Teste', 1])
await aprovarDiario(d12.id)
conferir('aprovado, conta para o cliente', await pctForro(['Aprovado']), 38)
definirPerfil('cliente')
const vistoPeloCliente = (await buscarDiario(d12.id)).data
conferir('cliente vê nome e atividade de quem trabalhou', [vistoPeloCliente.equipe[0].nome !== '', vistoPeloCliente.equipe[0].atividade], [true, 'Forro'])
conferir('cliente não recebe a função do prestador', vistoPeloCliente.equipe.map((p) => p.funcao), [''])
conferir('cliente vê o prestador de cada serviço lançado', vistoPeloCliente.execucoes.every((e) => e.prestador !== ''), true)
definirPerfil('socio')
conferir('sócio recebe a função', (await buscarDiario(d12.id)).data.equipe[0].funcao !== '', true)
const excesso = await salvarDiario({ id: d12.id, data: HOJE, equipe: [], lancamentos: [{ servico_id: 's9', quantidade: '999', qtd_pessoas: '2' }] })
conferir('passar do previsto não grava e diz onde', [excesso.data, excesso.erros.s9.startsWith('Faltam só')], [null, true])

// Devolver pede motivo
conferir('aprovado não pode ser devolvido', (await devolverDiario(d12.id, 'Motivo')).erro !== null, true)
conferir('aprovado não pode ser aprovado de novo', (await aprovarDiario(d12.id)).erro !== null, true)
await enviarDiario(d12.id)
conferir('devolver sem motivo é recusado', (await devolverDiario(d12.id, '  ')).erro !== null, true)
await devolverDiario(d12.id, 'Faltou foto.')
conferir('devolvido guarda o motivo', (await buscarDiario(d12.id)).data.comentario_devolucao, 'Faltou foto.')
await enviarDiario(d12.id)
conferir('reenviar limpa o motivo', (await buscarDiario(d12.id)).data.comentario_devolucao ?? null, null)

// ---------- Obra nova do zero ----------
const nova = await criarObraParaTeste()
definirObraAtual(nova.id)
conferir('obra nova começa sem diário', (await buscarDiarioDoDia(HOJE)).data, null)
const s1 = (await salvarServico({ nome: 'Demolição', frente: 'Demolição', unidade: 'm²', duracao: '3', prevista: '30', deps: [], valor: '3.000,00', custo_mo: '1.500', responsavel_id: 'f1' })).data
conferir('serviço criado ganha número de item', s1.numero_item, '1.1')
const s2 = (await salvarServico({ nome: 'Pintura', frente: 'Pintura', unidade: 'vb', duracao: '2', deps: [s1.id], valor: '2.000', responsavel_id: 'f7' })).data
conferir('serviço em vb nasce com 100', [s2.prevista, s2.forma], [100, 'Percentual'])
conferir('orçamento tem um item por serviço com valor', (await buscarOrcamento()).data.itens.length, 2)
const criado = await salvarDiario({ data: HOJE, clima_manha: 'Sol', clima_tarde: 'Sol', equipe: ['f1'], atividades: {}, lancamentos: [{ servico_id: s1.id, quantidade: '10', qtd_pessoas: '1' }] })
conferir('diário é criado na obra nova', [criado.erro, criado.data.status, criado.data.obra_id], [null, 'Rascunho', nova.id])
conferir('rascunho ainda não conta', (await carregarCronograma()).data.execucoes.filter((e) => e.status === 'Enviado').length, 0)
const semGente = (await salvarDiario({ data: '2026-11-04', clima_manha: 'Sol', clima_tarde: 'Sol', equipe: [], lancamentos: [] })).data
conferir('diário sem ninguém na equipe não é enviado', (await enviarDiario(semGente.id)).erro, 'Marque pelo menos uma pessoa na equipe do dia antes de enviar.')
conferir('e continua rascunho', (await buscarDiario(semGente.id)).data.status, 'Rascunho')
await salvarDiario({ id: semGente.id, data: '2026-11-04', clima_manha: 'Sol', clima_tarde: 'Sol', equipe: ['f1', 'f2'], lancamentos: [] })
await salvarDiario({ id: semGente.id, data: '2026-11-04', clima_manha: 'Sol', clima_tarde: 'Sol', equipe: [], lancamentos: [] })
conferir('marcar, salvar e desmarcar todo mundo também não envia', (await enviarDiario(semGente.id)).erro !== null, true)
conferir('diário com equipe é enviado', (await enviarDiario(criado.data.id)).erro, null)
const cicloErro = await salvarServico({ ...s1, duracao: '3', prevista: '30', deps: [s2.id] })
conferir('editar criando ciclo é recusado', cicloErro.erros?.deps?.includes('Ciclo'), true)
conferir('excluir com dependente é recusado', (await excluirServico(s1.id)).erro !== null, true)
conferir('excluir sem impedimento funciona', (await excluirServico(s2.id)).erro, null)
await salvarServico({ ...s1, nome: 'Demolição geral', duracao: '4', prevista: '30', deps: [], valor: '3000', custo_mo: '1500' })
conferir('editar grava no mesmo serviço', (await carregarCronograma()).data.servicos.map((s) => [s.nome, s.duracao]), [['Demolição geral', 4]])

// ---------- Custo lançado muda o líquido ----------
const liquido = async () => calcularFaturamento((await buscarBaseFaturamento()).data, HOJE).obras.find((o) => o.id === nova.id).liquido
conferir('sem custo, líquido zero', await liquido(), 0)
const custo = (await salvarCusto({ data: HOJE, descricao: 'Caçamba', categoria: 'Equipamento', valor: '450,00', pago: false })).data
conferir('custo novo desconta do líquido', await liquido(), -450)
conferir('custo fica nesta obra', (await listarCustos()).data.map((k) => k.obra_id), [nova.id])
await salvarCusto({ ...custo, valor: custo.valor, pago: true })
conferir('marcar como pago grava', (await listarCustos()).data[0].pago, true)
await excluirCusto(custo.id)
conferir('excluir custo devolve o líquido', await liquido(), 0)

// ---------- O que não pode se perder ----------
definirObraAtual('obra-ap302')
await salvarDiario({ id: 'd02', data: '2026-10-05', equipe: [], lancamentos: [{ servico_id: 's1', quantidade: '45', qtd_pessoas: '3' }] })
conferir('diário sem equipe marcada mantém a contagem de pessoas', (await buscarDiario('d02')).data.qtd_pessoas, 3)
conferir('serviço com lançamento não troca entre verba e quantidade', Object.keys((await salvarServico({ id: 's3', nome: 'Hidráulica', frente: 'Hidráulica', unidade: 'm²', prevista: '10', duracao: '8', deps: ['s2'], valor: '9.500', responsavel_id: 'f2' })).erros ?? {}), ['unidade'])
conferir('serviço medido não é excluído', (await excluirServico('s4')).erro.includes('medição'), true)
const trocado = (await salvarServico({ id: 's4', nome: 'Infra elétrica (eletrodutos)', frente: 'Instalações', unidade: 'm', prevista: '120', duracao: '6', deps: ['s2'], valor: '3.360', responsavel_id: 'f3' })).data
conferir('trocar de frente não muda o número do item', [trocado.frente, trocado.numero_item], ['Instalações', '3.1'])
conferir('e a medição continua achando o serviço', (await excluirServico('s4')).erro.includes('medição'), true)
conferir('prestador não pode ficar vazio', (await definirPrestadorDoServico('s1', '')).erro, 'Todo serviço precisa de um prestador.')
definirObraAtual(nova.id)

// Orçamento digitado à mão: o sócio vê, o cliente só depois de publicado
definirPerfil('cliente')
conferir('cliente não vê orçamento ainda não publicado', (await buscarOrcamento()).data, null)
definirPerfil('socio')

// ---------- Nada cruza de uma obra para outra ----------
definirObraAtual('obra-cjf')
const antes = (await buscarDiarioDoDia('2026-09-30')).data
conferir('diário de outra obra é recusado, não vira um novo', (await salvarDiario({ id: 'd01', data: '2026-09-30', equipe: [], lancamentos: [] })).erro !== null, true)
conferir('e nada foi criado na obra atual', [antes, (await buscarDiarioDoDia('2026-09-30')).data], [null, null])
conferir('serviço de outra obra é recusado', (await salvarServico({ id: 's1', nome: 'X', frente: 'Y', unidade: 'vb', duracao: '1', deps: [] })).erro !== null, true)
conferir('custo de outra obra é recusado', (await salvarCusto({ id: 'k1', data: HOJE, descricao: 'X', categoria: 'Outros', valor: '1' })).erro !== null, true)
conferir('dependência em serviço de outra obra é recusada', (await salvarServico({ nome: 'X', frente: 'Y', unidade: 'vb', duracao: '1', deps: ['s1'] })).erros?.deps, 'Só dá para depender de um serviço desta obra.')
definirObraAtual(nova.id)

// Serviço sem valor ao cliente não entra: sumiria do orçamento e do contrato sem aviso
const soCusto = await salvarServico({ nome: 'Só custo', frente: 'Z', unidade: 'vb', duracao: '1', deps: [s1.id], custo_mo: '500', responsavel_id: 'f1' })
conferir('serviço sem valor não é gravado', [soCusto.data, soCusto.erros?.valor], [null, 'Digite o valor ao cliente.'])
const semAnterior = await salvarServico({ nome: 'Solto', frente: 'Z', unidade: 'vb', duracao: '1', deps: [], valor: '100', responsavel_id: 'f1' })
conferir('segundo serviço sem anterior não é gravado', semAnterior.erros?.deps?.startsWith('Escolha de qual serviço'), true)

// ---------- Só quem pode ----------
definirPerfil('auxiliar')
conferir('auxiliar não cria serviço', (await salvarServico({ nome: 'X', frente: 'Y', unidade: 'vb', duracao: '1', deps: [] })).erro !== null, true)
conferir('auxiliar não lança custo', (await salvarCusto({ data: HOJE, descricao: 'X', categoria: 'Outros', valor: '1' })).erro !== null, true)
conferir('auxiliar lança diário', (await salvarDiario({ data: '2026-11-04', clima_manha: 'Sol', clima_tarde: 'Sol', equipe: [], lancamentos: [] })).erro, null)
definirPerfil('cliente')
conferir('cliente não lança diário', (await salvarDiario({ data: '2026-11-05', equipe: [], lancamentos: [] })).erro !== null, true)
definirPerfil('socio')
definirObraAtual(null)
conferir('sem obra escolhida não grava diário', (await salvarDiario({ data: HOJE, equipe: [], lancamentos: [] })).erro !== null, true)
conferir('sem obra escolhida não cria serviço', (await salvarServico({ nome: 'X', frente: 'Y', unidade: 'vb', duracao: '1', deps: [] })).erro !== null, true)
conferir('sem obra escolhida não lança custo', (await salvarCusto({ data: HOJE, descricao: 'X', categoria: 'Outros', valor: '1' })).erro !== null, true)

console.log(`${ok}/${tot} — lançamentos`)
process.exit(ok === tot ? 0 : 1)
