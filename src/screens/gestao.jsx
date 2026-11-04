import { Carregando, Titulo, Vazio, useCarregar } from '../components'
import { buscarBaseGestao, listarContratados } from '../lib/dados'
import { ddmm } from '../lib/formato'
import { calcularGestao } from '../lib/gestao'
import { HOJE } from '../lib/mockData'
import { useObra } from '../lib/ObraContext'
import { porcento } from '../lib/orcamento'

async function carregar() {
  const [b, c] = await Promise.all([buscarBaseGestao(), listarContratados()])
  if (b.erro || c.erro) return { data: null, erro: b.erro ?? c.erro }
  return { data: calcularGestao(b.data, c.data, HOJE), erro: null }
}

const COR_SAUDE = { Atrasada: 'solid-red', Atenção: 'amber', 'No prazo': 'green' }

// Parâmetro geral de todas as obras (comparativo explícito). Só sócios.
export function Gestao({ goto }) {
  const estado = useCarregar(carregar)
  const { trocarObra } = useObra()
  const abrir = (id) => { trocarObra(id); goto('painel') }
  const d = estado.data
  const n = (valor, ruim) => <div className={`n num ${valor > 0 && ruim ? ruim : ''}`}>{valor}</div>
  return (
    <>
      <Titulo rotulo="Todas as obras" titulo="Como estão as obras">
        <p>Mostra todas as obras, seja qual for a selecionada no topo. Só você e seu sócio têm acesso.</p>
      </Titulo>
      <Carregando estado={estado}>
        {d?.obras.length === 0 ? (
          <Vazio icone="obra" titulo="Nenhuma obra cadastrada" texto="Cadastre a primeira obra para acompanhar aqui." />
        ) : d && (
          <>
            <div className="section">
              <div className="stats stats-4">
                <div className="stat">{n(d.totais.ativas)}<span className="label">Obras em andamento</span></div>
                <div className="stat">{n(d.totais.servicosAtrasados, 'c-red')}<span className="label">Serviços atrasados</span></div>
                <div className="stat">{n(d.totais.tarefasAtrasadas, 'c-red')}<span className="label">Tarefas atrasadas</span></div>
                <div className="stat">{n(d.totais.conflitosEntreObras, 'c-red')}<span className="label">Prestadores em conflito</span></div>
              </div>
            </div>
            <div className="section">
              <div className="section-head"><span className="label">Obras</span><span className="label">{d.obras.length}</span></div>
              <div className="obras-grade">
                {d.obras.map((o) => (
                  <button key={o.id} className="panel obra-cartao" onClick={() => abrir(o.id)}>
                    <span className="obra-cartao-topo">
                      <span className="item-title">{o.nome}</span>
                      <span className={`tag ${COR_SAUDE[o.saude]}`}>{o.saude}</span>
                    </span>
                    <span className="obra-cartao-avanco">
                      <span className="label">Cronograma</span>
                      <b className="num">{porcento(o.fisico)} executado</b>
                    </span>
                    <span className="bar"><i style={{ width: `${o.fisico * 100}%` }}></i></span>
                    <span className="label" style={{ marginTop: 8, display: 'block' }}>
                      {o.atrasados} atrasados de {o.totalServicos}. Entrega {ddmm(o.entrega)}, previsão{' '}
                      <span className={o.atrasoEntrega ? 'c-red' : 'c-green'}>{ddmm(o.previsao)}</span>
                    </span>
                    <span className="obra-cartao-numeros">
                      <span><b className={`num ${o.tarefasAtrasadas ? 'c-red' : ''}`}>{o.tarefasAtrasadas}</b><span className="label">Tarefas atras.</span></span>
                      <span><b className="num">{o.tarefasAbertas}</b><span className="label">Tarefas abertas</span></span>
                      <span><b className={`num ${o.diariosParaAprovar ? 'c-amber' : ''}`}>{o.diariosParaAprovar}</b><span className="label">Diário p/ aprovar</span></span>
                      <span><b className={`num ${o.comprasAguardando ? 'c-amber' : ''}`}>{o.comprasAguardando}</b><span className="label">Compras aguard.</span></span>
                      <span><b className="num">{o.ultimoDiario ? ddmm(o.ultimoDiario) : '—'}</b><span className="label">Último diário</span></span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {d.conflitos.some((c) => c.tipo === 'Entre obras') && (
              <div className="section">
                <div className="section-head"><span className="label">Prestadores em conflito</span></div>
                {d.conflitos.filter((c) => c.tipo === 'Entre obras').map((c) => (
                  <div key={`${c.a.servico_id}-${c.b.servico_id}`} className="alerta red" style={{ marginTop: 10 }}>
                    <strong>{c.prestador}: {c.a.obra_codigo} e {c.b.obra_codigo}</strong>
                    <span>{c.a.servico}. {c.b.servico}.</span>
                    <span className="label">De {ddmm(c.de)} a {ddmm(c.ate)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Carregando>
    </>
  )
}
