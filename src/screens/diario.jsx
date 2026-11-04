import { useState } from 'react'
import { Carregando, Icon, Titulo, Vazio, useAviso, useCarregar, useOcupado } from '../components'
import {
  aprovarDiario, buscarDiario, buscarDiarioDoDia, carregarCronograma, devolverDiario,
  enviarDiario, listarContratados, listarDiarios, salvarDiario,
} from '../lib/dados'
import { calcularCascata, statusQueContam } from '../lib/cronograma'
import { corDoStatusDiario, dataBR, numeroBR, qtd } from '../lib/formato'
import { faltaDoServico } from '../lib/lancamentos'
import { HOJE } from '../lib/mockData'

const CLIMAS = ['Sol', 'Nublado', 'Chuva', 'Chuva forte']
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const diaDaSemana = (iso) => DIAS[new Date(`${iso}T12:00:00`).getDay()]

// Ordem da lista: o que pede ação de quem está olhando vem primeiro.
const prioridade = (perfil, d) =>
  (perfil === 'socio' && d.status === 'Enviado') || (perfil === 'auxiliar' && d.status === 'Devolvido') ? 0 : 1

// ---------- Lista de diários (Sócio: "Diário"; Auxiliar: "Meus diários"; Cliente: só aprovados) ----------
export function DiarioLista({ perfil, goto }) {
  const estado = useCarregar(listarDiarios)
  const lista = [...(estado.data ?? [])].sort((a, b) => prioridade(perfil, a) - prioridade(perfil, b))
  const podeLancar = perfil !== 'cliente'
  return (
    <>
      <Titulo rotulo="Diário de obra" titulo={perfil === 'auxiliar' ? 'Meus diários' : 'Diários da obra'}>
        {podeLancar && (
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => goto('diarioDia', { data: HOJE })}>
            Lançar o de hoje
          </button>
        )}
      </Titulo>
      <Carregando estado={estado}>
        {lista.length === 0 ? (
          <Vazio icone="diario" titulo={perfil === 'cliente' ? 'Nenhum diário aprovado ainda' : 'Nenhum diário lançado ainda'}
            texto={perfil === 'cliente' ? 'Assim que a equipe registrar o dia e a engenheira aprovar, ele aparece aqui.' : 'Lance o de hoje: equipe, o que foi feito e as fotos.'}
            botao={podeLancar ? 'Lançar o de hoje' : null} onBotao={() => goto('diarioDia', { data: HOJE })} />
        ) : (
          <div className="section">
            {lista.map((d) => (
              <button key={d.id} className="item" onClick={() => goto('diarioDia', { id: d.id })}>
                <span className={`sq ${{ Aprovado: 'green', Enviado: 'amber', Devolvido: 'red' }[d.status] ?? ''}`}></span>
                <span>
                  <span className="item-title">{diaDaSemana(d.data)}, {dataBR(d.data)}</span>
                  <span className="label item-meta" style={{ display: 'block' }}>
                    {d.qtd_pessoas} pessoas, {d.qtd_servicos} serviços, {d.qtd_fotos} fotos
                  </span>
                  {d.status === 'Devolvido' && d.comentario_devolucao && (
                    <span className="tags"><span className="tag red">Devolvido: {d.comentario_devolucao}</span></span>
                  )}
                </span>
                <span className={`tag ${corDoStatusDiario(d.status)}`}>{d.status === 'Enviado' ? 'Aguardando' : d.status}</span>
              </button>
            ))}
          </div>
        )}
      </Carregando>
    </>
  )
}

// ---------- Diário do dia ----------
async function carregarDia(params) {
  const [di, cr, fu] = await Promise.all([
    params.id ? buscarDiario(params.id) : buscarDiarioDoDia(params.data ?? HOJE),
    carregarCronograma(),
    listarContratados(),
  ])
  return { data: { diario: di.data, ...cr.data, contratados: fu.data }, erro: di.erro ?? cr.erro ?? fu.erro }
}

export function DiarioDia({ perfil, params, goto }) {
  const estado = useCarregar(() => carregarDia(params))
  return (
    <Carregando estado={estado}>
      {estado.data && <Formulario perfil={perfil} dados={estado.data} data={params.data ?? HOJE} goto={goto} recarregar={estado.recarregar} />}
    </Carregando>
  )
}

function Formulario({ perfil, dados, data, recarregar }) {
  const { diario, obra, servicos, execucoes, contratados } = dados
  const [aviso, avisar] = useAviso()
  const [salvando, rodar] = useOcupado()
  const d = diario ?? { status: 'Rascunho', data, clima_manha: 'Sol', clima_tarde: 'Sol', equipe: [], execucoes: [], fotos: [], qtd_pessoas: 0 }
  const somenteLeitura = perfil === 'cliente' || (perfil === 'auxiliar' && d.status === 'Aprovado')

  const [clima, setClima] = useState([d.clima_manha, d.clima_tarde])
  const [equipe, setEquipe] = useState(d.equipe.map((p) => p.id))
  const [atividades, setAtividades] = useState(Object.fromEntries(d.equipe.map((p) => [p.id, p.atividade])))
  const [ocorrencias, setOcorrencias] = useState(d.ocorrencias ?? '')
  const [lancamentos, setLancamentos] = useState(Object.fromEntries(d.execucoes.map((e) => [e.servico_id, {
    servico_id: e.servico_id, quantidade: numeroBR(e.quantidade), qtd_pessoas: String(e.qtd_pessoas), descricao: e.descricao ?? '',
  }])))
  const [erros, setErros] = useState({})
  const [devolvendo, setDevolvendo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [mostrarOutros, setMostrarOutros] = useState(false)

  if (perfil === 'cliente' && !diario) {
    return <Vazio icone="diario" titulo="Diário ainda não aprovado" texto="Este dia ainda não foi aprovado pela engenheira." />
  }

  // Meta do dia e serviços liberados saem da cascata (regra em lib/cronograma.js).
  const c = calcularCascata({ servicos, execucoes, obra, hoje: HOJE, contam: statusQueContam(perfil) })
  const lancado = (sid) => d.execucoes.find((e) => e.servico_id === sid)
  const aberto = c.linhas.filter((l) => !l.concluido || lancado(l.id))
  const liberado = (l) => lancado(l.id) || l.inicioReal || l.deps.every((x) => c.linhas.find((y) => y.id === x)?.concluido)
  // Quem só lê vê o que foi lançado naquele dia, não o que estava liberado.
  const liberados = somenteLeitura ? aberto.filter((l) => lancado(l.id)) : aberto.filter(liberado)
  const outros = aberto.filter((l) => !liberado(l))

  const mudarLancamento = (sid, campo, valor) => setLancamentos({
    ...lancamentos, [sid]: { servico_id: sid, quantidade: '', qtd_pessoas: '', descricao: '', ...lancamentos[sid], [campo]: valor },
  })

  // Grava tudo o que está na tela e, se houver, faz o próximo passo (enviar, aprovar).
  const salvar = (ok, depois) => rodar(async () => {
    const r = await salvarDiario({
      id: diario?.id, data: d.data, clima_manha: clima[0], clima_tarde: clima[1], ocorrencias, equipe, atividades,
      lancamentos: Object.values(lancamentos),
    })
    if (r.erros) { setErros(r.erros); avisar('Confira os campos destacados.'); return }
    if (r.erro) { avisar(r.erro); return }
    setErros({})
    if (depois) {
      const passo = await depois(r.data.id)
      if (passo.erro) { avisar(passo.erro); return }
    }
    avisar(ok)
    recarregar()
  })

  const devolver = () => rodar(async () => {
    const r = await devolverDiario(d.id, motivo)
    if (r.erro) { avisar(r.erro); return }
    setDevolvendo(false)
    avisar('Diário devolvido.')
    recarregar()
  })

  return (
    <>
      <Titulo rotulo={`Diário de ${obra.codigo}`} titulo={`${diaDaSemana(d.data)}, ${dataBR(d.data)}`}>
        <div className="tags">
          <span className={`tag ${corDoStatusDiario(d.status)}`}>{diario ? (d.status === 'Enviado' ? 'Enviado, aguardando aprovação' : d.status) : 'Novo, ainda não salvo'}</span>
        </div>
        {d.enviado_por && <p>Lançado por {d.enviado_por} às {d.enviado_as}</p>}
        {d.status === 'Devolvido' && d.comentario_devolucao && <p className="c-red"><b>Devolvido:</b> {d.comentario_devolucao}</p>}
      </Titulo>

      <div className="section">
        <div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>Clima</span></div>
        {['Manhã', 'Tarde'].map((periodo, i) => (
          <div className="clima-row" key={periodo} style={{ marginTop: i ? 14 : 12 }}>
            <span className="label">{periodo}</span>
            <div className="seg">
              {CLIMAS.map((cl) => (
                <button key={cl} aria-pressed={clima[i] === cl} disabled={somenteLeitura}
                  onClick={() => setClima(i ? [clima[0], cl] : [cl, clima[1]])}>{cl}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>Equipe do dia</span></div>
        <div className="equipe-total"><span className="n num">{equipe.length || d.qtd_pessoas}</span><span className="label">pessoas na obra</span></div>
        {somenteLeitura ? (
          d.equipe.length === 0 ? <p>Equipe não informada neste dia.</p> : d.equipe.map((p) => (
            <div key={p.id} className="prestador-dia">
              <strong>{p.nome}</strong> <span className="label">{p.funcao}</span>
              <p>{p.atividade || 'Atividade não informada.'}</p>
            </div>
          ))
        ) : (
          contratados.map((f) => (
            <div key={f.id} className="prestador-dia editavel">
              <label className="check">
                <input type="checkbox" checked={equipe.includes(f.id)}
                  onChange={(e) => setEquipe(e.target.checked ? [...equipe, f.id] : equipe.filter((x) => x !== f.id))} />
                <span>{f.nome}</span><small className="label">{f.funcao}</small>
              </label>
              {equipe.includes(f.id) && (
                <div className="field">
                  <label className="label" htmlFor={`at-${f.id}`}>O que {f.nome} fez hoje</label>
                  <input id={`at-${f.id}`} value={atividades[f.id] ?? ''} placeholder="Ex.: assentou o piso do banheiro social"
                    onChange={(e) => setAtividades({ ...atividades, [f.id]: e.target.value })} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-head">
          <span className="label" style={{ color: 'var(--ink)' }}>Serviços do dia</span>
          <span className="label">{liberados.length} {somenteLeitura ? 'lançados' : 'liberados'}</span>
        </div>
        {liberados.length === 0 && <p>{somenteLeitura ? 'Nenhum serviço lançado neste dia.' : 'Nenhum serviço liberado para hoje.'}</p>}
        {liberados.map((l) => <CartaoServico key={l.id} l={l} somenteLeitura={somenteLeitura}
          lancamento={lancamentos[l.id]} erro={erros[l.id]} descricao={lancado(l.id)?.descricao}
          falta={faltaDoServico(l, execucoes, diario?.id ?? null)}
          aoMudar={(campo, valor) => mudarLancamento(l.id, campo, valor)}
          nomePrestador={contratados.find((c) => c.id === l.responsavel_id)?.nome ?? lancado(l.id)?.prestador} />)}
        {mostrarOutros && outros.map((l) => (
          <div key={l.id} className="panel serv-card blocked">
            <div className="serv-top">
              <div><span className="label">{l.frente}</span><div className="item-title" style={{ marginTop: 4 }}>{l.nome}</div></div>
              <span className="tag slate">Ainda depende de outro</span>
            </div>
          </div>
        ))}
        {!somenteLeitura && outros.length > 0 && (
          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => setMostrarOutros(!mostrarOutros)}>
            {mostrarOutros ? 'Esconder outros serviços' : `Mostrar outros serviços (${outros.length})`}
          </button>
        )}
      </div>

      <div className="section">
        <div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>Ocorrências</span></div>
        <div className="field" style={{ marginTop: 12 }}>
          <textarea aria-label="Ocorrências" value={ocorrencias} onChange={(e) => setOcorrencias(e.target.value)} readOnly={somenteLeitura} placeholder="Ex.: faltou material, chuva parou o serviço…" />
        </div>
      </div>

      <div className="section">
        <div className="section-head"><span className="label" style={{ color: 'var(--ink)' }}>Fotos</span><span className="label">{d.fotos.length}</span></div>
        <div className="fotos">
          {d.fotos.map((f) => <div key={f.id} className="foto"><span>{f.legenda}</span></div>)}
          {!somenteLeitura && (
            <button className="foto-add" onClick={() => avisar('A câmera entra junto com o armazenamento de fotos (Etapa 7).')}>
              <Icon nome="camera" tamanho={28} />Tirar foto
            </button>
          )}
        </div>
      </div>

      {!somenteLeitura && devolvendo && (
        <div className="section">
          <div className="panel form-painel">
            <div className="field full">
              <label className="label" htmlFor="motivo">Por que este diário volta para ajuste?</label>
              <textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: faltou a foto do teste de estanqueidade" />
            </div>
          </div>
        </div>
      )}
      {!somenteLeitura && (
        <div className="actionbar">
          {perfil === 'socio' && d.status === 'Enviado' ? (
            devolvendo ? (
              <>
                <button className="btn" disabled={salvando} onClick={() => setDevolvendo(false)}>Cancelar</button>
                <button className="btn btn-danger" disabled={salvando || !motivo.trim()} onClick={devolver}>Confirmar devolução</button>
              </>
            ) : (
              <>
                <button className="btn btn-danger" disabled={salvando} onClick={() => setDevolvendo(true)}>Devolver</button>
                <button className="btn btn-primary" disabled={salvando} onClick={() => salvar('Diário aprovado. O cliente já pode ver.', aprovarDiario)}>{salvando ? 'Salvando…' : 'Aprovar diário'}</button>
              </>
            )
          ) : d.status === 'Aprovado' ? (
            <button className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={salvando} onClick={() => salvar('Alterações salvas.')}>{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
          ) : (
            <>
              <button className="btn" disabled={salvando} onClick={() => salvar(d.status === 'Rascunho' ? 'Rascunho salvo.' : 'Alterações salvas.')}>{d.status === 'Rascunho' ? 'Salvar rascunho' : 'Salvar alterações'}</button>
              <button className="btn btn-primary" disabled={salvando} onClick={() => salvar('Diário enviado para aprovação.', enviarDiario)}>{salvando ? 'Salvando…' : 'Enviar para aprovação'}</button>
            </>
          )}
        </div>
      )}
      {aviso}
    </>
  )
}

// Cartão de um serviço no diário: meta do dia em destaque e o lançamento.
function CartaoServico({ l, lancamento, erro, descricao, falta, aoMudar, somenteLeitura, nomePrestador }) {
  const porPercentual = l.forma === 'Percentual'
  const valor = lancamento?.quantidade ?? ''
  const pessoas = lancamento?.qtd_pessoas ?? ''
  const corTag = l.cor === 'red' ? 'solid-red' : l.cor
  return (
    <div className="panel serv-card">
      <div className="serv-top">
        <div>
          <span className="label">{l.frente}{nomePrestador ? `, ${nomePrestador}` : ''}</span>
          <div className="item-title" style={{ marginTop: 4 }}>{l.nome}</div>
        </div>
        {!somenteLeitura && <span className={`tag ${corTag}`}>{l.cor === 'red' ? 'Atrasado' : l.cor === 'amber' ? 'Atenção' : 'No prazo'}</span>}
      </div>
      {somenteLeitura ? (
        <>
          <p className="executado-dia">
            <b className="num">{porPercentual ? `${valor}%` : `${valor} ${l.unidade}`}</b> executados neste dia
            {pessoas ? `, com ${pessoas} ${pessoas === '1' ? 'pessoa' : 'pessoas'}` : ''}
          </p>
          <div className="bar"><i style={{ width: `${l.pct * 100}%` }}></i></div>
          <span className="label" style={{ display: 'block', marginTop: 6 }}>Total até agora: {qtd(l.executado, l.unidade, l.forma)} de {qtd(l.prevista, l.unidade, l.forma)}</span>
        </>
      ) : (
        <>
        <div className="meta-dia"><span className="label">Meta de hoje</span></div>
        <div className="meta-dia" style={{ marginTop: 2 }}>
          <span className={`n num ${l.cor === 'red' ? 'c-red' : ''}`}>{l.metaDia}</span>
          <span className="u">{porPercentual ? '%' : l.unidade}</span>
          <span className="label" style={{ marginLeft: 'auto' }}>já feito {qtd(l.executado, l.unidade, l.forma)} de {qtd(l.prevista, l.unidade, l.forma)}</span>
        </div>
        <div className="bar"><i style={{ width: `${l.pct * 100}%` }}></i></div>
        {porPercentual && (
          <div className="seg" style={{ marginTop: 14 }}>
            {[25, 50, 75].map((n) => (
              <button key={n} type="button" disabled={n > falta} aria-pressed={valor === String(n)} onClick={() => aoMudar('quantidade', valor === String(n) ? '' : String(n))}>+{n}%</button>
            ))}
            <button type="button" disabled={falta <= 0} aria-pressed={valor === numeroBR(falta)} onClick={() => aoMudar('quantidade', numeroBR(falta))}>Concluído</button>
          </div>
        )}
        <div className="fields">
          <div className="field">
            <label className="label" htmlFor={`q-${l.id}`}>Executado hoje</label>
            <div className="with-unit">
              <input className="big num" id={`q-${l.id}`} inputMode="decimal" placeholder="0" value={valor} aria-invalid={!!erro}
                onChange={(e) => aoMudar('quantidade', e.target.value)} />
              <span>{porPercentual ? '%' : l.unidade}</span>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor={`p-${l.id}`}>Pessoas no serviço</label>
            <input className="big num" id={`p-${l.id}`} inputMode="numeric" placeholder="0" value={pessoas}
              onChange={(e) => aoMudar('qtd_pessoas', e.target.value)} />
          </div>
        </div>
        </>
      )}
      {erro && <p className="acesso-erro" style={{ marginTop: 8 }} role="alert">{erro}</p>}
      {descricao && <p style={{ margin: '10px 0 0', color: 'var(--slate)', fontSize: 15 }}>{descricao}</p>}
    </div>
  )
}
