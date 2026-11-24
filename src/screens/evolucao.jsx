import { useEffect, useRef, useState } from 'react'
import { Carregando, Titulo, Vazio, useCarregar } from '../components'
import { HOJE, buscarOrcamento, carregarCronograma, listarCustos } from '../lib/dados'
import { montarEvolucao, nomeDoMes, situacaoDoAvanco } from '../lib/evolucao'
import { porcento, reais } from '../lib/orcamento'
import { pode } from '../lib/permissoes'

// Nos cartões e na tabela, reais sem centavos: a leitura é de ordem de grandeza.
const redondo = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Evolução da obra (cronograma físico-financeiro), uma obra por vez.
// Sócio: previsto × executado × gasto, com a projeção de estouro ou economia.
// Cliente: previsto × executado, em valor e em %. Nunca vê custo (quadro, 24/11/2026).
async function carregar(verGasto, perfil) {
  const [orc, cr, cu] = await Promise.all([
    buscarOrcamento(), carregarCronograma(), verGasto ? listarCustos() : Promise.resolve({ data: [], erro: null }),
  ])
  const erro = orc.erro ?? cr.erro ?? cu.erro
  if (erro) return { data: null, erro }
  if (!orc.data) return { data: { obra: cr.data.obra, ev: null }, erro: null }
  const ev = montarEvolucao({ ...cr.data, itens: orc.data.itens, custos: cu.data, hoje: HOJE, perfil })
  return { data: { obra: cr.data.obra, ev }, erro: null }
}

export function Evolucao({ perfil, usuario }) {
  const verGasto = pode('evolucao.ver_gasto', usuario)
  const estado = useCarregar(() => carregar(verGasto, perfil))
  const d = estado.data
  return (
    <Carregando estado={estado}>
      {d && !d.ev && (
        <>
          <Titulo rotulo="Evolução da obra" titulo={d.obra.nome} />
          <Vazio icone="fin" titulo={verGasto ? 'Esta obra ainda não tem orçamento' : 'A evolução da sua obra ainda não está disponível'}
            texto={verGasto ? 'Com o orçamento e o cronograma da obra, a evolução mês a mês aparece aqui.' : 'Assim que a engenharia publicar o orçamento, você acompanha aqui mês a mês.'} />
        </>
      )}
      {d?.ev && <Painel ev={d.ev} obra={d.obra} verGasto={verGasto} />}
    </Carregando>
  )
}

function Painel({ ev, obra, verGasto }) {
  const sit = situacaoDoAvanco(ev.fracaoPrevista, ev.fracaoExecutada)
  return (
    <>
      <Titulo rotulo="Evolução da obra" titulo={verGasto ? 'Físico-financeiro' : 'Como está a sua obra'} />
      <div className="pagina">
        <p className="ev-sub">{obra.nome}</p>
      </div>

      <div className="ev-cartoes">
        <div className={`ev-cartao${verGasto ? '' : ' inteiro'}`}>
          <span className="label">Estudo de viabilidade</span>
          <b className="num">{redondo(ev.total)}</b>
          <small>valor total da obra</small>
        </div>
        {verGasto && (
          <div className="ev-cartao gasto">
            <span className="label">Gasto lançado</span>
            <b className="num">{redondo(ev.gasto)}</b>
            <small>{porcento(ev.fracaoGasta)} do estudo</small>
          </div>
        )}
        <div className="ev-cartao previsto">
          <span className="label">Deveria estar</span>
          <b className="num">{porcento(ev.fracaoPrevista)}</b>
          <small>{redondo(ev.previstoHoje)} até hoje</small>
        </div>
        <div className="ev-cartao executado">
          <span className="label">Está</span>
          <b className="num">{porcento(ev.fracaoExecutada)}</b>
          <small className={`c-${sit.cor}`}>{sit.texto}</small>
        </div>
      </div>

      {verGasto && <Projecao ev={ev} />}

      <div className="section">
        <div className="section-head"><span className="label">Curva da obra · valor acumulado</span></div>
        <div className="panel ev-grafico">
          <Curva ev={ev} verGasto={verGasto} />
          <div className="ev-legenda">
            <span><i className="lg-previsto" />Previsto</span>
            <span><i className="lg-executado" />Executado</span>
            {verGasto && <span><i className="lg-gasto" />Gasto</span>}
            <span><i className="lg-hoje" />Hoje</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><span className="label">Mês a mês</span></div>
        <div className="panel ev-tabela-caixa">
          <table className="ev-tabela">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Previsto</th>
                <th>Executado</th>
                {verGasto && <th>Gasto</th>}
              </tr>
            </thead>
            <tbody>
              {ev.meses.map((m) => (
                <tr key={m.mes} className={m.mes === ev.mesDeHoje ? 'atual' : m.futuro ? 'futuro' : undefined}>
                  <td>{nomeDoMes(m.mes)}{m.mes === ev.mesDeHoje && <span className="ev-hoje">atual</span>}</td>
                  <td className="num">{redondo(m.previsto)}<small>{porcento(ev.total ? m.previstoAcum / ev.total : 0)} acum.</small></td>
                  <td className="num">{m.futuro ? '—' : redondo(m.executado)}{!m.futuro && <small>{porcento(ev.total ? m.executadoAcum / ev.total : 0)} acum.</small>}</td>
                  {verGasto && <td className="num">{m.futuro ? '—' : redondo(m.gasto)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ev-nota">
          {verGasto
            ? 'Previsto: o valor do estudo distribuído pelo cronograma planejado. Executado: o que os diários enviados e aprovados mostram feito. Gasto: os custos lançados no Financeiro.'
            : 'Previsto: o valor da obra distribuído pelo cronograma planejado. Executado: o que já foi feito, pelos diários aprovados.'}
        </p>
      </div>
    </>
  )
}

function Projecao({ ev }) {
  if (ev.projecaoGasto === null) {
    return <div className="ev-projecao neutra"><b>Ainda é cedo para projetar</b><span>Com pelo menos 5% da obra feita, o app mostra se ela caminha para estouro ou economia.</span></div>
  }
  const economia = ev.diferencaProjetada >= 0
  return (
    <div className={`ev-projecao ${economia ? 'economia' : 'estouro'}`}>
      <b>{economia ? `Economia projetada de ${reais(ev.diferencaProjetada)}` : `Estouro projetado de ${reais(-ev.diferencaProjetada)}`}</b>
      <span>No ritmo de hoje (gastou {reais(ev.gasto)} para {porcento(ev.fracaoExecutada)} da obra), ela termina custando {reais(ev.projecaoGasto)}.</span>
    </div>
  )
}

// Gráfico de linhas em SVG puro (o app não usa biblioteca de gráfico).
function useLargura() {
  const ref = useRef(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    if (!ref.current) return undefined
    const ro = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, largura]
}

function Curva({ ev, verGasto }) {
  const [ref, largura] = useLargura()
  return <div ref={ref}>{largura > 0 && <Linhas ev={ev} verGasto={verGasto} L={largura} />}</div>
}

function Linhas({ ev, verGasto, L }) {
  const A = Math.round(Math.min(320, Math.max(220, L * 0.5)))
  const m = { e: 48, d: 10, t: 12, b: 28 }
  const pts = ev.semanas
  const maxY = Math.max(ev.total, ...pts.map((p) => p.gasto ?? 0)) || 1
  const x = (i) => m.e + (pts.length > 1 ? (i / (pts.length - 1)) * (L - m.e - m.d) : 0)
  const y = (v) => m.t + (1 - v / maxY) * (A - m.t - m.b)
  const linha = (campo) => pts.map((p, i) => (p[campo] === null ? null : `${x(i)},${y(p[campo])}`)).filter(Boolean).join(' ')
  const iHoje = pts.reduce((k, p, i) => (p.executado !== null ? i : k), -1)
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY)
  const curto = (v) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : `${Math.round(v)}`)
  // Um rótulo por mês, na primeira semana que começa nele; rótulo colado no anterior não aparece.
  const meses = []
  pts.forEach((p, i) => {
    const mes = p.semana.slice(0, 7)
    if (i > 0 && pts[i - 1].semana.slice(0, 7) === mes) return
    if (meses.length && x(i) - x(meses.at(-1)[0]) < 44) meses.pop()
    meses.push([i, mes])
  })
  return (
    <svg className="ev-svg" viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Curva do valor previsto, executado e gasto ao longo da obra">
      {marcas.map((v) => (
        <g key={v}>
          <line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} className="ev-grade" />
          <text x={m.e - 8} y={y(v) + 4} textAnchor="end" className="ev-eixo">{curto(v)}</text>
        </g>
      ))}
      {meses.map(([i, mes]) => <text key={mes} x={x(i)} y={A - 8} textAnchor="middle" className="ev-eixo">{nomeDoMes(mes)}</text>)}
      {iHoje >= 0 && <line x1={x(iHoje)} x2={x(iHoje)} y1={m.t} y2={A - m.b} className="ev-linha-hoje" />}
      <polyline points={linha('previsto')} className="ev-l-previsto" />
      {verGasto && <polyline points={linha('gasto')} className="ev-l-gasto" />}
      <polyline points={linha('executado')} className="ev-l-executado" />
      {iHoje >= 0 && <circle cx={x(iHoje)} cy={y(pts[iHoje].executado)} r="5" className="ev-ponto" />}
    </svg>
  )
}
