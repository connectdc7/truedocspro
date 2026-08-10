import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase env vars. Create a .env file from .env.example and add your project URL + anon key.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export const DOCUMENTS_BUCKET = 'client-documents'
