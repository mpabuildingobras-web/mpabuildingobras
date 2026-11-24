import { useState } from 'react'
import { Titulo, useOcupado } from '../components'
import { importarOrcamento } from '../lib/dados'
import { importarEstudo } from '../lib/importarEstudo'
import { porcento, reais } from '../lib/orcamento'
import { lerPlanilha } from '../lib/xlsx'

// Importar o Estudo de Viabilidade (modelo Vita Belle). Só sócio.
// Três passos: escolher o arquivo → conferir tudo o que foi lido → confirmar. Nada grava antes do Confirmar.
export function ImportarOrcamento({ onFechar, onImportado }) {
  const [estudo, setEstudo] = useState(null)
  const [arquivo, setArquivo] = useState('')
  const [erro, setErro] = useState(null)
  const [lendo, setLendo] = useState(false)
  const [ocupado, ocupar] = useOcupado()

  const escolher = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErro(null)
    setEstudo(null)
    if (!/\.xlsx$/i.test(f.name)) return setErro('Escolha o arquivo do Excel (.xlsx) do Estudo de Viabilidade.')
    setLendo(true)
    try {
      const { abas } = await lerPlanilha(await f.arrayBuffer())
      setArquivo(f.name)
      setEstudo(importarEstudo(abas))
    } catch (falha) {
      setErro(falha?.message || 'Não consegui ler esta planilha. Confira se é o arquivo .xlsx do modelo.')
    } finally {
      setLendo(false)
    }
  }

  const confirmar = () => ocupar(async () => {
    const { erro: e } = await importarOrcamento(estudo)
    if (e) return setErro(e)
    onImportado()
  })

  return (
    <>
      <Titulo rotulo="Orçamento" titulo="Importar estudo de viabilidade">
        <p>Use a planilha no modelo da MPA, com as abas ORÇAMENTO e QUANTITATIVO. Você confere tudo antes de gravar.</p>
      </Titulo>
      <div className="section imp-escolher">
        <label className={`btn ${estudo ? '' : 'btn-primary'} imp-arquivo`}>
          {lendo ? 'Lendo a planilha…' : estudo ? 'Escolher outra planilha' : 'Escolher a planilha (.xlsx)'}
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={escolher} disabled={lendo} />
        </label>
        <button className="btn-texto" onClick={onFechar}>Cancelar</button>
        {erro && <p className="acesso-erro imp-erro" role="alert">{erro}</p>}
      </div>
      {estudo && <Conferencia estudo={estudo} arquivo={arquivo} confirmar={confirmar} ocupado={ocupado} />}
    </>
  )
}

function Conferencia({ estudo, arquivo, confirmar, ocupado }) {
  const [aberta, setAberta] = useState(null)
  const [verQuant, setVerQuant] = useState(false)
  const graves = estudo.problemas.filter((p) => p.grave)
  const avisos = estudo.problemas.filter((p) => !p.grave)
  const comodos = [...new Set(estudo.quantitativo.map((q) => q.comodo))]
  const margem = estudo.total_eng - estudo.total_mo
  return (
    <>
      <div className="section">
        <div className="section-head"><span className="label">Lido de {arquivo}</span></div>
        <h2 className="imp-titulo">{estudo.titulo}</h2>
        {estudo.etapas.length > 0 && (
          <div className="ev-cartoes imp-cartoes">
            <div className="ev-cartao executado"><span className="label">Total ENG. (cliente)</span><b className="num">{reais(estudo.total_eng)}</b>
              <small>{estudo.totalDeclarado === null ? 'sem VALOR TOTAL na planilha' : Math.abs(estudo.totalDeclarado - estudo.total_eng) <= 0.05 ? '✓ bate com o VALOR TOTAL' : `planilha diz ${reais(estudo.totalDeclarado)}`}</small></div>
            <div className="ev-cartao"><span className="label">Total MO (custo)</span><b className="num">{reais(estudo.total_mo)}</b><small>só os sócios veem</small></div>
            <div className="ev-cartao gasto"><span className="label">Diferença ENG. − MO</span><b className="num">{reais(margem)}</b><small>{estudo.total_eng ? porcento(margem / estudo.total_eng) : '—'} do total</small></div>
            <div className="ev-cartao"><span className="label">Serviços</span><b className="num">{estudo.qtdItens}</b><small>em {estudo.etapas.length} etapas</small></div>
          </div>
        )}
      </div>

      {graves.length > 0 && (
        <div className="section">
          <div className="imp-caixa grave" role="alert">
            <b>Corrija na planilha antes de importar</b>
            <ul>{graves.map((p, i) => <li key={i}>{p.mensagem}</li>)}</ul>
          </div>
        </div>
      )}
      {avisos.length > 0 && (
        <div className="section">
          <div className="imp-caixa aviso">
            <b>Confira {avisos.length === 1 ? 'este ponto' : `estes ${avisos.length} pontos`} (não impedem a importação)</b>
            <ul>{avisos.map((p, i) => <li key={i}>{p.mensagem}</li>)}</ul>
          </div>
        </div>
      )}

      {estudo.etapas.length > 0 && (
        <div className="section">
          <div className="section-head"><span className="label">Etapas e serviços</span><span className="label">MO · ENG.</span></div>
          <div className="panel imp-etapas">
            {estudo.etapas.map((e) => {
              const aberto = aberta === e.numero
              return (
                <div key={e.numero} className="imp-etapa">
                  <button aria-expanded={aberto} onClick={() => setAberta(aberto ? null : e.numero)}>
                    <span className="imp-n">{e.numero}</span>
                    <span className="imp-nome">{e.nome}<small>{e.itens.length} {e.itens.length === 1 ? 'serviço' : 'serviços'}</small></span>
                    <span className="imp-vals num"><small>{reais(e.total_mo)}</small>{reais(e.total_eng)}</span>
                    <span className="imp-seta" aria-hidden="true">{aberto ? '−' : '+'}</span>
                  </button>
                  {aberto && (
                    <div className="imp-itens">
                      {e.itens.map((i) => (
                        <div key={i.numero_item} className="imp-item">
                          <span className="label">{i.numero_item}</span>
                          <span className="imp-item-nome">{i.nome}<small>{i.tipo === 'Percentual' ? `${i.percentual ?? '?'}% sobre o total` : i.unidade}{i.obs ? ` · ${i.obs}` : ''}</small></span>
                          <span className="imp-vals num"><small>{reais(i.total_mo)}</small>{reais(i.total_eng)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head"><span className="label">Quantitativo (materiais e serviços por cômodo)</span></div>
        {estudo.quantitativo.length === 0 ? <p className="ev-nota">Nenhuma linha no QUANTITATIVO.</p> : (
          <div className="panel imp-quant">
            <button className="imp-quant-topo" aria-expanded={verQuant} onClick={() => setVerQuant(!verQuant)}>
              <span><b>{estudo.quantitativo.length} linhas</b> em {comodos.length} cômodos</span>
              <span className="imp-seta" aria-hidden="true">{verQuant ? '−' : '+'}</span>
            </button>
            {verQuant && comodos.map((c) => (
              <div key={c} className="imp-comodo">
                <span className="label">{c}</span>
                {estudo.quantitativo.filter((q) => q.comodo === c).map((q, k) => (
                  <div key={k} className="imp-quant-linha">
                    <span>{q.descricao}</span>
                    <span className="num">{q.quantidade !== null ? `${q.quantidade.toLocaleString('pt-BR')}${q.unidade ? ` ${q.unidade}` : ''}` : q.texto ?? '—'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section imp-confirmar">
        <p className="ev-nota">Ao confirmar, cada serviço entra no Cronograma com 5 dias úteis, um depois do outro, medido em %. Depois você ajusta duração, ordem e responsável em Cronograma.</p>
        <button className="btn btn-primary btn-block" disabled={!estudo.ok || ocupado} onClick={confirmar}>
          {ocupado ? 'Criando o orçamento…' : estudo.ok ? 'Confirmar e criar o orçamento' : 'Corrija a planilha para importar'}
        </button>
      </div>
    </>
  )
}
