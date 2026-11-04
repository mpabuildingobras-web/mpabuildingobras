import { Carregando, EntregaDestaque, Titulo, Vazio, useCarregar } from '../components'
import { listarFotos } from '../lib/dados'
import { ddmm } from '../lib/formato'
import { porcento } from '../lib/orcamento'
import { carregarResumoOrcamento } from './orcamento'

async function carregar() {
  const [r, f] = await Promise.all([carregarResumoOrcamento('cliente'), listarFotos()])
  return { data: { ...r.data, fotos: f.data }, erro: r.erro ?? f.erro }
}

// Início do cliente: a entrega, o avanço por etapa e as fotos mais recentes. Só aprovados.
export function Avanco({ goto }) {
  const estado = useCarregar(carregar)
  const d = estado.data
  return (
    <Carregando estado={estado}>
      {d && !d.orcamento && (
        <><Titulo rotulo="Avanço da obra" titulo={d.obra.nome} />
          <Vazio icone="home" titulo="A obra ainda não começou" texto="Assim que o primeiro diário for aprovado, o avanço aparece aqui." /></>
      )}
      {d?.orcamento && (
        <>
          <EntregaDestaque atraso={d.cascata.diasAtrasoEntrega} previsao={ddmm(d.cascata.previsaoEntrega)} contratada={ddmm(d.obra.data_entrega)}>
            {`. ${porcento(d.resumo.fracao)} executado.`}
          </EntregaDestaque>
          <div className="section">
            <div className="section-head"><span className="label">Etapas</span></div>
            {d.resumo.etapas.map((e) => (
              <div key={e.frente} className="etapa">
                <button onClick={() => goto('orcamento')}>
                  <span className="etapa-n">{e.numero}</span>
                  <span className="etapa-nome">{e.frente}</span>
                  <span className={`etapa-pct num ${e.fracao >= 1 ? 'c-green' : ''}`}>{porcento(e.fracao)}</span>
                  <span className={`bar ${e.fracao >= 1 ? 'done' : ''}`}><i style={{ width: `${Math.min(e.fracao, 1) * 100}%` }}></i></span>
                </button>
              </div>
            ))}
          </div>
          <div className="section">
            <div className="section-head"><span className="label">Fotos recentes</span>
              <button className="link label" onClick={() => goto('fotos')}>Ver todas</button></div>
            <div className="fotos">
              {d.fotos.slice(0, 6).map((f) => <div key={f.id} className="foto"><span>{f.legenda}</span></div>)}
            </div>
          </div>
        </>
      )}
    </Carregando>
  )
}
