import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '.'
import { useObra } from '../lib/ObraContext'
import { corDaSituacao, dataBR } from '../lib/formato'

// Sempre visível no topo: diz em qual obra a pessoa está. Quem só enxerga uma obra
// vê o nome, sem botão de trocar.
export function SeletorObra() {
  const { obras, obra, trocarObra } = useObra()
  const [aberto, setAberto] = useState(false)

  if (!obra) {
    return (
      <div className="seletor">
        <div>
          <span className="label">Obra</span>
          <strong>Nenhuma obra para mostrar</strong>
        </div>
      </div>
    )
  }

  const info = (
    <span className="seletor-info">
      <strong>{obra.nome}</strong>
      <span className="seletor-sub">
        <span>{obra.codigo}</span>
        <span className={`c-${corDaSituacao(obra.situacao)}`}>{obra.situacao}</span>
        <span className="sem-celular">Entrega {dataBR(obra.data_entrega)}</span>
      </span>
    </span>
  )

  const escolher = (id) => {
    setAberto(false)
    trocarObra(id)
  }

  return (
    <>
      {obras.length > 1 ? (
        <button className="seletor seletor-botao" onClick={() => setAberto(true)} aria-haspopup="dialog" aria-label={`Obra selecionada: ${obra.nome}. Trocar de obra`}>
          {info}
          <Icon nome="abrir" tamanho={20} />
        </button>
      ) : <div className="seletor">{info}</div>}

      {aberto && createPortal(
        <div className="folha-fundo" role="dialog" aria-modal="true" aria-label="Trocar de obra"
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="folha">
            <div className="folha-topo">
              <strong>Trocar de obra</strong>
              <button className="btn btn-mono" onClick={() => setAberto(false)}>Fechar</button>
            </div>
            {obras.map((o) => (
              <button key={o.id} className="folha-opcao" aria-current={o.id === obra.id}
                onClick={() => escolher(o.id)}>
                <span>
                  <strong><span className="tag slate">{o.codigo}</span> {o.nome}</strong>
                  <span className="label">{o.cliente_nome}, entrega {dataBR(o.data_entrega)}</span>
                </span>
                <span className={`tag ${corDaSituacao(o.situacao)}`}>{o.situacao}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
