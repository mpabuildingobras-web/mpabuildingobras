import { useState } from 'react'
import { Carregando, Titulo, Vazio, useAviso, useCarregar, useOcupado } from '../components'
import { comentarCotacao, listarCotacoes } from '../lib/dados'
import { reais } from '../lib/orcamento'

const COR = { 'Em cotação': 'slate', 'Aguardando cliente': 'amber', Escolhido: 'green', Comprado: 'green' }

// Compras: o quadro de concorrência. O cliente vê os preços e aprova num comentário.
export function Cotacoes({ perfil, usuario }) {
  const estado = useCarregar(listarCotacoes)
  const [aberta, setAberta] = useState(null)
  const [textos, setTextos] = useState({})
  const [aviso, avisar] = useAviso()
  const [enviando, rodar] = useOcupado()
  const socio = perfil === 'socio'

  const comentar = async (q) => {
    const { erro } = await comentarCotacao(q.id, usuario.nome, textos[q.id] ?? '')
    if (erro) return avisar(erro)
    setTextos({ ...textos, [q.id]: '' })
    avisar(socio ? 'Comentário registrado.' : 'Sua aprovação foi registrada. A engenharia já pode ver.')
    estado.recarregar()
  }

  return (
    <>
      <Titulo rotulo="Compras" titulo="Cotações e aprovação">
        {!socio && <p>Compare as propostas e deixe sua aprovação num comentário.</p>}
        {socio && estado.data?.length > 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => avisar('Criar cotação entra na próxima etapa.')}>+ Nova cotação</button>}
      </Titulo>
      <Carregando estado={estado}>
        {estado.data?.length === 0 ? (
          <Vazio icone="compras" titulo="Nenhuma cotação nesta obra"
            texto={socio ? 'Monte o quadro com as propostas dos fornecedores e envie para o cliente aprovar.' : 'Quando houver fornecedores para você escolher, eles aparecem aqui.'}
            botao={socio ? 'Criar a primeira cotação' : null} onBotao={() => avisar('Criar cotação entra na próxima etapa.')} />
        ) : (
          <div className="section">
            {estado.data?.map((q) => {
              const menor = Math.min(...q.propostas.map((p) => p[1]))
              const open = aberta === q.id
              const podeComentar = socio || q.status === 'Aguardando cliente' || q.status === 'Escolhido'
              return (
                <div key={q.id} className="etapa">
                  <button onClick={() => setAberta(open ? null : q.id)} aria-expanded={open}>
                    <span className="etapa-n">{q.propostas.length}</span>
                    <span className="etapa-nome">{q.titulo}</span>
                    <span className={`tag ${COR[q.status]}`} style={{ gridRow: 'span 2' }}>{q.status}</span>
                    <span className="etapa-vals"><span className="label">{q.escolhida ? `Escolhido: ${q.escolhida}` : `${q.propostas.length} propostas`}{q.comentarios.length > 0 && `, ${q.comentarios.length} comentários`}</span></span>
                  </button>
                  {open && (
                    <div style={{ padding: '0 0 14px' }}>
                      {q.propostas.map(([forn, valor, prazo, cond]) => (
                        <div key={forn} className="it" style={{ borderTop: '1px solid var(--line-soft)' }}>
                          <span className="it-nome">{forn} {valor === menor && q.propostas.length > 1 && <span className="tag green">Menor preço</span>}</span>
                          <b className="num">{reais(valor)}</b>
                          <span className="label">Entrega em {prazo}, {cond}</span>
                        </div>
                      ))}
                      {q.comentarios.map(([autor, data, texto], i) => (
                        <p key={i} className="comentario"><b>{autor}</b> <span className="label">{data}</span><br />{texto}</p>
                      ))}
                      {podeComentar && (
                        <div className="field" style={{ marginTop: 12 }}>
                          <label className="label" htmlFor={`com-${q.id}`}>{socio ? 'Comentário' : 'Sua aprovação ou comentário'}</label>
                          <textarea id={`com-${q.id}`} value={textos[q.id] ?? ''} placeholder={socio ? '' : 'Ex.: Aprovo o fornecedor B.'}
                            onChange={(e) => setTextos({ ...textos, [q.id]: e.target.value })} />
                          <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} disabled={enviando} onClick={() => rodar(() => comentar(q))}>{enviando ? 'Enviando…' : socio ? 'Comentar' : 'Enviar aprovação'}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Carregando>
      {aviso}
    </>
  )
}
