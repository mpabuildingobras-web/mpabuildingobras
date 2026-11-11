import { useState } from 'react'
import { Carregando, Titulo, useAviso, useCarregar, useOcupado } from '../components'
import { excluirServico, listarContratados, listarServicos, listarValoresDosServicos, salvarServico } from '../lib/dados'
import { servicosDaCadeia } from '../lib/cronograma'
import { numeroBR } from '../lib/formato'
import { UNIDADES, medeEmPercentual } from '../lib/lancamentos'

async function carregar() {
  const [s, c, v] = await Promise.all([listarServicos(), listarContratados(), listarValoresDosServicos()])
  return {
    data: { servicos: servicosDaCadeia(s.data), contratados: c.data, valores: v.data },
    erro: s.erro ?? c.erro ?? v.erro,
  }
}

// Novo serviço ou edição: nome, frente, duração, de quem depende, prestador e valores. Só sócios.
export function EditarServico({ params, goto }) {
  const estado = useCarregar(carregar)
  return (
    <Carregando estado={estado}>
      {estado.data && <Formulario dados={estado.data} id={params.id} goto={goto} />}
    </Carregando>
  )
}

function Formulario({ dados, id, goto }) {
  const { servicos, contratados, valores } = dados
  const atual = servicos.find((s) => s.id === id)
  const item = valores.find((v) => v.servico_id === id)
  const [d, setD] = useState(atual ? {
    ...atual,
    duracao: String(atual.duracao), prevista: numeroBR(atual.prevista),
    valor: numeroBR(item?.valor), custo_mo: numeroBR(item?.custo_mo), obs: atual.obs ?? '',
    responsavel_id: atual.responsavel_id ?? '',
  } : { nome: '', frente: '', unidade: 'm²', prevista: '', duracao: '', deps: [], responsavel_id: '', valor: '', custo_mo: '', obs: '' })
  const [erros, setErros] = useState({})
  const [aviso, avisar] = useAviso()
  const [salvando, rodar] = useOcupado()
  const muda = (c) => (e) => setD({ ...d, [c]: e.target.value })
  const outros = servicos.filter((s) => s.id !== id)
  const frentes = [...new Set(servicos.map((s) => s.frente))]
  const porPercentual = medeEmPercentual(d.unidade)

  const salvar = async (e) => {
    e.preventDefault()
    const r = await salvarServico(d)
    if (r.erros) { setErros(r.erros); avisar('Confira os campos destacados.'); return }
    if (r.erro) { avisar(r.erro); return }
    goto('cronograma')
  }
  const excluir = async () => {
    if (!window.confirm(`Excluir "${atual.nome}"? Isso não pode ser desfeito.`)) return
    const r = await excluirServico(id)
    if (r.erro) { avisar(r.erro); return }
    goto('cronograma')
  }
  const erro = (c) => erros[c] && <span className="acesso-erro">{erros[c]}</span>

  return (
    <>
      <Titulo rotulo="Cronograma" titulo={atual ? 'Editar serviço' : 'Novo serviço'} />
      <form onSubmit={(e) => rodar(() => salvar(e))} noValidate>
        <div className="section">
          <div className="panel form-painel">
            <div className="field full"><label className="label" htmlFor="s-nome">Nome do serviço</label>
              <input id="s-nome" value={d.nome} onChange={muda('nome')} placeholder="Ex.: Reboco de paredes" />{erro('nome')}</div>
            <div className="field"><label className="label" htmlFor="s-frente">Frente de serviço</label>
              <input id="s-frente" list="s-frentes" value={d.frente} onChange={muda('frente')} placeholder="Ex.: Alvenaria" />
              <datalist id="s-frentes">{frentes.map((f) => <option key={f} value={f} />)}</datalist>{erro('frente')}</div>
            <div className="field"><label className="label" htmlFor="s-resp">Prestador</label>
              <select id="s-resp" value={d.responsavel_id} onChange={muda('responsavel_id')} aria-invalid={!!erros.responsavel_id}>
                <option value="" disabled>Escolha o prestador</option>
                {contratados.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.funcao})</option>)}
              </select>{erro('responsavel_id')}</div>
            <div className="field"><label className="label" htmlFor="s-un">Unidade</label>
              <select id="s-un" value={d.unidade} onChange={muda('unidade')}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</select>{erro('unidade')}
              {porPercentual && <span className="form-nota">Em verba (vb), o avanço é lançado em percentual.</span>}</div>
            {!porPercentual && (
              <div className="field"><label className="label" htmlFor="s-prev">Quantidade prevista</label>
                <input id="s-prev" inputMode="decimal" value={d.prevista} onChange={muda('prevista')} />{erro('prevista')}</div>
            )}
            <div className="field"><label className="label" htmlFor="s-dur">Duração (dias úteis)</label>
              <input id="s-dur" inputMode="numeric" value={d.duracao} onChange={muda('duracao')} />{erro('duracao')}</div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><span className="label">Só começa quando terminar</span></div>
          {outros.length === 0 && <p className="form-nota" style={{ marginTop: 10 }}>Este é o primeiro serviço da obra.</p>}
          {outros.map((s) => (
            <label key={s.id} className="check">
              <input type="checkbox" checked={d.deps.includes(s.id)}
                onChange={() => setD({ ...d, deps: d.deps.includes(s.id) ? d.deps.filter((x) => x !== s.id) : [...d.deps, s.id] })} />
              <span>{s.nome}</span><small className="label">{s.frente}</small>
            </label>
          ))}
          {erro('deps')}
        </div>

        <div className="section">
          <div className="section-head"><span className="label">Valores do orçamento</span></div>
          <div className="panel form-painel">
            <div className="field"><label className="label" htmlFor="s-valor">Valor ao cliente (R$)</label>
              <input id="s-valor" inputMode="decimal" value={d.valor} onChange={muda('valor')} />{erro('valor')}</div>
            <div className="field"><label className="label" htmlFor="s-custo">Custo previsto de mão de obra (R$)</label>
              <input id="s-custo" inputMode="decimal" value={d.custo_mo} onChange={muda('custo_mo')} />{erro('custo_mo')}</div>
            <div className="field full"><label className="label" htmlFor="s-obs">Observação (o cliente vê)</label>
              <input id="s-obs" value={d.obs} onChange={muda('obs')} /></div>
          </div>
        </div>

        <div className="section ficha-acoes">
          <button type="button" className="btn" onClick={() => goto('cronograma')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando…' : atual ? 'Salvar serviço' : 'Cadastrar serviço'}</button>
        </div>
      </form>
      {atual && (
        <div className="section" style={{ marginBottom: 24 }}>
          <button className="btn btn-danger btn-block" onClick={excluir}>Excluir serviço</button>
        </div>
      )}
      {aviso}
    </>
  )
}
