// Peças reutilizáveis.
import { useEffect, useRef, useState } from 'react'

const linha = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' }

const ICONES = {
  home: <path {...linha} d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />,
  diario: <path {...linha} d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3v18M9.5 8h5M9.5 12h5" />,
  lista: <path {...linha} d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  crono: <path {...linha} d="M4 5h9M8 10h9M12 15h8M6 20h6M3 3v19" />,
  medicao: <path {...linha} d="m3 16 13-13 5 5L8 21zM7 12l2 2M10 9l2 2M13 6l2 2" />,
  orcamento: <path {...linha} d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />,
  pagamento: <path {...linha} d="M3 6h18v12H3zM3 10h18M7 15h4" />,
  fin: <path {...linha} d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  cotacao: <path {...linha} d="M4 5h16v14H4zM4 10h16M10 10v9" />,
  foto: <g {...linha}><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><circle cx="12" cy="13" r="3.5" /></g>,
  obra: <path {...linha} d="M3 21h18M5 21V9l7-5 7 5v12M10 21v-6h4v6" />,
  equipe: <g {...linha}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.7 3 2.4 3.5 5.2" /></g>,
  user: <g {...linha}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.2 4-6.5 8-6.5s7 2.3 8 6.5" /></g>,
  gestao: <path {...linha} d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  tarefa: <path {...linha} d="M4 6h1.5M4 12h1.5M4 18h1.5M9 6h11M9 12h11M9 18h11" />,
  ferramenta: <path {...linha} d="M14.5 6.5a4 4 0 0 0 5 5l-8.5 8.5a2.2 2.2 0 0 1-3-3zM14.5 6.5 17 4l3 3-2.500 2.500" />,
  compras: <g {...linha}><path d="M3 4h2.500l2 11h10l2-8H6.500" /><circle cx="9" cy="19.500" r="1.300" /><circle cx="16.500" cy="19.500" r="1.300" /></g>,
  abrir: <path {...linha} d="m6 9 6 6 6-6" />,
  camera: <g {...linha}><path d="M3 7h4l2-3h6l2 3h4v13H3z" /><path d="M12 10v6M9 13h6" /></g>,
  mais: <g fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></g>,
}

// Tela sem registro: ícone, frase acolhedora e, quando der, o botão de criar o primeiro.
export function Vazio({ icone = 'lista', titulo, texto, botao, onBotao }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon nome={icone} tamanho={44} /></div>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {botao && <button className="btn btn-primary" onClick={onBotao}>{botao}</button>}
    </div>
  )
}

// A resposta da segunda-feira: "a entrega está de pé?". É o destaque da tela inicial.
export function EntregaDestaque({ atraso, previsao, contratada, children }) {
  return (
    <section className={`entrega-destaque ${atraso ? 'atrasada' : 'no-prazo'}`}>
      <h1>{atraso ? `Entrega com ${atraso} ${atraso === 1 ? 'dia' : 'dias'} de atraso` : 'Entrega no prazo'}</h1>
      <p>Previsão {previsao}, contratada {contratada}{children}</p>
    </section>
  )
}

// Botão que salva mostra que está salvando, e não aceita um segundo clique no meio.
export function useOcupado() {
  const [ocupado, setOcupado] = useState(false)
  const rodar = async (fn) => {
    if (ocupado) return undefined
    setOcupado(true)
    try { return await fn() } finally { setOcupado(false) }
  }
  return [ocupado, rodar]
}

export function Titulo({ rotulo, titulo, children }) {
  return (
    <div className="page-title">
      <span className="label">{rotulo}</span>
      <h1>{titulo}</h1>
      {children}
    </div>
  )
}

// Aviso que some sozinho (toast).
export function useAviso() {
  const [texto, setTexto] = useState('')
  const timer = useRef(null)
  const mostrar = (t) => {
    setTexto(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setTexto(''), 2800)
  }
  const elemento = texto ? <div className="toast" role="status">{texto}</div> : null
  return [elemento, mostrar]
}

// Carrega dados da camada de dados ao abrir a tela (a tela remonta ao trocar de obra).
export function useCarregar(carregar, dependencias = []) {
  const [estado, setEstado] = useState({ data: null, erro: null, carregando: true })
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    carregar().then(({ data, erro }) => setEstado({ data, erro, carregando: false }))
  }, [versao, ...dependencias])
  return { ...estado, recarregar: () => setVersao((v) => v + 1) }
}

export function Carregando({ estado, children }) {
  if (estado.carregando) return <div className="page-title"><p>Carregando…</p></div>
  if (estado.erro) return <div className="page-title"><p className="c-red">{estado.erro}</p></div>
  return children
}

export function Icon({ nome, tamanho = 24 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      {ICONES[nome] ?? ICONES.lista}
    </svg>
  )
}
