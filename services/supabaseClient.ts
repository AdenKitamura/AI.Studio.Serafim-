import { createClient } from '@supabase/supabase-js';

// --- КОНФИГУРАЦИЯ SUPABASE ---
// URL проекта извлечен из вашего ключа (uuvxszzmurrmulfdjkea)
const supabaseUrl = 'https://uuvxszzmurrmulfdjkea.supabase.co';

// Ваш Anon Key
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1dnhzenptdXJybXVsZmRqa2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTI5MDcsImV4cCI6MjA4MzI4ODkwN30.EXfnbARF4EgNIKl-KiBbr_0tEF3gAD2i3_tao0DGfHI';

console.log('🔌 Serafim OS: Connecting to Supabase at', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ CRITICAL: Supabase config is missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});