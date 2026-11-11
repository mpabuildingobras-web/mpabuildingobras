import { useState } from 'react'
import { Carregando, Titulo, Vazio, useAviso, useCarregar, useOcupado } from '../components'
import { HOJE, criarTarefa, listarTarefas, listarTarefasDeTodasAsObras, listarUsuarios, mudarStatusTarefa } from '../lib/dados'
import { dataBR } from '../lib/formato'
import { useObra } from '../lib/ObraContext'
import { PRIORIDADES, agruparTarefas, estaAtrasada } from '../lib/tarefas'

const COR_PRIORIDADE = { Alta: 'red', Média: 'amber', Baixa: 'green' }

// O que está pendente em cada obra. Só sócios. Abre na obra selecionada;
// "Todas as obras" é um comparativo pedido por quem olha, e cada tarefa diz de qual obra é.
export function Tarefas() {
  const { obra, obras } = useObra()
  const [todas, setTodas] = useState(false)
  const [criando, setCriando] = useState(false)
  const [aviso, avisar] = useAviso()
  const estado = useCarregar(async () => {
    const [t, u] = await Promise.all([todas ? listarTarefasDeTodasAsObras() : listarTarefas(), listarUsuarios()])
    return { data: { tarefas: t.data, socios: u.data.filter((x) => x.role === 'socio') }, erro: t.erro ?? u.erro }
  }, [todas])

  const alternar = async (t) => {
    const { erro } = await mudarStatusTarefa(t.id, t.status === 'Concluída' ? 'Pendente' : 'Concluída')
    if (erro) return avisar(erro)
    estado.recarregar()
  }

  const tarefas = estado.data?.tarefas ?? []
  const abertas = tarefas.filter((t) => t.status !== 'Concluída').length
  const atrasadas = tarefas.filter((t) => estaAtrasada(t, HOJE)).length

  return (
    <>
      <Titulo rotulo={todas ? 'Tarefas de todas as obras' : `Tarefas de ${obra?.codigo ?? ''}`} titulo="O que está pendente" />
      <div className="section">
        <div className="gantt-tools">
          <div className="seg seg-2" aria-label="Quais obras">
            <button aria-pressed={!todas} onClick={() => setTodas(false)}>Esta obra</button>
            <button aria-pressed={todas} onClick={() => setTodas(true)}>Todas as obras</button>
          </div>
          <button className="btn btn-primary" onClick={() => setCriando(!criando)}>{criando ? 'Fechar' : '+ Nova tarefa'}</button>
        </div>
        {criando && estado.data && (
          <FormTarefa obras={obras} obraAtual={obra?.id} socios={estado.data.socios}
            onSalvo={() => { setCriando(false); avisar('Tarefa criada.'); estado.recarregar() }} />
        )}
      </div>
      <Carregando estado={estado}>
        {tarefas.length === 0 ? (
          <Vazio icone="tarefa" titulo="Nenhuma tarefa nesta obra" texto="Anote aqui o que precisa ser feito, com responsável e prazo." botao="Criar a primeira tarefa" onBotao={() => setCriando(true)} />
        ) : (
          <div className="section">
            <div className="section-head">
              <span className="label">{abertas} em aberto</span>
              {atrasadas > 0 && <span className="label c-red">{atrasadas} atrasadas</span>}
            </div>
            {agruparTarefas(tarefas).map((g) => (
              <div key={g.chave}>
                <div className="grupo"><span className="label">{g.chave === 'Concluídas' ? g.chave : dataBR(g.chave)}</span></div>
                {g.tarefas.map((t) => (
                  <div key={t.id} className="tarefa">
                    <label className="tarefa-check">
                      <input type="checkbox" checked={t.status === 'Concluída'} onChange={() => alternar(t)} aria-label={`Concluir: ${t.titulo}`} />
                    </label>
                    <div>
                      <div className={`item-title${t.status === 'Concluída' ? ' riscado' : ''}`}>{t.titulo}</div>
                      <span className="label item-meta" style={{ display: 'block' }}>{t.responsavel}, prazo {dataBR(t.prazo)}</span>
                      <div className="tags">
                        {t.obra_codigo && <span className="tag slate">{t.obra_codigo}</span>}
                        {estaAtrasada(t, HOJE) && <span className="tag solid-red">Atrasada</span>}
                        {t.status === 'Em andamento' && <span className="tag amber">Em andamento</span>}
                        {t.status !== 'Concluída' && <span className={`tag ${COR_PRIORIDADE[t.prioridade]}`}>{t.prioridade}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Carregando>
      {aviso}
    </>
  )
}

function FormTarefa({ obras, obraAtual, socios, onSalvo }) {
  const [d, setD] = useState({ titulo: '', obra_id: obraAtual ?? '', responsavel: socios[0]?.nome ?? '', prazo: HOJE, prioridade: 'Média' })
  const [erros, setErros] = useState({})
  const [falha, setFalha] = useState('')
  const [salvando, rodar] = useOcupado()
  const muda = (c) => (e) => setD({ ...d, [c]: e.target.value })
  const salvar = async (e) => {
    e.preventDefault()
    const r = await criarTarefa(d)
    if (r.erros) return setErros(r.erros)
    if (r.erro) return setFalha(r.erro)
    onSalvo()
  }
  return (
    <form className="panel form-painel" onSubmit={(e) => rodar(() => salvar(e))} noValidate>
      <div className="field full"><label className="label" htmlFor="t-titulo">O que precisa ser feito</label>
        <input id="t-titulo" value={d.titulo} onChange={muda('titulo')} />{erros.titulo && <span className="acesso-erro">{erros.titulo}</span>}</div>
      <div className="field"><label className="label" htmlFor="t-obra">Obra</label>
        <select id="t-obra" value={d.obra_id} onChange={muda('obra_id')}>{obras.map((o) => <option key={o.id} value={o.id}>{o.codigo}, {o.nome}</option>)}</select></div>
      <div className="field"><label className="label" htmlFor="t-resp">Responsável</label>
        <select id="t-resp" value={d.responsavel} onChange={muda('responsavel')}>{socios.map((s) => <option key={s.id}>{s.nome}</option>)}</select></div>
      <div className="field"><label className="label" htmlFor="t-prazo">Prazo</label>
        <input id="t-prazo" type="date" value={d.prazo} onChange={muda('prazo')} />{erros.prazo && <span className="acesso-erro">{erros.prazo}</span>}</div>
      <div className="field"><label className="label" htmlFor="t-prio">Prioridade</label>
        <select id="t-prio" value={d.prioridade} onChange={muda('prioridade')}>{PRIORIDADES.map((p) => <option key={p}>{p}</option>)}</select></div>
      {falha && <p className="acesso-erro full" role="alert">{falha}</p>}
      <button type="submit" className="btn btn-primary full" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar tarefa'}</button>
    </form>
  )
}
