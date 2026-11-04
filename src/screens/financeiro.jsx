import { Carregando, Titulo, Vazio, useCarregar } from '../components'
import { listarCustos, listarMedicoes } from '../lib/dados'
import { dataBR } from '../lib/formato'
import { reais } from '../lib/orcamento'
import { carregarResumoOrcamento } from './orcamento'

async function carregar() {
  const [r, c, m] = await Promise.all([carregarResumoOrcamento('socio'), listarCustos(), listarMedicoes()])
  return { data: { ...r.data, custos: c.data, medicoes: m.data }, erro: r.erro ?? c.erro ?? m.erro }
}

// Saúde financeira de UMA obra (a da barra de cima). Só sócio.
export function Financeiro() {
  const estado = useCarregar(carregar)
  const d = estado.data
  const soma = (l, f = (x) => x.valor) => l.reduce((s, x) => s + f(x), 0)
  return (
    <>
      <Titulo rotulo="Financeiro da obra" titulo="Saúde financeira" />
      <Carregando estado={estado}>
        {d && (
          <>
            <div className="section">
              <div className="stats">
                <div className="stat"><div className="n num money">{reais(d.resumo?.total ?? 0)}</div><span className="label">Contrato</span></div>
                <div className="stat"><div className="n num money c-acao">{reais(soma(d.medicoes.filter((m) => m.status !== 'Rascunho'), (m) => m.valor_total))}</div><span className="label">Medido (cobrado)</span></div>
                <div className="stat"><div className="n num money">{reais(soma(d.custos))}</div><span className="label">Custos lançados</span></div>
              </div>
            </div>
            <div className="section">
              <div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>Custos</span><span className="label">{d.custos.length}</span></div>
              {d.custos.length === 0 ? (
                <Vazio icone="fin" titulo="Nenhum custo lançado nesta obra" texto="Lance mão de obra, material e equipamento para acompanhar a margem." />
              ) : d.custos.map((k) => (
                <div key={k.id} className="item" style={{ cursor: 'default' }}>
                  <span className={`sq ${k.pago ? 'green' : 'amber'}`}></span>
                  <span>
                    <span className="item-title">{k.descricao}</span>
                    <span className="label item-meta" style={{ display: 'block' }}>{k.categoria}, {dataBR(k.data)}, {k.pago ? 'pago' : 'a pagar'}</span>
                  </span>
                  <span className="folga"><span className="n num" style={{ fontSize: 22 }}>{reais(k.valor)}</span></span>
                </div>
              ))}
            </div>
          </>
        )}
      </Carregando>
    </>
  )
}
