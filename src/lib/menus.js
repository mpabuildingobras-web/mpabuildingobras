// Quem vê qual tela. Dono único dos menus: shell, barra inferior e menu lateral leem daqui.
// O perfil é o TETO de acesso; o sócio pode bloquear telas de cada usuário dentro desse teto
// (telas_bloqueadas), mas nunca dar a alguém uma tela que o perfil dele não tem.

export const PERFIS = {
  socio: { rotulo: 'Sócio', inicio: 'painel' },
  auxiliar: { rotulo: 'Auxiliar', inicio: 'hoje' },
  cliente: { rotulo: 'Cliente', inicio: 'avanco' },
}

export const TELAS = {
  painel: { titulo: 'Painel do dia', curto: 'Início', icone: 'home' },
  hoje: { titulo: 'Diário de hoje', curto: 'Hoje', icone: 'diario' },
  meusDiarios: { titulo: 'Meus diários', curto: 'Diários', icone: 'lista' },
  avanco: { titulo: 'Avanço da obra', curto: 'Avanço', icone: 'home' },
  diario: { titulo: 'Diário de obra', curto: 'Diário', icone: 'diario' },
  cronograma: { titulo: 'Cronograma', curto: 'Cronog.', icone: 'crono' },
  medicoes: { titulo: 'Medições', curto: 'Medições', icone: 'medicao' },
  gestao: { titulo: 'Gestão de Obras', curto: 'Gestão', icone: 'gestao' },
  tarefas: { titulo: 'Tarefas', curto: 'Tarefas', icone: 'tarefa' },
  servicos: { titulo: 'Serviços', curto: 'Serviços', icone: 'ferramenta' },
  contratados: { titulo: 'Contratados', curto: 'Contrat.', icone: 'equipe' },
  orcamento: { titulo: 'Orçamento', curto: 'Orçam.', icone: 'orcamento' },
  pagamentos: { titulo: 'Pagamentos', curto: 'Pagar', icone: 'pagamento' },
  faturamento: { titulo: 'Faturamento', curto: 'Faturam.', icone: 'pagamento' },
  cotacoes: { titulo: 'Compras', curto: 'Compras', icone: 'compras' },
  financeiro: { titulo: 'Financeiro da obra', curto: 'Financeiro', icone: 'fin' },
  fotos: { titulo: 'Fotos', curto: 'Fotos', icone: 'foto' },
  obras: { titulo: 'Obras', curto: 'Obras', icone: 'obra' },
  usuarios: { titulo: 'Usuários', curto: 'Usuários', icone: 'user' },
  perfil: { titulo: 'Meu perfil', curto: 'Perfil', icone: 'user' },
  mais: { titulo: 'Mais', curto: 'Mais', icone: 'mais' },
}

// barra = itens fixos da barra inferior do celular (até 4; o 5º é "Mais" quando houver mais).
// mais  = o resto, que no computador aparece direto no menu lateral.
export const MENUS = {
  socio: {
    barra: ['painel', 'diario', 'cronograma', 'tarefas'],
    mais: ['gestao', 'servicos', 'contratados', 'cotacoes', 'medicoes', 'orcamento', 'financeiro', 'faturamento', 'fotos', 'obras', 'usuarios', 'perfil'],
  },
  auxiliar: {
    barra: ['hoje', 'meusDiarios', 'perfil'],
    mais: [],
  },
  cliente: {
    barra: ['avanco', 'orcamento', 'pagamentos', 'diario'],
    mais: ['fotos', 'cotacoes', 'perfil'],
  },
}

// Telas que mostram preço, valor ou custo. O auxiliar não abre nenhuma.
export const TELAS_COM_DINHEIRO = ['medicoes', 'orcamento', 'pagamentos', 'faturamento', 'cotacoes', 'financeiro']

// Telas que mostram custo interno, dados da equipe ou juntam obras. Só sócio.
export const TELAS_SO_SOCIO = ['faturamento', 'gestao', 'tarefas', 'servicos', 'contratados', 'financeiro', 'cronograma', 'medicoes', 'obras', 'usuarios']

// Telas que não estão no menu, abertas a partir de outra. Herdam a permissão de quem as abre.
export const SUBTELAS = {
  diarioDia: ['diario', 'meusDiarios', 'hoje'],
  medicao: ['medicoes', 'pagamentos'],
  fichaObra: ['obras'],
}

// Menu de um usuário: o do perfil, menos o que o sócio bloqueou.
export function menuDoUsuario(perfil, bloqueadas = []) {
  const m = MENUS[perfil]
  if (!m) return { barra: [], mais: [] }
  const livre = (t) => !bloqueadas.includes(t)
  return { barra: m.barra.filter(livre), mais: m.mais.filter(livre) }
}

// Telas que o sócio pode marcar para um perfil. "Meu perfil" fica sempre: é onde se sai do app.
export const telasConfiguraveis = (perfil) => {
  const m = MENUS[perfil]
  return m ? [...m.barra, ...m.mais].filter((t) => t !== 'perfil') : []
}

export function telaInicial(perfil, bloqueadas = []) {
  const m = menuDoUsuario(perfil, bloqueadas)
  const inicio = PERFIS[perfil]?.inicio
  return m.barra.includes(inicio) ? inicio : ([...m.barra, ...m.mais][0] ?? 'perfil')
}

export function podeAbrir(perfil, tela, bloqueadas = []) {
  const m = menuDoUsuario(perfil, bloqueadas)
  if (!MENUS[perfil]) return false
  if (tela === 'mais') return m.mais.length > 0
  if (SUBTELAS[tela]) return SUBTELAS[tela].some((pai) => podeAbrir(perfil, pai, bloqueadas))
  return m.barra.includes(tela) || m.mais.includes(tela)
}

// Item do menu que acende quando a tela atual é uma subtela.
export function telaDoMenu(perfil, tela, bloqueadas = []) {
  if (!SUBTELAS[tela]) return tela
  return SUBTELAS[tela].find((pai) => podeAbrir(perfil, pai, bloqueadas)) ?? tela
}

export function itensDaBarra(perfil, bloqueadas = []) {
  const m = menuDoUsuario(perfil, bloqueadas)
  return m.mais.length ? [...m.barra, 'mais'] : [...m.barra]
}
