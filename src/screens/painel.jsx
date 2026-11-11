import { Carregando, EntregaDestaque, Vazio, useCarregar } from '../components'
import { HOJE, carregarCronograma, listarDiarios, listarContratados } from '../lib/dados'
import { calcularCascata, ordenarPorAtraso, statusQueContam } from '../lib/cronograma'
import { STATUS_DIARIO } from '../lib/diario'
import { comSinal, ddmm } from '../lib/formato'

async function carregar() {
  const [cr, di, fu] = await Promise.all([carregarCronograma(), listarDiarios(), listarContratados()])
  return { data: { ...cr.data, diarios: di.data, contratados: fu.data }, erro: cr.erro ?? di.erro ?? fu.erro }
}

const CLASSE_COR = { red: 'c-red', amber: 'c-amber', green: 'c-green' }

// A tela de toda manhã: o mais atrasado primeiro e a resposta "a entrega está de pé?".
export function Painel({ goto }) {
  const estado = useCarregar(carregar)
  return (
    <Carregando estado={estado}>
      {estado.data && <Conteudo dados={estado.data} goto={goto} />}
    </Carregando>
  )
}

function Conteudo({ dados, goto }) {
  const { obra, servicos, execucoes, diarios, contratados } = dados
  if (servicos.length === 0) {
    return <Vazio icone="crono" titulo="Esta obra ainda não tem serviços"
      texto="Cadastre os serviços no Cronograma para acompanhar os prazos aqui."
      botao="Cadastrar serviços" onBotao={() => goto('cronograma')} />
  }
  const c = calcularCascata({ servicos, execucoes, obra, hoje: HOJE, contam: statusQueContam('socio') })
  const abertos = ordenarPorAtraso(c.linhas)
  const nome = (id) => contratados.find((f) => f.id === id)?.nome ?? '—'
  const atrasados = abertos.filter((l) => l.cor === 'red').length
  const pessoasHoje = diarios.find((d) => d.data === HOJE)?.qtd_pessoas ?? 0
  const aguardando = diarios.filter((d) => d.status === STATUS_DIARIO.enviado)
  const diarioHoje = diarios.find((d) => d.data === HOJE)

  // Agrupa por frente mantendo a ordem do mais atrasado.
  const grupos = []
  for (const l of abertos) {
    let g = grupos.find((x) => x.frente === l.frente)
    if (!g) { g = { frente: l.frente, itens: [] }; grupos.push(g) }
    g.itens.push(l)
  }

  const caixaDiario = diarioHoje && (
    <div className="diario-box">
      <div>
        <span className="label">Diário de hoje</span>
        <strong>{diarioHoje.status === STATUS_DIARIO.enviado ? 'Enviado, aguardando sua aprovação' : diarioHoje.status}</strong>
      </div>
      <button className="btn" onClick={() => goto('diarioDia', { id: diarioHoje.id })}>Abrir</button>
    </div>
  )

  return (
    <>
    <EntregaDestaque atraso={c.diasAtrasoEntrega} previsao={ddmm(c.previsaoEntrega)} contratada={ddmm(obra.data_entrega)} />
    <div className="numeros-dia">
      <div><b className="num">{pessoasHoje}</b><span className="label">pessoas no canteiro</span></div>
      <div><b className={`num ${atrasados ? 'c-red' : ''}`}>{atrasados}</b><span className="label">serviços atrasados</span></div>
      <div><b className={`num ${aguardando.length ? 'c-amber' : ''}`}>{aguardando.length}</b><span className="label">diário para aprovar</span></div>
    </div>
    <div className="painel-grid">
      <div>

        <div className="section">
          <div className="section-head">
            <span className="label">Mais atrasado primeiro</span>
            <span className="label">{abertos.length} em aberto</span>
          </div>
          {abertos.length === 0 && <p>Nenhum serviço em aberto nesta obra.</p>}
          {grupos.map((g) => (
            <div key={g.frente}>
              <div className="grupo"><span className="label">{g.frente}</span></div>
              {g.itens.map((l) => (
                <button key={l.id} className="item" onClick={() => goto('cronograma')}>
                  <span className={`sq ${l.cor}`}></span>
                  <span>
                    <span className="item-title">{l.nome}</span>
                    <span className="label item-meta" style={{ display: 'block' }}>
                      {nome(l.responsavel_id)}, {Math.round(l.pct * 100)}% feito, programar até{' '}
                      <span className={l.limitePassouSemComecar ? 'c-red' : ''}>{ddmm(l.limiteProgramar)}</span>
                    </span>
                    {l.pct > 0 && <span className="bar"><i style={{ width: `${l.pct * 100}%` }}></i></span>}
                    {l.cor !== 'green' && (
                      <span className="tags">
                        <span className={`tag ${l.diasAtraso > 0 ? 'solid-red' : l.cor}`}>
                          {l.diasAtraso > 0 ? `${l.diasAtraso} dias de atraso`
                            : l.limitePassouSemComecar ? 'Limite passou, não começou'
                            : l.folga <= 0 ? 'Vai empurrar a entrega' : 'Pouca folga'}
                        </span>
                      </span>
                    )}
                    {execucoes.some((e) => e.servico_id === l.id && e.status === STATUS_DIARIO.enviado) && <span className="label c-amber item-nota">Lançamento aguardando aprovação</span>}
                    {!l.inicioReal && l.deps.some((d) => !c.linhas.find((x) => x.id === d)?.concluido) && (
                      <span className="label item-nota">Espera {l.deps.map((d) => c.linhas.find((x) => x.id === d)).filter((x) => !x.concluido).map((x) => x.nome.split(' ')[0]).join(', ')}</span>
                    )}
                  </span>
                  <span className="folga"><span className={`n num ${CLASSE_COR[l.cor]}`}>{comSinal(l.folga)}</span><span className="label">folga</span></span>
                </button>
              ))}
            </div>
          ))}
          <div className="hide-wide">{caixaDiario}</div>
        </div>
      </div>

      <aside className="painel-side" aria-label="Resumo lateral">
        {caixaDiario}
        <div className="panel legenda" style={{ marginTop: 16 }}>
          <span className="label">Como ler a lista</span>
          <div><span className="sq red"></span>Atrasado: já passou do limite</div>
          <div><span className="sq amber"></span>Atenção: folga de 3 dias ou menos</div>
          <div><span className="sq green"></span>No prazo: tem folga</div>
          <span className="label" style={{ marginTop: 4 }}>Folga = dias úteis até o limite. Negativa empurra a entrega.</span>
        </div>
      </aside>
    </div>
    </>
  )
}
