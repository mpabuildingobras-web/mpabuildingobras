import { Carregando, Titulo, Vazio, useCarregar } from '../components'
import { listarFotos } from '../lib/dados'
import { ddmm } from '../lib/formato'

// Galeria da obra. As fotos chegam pelos diários (o cliente só vê as dos aprovados).
export function Fotos() {
  const estado = useCarregar(listarFotos)
  return (
    <>
      <Titulo rotulo="Fotos" titulo="Galeria da obra" />
      <Carregando estado={estado}>
        {estado.data?.length === 0 ? (
          <Vazio icone="foto" titulo="Nenhuma foto ainda" texto="As fotos lançadas no diário aparecem aqui, por data." />
        ) : (
          <div className="section">
            <div className="fotos">
              {estado.data?.map((f) => (
                <div key={f.id} className="foto" title={f.servico}><span>{ddmm(f.data)}, {f.legenda}</span></div>
              ))}
            </div>
          </div>
        )}
      </Carregando>
    </>
  )
}
