import { createClient } from '@supabase/supabase-js'

// Ainda não é importado por ninguém: o app roda com dados de exemplo até a Etapa 7.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = createClient(url, key)
