import { Carregando, Titulo, Vazio, useCarregar } from '../components'
import { HOJE, buscarBaseFaturamento } from '../lib/dados'
import { calcularFaturamento } from '../lib/faturamento'
import { corDaSituacao } from '../lib/formato'
import { useObra } from '../lib/ObraContext'
import { porcento, reais } from '../lib/orcamento'

async function carregar() {
  const { data, erro } = await buscarBaseFaturamento()
  if (erro) return { data: null, erro }
  return { data: calcularFaturamento(data, HOJE), erro: null }
}

// A única tela que junta obras (comparativo explícito). Só sócio: ver lib/menus.js e dados.js.
export function Faturamento({ goto }) {
  const estado = useCarregar(carregar)
  const { trocarObra } = useObra()
  const abrirObra = (id) => {
    trocarObra(id)
    goto('painel')
  }
  const d = estado.data
  return (
    <>
      <Titulo rotulo="Faturamento de todas as obras" titulo="Bruto e líquido">
        <p>Esta tela soma todas as obras, seja qual for a obra selecionada no topo. Só você e seu sócio têm acesso.</p>
      </Titulo>
      <Carregando estado={estado}>
        {d && d.totais.bruto === 0 ? (
          <Vazio icone="pagamento" titulo="Nenhuma medição fechada ainda"
            texto="O faturamento aparece aqui quando a primeira medição for fechada." />
        ) : d && (
          <>
            <div className="section">
              <div className="stats stats-4">
                <div className="stat"><div className="n num money">{reais(d.totais.bruto)}</div><span className="label">Faturamento bruto</span></div>
                <div className="stat">
                  <div className={`n num money ${d.totais.liquido < 0 ? 'c-red' : 'c-green'}`}>{reais(d.totais.liquido)}</div>
                  <span className="label">Líquido{d.totais.margem !== null && ` (${porcento(d.totais.margem)})`}</span>
                </div>
                <div className="stat"><div className="n num money">{reais(d.totais.aReceber)}</div><span className="label">A receber</span></div>
                <div className="stat"><div className="n num money">{reais(d.totais.contrato)}</div><span className="label">Contratos em carteira</span></div>
              </div>
              <div className="panel orc-geral">
                <div className="orc-geral-top"><span className="label">Evolução dos contratos</span><b className="num">{porcento(d.totais.fracao)}</b></div>
                <div className="bar big"><i style={{ width: `${Math.min(d.totais.fracao, 1) * 100}%` }}></i></div>
                <span className="label" style={{ display: 'block', marginTop: 8 }}>{reais(d.totais.executado)} executados de {reais(d.totais.contrato)}</span>
              </div>
            </div>
            <div className="section">
              <div className="section-head">
                <span className="label" style={{ color: 'var(--ink)' }}>Obra a obra</span>
                <span className="label">{d.obras.length} obras</span>
              </div>
              {d.obras.map((o) => (
                <div key={o.id} className="etapa">
                  <button onClick={() => abrirObra(o.id)}>
                    <span className="tag slate fat-codigo">{o.codigo}</span>
                    <span className="etapa-nome">{o.nome}</span>
                    <span className="etapa-pct num">{o.fracao === null ? '—' : porcento(o.fracao)}</span>
                    <span className="etapa-vals">
                      <span className={`label c-${corDaSituacao(o.situacao)}`}>{o.situacao}</span>
                      <span className="label">{o.contrato ? `Contrato ${reais(o.contrato)}` : 'Sem orçamento'}</span>
                      <span className="label">Bruto {reais(o.bruto)}</span>
                      <span className={`label ${o.liquido < 0 ? 'c-red' : 'c-green'}`}>Líquido {reais(o.liquido)}{o.margem !== null && ` (${porcento(o.margem)})`}</span>
                    </span>
                    <span className="bar"><i style={{ width: `${Math.min(o.fracao ?? 0, 1) * 100}%` }}></i></span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </Carregando>
    </>
  )
}
