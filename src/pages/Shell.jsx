import { useState } from 'react'
import { Icon, Vazio } from '../components'
import { ErroDeTela } from '../components/ErroDeTela'
import { SeletorObra } from '../components/SeletorObra'
import { useObra } from '../lib/ObraContext'
import { PERFIS, SUBTELAS, TELAS, itensDaBarra, menuDoUsuario, podeAbrir, telaDoMenu, telaInicial, telaPrecisaDeObra } from '../lib/menus'
import { HOJE } from '../lib/dados'
import { Avanco } from '../screens/avanco'
import { Perfil } from '../screens/cadastros'
import { Contratados } from '../screens/contratados'
import { Cotacoes } from '../screens/cotacoes'
import { Cronograma } from '../screens/cronograma'
import { DiarioDia, DiarioLista } from '../screens/diario'
import { EditarServico } from '../screens/editarServico'
import { Faturamento } from '../screens/faturamento'
import { Financeiro } from '../screens/financeiro'
import { Fotos } from '../screens/fotos'
import { Gestao } from '../screens/gestao'
import { Mais } from '../screens/mais'
import { MedicaoDetalhe, Medicoes, Pagamentos } from '../screens/medicoes'
import { FichaObra, Obras } from '../screens/obras'
import { Orcamento } from '../screens/orcamento'
import { Painel } from '../screens/painel'
import { Servicos } from '../screens/servicos'
import { Tarefas } from '../screens/tarefas'
import { Usuarios } from '../screens/usuarios'

// Uma shell para os três perfis: o menu de cada um vem de lib/menus.js.
export default function Shell({ usuario, onSair }) {
  const perfil = usuario.role
  const bloqueadas = usuario.telas_bloqueadas ?? []
  const { obra, obraId } = useObra()
  const [route, setRoute] = useState({ screen: telaInicial(perfil, bloqueadas), params: {}, obraId })
  // obraDestino: quando a tela abre já trocando de obra (ex.: da lista de obras para a ficha dela).
  const goto = (screen, params = {}, obraDestino = null) => {
    if (!podeAbrir(perfil, screen, bloqueadas)) return
    setRoute({ screen, params, obraId: obraDestino ?? obraId })
    window.scrollTo({ top: 0 })
  }

  const menu = menuDoUsuario(perfil, bloqueadas)
  // Subtela aberta em outra obra (um diário, uma medição) não vale na obra nova: volta para a lista.
  const telaAtual = SUBTELAS[route.screen] && route.obraId !== obraId ? telaDoMenu(perfil, route.screen, bloqueadas) : route.screen
  const doMenu = telaDoMenu(perfil, telaAtual, bloqueadas)
  // Na barra do celular, uma tela que mora em "Mais" acende o botão "Mais".
  const ativoNaBarra = menu.barra.includes(doMenu) ? doMenu : 'mais'
  const p = { perfil, usuario, goto, params: route.params }

  let body
  switch (telaAtual) {
    case 'painel': body = <Painel {...p} />; break
    case 'hoje': body = <DiarioDia {...p} params={{ data: HOJE }} />; break
    case 'diario':
    case 'meusDiarios': body = <DiarioLista {...p} />; break
    case 'diarioDia': body = <DiarioDia {...p} />; break
    case 'cronograma': body = <Cronograma {...p} />; break
    case 'editarServico': body = <EditarServico {...p} />; break
    case 'gestao': body = <Gestao {...p} />; break
    case 'tarefas': body = <Tarefas {...p} />; break
    case 'servicos': body = <Servicos {...p} />; break
    case 'contratados': body = <Contratados {...p} />; break
    case 'orcamento': body = <Orcamento {...p} />; break
    case 'medicoes': body = <Medicoes {...p} />; break
    case 'medicao': body = <MedicaoDetalhe {...p} />; break
    case 'pagamentos': body = <Pagamentos {...p} />; break
    case 'avanco': body = <Avanco {...p} />; break
    case 'cotacoes': body = <Cotacoes {...p} />; break
    case 'financeiro': body = <Financeiro {...p} />; break
    case 'fotos': body = <Fotos {...p} />; break
    case 'obras': body = <Obras {...p} />; break
    case 'fichaObra': body = <FichaObra {...p} />; break
    case 'usuarios': body = <Usuarios {...p} />; break
    case 'perfil': body = <Perfil {...p} onSair={onSair} />; break
    case 'mais': body = <Mais menu={menu} goto={goto} />; break
    case 'faturamento': body = <Faturamento {...p} />; break
    default: body = null
  }

  // Primeiro uso, ou pessoa sem obra liberada: nenhuma tela de obra abre sem obra.
  if (!obra && telaPrecisaDeObra(telaAtual, route.params)) {
    body = perfil === 'socio'
      ? <Vazio icone="obra" titulo="Cadastre a sua primeira obra" texto="Tudo no app acontece dentro de uma obra: cronograma, diário, orçamento e custos."
        botao="Cadastrar a primeira obra" onBotao={() => goto('fichaObra', { nova: true })} />
      : <Vazio icone="obra" titulo="Nenhuma obra liberada para você" texto="Fale com a engenharia para vincular a sua obra à sua conta." />
  }

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Menu">
        <div className="marca">
          <img className="marca-logo" src="/logo-mpa.webp" alt="MPA Building, Gestão de Obras" />
        </div>
        <nav className="side-nav">
          {menu.barra.map((t) => (
            <LinkLateral key={t} tela={t} atual={doMenu} goto={goto} />
          ))}
          {menu.mais.length > 0 && <span className="label sep">Mais</span>}
          {menu.mais.map((t) => (
            <LinkLateral key={t} tela={t} atual={doMenu} goto={goto} />
          ))}
        </nav>
        <div className="side-usuario">
          <strong>{usuario.nome}</strong>
          <span className="label">{PERFIS[perfil].rotulo}</span>
          <button className="btn btn-mono btn-block" style={{ marginTop: 12 }} onClick={onSair}>Sair</button>
        </div>
      </aside>

      <main>
        <header className="topo">
          <img className="topo-icone so-celular" src="/icone-mpa.png" alt="MPA Building" />
          <SeletorObra />
          <button className="btn-texto so-celular" onClick={onSair}>Sair</button>
        </header>
        {/* Trocar de obra remonta o conteúdo: nada da obra anterior sobra na tela. */}
        <div key={`${obraId}-${telaAtual}-${JSON.stringify(route.params)}`}>
          {SUBTELAS[telaAtual] && <button className="btn-voltar" onClick={() => goto(doMenu)}>‹ Voltar para {TELAS[doMenu].titulo}</button>}
          <ErroDeTela>{body}</ErroDeTela>
        </div>
      </main>

      <nav className="tabbar" aria-label="Navegação">
        {itensDaBarra(perfil, bloqueadas).map((t) => (
          <button
            key={t}
            className="tab"
            aria-current={ativoNaBarra === t ? 'page' : undefined}
            onClick={() => goto(t)}
          >
            <Icon nome={TELAS[t].icone} />
            {TELAS[t].curto}
          </button>
        ))}
      </nav>
    </div>
  )
}

function LinkLateral({ tela, atual, goto }) {
  return (
    <button
      className="side-link"
      aria-current={atual === tela ? 'page' : undefined}
      onClick={() => goto(tela)}
    >
      <Icon nome={TELAS[tela].icone} tamanho={22} />
      {TELAS[tela].titulo}
    </button>
  )
}
