import { createClient } from '@supabase/supabase-js';

// 1. Пытаемся получить ключи из переменных окружения (Vite, Next.js или CRA)
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  process.env.REACT_APP_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  process.env.REACT_APP_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  '';

// 2. Проверяем, нашлись ли ключи
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ CRITICAL: Supabase keys are missing! Check your .env file or Vercel settings.');
} else {
  console.log('🔌 Serafim OS: Supabase connected securely.');
}

// 3. Создаем клиент (ЛОГИКА ОСТАЕТСЯ ПРЕЖНЕЙ)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
