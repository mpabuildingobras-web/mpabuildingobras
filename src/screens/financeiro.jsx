import { useState } from 'react'
import { Carregando, Titulo, Vazio, useAviso, useCarregar, useOcupado } from '../components'
import { HOJE, excluirCusto, listarCustos, listarMedicoes, salvarCusto } from '../lib/dados'
import { dataBR } from '../lib/formato'
import { CATEGORIAS_CUSTO } from '../lib/lancamentos'
import { reais } from '../lib/orcamento'
import { carregarResumoOrcamento } from './orcamento'

async function carregar() {
  const [r, c, m] = await Promise.all([carregarResumoOrcamento('socio'), listarCustos(), listarMedicoes()])
  return { data: { ...r.data, custos: c.data, medicoes: m.data }, erro: r.erro ?? c.erro ?? m.erro }
}

// Saúde financeira de UMA obra (a da barra de cima). Só sócio.
// O que é lançado aqui é o custo de verdade que desconta do líquido no Faturamento.
export function Financeiro() {
  const estado = useCarregar(carregar)
  const [criando, setCriando] = useState(false)
  const [aviso, avisar] = useAviso()
  const d = estado.data
  const soma = (l, f = (x) => x.valor) => l.reduce((s, x) => s + f(x), 0)

  const alternarPago = async (k) => {
    const { erro } = await salvarCusto({ ...k, pago: !k.pago })
    if (erro) return avisar(erro)
    estado.recarregar()
  }
  const excluir = async (k) => {
    if (!window.confirm(`Excluir "${k.descricao}"? Isso não pode ser desfeito.`)) return
    const { erro } = await excluirCusto(k.id)
    if (erro) return avisar(erro)
    estado.recarregar()
  }

  return (
    <>
      <Titulo rotulo="Financeiro da obra" titulo="Saúde financeira">
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setCriando(!criando)}>{criando ? 'Fechar' : '+ Novo custo'}</button>
      </Titulo>
      {criando && (
        <div className="section">
          <FormCusto onSalvo={() => { setCriando(false); avisar('Custo lançado.'); estado.recarregar() }} />
        </div>
      )}
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
              <div className="section-head"><span className="label">Custos</span><span className="label">{d.custos.length}</span></div>
              {d.custos.length === 0 ? (
                <Vazio icone="fin" titulo="Nenhum custo lançado nesta obra" texto="Lance mão de obra, material e equipamento. É isso que desconta do líquido no Faturamento."
                  botao="Lançar o primeiro custo" onBotao={() => setCriando(true)} />
              ) : d.custos.map((k) => (
                <div key={k.id} className="item" style={{ cursor: 'default' }}>
                  <span className={`sq ${k.pago ? 'green' : 'amber'}`}></span>
                  <span>
                    <span className="item-title">{k.descricao}</span>
                    <span className="label item-meta" style={{ display: 'block' }}>{k.categoria}, {dataBR(k.data)}, {k.pago ? 'pago' : 'a pagar'}</span>
                    <span className="item-acoes">
                      <button className="btn-texto" onClick={() => alternarPago(k)}>{k.pago ? 'Marcar como a pagar' : 'Marcar como pago'}</button>
                      <button className="btn-texto" onClick={() => excluir(k)}>Excluir</button>
                    </span>
                  </span>
                  <span className="folga"><span className="n num" style={{ fontSize: 20 }}>{reais(k.valor)}</span></span>
                </div>
              ))}
            </div>
          </>
        )}
      </Carregando>
      {aviso}
    </>
  )
}

function FormCusto({ onSalvo }) {
  const [d, setD] = useState({ data: HOJE, descricao: '', categoria: 'Mão de obra', valor: '', pago: false })
  const [erros, setErros] = useState({})
  const [falha, setFalha] = useState('')
  const [salvando, rodar] = useOcupado()
  const muda = (c) => (e) => setD({ ...d, [c]: e.target.value })
  const salvar = async (e) => {
    e.preventDefault()
    const r = await salvarCusto(d)
    if (r.erros) { setErros(r.erros); return }
    if (r.erro) { setFalha(r.erro); return }
    onSalvo()
  }
  const erro = (c) => erros[c] && <span className="acesso-erro">{erros[c]}</span>
  return (
    <form className="panel form-painel" onSubmit={(e) => rodar(() => salvar(e))} noValidate>
      <div className="field full"><label className="label" htmlFor="k-desc">Descrição</label>
        <input id="k-desc" value={d.descricao} onChange={muda('descricao')} placeholder="Ex.: Mão de obra da quinzena" />{erro('descricao')}</div>
      <div className="field"><label className="label" htmlFor="k-cat">Categoria</label>
        <select id="k-cat" value={d.categoria} onChange={muda('categoria')}>{CATEGORIAS_CUSTO.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label className="label" htmlFor="k-valor">Valor (R$)</label>
        <input id="k-valor" inputMode="decimal" value={d.valor} onChange={muda('valor')} />{erro('valor')}</div>
      <div className="field"><label className="label" htmlFor="k-data">Data</label>
        <input id="k-data" type="date" value={d.data} onChange={muda('data')} />{erro('data')}</div>
      <label className="check"><input type="checkbox" checked={d.pago} onChange={(e) => setD({ ...d, pago: e.target.checked })} /><span>Já foi pago</span></label>
      {falha && <p className="acesso-erro full" role="alert">{falha}</p>}
      <button type="submit" className="btn btn-primary full" disabled={salvando}>{salvando ? 'Salvando…' : 'Lançar custo'}</button>
    </form>
  )
}
