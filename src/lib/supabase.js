import { createClient } from '@supabase/supabase-js'

// Só a camada de dados (lib/dados.js) importa este arquivo. Chave PUBLICÁVEL (sb_publishable_...),
// nunca a secreta: a segurança fica na RLS do banco. Sem .env.local o cliente não nasce e o app
// só funciona com USAR_MOCK = true em lib/dados.js.
const url = import.meta.env?.VITE_SUPABASE_URL
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null
