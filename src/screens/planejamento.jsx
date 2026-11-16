import { useState } from 'react'
import { Icon, Titulo, Vazio, useAviso, useCarregar, useOcupado } from '../components'
import {
  HOJE, arquivarSubatividade, carregarCronograma, listarCompromissos, listarContratados, listarRestricoes, listarSubatividades,
  listarUsuarios, marcarSubatividade, moverAtividade, moverRestricao, resolverRestricao, salvarRestricao, salvarSubatividade,
} from '../lib/dados'
import { segundaDaSemana } from '../lib/conflitos'
import { calcularCascata, statusQueContam } from '../lib/cronograma'
import { ddmm } from '../lib/formato'
import {
  CAUSAS_NAO_REALIZADO, COLUNAS_KANBAN, SEMANAS_DO_HORIZONTE, STATUS_KANBAN, TIPOS_RESTRICAO, atividadesDaSemana, comPrevisto,
  conferirRestricao, conferirSubatividade, datasPadraoSubatividade, domingoDa, linhaDoTempo, montarEAP, montarLookahead, ppc,
  semanasEntre, servicosDaSemana, servicosImpedidos, somarSemanas,
} from '../lib/planejamento'

// Planejamento (Last Planner): quatro abas que leem a MESMA árvore (frentes, serviços e subatividades).
// Ciclo de uso: EAP → Longo prazo → Médio prazo → Curto prazo. Só sócios.
const ABAS = [
  { id: 'eap', rotulo: 'EAP', titulo: 'Estrutura da obra (EAP)' },
  { id: 'longo', rotulo: 'Longo', titulo: 'Longo prazo (cronograma)' },
  { id: 'medio', rotulo: 'Médio', titulo: 'Médio prazo (restrições)' },
  { id: 'curto', rotulo: 'Curto', titulo: 'Curto prazo (semana)' },
]

const EXPLICACAO = {
  eap: 'A base do planejamento: as frentes e os serviços do Cronograma, quebrados em subatividades.',
  longo: 'A obra inteira no tempo: quanto cada serviço já andou (real) e quanto já deveria ter andado hoje (previsto).',
  medio: 'As próximas semanas e o que impede cada serviço de andar. Resolva a restrição antes de prometer o serviço na semana.',
  curto: 'O que foi prometido para a semana e como está. O PPC mostra quanto do prometido foi cumprido.',
}

async function carregarPlanejamento() {
  const [cr, su, co, re, us, cp] = await Promise.all([
    carregarCronograma(), listarSubatividades(), listarContratados(), listarRestricoes(), listarUsuarios(), listarCompromissos(),
  ])
  const erro = cr.erro ?? su.erro ?? co.erro ?? re.erro ?? us.erro ?? cp.erro
  if (erro) return { data: null, erro }
  // Quem pode resolver uma restrição: os sócios e a equipe.
  const responsaveis = [...us.data.filter((u) => u.role === 'socio').map((u) => u.nome), ...co.data.map((c) => c.nome)]
  return {
    data: { ...cr.data, subatividades: su.data, contratados: co.data, restricoes: re.data, responsaveis, compromissos: cp.data },
    erro: null,
  }
}

// Os dados são carregados uma vez aqui e a mesma árvore vai para todas as abas: o que muda numa
// aparece nas outras.
export function Planejamento({ goto }) {
  const [aba, setAba] = useState('eap')
  const estado = useCarregar(carregarPlanejamento)
  const atual = ABAS.find((a) => a.id === aba)

  let corpo
  if (estado.carregando) corpo = <div className="page-title"><p>Carregando o planejamento…</p></div>
  else if (estado.erro) {
    corpo = (
      <div className="page-title">
        <p className="c-red" role="alert">{estado.erro}</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={estado.recarregar}>Tentar de novo</button>
      </div>
    )
  } else if (estado.data.servicos.length === 0) {
    corpo = <Vazio icone="eap" titulo="Esta obra ainda não tem serviços"
      texto="O planejamento nasce dos serviços do Cronograma. Cadastre o primeiro e depois quebre em subatividades."
      botao="Cadastrar o primeiro serviço" onBotao={() => goto('editarServico')} />
  } else {
    const { obra, servicos, execucoes } = estado.data
    const linhas = calcularCascata({ servicos, execucoes, obra, hoje: HOJE, contam: statusQueContam('socio') }).linhas
    const p = { goto, dados: { ...estado.data, linhas }, recarregar: estado.recarregar }
    const ABA = { eap: Eap, longo: Longo, medio: Medio, curto: Curto }[aba]
    corpo = <ABA {...p} />
  }

  return (
    <>
      <Titulo rotulo="Planejamento" titulo={atual.titulo}>
        {EXPLICACAO[aba] && <p>{EXPLICACAO[aba]}</p>}
      </Titulo>
      <div className="section">
        <div className="seg" role="tablist" aria-label="Abas do planejamento">
          {ABAS.map((a) => (
            <button key={a.id} role="tab" aria-selected={aba === a.id} aria-pressed={aba === a.id} disabled={a.emBreve}
              title={a.emBreve ? 'Em construção' : undefined} onClick={() => setAba(a.id)}>
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>
      {corpo}
    </>
  )
}

function Eap({ goto, dados, recarregar }) {
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  const [fechadas, setFechadas] = useState({})
  const [form, setForm] = useState(null) // { servicoId } para criar; { servicoId, sub } para editar
  const [aviso, avisar] = useAviso()
  const [mexendo, rodar] = useOcupado()

  const { linhas, subatividades, contratados } = dados
  const eap = montarEAP(linhas, subatividades, { mostrarArquivadas })
  const opcoesServico = eap.flatMap((f) => f.servicos.map((s) => ({ id: s.id, rotulo: `${s.codigo} ${s.nome}`, inicio: s.inicio, termino: s.termino })))
  const nome = (id) => contratados.find((x) => x.id === id)?.nome ?? 'sem prestador'
  const totalArquivadas = subatividades.filter((x) => x.arquivada).length

  const arquivar = (sub) => rodar(async () => {
    const { erro } = await arquivarSubatividade(sub.id, !sub.arquivada)
    if (erro) return avisar(erro)
    avisar(sub.arquivada ? 'Subatividade de volta na EAP.' : 'Subatividade arquivada. Ela volta em "Mostrar arquivadas".')
    recarregar()
  })
  const salvo = (msg) => { setForm(null); avisar(msg); recarregar() }

  return (
    <>
      <div className="section">
        <div className="gantt-tools">
          <label className="eap-check">
            <input type="checkbox" checked={mostrarArquivadas} onChange={(e) => setMostrarArquivadas(e.target.checked)} />
            Mostrar arquivadas{totalArquivadas ? ` (${totalArquivadas})` : ''}
          </label>
          <button className="btn btn-primary" onClick={() => goto('editarServico')}>+ Novo serviço</button>
        </div>
      </div>

      <div className="section">
        {eap.map((f) => {
          const fechada = !!fechadas[f.codigo]
          return (
            <div key={f.codigo} className="eap-frente">
              <button className="eap-linha eap-linha-frente" aria-expanded={!fechada} onClick={() => setFechadas({ ...fechadas, [f.codigo]: !fechada })}>
                <span className="eap-cod">{f.codigo}</span>
                <span>
                  <span className="item-title">{f.nome} {fechada ? '▸' : '▾'}</span>
                  <span className="label" style={{ display: 'block' }}>{ddmm(f.inicio)} a {ddmm(f.termino)}, {f.servicos.length} {f.servicos.length === 1 ? 'serviço' : 'serviços'}</span>
                  <span className={`bar${f.pct >= 1 ? ' done' : ''}`}><i style={{ width: `${f.pct * 100}%` }}></i></span>
                </span>
                <b className="num">{Math.round(f.pct * 100)}%</b>
              </button>

              {!fechada && f.servicos.map((s) => (
                <div key={s.id} className="eap-servico">
                  <div className="eap-linha">
                    <span className="eap-cod">{s.codigo}</span>
                    <span>
                      <span className="eap-nome">{s.nome}</span>
                      <span className="label" style={{ display: 'block' }}>{ddmm(s.inicio)} a {ddmm(s.termino)}, {nome(s.responsavel_id)}</span>
                      <span className={`bar${s.concluido ? ' done' : ''}`}><i style={{ width: `${s.pct * 100}%` }}></i></span>
                    </span>
                    <b className="num">{Math.round(s.pct * 100)}%</b>
                  </div>
                  <div className="eap-acoes">
                    <button className="btn-texto" onClick={() => setForm({ servicoId: s.id })}>+ Subatividade</button>
                    <button className="btn-texto" onClick={() => goto('editarServico', { id: s.id })}>Editar serviço</button>
                  </div>

                  {s.subatividades.map((x) => (
                    form?.sub?.id === x.id ? (
                      <FormSub key={x.id} sub={x} servicoId={s.id} opcoes={opcoesServico} onCancelar={() => setForm(null)} onSalvo={() => salvo('Subatividade salva.')} />
                    ) : (
                      <div key={x.id} className={`eap-sub${x.arquivada ? ' arquivada' : ''}`}>
                        <span className="eap-cod">{x.codigo ?? '—'}</span>
                        <span>
                          <span className={x.concluida ? 'riscado' : ''}>{x.titulo}</span>
                          <span className="label" style={{ display: 'block' }}>{ddmm(x.inicio)} a {ddmm(x.fim)}</span>
                          <span className="tags">
                            {x.concluida && <span className="tag green">Concluída</span>}
                            {x.arquivada && <span className="tag slate">Arquivada</span>}
                          </span>
                        </span>
                        <span className="eap-sub-acoes">
                          {!x.arquivada && <button className="btn-texto" onClick={() => setForm({ servicoId: s.id, sub: x })}>Editar</button>}
                          <button className="btn-texto" disabled={mexendo} onClick={() => arquivar(x)}>{x.arquivada ? 'Desarquivar' : 'Arquivar'}</button>
                        </span>
                      </div>
                    )
                  ))}
                  {s.subatividades.length === 0 && form?.servicoId !== s.id && (
                    <p className="label eap-vazio">Sem subatividades. Quebre o serviço em passos menores para planejar a semana.</p>
                  )}
                  {form?.servicoId === s.id && !form.sub && (
                    <FormSub servicoId={s.id} opcoes={opcoesServico} onCancelar={() => setForm(null)} onSalvo={() => salvo('Subatividade criada.')} />
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {aviso}
    </>
  )
}

// Criar ou editar uma subatividade. Trocar o serviço move ela de lugar na EAP.
function FormSub({ sub, servicoId, opcoes, onCancelar, onSalvo }) {
  const servico = opcoes.find((o) => o.id === servicoId)
  const [d, setD] = useState(() => sub
    ? { id: sub.id, titulo: sub.titulo, servico_id: sub.servico_id, inicio: sub.inicio, fim: sub.fim }
    : { titulo: '', servico_id: servicoId, ...datasPadraoSubatividade(servico, HOJE) })
  const [tocados, setTocados] = useState({})
  const [falha, setFalha] = useState('')
  const [salvando, rodar] = useOcupado()
  // Obrigatório avisa na hora: o erro aparece assim que a pessoa mexe no campo.
  const erros = conferirSubatividade(d, opcoes.map((o) => o.id)).erros
  const muda = (c) => (e) => { setD({ ...d, [c]: e.target.value }); setTocados({ ...tocados, [c]: true }) }
  const erro = (c) => tocados[c] && erros[c] && <span className="acesso-erro">{erros[c]}</span>

  const salvar = async (e) => {
    e.preventDefault()
    setTocados({ titulo: true, servico_id: true, inicio: true, fim: true })
    const r = await salvarSubatividade(d)
    if (r.erros) return
    if (r.erro) return setFalha(r.erro)
    onSalvo()
  }

  return (
    <form className="panel form-painel" onSubmit={(e) => rodar(() => salvar(e))} noValidate>
      <div className="field full"><label className="label" htmlFor="sa-titulo">Subatividade</label>
        <input id="sa-titulo" value={d.titulo} onChange={muda('titulo')} placeholder="Ex.: chapisco das paredes do banheiro" autoFocus />{erro('titulo')}</div>
      <div className="field full"><label className="label" htmlFor="sa-servico">Dentro do serviço</label>
        <select id="sa-servico" value={d.servico_id} onChange={muda('servico_id')}>
          {opcoes.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
        </select>{erro('servico_id')}</div>
      <div className="field"><label className="label" htmlFor="sa-inicio">Início</label>
        <input id="sa-inicio" type="date" value={d.inicio} onChange={muda('inicio')} />{erro('inicio')}</div>
      <div className="field"><label className="label" htmlFor="sa-fim">Fim</label>
        <input id="sa-fim" type="date" value={d.fim} min={d.inicio} onChange={muda('fim')} />{erro('fim')}</div>
      {falha && <p className="acesso-erro full" role="alert">{falha}</p>}
      <div className="full eap-form-botoes">
        <button type="button" className="btn" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar subatividade'}</button>
      </div>
    </form>
  )
}

// ---------- Longo prazo: a obra inteira no tempo, real x previsto ----------
const RITMO = { concluido: ['green', 'Concluído'], em_dia: ['green', 'Em dia'], atrasado: ['red', 'Atrás do previsto'] }
const pc = (f) => `${(f * 100).toFixed(3)}%`
const inteiro = (f) => `${Math.round(f * 100)}%`

function Longo({ dados }) {
  const [modo, setModo] = useState('semana')
  const { linhas, subatividades, obra } = dados
  const frentes = comPrevisto(montarEAP(linhas, subatividades), HOJE)
  const datas = frentes.flatMap((f) => [f.inicio, f.termino])
  const inicio = [obra.data_inicio, ...datas].filter(Boolean).sort()[0]
  const fim = [obra.data_entrega, ...datas].filter(Boolean).sort().at(-1)
  const tl = linhaDoTempo(inicio, fim, modo)
  const servicos = frentes.flatMap((f) => f.servicos)
  const peso = servicos.reduce((t, s) => t + s.duracao, 0)
  const obraReal = servicos.reduce((t, s) => t + s.pct * s.duracao, 0) / peso
  const obraPrev = servicos.reduce((t, s) => t + s.previsto * s.duracao, 0) / peso
  const atrasados = servicos.filter((s) => s.ritmo === 'atrasado').length

  return (
    <>
      <div className="section">
        <div className="lp-resumo panel">
          <div><span className="label">Real</span><b className="num">{inteiro(obraReal)}</b></div>
          <div><span className="label">Previsto hoje</span><b className="num">{inteiro(obraPrev)}</b></div>
          <div><span className="label">Atrás do previsto</span><b className={`num${atrasados ? ' c-red' : ''}`}>{atrasados}</b></div>
        </div>
        <div className="gantt-tools so-computador-flex">
          <div className="seg seg-2" aria-label="Escala da linha do tempo">
            <button aria-pressed={modo === 'semana'} onClick={() => setModo('semana')}>Por semana</button>
            <button aria-pressed={modo === 'mes'} onClick={() => setModo('mes')}>Por mês</button>
          </div>
          <div className="gantt-legenda">
            <span><i className="lp-leg lp-leg-real"></i>Real</span>
            <span><i className="lp-leg lp-leg-prev"></i>Previsto hoje</span>
            <span><i className="lp-leg lp-leg-hoje"></i>Hoje {ddmm(HOJE)}</span>
            <span><i className="lp-leg lp-leg-entrega"></i>Entrega {ddmm(obra.data_entrega)}</span>
          </div>
        </div>
      </div>

      {/* Computador: barras na linha do tempo. */}
      <div className="section so-computador">
        <div className="lp-grafico" aria-label="Linha do tempo da obra">
          <div className="lp-linha lp-cab">
            <div className="lp-rot"><span className="label">Serviço</span></div>
            <div className="lp-trilho">
              {tl.colunas.map((c) => <span key={c.inicio} className="lp-col" style={{ width: pc(c.largura) }}>{c.rotulo}</span>)}
            </div>
            <div className="lp-pct"><span className="label">Real / prev.</span></div>
          </div>
          {frentes.map((f) => (
            <div key={f.codigo}>
              <LinhaDoTempo item={f} tl={tl} obra={obra} frente />
              {f.servicos.map((s) => <LinhaDoTempo key={s.id} item={s} tl={tl} obra={obra} />)}
            </div>
          ))}
        </div>
      </div>

      {/* Celular: a mesma informação em lista. */}
      <div className="section lp-lista">
        {frentes.map((f) => (
          <div key={f.codigo}>
            <div className="grupo"><span className="label">{f.codigo} {f.nome}</span></div>
            {f.servicos.map((s) => (
              <div key={s.id} className="lp-item">
                <span className="eap-cod">{s.codigo}</span>
                <span>
                  <span className="eap-nome">{s.nome}</span>
                  <span className="label" style={{ display: 'block' }}>{ddmm(s.inicio)} a {ddmm(s.termino)}</span>
                  <span className={`bar lp-bar${s.concluido ? ' done' : ''}`} aria-hidden="true">
                    <i style={{ width: pc(s.pct) }}></i>
                    {!s.concluido && s.previsto > 0 && <b className="lp-marca" style={{ left: pc(s.previsto) }}></b>}
                  </span>
                  <span className="label" style={{ display: 'block', marginTop: 6 }}>Real {inteiro(s.pct)}, previsto hoje {inteiro(s.previsto)}</span>
                </span>
                <span className={`tag ${RITMO[s.ritmo][0]}`}>{RITMO[s.ritmo][1]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function LinhaDoTempo({ item, tl, obra, frente = false }) {
  const esq = tl.posicao(item.inicio)
  const larg = Math.max(tl.posicao(item.termino, true) - esq, 0.004)
  const [cor, texto] = RITMO[item.ritmo]
  return (
    <div className={`lp-linha${frente ? ' lp-frente' : ''}`}>
      <div className="lp-rot">
        <span className="eap-cod">{item.codigo}</span>
        <span className={frente ? 'lp-nome-frente' : 'lp-nome'} title={item.nome}>{item.nome}</span>
      </div>
      <div className="lp-trilho">
        {tl.colunas.map((c) => <i key={c.inicio} className="lp-grade" style={{ left: pc(tl.posicao(c.inicio)) }} />)}
        <i className="lp-hoje" style={{ left: pc(tl.posicao(HOJE)) }} />
        <i className="lp-entrega" style={{ left: pc(tl.posicao(obra.data_entrega, true)) }} />
        <span className={`lp-barra lp-${cor}`} style={{ left: pc(esq), width: pc(larg) }}
          title={`${item.nome}: ${ddmm(item.inicio)} a ${ddmm(item.termino)}. Real ${inteiro(item.pct)}, previsto hoje ${inteiro(item.previsto)} (${texto}).`}>
          <i className="lp-real" style={{ width: pc(item.pct) }} />
          {item.ritmo !== 'concluido' && item.previsto > 0 && <b className="lp-marca" style={{ left: pc(item.previsto) }} />}
        </span>
      </div>
      <div className="lp-pct">
        <b className={`num ${item.ritmo === 'atrasado' ? 'c-red' : ''}`}>{inteiro(item.pct)}</b>
        <span className="label"> / {inteiro(item.previsto)}</span>
      </div>
    </div>
  )
}

// ---------- Médio prazo: quadro de restrições por semana ----------
// Cada tipo tem cor e ícone próprios (cores em telas.css, .rt-*).
const TIPO_VISUAL = {
  Material: ['caixa', 'material'], 'Mão de obra': ['equipe', 'mao-de-obra'], Método: ['metodo', 'metodo'],
  Equipamento: ['ferramenta', 'equipamento'], Projeto: ['planta', 'projeto'], Segurança: ['escudo', 'seguranca'],
  Logística: ['caminhao', 'logistica'],
}

function Medio({ dados, recarregar }) {
  const [semanas, setSemanas] = useState(4)
  const [responsavel, setResponsavel] = useState('')
  const [mostrarResolvidas, setMostrarResolvidas] = useState(false)
  const [form, setForm] = useState(null) // {} = nova; { restricao } = editar
  const [aviso, avisar] = useAviso()
  const [mexendo, rodar] = useOcupado()

  const { linhas, subatividades, restricoes, responsaveis } = dados
  const servicos = montarEAP(linhas, subatividades).flatMap((f) => f.servicos)
  const servico = (id) => servicos.find((s) => s.id === id)
  const q = montarLookahead(restricoes, HOJE, { semanas, responsavel, mostrarResolvidas })
  const nomesNoQuadro = [...new Set(restricoes.map((r) => r.responsavel))].sort()
  const abertas = restricoes.filter((r) => !r.resolvida).length

  const agir = (fazer, mensagem) => rodar(async () => {
    const { erro } = await fazer()
    if (erro) return avisar(erro)
    avisar(mensagem)
    recarregar()
  })
  const salvo = (msg) => { setForm(null); avisar(msg); recarregar() }

  if (restricoes.length === 0 && !form) {
    return (
      <>
        <Vazio icone="caixa" titulo="Nenhuma restrição nesta obra"
          texto="Restrição é o que impede um serviço de andar: material que não chegou, projeto sem aprovação, equipe em outra obra. Registre para resolver antes da semana do serviço."
          botao="Registrar a primeira restrição" onBotao={() => setForm({})} />
        {aviso}
      </>
    )
  }

  return (
    <>
      <div className="section">
        <div className="lk-filtros">
          <div className="field"><label className="label" htmlFor="lk-semanas">Semanas à frente</label>
            <select id="lk-semanas" value={semanas} onChange={(e) => setSemanas(Number(e.target.value))}>
              {SEMANAS_DO_HORIZONTE.map((n) => <option key={n} value={n}>{n} semanas</option>)}
            </select></div>
          <div className="field"><label className="label" htmlFor="lk-resp">Responsável</label>
            <select id="lk-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
              <option value="">Todos</option>
              {nomesNoQuadro.map((n) => <option key={n}>{n}</option>)}
            </select></div>
          <label className="eap-check">
            <input type="checkbox" checked={mostrarResolvidas} onChange={(e) => setMostrarResolvidas(e.target.checked)} />
            Mostrar resolvidas
          </label>
          <button className="btn btn-primary" onClick={() => setForm(form ? null : {})}>{form ? 'Fechar' : '+ Nova restrição'}</button>
        </div>
        {form && (
          <FormRestricao restricao={form.restricao} servicos={servicos} responsaveis={responsaveis}
            onCancelar={() => setForm(null)} onSalvo={() => salvo(form.restricao ? 'Restrição salva.' : 'Restrição registrada.')} />
        )}
        <p className="label" style={{ marginTop: 10 }}>
          {abertas} {abertas === 1 ? 'restrição aberta' : 'restrições abertas'} nesta obra
          {q.depois > 0 && `, ${q.depois} depois das ${semanas} semanas`}
        </p>
      </div>

      <div className="section">
        <div className="lk-quadro" style={{ '--n': semanas }}>
          {q.colunas.map((c, i) => {
            const naSemana = servicosDaSemana(servicos, c.semana)
            return (
              <section key={c.semana} className="lk-coluna" aria-label={`Semana de ${ddmm(c.semana)}`}>
                <header className="lk-cab">
                  <strong>{i === 0 ? 'Esta semana' : `Semana de ${ddmm(c.semana)}`}</strong>
                  <span className="label">{i === 0 ? `de ${ddmm(c.semana)}, ` : ''}{naSemana.length} {naSemana.length === 1 ? 'serviço' : 'serviços'} trabalhando</span>
                </header>
                {c.restricoes.length === 0 && <p className="label lk-vazia">Nada impedindo nesta semana.</p>}
                {c.restricoes.map((r) => {
                  const [icone, classe] = TIPO_VISUAL[r.tipo] ?? ['lista', 'material']
                  const s = servico(r.servico_id)
                  // Atrasada: "próxima" leva para a semana seguinte à de hoje, não à semana velha dela.
                  const paraFrente = r.atrasada ? semanasEntre(r.semana, q.colunas[0].semana) + 1 : 1
                  return (
                    <article key={r.id} className={`rt-card rt-${classe}${r.resolvida ? ' resolvida' : ''}`}>
                      <div className="rt-topo">
                        <span className="rt-tipo"><Icon nome={icone} tamanho={18} />{r.tipo}</span>
                        {r.atrasada && <span className="tag solid-red">Atrasada, era de {ddmm(r.semana)}</span>}
                        {r.vencida && <span className="tag red">Prazo vencido</span>}
                        {r.resolvida && <span className="tag green">Resolvida</span>}
                      </div>
                      <p className={`rt-desc${r.resolvida ? ' riscado' : ''}`}>{r.descricao}</p>
                      <span className="label" style={{ display: 'block' }}>{s ? `${s.codigo} ${s.nome}` : 'Serviço fora do cronograma'}</span>
                      <span className="label" style={{ display: 'block' }}>Resolver até {ddmm(r.prazo)}, {r.responsavel}</span>
                      <div className="rt-acoes">
                        <button className="btn-texto" aria-label="Mover para a semana anterior" title="Semana anterior" disabled={mexendo || i === 0}
                          onClick={() => agir(() => moverRestricao(r.id, -1), 'Restrição foi para a semana anterior.')}>◀</button>
                        <button className="btn-texto" aria-label="Mover para a próxima semana" title="Próxima semana" disabled={mexendo || r.resolvida}
                          onClick={() => agir(() => moverRestricao(r.id, paraFrente), 'Restrição foi para a semana seguinte.')}>▶</button>
                        <button className="btn-texto" disabled={mexendo}
                          onClick={() => agir(() => resolverRestricao(r.id, !r.resolvida), r.resolvida ? 'Restrição reaberta.' : 'Restrição resolvida.')}>
                          {r.resolvida ? 'Reabrir' : 'Resolver'}
                        </button>
                        {!r.resolvida && <button className="btn-texto" onClick={() => setForm({ restricao: r })}>Editar</button>}
                      </div>
                    </article>
                  )
                })}
              </section>
            )
          })}
        </div>
      </div>
      {aviso}
    </>
  )
}

function FormRestricao({ restricao, servicos, responsaveis, onCancelar, onSalvo }) {
  const [d, setD] = useState(() => restricao
    ? { id: restricao.id, descricao: restricao.descricao, tipo: restricao.tipo, servico_id: restricao.servico_id, prazo: restricao.prazo, responsavel: restricao.responsavel }
    : { descricao: '', tipo: TIPOS_RESTRICAO[0], servico_id: servicos.find((s) => !s.concluido)?.id ?? servicos[0]?.id ?? '', prazo: HOJE, responsavel: responsaveis[0] ?? '' })
  const [tocados, setTocados] = useState({})
  const [falha, setFalha] = useState('')
  const [salvando, rodar] = useOcupado()
  // Obrigatório avisa na hora: o erro aparece assim que a pessoa mexe no campo.
  const erros = conferirRestricao(d, servicos.map((s) => s.id)).erros
  const muda = (c) => (e) => { setD({ ...d, [c]: e.target.value }); setTocados({ ...tocados, [c]: true }) }
  const erro = (c) => tocados[c] && erros[c] && <span className="acesso-erro">{erros[c]}</span>
  const opcoesResp = d.responsavel && !responsaveis.includes(d.responsavel) ? [d.responsavel, ...responsaveis] : responsaveis

  const salvar = async (e) => {
    e.preventDefault()
    setTocados({ descricao: true, tipo: true, servico_id: true, prazo: true, responsavel: true })
    const r = await salvarRestricao(d)
    if (r.erros) return
    if (r.erro) return setFalha(r.erro)
    onSalvo()
  }

  return (
    <form className="panel form-painel" onSubmit={(e) => rodar(() => salvar(e))} noValidate>
      <div className="field full"><label className="label" htmlFor="rt-desc">O que está impedindo</label>
        <textarea id="rt-desc" value={d.descricao} onChange={muda('descricao')} placeholder="Ex.: argamassa do porcelanato ainda não comprada" autoFocus />{erro('descricao')}</div>
      <div className="field"><label className="label" htmlFor="rt-tipo">Tipo</label>
        <select id="rt-tipo" value={d.tipo} onChange={muda('tipo')}>{TIPOS_RESTRICAO.map((t) => <option key={t}>{t}</option>)}</select>{erro('tipo')}</div>
      <div className="field"><label className="label" htmlFor="rt-servico">Serviço impedido</label>
        <select id="rt-servico" value={d.servico_id} onChange={muda('servico_id')}>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.codigo} {s.nome}{s.concluido ? ' (concluído)' : ''}</option>)}
        </select>{erro('servico_id')}</div>
      <div className="field"><label className="label" htmlFor="rt-prazo">Resolver até</label>
        <input id="rt-prazo" type="date" value={d.prazo} onChange={muda('prazo')} />{erro('prazo')}</div>
      <div className="field"><label className="label" htmlFor="rt-resp">Quem resolve</label>
        <select id="rt-resp" value={d.responsavel} onChange={muda('responsavel')}>
          {opcoesResp.map((n) => <option key={n}>{n}</option>)}
        </select>{erro('responsavel')}</div>
      {falha && <p className="acesso-erro full" role="alert">{falha}</p>}
      <div className="full eap-form-botoes">
        <button type="button" className="btn" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : restricao ? 'Salvar restrição' : 'Registrar restrição'}</button>
      </div>
    </form>
  )
}

// ---------- Curto prazo: kanban da semana e PPC ----------
const corDoPPC = (pct) => (pct === null ? 'slate' : pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red')

function Curto({ dados, recarregar }) {
  const estaSemana = segundaDaSemana(HOJE)
  const [semana, setSemana] = useState(estaSemana)
  const [pedindoCausa, setPedindoCausa] = useState(null) // { tipo: 'servico' | 'sub', id }
  const [causa, setCausa] = useState('')
  const [faltaCausa, setFaltaCausa] = useState(false)
  const [aviso, avisar] = useAviso()
  const [mexendo, rodar] = useOcupado()

  const { linhas, subatividades, restricoes, compromissos, contratados } = dados
  const servicos = montarEAP(linhas, subatividades).flatMap((f) => f.servicos)
  const atividades = atividadesDaSemana(servicos, compromissos, semana, servicosImpedidos(restricoes))
  const placar = ppc(atividades)
  // Histórico: só semanas em que alguém marcou o kanban, para não inventar PPC de semana não planejada.
  const historico = [...new Set(compromissos.map((c) => c.semana))].filter((s) => s < semana).sort().slice(-4)
    .map((s) => ({ semana: s, ...ppc(atividadesDaSemana(servicos, compromissos, s)) }))
  const nome = (id) => contratados.find((c) => c.id === id)?.nome ?? 'sem prestador'

  const gravar = (fazer, mensagem) => rodar(async () => {
    const { erro } = await fazer()
    if (erro) return avisar(erro)
    setPedindoCausa(null)
    avisar(mensagem)
    recarregar()
  })
  const pedirCausa = (tipo, id) => { setPedindoCausa({ tipo, id }); setCausa(''); setFaltaCausa(false) }
  const mover = (a, status) => {
    if (status === 'nao_realizado') return pedirCausa('servico', a.id)
    gravar(() => moverAtividade({ servico_id: a.id, semana, status }), `Movido para ${STATUS_KANBAN[status]}.`)
  }
  const confirmarCausa = () => {
    if (!causa) { setFaltaCausa(true); return }
    gravar(() => (pedindoCausa.tipo === 'servico'
      ? moverAtividade({ servico_id: pedindoCausa.id, semana, status: 'nao_realizado', causa })
      : marcarSubatividade(pedindoCausa.id, { nao_realizada: true, causa })), 'Marcado como não realizado, com a causa.')
  }

  const formCausa = (
    <div className="kb-causa" role="group" aria-label="Causa do não realizado">
      <label className="label" htmlFor="kb-causa">Por que não foi feito?</label>
      <select id="kb-causa" value={causa} onChange={(e) => { setCausa(e.target.value); setFaltaCausa(false) }} autoFocus>
        <option value="">Escolha a causa</option>
        {CAUSAS_NAO_REALIZADO.map((c) => <option key={c}>{c}</option>)}
      </select>
      {faltaCausa && <span className="acesso-erro">Escolha a causa: por que não foi feito?</span>}
      <div className="eap-form-botoes">
        <button className="btn" onClick={() => setPedindoCausa(null)}>Cancelar</button>
        <button className="btn btn-primary" disabled={mexendo} onClick={confirmarCausa}>Confirmar não realizado</button>
      </div>
    </div>
  )

  const cartao = (a) => (
    <article key={a.id} className={`kb-card${a.status === 'nao_realizado' ? ' nao' : ''}`}>
      <div className="kb-topo"><span className="eap-cod">{a.codigo}</span><strong>{a.nome}</strong></div>
      <span className="label" style={{ display: 'block' }}>{ddmm(a.inicio)} a {ddmm(a.termino)}, {nome(a.responsavel_id)}</span>
      <div className="tags">
        {a.acumulada && <span className="tag solid-red">Atrasado: devia ter acabado {ddmm(a.termino)}</span>}
        {a.impedido && <span className="tag amber">Impedido: restrição aberta</span>}
        {a.status === 'nao_realizado' && <span className="tag red">Causa: {a.causa}</span>}
      </div>
      {a.subtarefas.length > 0 && (
        <ul className="kb-check" aria-label={`Subtarefas de ${a.nome}`}>
          {a.subtarefas.map((x) => (
            <li key={x.id}>
              <label>
                <input type="checkbox" checked={x.concluida} disabled={mexendo} aria-label={`Feita: ${x.titulo}`}
                  onChange={(e) => gravar(() => marcarSubatividade(x.id, { concluida: e.target.checked }), e.target.checked ? 'Subtarefa feita.' : 'Subtarefa de volta para fazer.')} />
                <span className={x.concluida ? 'riscado' : ''}>{x.titulo}</span>
              </label>
              {x.nao_realizada
                ? <span className="tag red">Não feita: {x.causa}</span>
                : !x.concluida && <button className="btn-texto" onClick={() => pedirCausa('sub', x.id)}>Não feita</button>}
              {pedindoCausa?.tipo === 'sub' && pedindoCausa.id === x.id && formCausa}
            </li>
          ))}
        </ul>
      )}
      {pedindoCausa?.tipo === 'servico' && pedindoCausa.id === a.id && formCausa}
      <div className="field kb-mover">
        <label className="label" htmlFor={`mv-${a.id}`}>Mover para</label>
        <select id={`mv-${a.id}`} value={a.status} disabled={mexendo} onChange={(e) => mover(a, e.target.value)}>
          {Object.entries(STATUS_KANBAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
    </article>
  )

  const naoRealizadas = atividades.filter((a) => a.status === 'nao_realizado')

  return (
    <>
      <div className="section">
        <div className="kb-semana">
          <button className="btn" aria-label="Semana anterior" onClick={() => setSemana(somarSemanas(semana, -1))}>◀</button>
          <div>
            <strong>{semana === estaSemana ? 'Esta semana' : `Semana de ${ddmm(semana)}`}</strong>
            <span className="label" style={{ display: 'block' }}>{ddmm(semana)} a {ddmm(domingoDa(semana))}</span>
          </div>
          <button className="btn" aria-label="Próxima semana" onClick={() => setSemana(somarSemanas(semana, 1))}>▶</button>
        </div>
        {semana !== estaSemana && <button className="btn-texto" onClick={() => setSemana(estaSemana)}>Voltar para esta semana</button>}

        <div className={`panel kb-ppc ppc-${corDoPPC(placar.pct)}`}>
          <div>
            <span className="label">PPC da semana</span>
            <b className="kb-ppc-num num">{placar.pct === null ? '—' : `${placar.pct}%`}</b>
            <span className="label">{placar.concluidas} de {placar.total} {placar.total === 1 ? 'concluída' : 'concluídas'}</span>
          </div>
          <span className="bar big"><i style={{ width: `${placar.pct ?? 0}%` }}></i></span>
          {historico.length > 0 && (
            <div className="kb-hist" aria-label="PPC das semanas anteriores">
              {historico.map((h) => (
                <span key={h.semana} className="kb-hist-item">
                  <span className="label">{ddmm(h.semana)}</span>
                  <span className="kb-hist-barra"><i className={`ppc-${corDoPPC(h.pct)}`} style={{ height: `${Math.max(h.pct ?? 0, 4)}%` }}></i></span>
                  <b className="num">{h.pct}%</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {atividades.length === 0 ? (
        <Vazio icone="lista" titulo="Nada planejado para esta semana"
          texto="Nenhum serviço do cronograma trabalha nesta semana. Use as setas para ver outra semana." />
      ) : (
        <div className="section">
          <div className="kb-quadro">
            {COLUNAS_KANBAN.map((col) => {
              const daColuna = atividades.filter((a) => a.status === col)
              return (
                <section key={col} className="lk-coluna" aria-label={STATUS_KANBAN[col]}>
                  <header className="lk-cab"><strong>{STATUS_KANBAN[col]}</strong><span className="label">{daColuna.length}</span></header>
                  {daColuna.length === 0 && <p className="label lk-vazia">Nada aqui.</p>}
                  {daColuna.map(cartao)}
                </section>
              )
            })}
          </div>
          {naoRealizadas.length > 0 && (
            <section className="lk-coluna kb-nao" aria-label="Não realizado">
              <header className="lk-cab"><strong>Não realizado nesta semana</strong><span className="label">{naoRealizadas.length}, contam no PPC como não cumpridas</span></header>
              {naoRealizadas.map(cartao)}
            </section>
          )}
        </div>
      )}
      {aviso}
    </>
  )
}
