// Dados de mentira até a Etapa 7. As mesmas duas obras viram o seed do banco.
// Elas são diferentes de propósito: com uma obra só, filtro esquecido não dá sintoma.
// A CJF não tem orçamento, medição nem cotação: é o "dado que a outra não tem".
// "Hoje" nos exemplos: terça, 03/11/2026.

export const HOJE = '2026-11-03'

export const obras = [
  {
    id: 'obra-ap302', codigo: 'AP302', nome: 'Reforma Apto 302 — Ed. Aurora',
    endereco: 'Rua Aurora, 1200, apto 302', cliente_nome: 'Cláudia Cliente',
    data_inicio: '2026-09-29', data_entrega: '2026-11-27', situacao: 'Em andamento',
    foto: null, cliente_telefone: '(11) 90000-0001', cliente_email: 'claudia@exemplo.com', cliente_documento: '000.000.000-01',
    descricao: 'Reforma completa de apartamento de 85 m²: banheiros, piso da área social, forro de gesso e pintura geral.',
    informacoes: 'Obra permitida de segunda a sexta, das 8h às 17h. Elevador de serviço reservado com a portaria. Síndico: Sr. Exemplo.',
    documentos: [{ id: 'doc1', nome: 'Planta de reforma.pdf' }, { id: 'doc2', nome: 'ART de execução.pdf' }],
  },
  {
    id: 'obra-cjf', codigo: 'CJF', nome: 'Reforma Casa Jardim das Flores',
    endereco: 'Rua das Hortênsias, 210 — Jardim das Flores', cliente_nome: 'Roberto Exemplo',
    data_inicio: '2026-10-19', data_entrega: '2027-02-26', situacao: 'Em andamento',
    foto: null, cliente_telefone: '(11) 90000-0002', cliente_email: 'roberto@exemplo.com', cliente_documento: '00.000.000/0001-02',
    descricao: 'Reforma de casa térrea: nova cozinha e lavanderia, revisão elétrica e do telhado.',
    informacoes: 'Moradores continuam na casa durante a obra. Chave com o caseiro.',
    documentos: [],
  },
]

// Quem (além dos sócios, que veem todas) enxerga qual obra.
export const membros = [
  { obra_id: 'obra-ap302', usuario_id: 'u3', papel: 'auxiliar' },
  { obra_id: 'obra-cjf', usuario_id: 'u3', papel: 'auxiliar' },
  { obra_id: 'obra-ap302', usuario_id: 'u4', papel: 'cliente' },
]

// Senha de teste (só do ambiente de exemplo; some na Etapa 7, quando o login vira Supabase).
export const usuarios = [
  { id: 'u1', nome: 'Ana Exemplo', email: 'ana@exemplo.com', role: 'socio', telas_bloqueadas: [], senha_teste: 'obra1234' },
  { id: 'u2', nome: 'Bruno Exemplo', email: 'bruno@exemplo.com', role: 'socio', telas_bloqueadas: [], senha_teste: 'obra1234' },
  { id: 'u3', nome: 'Rita Auxiliar', email: 'rita@exemplo.com', role: 'auxiliar', telas_bloqueadas: [], senha_teste: 'obra1234' },
  { id: 'u4', nome: 'Cláudia Cliente', email: 'claudia@exemplo.com', role: 'cliente', telas_bloqueadas: [], senha_teste: 'obra1234' },
  { id: 'u5', nome: 'Novo Usuário', email: 'novo@exemplo.com', role: 'pendente', telas_bloqueadas: [], senha_teste: 'obra1234' },
]

// A equipe circula entre obras: não tem obra_id. Só sócios veem esta lista.
export const contratados = [
  { id: 'f1', nome: 'José', funcao: 'Servente', tipo: 'Funcionário', empresa: '' },
  { id: 'f2', nome: 'Carlos', funcao: 'Encanador', tipo: 'Prestador', empresa: 'Hidro Exemplo' },
  { id: 'f3', nome: 'Paulo', funcao: 'Eletricista', tipo: 'Prestador', empresa: 'Elétrica Exemplo' },
  { id: 'f4', nome: 'Marcos', funcao: 'Pedreiro', tipo: 'Funcionário', empresa: '' },
  { id: 'f5', nome: 'Antônio', funcao: 'Azulejista', tipo: 'Prestador', empresa: '' },
  { id: 'f6', nome: 'Rafael', funcao: 'Gesseiro', tipo: 'Prestador', empresa: 'Gesso Exemplo' },
  { id: 'f7', nome: 'Luiz', funcao: 'Pintor', tipo: 'Prestador', empresa: '' },
  { id: 'f8', nome: 'Edson', funcao: 'Servente', tipo: 'Funcionário', empresa: '' },
]

// O que está pendente de fazer em cada obra. Só sócios veem.
export const tarefas = [
  { id: 't1', obra_id: 'obra-ap302', titulo: 'Comprar registro de gaveta da suíte', responsavel: 'Ana Exemplo', prazo: '2026-11-03', prioridade: 'Alta', status: 'Em andamento' },
  { id: 't2', obra_id: 'obra-ap302', titulo: 'Cobrar teste de estanqueidade da hidráulica', responsavel: 'Bruno Exemplo', prazo: '2026-10-30', prioridade: 'Alta', status: 'Pendente' },
  { id: 't3', obra_id: 'obra-ap302', titulo: 'Enviar quadro do porcelanato para a cliente', responsavel: 'Ana Exemplo', prazo: '2026-11-05', prioridade: 'Média', status: 'Pendente' },
  { id: 't4', obra_id: 'obra-ap302', titulo: 'Registrar ART de execução', responsavel: 'Ana Exemplo', prazo: '2026-09-28', prioridade: 'Alta', status: 'Concluída' },
  { id: 't5', obra_id: 'obra-cjf', titulo: 'Aprovar projeto elétrico com o cliente', responsavel: 'Bruno Exemplo', prazo: '2026-11-10', prioridade: 'Média', status: 'Pendente' },
  { id: 't6', obra_id: 'obra-cjf', titulo: 'Contratar telhadista', responsavel: 'Ana Exemplo', prazo: '2026-11-06', prioridade: 'Baixa', status: 'Pendente' },
]

// Serviço = item do orçamento. Itens em vb são medidos por percentual (previsto = 100).
const S = (id, obra_id, numero_item, frente, nome, unidade, prevista, duracao, deps, responsavel_id, extra = {}) => ({
  id, obra_id, numero_item, frente, nome, unidade, prevista, duracao, deps, responsavel_id,
  tipo: 'Normal', forma: unidade === 'vb' ? 'Percentual' : 'Quantidade', ...extra,
})

export const servicos = [
  S('s1', 'obra-ap302', '1.1', 'Demolição', 'Demolição de revestimentos', 'm²', 85, 5, [], 'f1', { obs: 'Considerada remoção com martelete' }),
  S('s2', 'obra-ap302', '1.2', 'Demolição', 'Retirada de entulho', 'vb', 100, 2, ['s1'], 'f8', { obs: 'Ensacamento e descida em todas as etapas' }),
  S('s3', 'obra-ap302', '2.1', 'Hidráulica', 'Hidráulica embutida banheiros', 'vb', 100, 8, ['s2'], 'f2'),
  S('s4', 'obra-ap302', '3.1', 'Elétrica', 'Infra elétrica (eletrodutos)', 'm', 120, 6, ['s2'], 'f3'),
  S('s5', 'obra-ap302', '4.1', 'Alvenaria', 'Reboco de paredes', 'm²', 60, 6, ['s3', 's4'], 'f4'),
  S('s6', 'obra-ap302', '5.1', 'Pisos', 'Contrapiso', 'm²', 70, 4, ['s3'], 'f4'),
  S('s7', 'obra-ap302', '6.1', 'Revestimento', 'Porcelanato piso', 'm²', 70, 8, ['s6'], 'f5'),
  S('s8', 'obra-ap302', '6.2', 'Revestimento', 'Revestimento parede banheiros', 'm²', 45, 7, ['s5'], 'f5'),
  S('s9', 'obra-ap302', '7.1', 'Gesso', 'Forro de gesso', 'm²', 65, 6, ['s4'], 'f6', { obs: 'Valor já incluso o material' }),
  S('s10', 'obra-ap302', '8.1', 'Pintura', 'Pintura geral', 'm²', 240, 8, ['s7', 's8', 's9'], 'f7'),
  { id: 's11', obra_id: 'obra-ap302', numero_item: '9.1', frente: 'Gestão de obra', nome: 'Gestão de obra — 10% sobre o total da obra', unidade: '%', tipo: 'Percentual', percentual: 10, obs: 'Acompanha o executado dos outros itens' },

  S('c1', 'obra-cjf', '1.1', 'Serviços preliminares', 'Proteção de pisos e esquadrias', 'vb', 100, 2, [], 'f1'),
  S('c2', 'obra-cjf', '2.1', 'Demolição', 'Demolição da cozinha e lavanderia', 'm²', 38, 5, ['c1'], 'f8'),
  S('c3', 'obra-cjf', '3.1', 'Elétrica', 'Novo quadro e circuitos', 'vb', 100, 10, ['c2'], 'f3'),
  S('c4', 'obra-cjf', '4.1', 'Telhado', 'Revisão do telhado e calhas', 'vb', 100, 6, ['c1'], 'f6'),
]

// Valor ao cliente (TOTAL ENG.) e custo de mão de obra (TOTAL MO) moram separados, como no banco.
export const servicosValores = [
  ['s1', 2975], ['s2', 1800], ['s3', 9500], ['s4', 3360], ['s5', 2520],
  ['s6', 2660], ['s7', 4550], ['s8', 3150], ['s9', 3575], ['s10', 5280], ['s11', 3937],
].map(([servico_id, valor_cliente]) => ({ obra_id: 'obra-ap302', servico_id, valor_cliente }))

export const servicosCustos = servicosValores.map((v) => ({
  obra_id: v.obra_id, servico_id: v.servico_id,
  custo_mo: v.servico_id === 's11' ? 0 : Math.round((v.valor_cliente / 1.5) * 100) / 100,
}))

export const orcamentos = [
  { obra_id: 'obra-ap302', titulo: 'ORÇAMENTO - APTO 302 - ED. AURORA', importado_em: '2026-09-29', qtd_etapas: 9, qtd_itens: 11 },
]

const D = (id, obra_id, data, status, qtd_pessoas, clima = ['Sol', 'Sol'], extra = {}) => ({
  id, obra_id, data, status, qtd_pessoas, clima_manha: clima[0], clima_tarde: clima[1], ...extra,
})

export const diarios = [
  D('d01', 'obra-ap302', '2026-09-30', 'Aprovado', 3),
  D('d02', 'obra-ap302', '2026-10-05', 'Aprovado', 3),
  D('d03', 'obra-ap302', '2026-10-06', 'Aprovado', 2),
  D('d04', 'obra-ap302', '2026-10-07', 'Aprovado', 2),
  D('d05', 'obra-ap302', '2026-10-08', 'Aprovado', 4),
  D('d06', 'obra-ap302', '2026-10-09', 'Aprovado', 4),
  D('d07', 'obra-ap302', '2026-10-15', 'Aprovado', 3, ['Nublado', 'Sol']),
  D('d08', 'obra-ap302', '2026-10-22', 'Aprovado', 2),
  D('d09', 'obra-ap302', '2026-10-28', 'Aprovado', 4, ['Sol', 'Sol'], { equipe: ['f2', 'f8', 'f6', 'f1'], atividades: { f2: 'Prumadas do banheiro social', f8: 'Apoio à hidráulica', f6: 'Estrutura do forro da sala', f1: 'Apoio ao gesso e limpeza' } }),
  D('d10', 'obra-ap302', '2026-10-29', 'Aprovado', 3, ['Nublado', 'Chuva'], { equipe: ['f6', 'f1', 'f2'], atividades: { f6: 'Placas do forro da sala', f1: 'Apoio ao gesso', f2: 'Conferência de pontos' }, ocorrencias: 'Chuva parou a obra às 15h.' }),
  D('d11', 'obra-ap302', '2026-10-30', 'Devolvido', 3, ['Sol', 'Sol'], { equipe: ['f2', 'f8', 'f1'], atividades: { f2: 'Teste de estanqueidade', f8: 'Apoio à hidráulica', f1: 'Limpeza' }, comentario_devolucao: 'Faltou a foto do teste de estanqueidade.' }),
  D('d12', 'obra-ap302', '2026-11-03', 'Enviado', 4, ['Sol', 'Nublado'], { equipe: ['f2', 'f8', 'f4', 'f1'], atividades: { f2: 'Ligou o ramal de água fria do banheiro social', f8: 'Apoio ao encanador', f4: 'Preparou a argamassa do reboco', f1: 'Limpeza e descida de entulho' }, ocorrencias: 'Faltou registro de gaveta do banheiro da suíte. Compra pedida, chega amanhã às 8h.', enviado_por: 'Rita Auxiliar', enviado_as: '17h12' }),

  D('e01', 'obra-cjf', '2026-10-19', 'Aprovado', 2),
  D('e02', 'obra-cjf', '2026-10-20', 'Aprovado', 2),
  D('e03', 'obra-cjf', '2026-10-26', 'Aprovado', 3, ['Nublado', 'Nublado']),
  D('e04', 'obra-cjf', '2026-11-03', 'Rascunho', 5, ['Sol', 'Sol'], { equipe: ['f3', 'f8', 'f6', 'f4', 'f7'], atividades: { f3: 'Levantamento do quadro antigo', f8: 'Retirada de entulho da cozinha', f6: 'Vistoria do telhado' } }),
]

const E = (diario_id, servico_id, quantidade, qtd_pessoas, descricao = '') => ({ diario_id, servico_id, quantidade, qtd_pessoas, descricao })

export const execucoes = [
  E('d01', 's1', 40, 3), E('d02', 's1', 45, 3),
  E('d03', 's2', 50, 2), E('d04', 's2', 50, 2),
  E('d05', 's4', 30, 2), E('d05', 's3', 10, 2),
  E('d06', 's4', 30, 2),
  E('d07', 's4', 60, 2), E('d07', 's3', 20, 1),
  E('d08', 's3', 20, 2),
  E('d09', 's3', 10, 2), E('d09', 's9', 10, 2),
  E('d10', 's9', 8, 2),
  E('d11', 's3', 10, 2),
  E('d12', 's3', 10, 2, 'Ramal de água fria do banheiro social ligado'),

  E('e01', 'c1', 50, 2), E('e02', 'c1', 50, 2),
  E('e03', 'c2', 12, 3),
]

export const fotos = [
  { id: 'p1', diario_id: 'd12', servico_id: 's3', legenda: 'Ramal banheiro social' },
  { id: 'p2', diario_id: 'd12', servico_id: 's3', legenda: 'Registro faltando' },
  { id: 'p3', diario_id: 'd10', servico_id: 's9', legenda: 'Estrutura do forro, sala' },
  { id: 'p4', diario_id: 'd09', servico_id: 's9', legenda: 'Início do forro' },
  { id: 'p5', diario_id: 'd07', servico_id: 's4', legenda: 'Eletrodutos concluídos' },
  { id: 'p6', diario_id: 'd02', servico_id: 's1', legenda: 'Banheiros demolidos' },
  { id: 'p7', diario_id: 'e03', servico_id: 'c2', legenda: 'Demolição da cozinha' },
]

export const medicoes = [
  { id: 'm1', obra_id: 'obra-ap302', numero: 1, periodo_inicio: '2026-09-29', periodo_fim: '2026-10-09', vencimento: '2026-10-14', status: 'Paga', data_pagamento: '2026-10-14',
    itens: [['1.1', 'Demolição de revestimentos', '85 m²', 2975], ['1.2', 'Retirada de entulho', '100%', 1800], ['3.1', 'Infra elétrica', '60 m', 1680], ['2.1', 'Hidráulica embutida', '10%', 950], ['9.1', 'Gestão de obra (10%)', '', 740.5]] },
  { id: 'm2', obra_id: 'obra-ap302', numero: 2, periodo_inicio: '2026-10-12', periodo_fim: '2026-10-23', vencimento: '2026-11-05', status: 'Fechada',
    itens: [['3.1', 'Infra elétrica', '60 m', 1680], ['2.1', 'Hidráulica embutida', '40%', 3800], ['9.1', 'Gestão de obra (10%)', '', 548]] },
  { id: 'm3', obra_id: 'obra-ap302', numero: 3, periodo_inicio: '2026-10-26', periodo_fim: '2026-11-06', vencimento: '2026-11-11', status: 'Rascunho',
    itens: [['2.1', 'Hidráulica embutida', '10%', 950], ['7.1', 'Forro de gesso', '18 m²', 990], ['9.1', 'Gestão de obra (10%)', '', 194]] },
].map((m) => ({ ...m, valor_total: m.itens.reduce((s, i) => s + i[3], 0) }))

export const cotacoes = [
  { id: 'q1', obra_id: 'obra-ap302', titulo: 'Porcelanato piso — 70 m²', status: 'Aguardando cliente',
    propostas: [['Fornecedor A', 6300, '15 dias', '30/60 dias'], ['Fornecedor B', 5880, '20 dias', 'À vista'], ['Fornecedor C', 6950, '7 dias', '3x sem juros']], comentarios: [] },
  { id: 'q2', obra_id: 'obra-ap302', titulo: 'Louças e metais dos banheiros', status: 'Escolhido', escolhida: 'Fornecedor B',
    propostas: [['Fornecedor A', 4120, '10 dias', 'À vista'], ['Fornecedor B', 3890, '12 dias', '2x']],
    comentarios: [['Cláudia Cliente', '27/10', 'Fico com o B, gostei mais do acabamento.']] },
  { id: 'q3', obra_id: 'obra-ap302', titulo: 'Placas de gesso', status: 'Em cotação', propostas: [['Fornecedor D', 1260, '3 dias', 'À vista']], comentarios: [] },
  { id: 'q4', obra_id: 'obra-ap302', titulo: 'Tinta acrílica', status: 'Comprado', escolhida: 'Fornecedor A', propostas: [['Fornecedor A', 1480, '2 dias', 'À vista']], comentarios: [] },
]

export const custos = [
  { id: 'k1', obra_id: 'obra-ap302', data: '2026-10-10', descricao: 'Mão de obra — quinzena 1', categoria: 'Mão de obra', valor: 6200, pago: true },
  { id: 'k2', obra_id: 'obra-ap302', data: '2026-10-24', descricao: 'Mão de obra — quinzena 2', categoria: 'Mão de obra', valor: 5800, pago: true },
  { id: 'k3', obra_id: 'obra-ap302', data: '2026-10-08', descricao: 'Tubos e conexões', categoria: 'Material', valor: 1340, pago: true },
  { id: 'k4', obra_id: 'obra-ap302', data: '2026-10-27', descricao: 'Perfis e placas de gesso', categoria: 'Material', valor: 980, pago: false },
  { id: 'k5', obra_id: 'obra-ap302', data: '2026-09-30', descricao: 'Caçamba de entulho', categoria: 'Equipamento', valor: 450, pago: true },
  { id: 'k6', obra_id: 'obra-cjf', data: '2026-10-20', descricao: 'Lona e papelão de proteção', categoria: 'Material', valor: 310, pago: true },
]

// ---------- Junções que o banco vai fazer por SQL ----------
export function execucoesComStatus() {
  return execucoes.map((e) => {
    const d = diarios.find((x) => x.id === e.diario_id)
    return { ...e, obra_id: d.obra_id, data: d.data, status: d.status }
  })
}

export function itensDoOrcamento(obraId) {
  return servicos
    .filter((s) => s.obra_id === obraId)
    .map((s) => ({
      ...s,
      valor: servicosValores.find((v) => v.servico_id === s.id)?.valor_cliente,
      custo_mo: servicosCustos.find((v) => v.servico_id === s.id)?.custo_mo,
    }))
    .filter((s) => s.valor !== undefined)
}
