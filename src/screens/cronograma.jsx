import { useEffect, useRef, useState } from 'react'
import { Carregando, Vazio, useCarregar } from '../components'
import { carregarCronograma, listarContratados } from '../lib/dados'
import { calcularCascata, statusQueContam } from '../lib/cronograma'
import { ddmm } from '../lib/formato'
import { HOJE } from '../lib/mockData'

async function carregar() {
  const [cr, fu] = await Promise.all([carregarCronograma(), listarContratados()])
  return { data: { ...cr.data, contratados: fu.data }, erro: cr.erro ?? fu.erro }
}

export function Cronograma({ goto }) {
  const estado = useCarregar(carregar)
  return (
    <Carregando estado={estado}>
      {estado.data && <Gantt dados={estado.data} goto={goto} />}
    </Carregando>
  )
}

// Posição no eixo: dias corridos desde a segunda-feira da semana de início da obra.
const num = (iso) => { const [a, m, d] = iso.split('-').map(Number); return Date.UTC(a, m - 1, d) / 864e5 }
const iso = (n) => new Date(n * 864e5).toISOString().slice(0, 10)

function Gantt({ dados, goto }) {
  const { obra, servicos, execucoes, contratados } = dados
  const [dw, setDw] = useState(20)
  const [sel, setSel] = useState(null)
  const rolagem = useRef(null)

  const temServicos = servicos.length > 0
  const c = temServicos ? calcularCascata({ servicos, execucoes, obra, hoje: HOJE, contam: statusQueContam('socio') }) : null

  const inicio = (() => { const n = num(obra.data_inicio); const sem = new Date(n * 864e5).getUTCDay(); return n - ((sem + 6) % 7) })()
  const fimDatas = c ? [c.previsaoEntrega, obra.data_entrega] : [obra.data_entrega]
  const dias = Math.ceil((Math.max(...fimDatas.map(num)) + 8 - inicio) / 7) * 7
  const idx = (d) => num(d) - inicio

  useEffect(() => {
    const el = rolagem.current
    if (!el) return
    const lw = el.querySelector('.g-label')?.offsetWidth ?? 140
    el.scrollLeft = Math.max(0, idx(HOJE) * dw - (el.clientWidth - lw) / 3)
  }, [dw])

  if (!temServicos) {
    return <Vazio icone="crono" titulo="Esta obra ainda não tem cronograma"
      texto="Cadastre as frentes e os serviços desta obra, com a duração e de quem cada um depende."
      botao="Cadastrar o primeiro serviço" onBotao={() => goto('editarServico')} />
  }

  const nome = (id) => contratados.find((f) => f.id === id)?.nome ?? '—'
  const semanas = []
  const diasCab = []
  for (let i = 0; i < dias; i++) {
    const d = iso(inicio + i)
    const sem = new Date((inicio + i) * 864e5).getUTCDay()
    if (i % 7 === 0) semanas.push(<div key={i} className="g-sem" style={{ '--s': i }}>{ddmm(d)}</div>)
    diasCab.push(<div key={i} className={`g-dia${sem % 6 === 0 ? ' fds' : ''}`} style={{ '--s': i }}>{Number(d.slice(8))}</div>)
  }
  const fds = Array.from({ length: dias / 7 }, (_, k) => <div key={k} className="g-fds" style={{ '--s': k * 7 + 5 }} />)

  const frentes = []
  for (const l of c.linhas) {
    let f = frentes.find((x) => x.frente === l.frente)
    if (!f) { f = { frente: l.frente, linhas: [] }; frentes.push(f) }
    f.linhas.push(l)
  }
  const s = c.linhas.find((l) => l.id === sel)

  return (
    <>
      <div className="page-title">
        <span className="label">Cadeia de serviços</span>
        <h1>Previsão {ddmm(c.previsaoEntrega)}, contratada {ddmm(obra.data_entrega)}</h1>
        <p>Cada serviço só começa quando o anterior termina. Atrasou um, as barras seguintes andam junto.</p>
      </div>
      <div className="section">
        <div className="gantt-tools">
          <div className="seg seg-2" aria-label="Escala">
            <button aria-pressed={dw === 11} onClick={() => setDw(11)}>Compacto</button>
            <button aria-pressed={dw === 20} onClick={() => setDw(20)}>Detalhado</button>
          </div>
          <button className="btn btn-primary" onClick={() => goto('editarServico')}>+ Novo serviço</button>
        </div>
        <div className="gantt-legenda">
          <span><i className="lg lg-done"></i>Concluído</span>
          <span><i className="lg lg-exec"></i>Executado</span>
          <span><i className="lg lg-prev"></i>Previsto</span>
          <span><i className="lg lg-late"></i>Passa do limite</span>
          <span><i className="lg lg-hoje"></i>Hoje</span>
          <span><i className="lg lg-entrega"></i>Entrega contratada</span>
        </div>
      </div>
      <div className="section">
        <div ref={rolagem} className={`gantt${dw < 16 ? ' compacto' : ''}`} style={{ '--dw': `${dw}px` }} tabIndex={0} aria-label="Gráfico de Gantt, role para os lados">
          <div className="g-inner" style={{ width: `calc(var(--lw) + var(--dw) * ${dias})` }}>
            <div className="g-row g-head">
              <div className="g-label"><span className="label">Serviço</span></div>
              <div className="g-tl" style={{ width: `calc(var(--dw) * ${dias})` }}>
                <div className="g-sems">{semanas}</div>
                <div className="g-dias">{diasCab}</div>
              </div>
            </div>
            <div className="g-layer">
              {fds}
              <div className="g-linha hoje" style={{ '--s': idx(HOJE) }}><span>Hoje {ddmm(HOJE)}</span></div>
              <div className="g-linha entrega" style={{ '--s': idx(obra.data_entrega) }}><span>Entrega {ddmm(obra.data_entrega)}</span></div>
            </div>
            {frentes.map((f) => (
              <div key={f.frente}>
                <div className="g-row g-grupo"><div className="g-label"><span className="label">{f.frente}</span></div><div className="g-tl" /></div>
                {f.linhas.map((l) => {
                  const a = idx(l.inicio)
                  const b = idx(l.termino)
                  const lf = idx(l.limiteTermino)
                  const passa = !l.concluido && b > lf
                  return (
                    <div key={l.id} className={`g-row${sel === l.id ? ' sel' : ''}`} onClick={() => setSel(l.id)}>
                      <div className="g-label">
                        <span className="g-nome">{l.nome}</span>
                        <span className="label">{nome(l.responsavel_id)}, <b className={l.concluido ? 'c-green' : ''}>{Math.round(l.pct * 100)}%</b></span>
                      </div>
                      <div className="g-tl" style={{ width: `calc(var(--dw) * ${dias})` }}>
                        <button className={`g-bar${l.concluido ? ' done' : ''}`} style={{ '--s': a, '--n': b - a + 1 }} aria-label={`${l.nome}, ${ddmm(l.inicio)} a ${ddmm(l.termino)}`}>
                          <i className="g-exec" style={{ width: `${l.pct * 100}%` }} />
                          {passa && <i className="g-late" style={{ '--s': Math.max(0, lf + 1 - a), '--n': Math.min(b - a + 1, b - lf) }} />}
                        </button>
                        <span className={`g-fim label ${l.concluido ? '' : passa ? 'c-red' : 'c-green'}`} style={{ '--s': b + 1 }}>
                          {l.concluido ? '✓ ' : ''}{ddmm(l.termino)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="panel gantt-info">
          {s ? (
            <>
              <span className="label">{s.frente}, {nome(s.responsavel_id)}</span>
              <strong>{s.nome}</strong>
              <div className="gi-grid">
                <div><span className="label">{s.inicioReal ? 'Início' : 'Início prev.'}</span><b className="num">{ddmm(s.inicio)}</b></div>
                <div><span className="label">{s.concluido ? 'Término' : 'Término prev.'}</span><b className={`num ${!s.concluido && s.folga < 0 ? 'c-red' : ''}`}>{ddmm(s.termino)}</b></div>
                <div><span className="label">Programar até</span><b className="num">{ddmm(s.limiteProgramar)}</b></div>
                <div><span className="label">Limite de término</span><b className="num">{ddmm(s.limiteTermino)}</b></div>
              </div>
              <span className="label">Depende de: {s.deps.length ? s.deps.map((d) => c.linhas.find((x) => x.id === d)?.nome).join(', ') : 'ninguém (primeiro da cadeia)'}</span>
              <button className="btn" onClick={() => goto('editarServico', { id: s.id })}>Editar serviço</button>
            </>
          ) : (
            <>
              <span className="label">Toque numa barra</span>
              <strong>para ver datas, limite e de quem o serviço depende.</strong>
            </>
          )}
        </div>
      </div>
    </>
  )
}
