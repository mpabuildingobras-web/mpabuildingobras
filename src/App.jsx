import { useEffect, useState } from 'react'
import { estadoDaConta } from './lib/acesso'
import { ObraProvider } from './lib/ObraContext'
import { minhaConta, sair as sairDoApp } from './lib/dados'
import Aguardando from './pages/Aguardando'
import Entrada from './pages/Entrada'
import Shell from './pages/Shell'

// Entrada em duas portas (equipe e cliente), com o login do Supabase.
// Ao abrir, volta a sessão guardada no navegador; sem sessão, mostra a entrada.
export default function App() {
  const [usuario, setUsuario] = useState(undefined) // undefined = ainda conferindo a sessão
  useEffect(() => {
    minhaConta().then(({ data }) => setUsuario(data ?? null)).catch(() => setUsuario(null))
  }, [])
  const sair = async () => { await sairDoApp(); setUsuario(null) }

  if (usuario === undefined) return <div className="pagina">Carregando…</div>
  const estado = estadoDaConta(usuario)
  if (estado === 'fora') return <Entrada onEntrar={setUsuario} />
  if (estado !== 'dentro') return <Aguardando bloqueado={estado === 'bloqueado'} onSair={sair} />
  return (
    <ObraProvider key={usuario.id} usuario={usuario}>
      <Shell usuario={usuario} onSair={sair} />
    </ObraProvider>
  )
}
