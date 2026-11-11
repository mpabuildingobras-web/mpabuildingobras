import { Carregando, Titulo, Vazio, useAviso, useCarregar } from '../components'
import { HOJE, buscarObraAtual, listarMedicoes } from '../lib/dados'
import { dataBR, ddmm } from '../lib/formato'
import { reais } from '../lib/orcamento'
import { separarPagamentos } from '../lib/pagamentos'

const COR = { Rascunho: 'slate', Fechada: 'amber', Paga: 'green' }

// Sócio: as cobranças ao cliente desta obra.
export function Medicoes({ goto }) {
  const estado = useCarregar(listarMedicoes)
  const [aviso, avisar] = useAviso()
  const gerar = () => avisar('Gerar medição a partir dos diários aprovados entra na Fase 2.')
  return (
    <>
      <Titulo rotulo="Medições" titulo="Cobranças ao cliente">
        {estado.data?.length > 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={gerar}>Gerar medição</button>}
      </Titulo>
      <Carregando estado={estado}>
        {estado.data?.length === 0 ? (
          <Vazio icone="medicao" titulo="Nenhuma medição ainda"
            texto="Assim que você aprovar os diários, o sistema soma o que foi executado e monta a primeira medição para o cliente. Você só confere e fecha."
            botao="Gerar a primeira medição" onBotao={gerar} />
        ) : (
          <div className="section">
            {estado.data?.map((m) => (
              <button key={m.id} className="item" onClick={() => goto('medicao', { id: m.id })}>
                <span className={`sq ${COR[m.status] === 'slate' ? '' : COR[m.status]}`}></span>
                <span>
                  <span className="item-title">Medição {m.numero}: {reais(m.valor_total)}</span>
                  <span className="label item-meta" style={{ display: 'block' }}>
                    {ddmm(m.periodo_inicio)} a {ddmm(m.periodo_fim)}, vence {dataBR(m.vencimento)}
                  </span>
                </span>
                <span className={`tag ${COR[m.status]}`}>{m.status}</span>
              </button>
            ))}
          </div>
        )}
      </Carregando>
      {aviso}
    </>
  )
}

// Detalhe (sócio edita; cliente só lê, pelos Pagamentos).
export function MedicaoDetalhe({ params }) {
  const estado = useCarregar(listarMedicoes)
  const m = estado.data?.find((x) => x.id === params.id)
  return (
    <Carregando estado={estado}>
      {!m ? <Vazio titulo="Medição não encontrada nesta obra" texto="Ela pode ser de outra obra." /> : (
        <>
          <Titulo rotulo={`Medição ${m.numero}`} titulo={reais(m.valor_total)}>
            <div className="tags"><span className={`tag ${COR[m.status]}`}>{m.status}{m.data_pagamento ? ` em ${dataBR(m.data_pagamento)}` : ''}</span></div>
            <p>Período de {dataBR(m.periodo_inicio)} a {dataBR(m.periodo_fim)}, vencimento {dataBR(m.vencimento)}</p>
          </Titulo>
          <div className="section">
            <div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>Itens medidos</span></div>
            {m.itens.map(([n, nome, q, v]) => (
              <div key={n + nome} className="it" style={{ borderTop: '1px solid var(--line-soft)' }}>
                <span className="it-nome"><span className="label">{n}</span> {nome}</span>
                <b className="num">{reais(v)}</b>
                {q && <span className="label">Executado no período: {q}</span>}
              </div>
            ))}
            <div className="it" style={{ borderTop: '1.5px solid var(--ink)' }}>
              <span className="it-nome">Total</span><b className="num">{reais(m.valor_total)}</b>
            </div>
          </div>
        </>
      )}
    </Carregando>
  )
}

// Cliente: o que pagar hoje, os próximos vencimentos e o que já foi pago.
async function carregarPagamentos() {
  const [m, o] = await Promise.all([listarMedicoes(), buscarObraAtual()])
  return { data: { medicoes: m.data, obra: o.data }, erro: m.erro ?? o.erro }
}

export function Pagamentos({ goto }) {
  const estado = useCarregar(carregarPagamentos)
  const lista = estado.data?.medicoes ?? []
  const { abertas, vencidas, pagas, totalHoje, totalProximas, totalPago, totalAberto } = separarPagamentos(lista, HOJE)
  const linha = (m) => (
    <button key={m.id} className="item" onClick={() => goto('medicao', { id: m.id })}>
      <span className={`sq ${m.status === 'Paga' ? 'green' : 'amber'}`}></span>
      <span>
        <span className="item-title">Medição {m.numero}</span>
        <span className="label item-meta" style={{ display: 'block' }}>
          {m.status === 'Paga' ? `Pago em ${dataBR(m.data_pagamento)}` : `Vence ${dataBR(m.vencimento)}`}
        </span>
      </span>
      <span className="folga"><span className="n num" style={{ fontSize: 22 }}>{reais(m.valor_total)}</span></span>
    </button>
  )
  return (
    <>
      <Titulo rotulo="Pagamentos" titulo="O que pagar e o que já foi pago" />
      <Carregando estado={estado}>
        {lista.length === 0 ? (
          <Vazio icone="pagamento" titulo="Nenhum pagamento por enquanto" texto="Quando a primeira medição for fechada, o valor e o vencimento aparecem aqui." />
        ) : (
          <>
            <div className="section">
              <div className={`diario-box`} style={vencidas.length ? undefined : { borderColor: 'var(--green)', background: 'var(--green-tint)' }}>
                <div>
                  <span className={`label ${vencidas.length ? 'c-amber' : 'c-green'}`}>Para pagar hoje</span>
                  <strong className="num" style={{ fontSize: 28 }}>{reais(totalHoje)}</strong>
                </div>
              </div>
              <div className="stats">
                <div className="stat"><div className="n num money">{reais(totalProximas)}</div><span className="label">Próximos vencimentos</span></div>
                <div className="stat"><div className="n num money c-green">{reais(totalPago)}</div><span className="label">Já pago</span></div>
                <div className="stat"><div className="n num money">{reais(totalAberto)}</div><span className="label">Em aberto</span></div>
              </div>
            </div>
            {abertas.length > 0 && <div className="section"><div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>A pagar</span></div>{abertas.map(linha)}</div>}
            {pagas.length > 0 && <div className="section"><div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>Pagos</span></div>{pagas.map(linha)}</div>}
          </>
        )}
      </Carregando>
    </>
  )
}
