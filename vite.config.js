import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração mínima do Vite. Não precisa de mais nada para o padrão desta skill.
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // A biblioteca do Supabase vai num arquivo à parte: o do app fica menor e o navegador
        // guarda a biblioteca em cache entre uma versão e outra do app.
        codeSplitting: { groups: [{ name: 'supabase', test: /node_modules[\\/]@supabase/ }] },
      },
    },
  },
})
