import { createContext, useContext, useEffect, useState } from 'react'
import { definirObraAtual, definirPerfil, listarObras } from './dados'
import { escolherObraInicial } from './obras'

const ObraContext = createContext(null)

// A chave guardada no navegador tem quem está usando: cada pessoa volta na sua obra.
const chave = (usuarioId) => `gestao-de-obra:obra-atual:${usuarioId}`

function lerGuardada(usuarioId) {
  try { return localStorage.getItem(chave(usuarioId)) } catch { return null }
}
function guardar(usuarioId, obraId) {
  try { localStorage.setItem(chave(usuarioId), obraId) } catch { /* navegador sem armazenamento: só não lembra */ }
}

export function ObraProvider({ usuario, children }) {
  const [obras, setObras] = useState(null)
  const [obraId, setObraId] = useState(null)

  useEffect(() => {
    definirPerfil(usuario.role)
    listarObras(usuario.role, usuario.id).then(({ data }) => {
      const id = escolherObraInicial(data, lerGuardada(usuario.id))
      definirObraAtual(id)
      setObras(data)
      setObraId(id)
    })
  }, [usuario.id])

  const trocarObra = (id) => {
    if (id === obraId) return
    definirObraAtual(id)
    guardar(usuario.id, id)
    setObraId(id)
  }

  // Depois de criar ou editar uma obra: o seletor e as listas mostram o dado novo.
  const recarregarObras = async () => {
    const { data } = await listarObras(usuario.role, usuario.id)
    setObras(data)
  }

  if (!obras) return <div className="pagina">Carregando obras…</div>
  const obra = obras.find((o) => o.id === obraId) ?? null
  return (
    <ObraContext.Provider value={{ obras, obra, obraId, trocarObra, recarregarObras }}>
      {children}
    </ObraContext.Provider>
  )
}

export const useObra = () => useContext(ObraContext)
