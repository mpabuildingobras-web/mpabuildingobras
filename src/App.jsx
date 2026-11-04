import { useState } from 'react'
import { ObraProvider } from './lib/ObraContext'
import Aguardando from './pages/Aguardando'
import Entrada from './pages/Entrada'
import Shell from './pages/Shell'

// Entrada em duas portas (equipe e cliente). Na Etapa 7 o login vira Supabase Auth
// (sessão + linha em `profiles` com o role).
export default function App() {
  const [usuario, setUsuario] = useState(null)
  const sair = () => setUsuario(null)
  if (!usuario) return <Entrada onEntrar={setUsuario} />
  if (usuario.role === 'pendente') return <Aguardando onSair={sair} />
  return (
    <ObraProvider key={usuario.id} usuario={usuario}>
      <Shell usuario={usuario} onSair={sair} />
    </ObraProvider>
  )
}
