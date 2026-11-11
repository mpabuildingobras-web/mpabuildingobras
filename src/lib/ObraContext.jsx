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
  const [erro, setErro] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    definirPerfil(usuario.role, usuario.nome)
    listarObras(usuario.role, usuario.id).then(({ data, erro: falhou }) => {
      if (falhou) { setErro(falhou); return }
      const id = escolherObraInicial(data, lerGuardada(usuario.id))
      definirObraAtual(id)
      setErro(null)
      setObras(data)
      setObraId(id)
    }).catch(() => setErro('Algo deu errado ao falar com o banco.'))
  }, [usuario.id, tentativa])

  const trocarObra = (id) => {
    if (id === obraId) return
    definirObraAtual(id)
    guardar(usuario.id, id)
    setObraId(id)
  }

  // Depois de criar ou editar uma obra: o seletor e as listas mostram o dado novo.
  const recarregarObras = async () => {
    const { data, erro: falhou } = await listarObras(usuario.role, usuario.id)
    if (!falhou) setObras(data)
  }

  if (erro && !obras) {
    return (
      <div className="pagina">
        <p>Não deu para carregar as obras. {erro}</p>
        <button className="btn btn-primary" onClick={() => { setErro(null); setTentativa(tentativa + 1) }}>Tentar de novo</button>
      </div>
    )
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
