import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

let supabase: SupabaseClient | null = null;

// Function to initialize/get Supabase client with a Clerk Token
export const getSupabase = async (clerkToken?: string | null) => {
    if (!supabaseUrl || !supabaseAnonKey) return null;

    // If we have a Clerk token, we create a client that uses it for RLS
    if (clerkToken) {
        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: `Bearer ${clerkToken}` },
            },
        });
    }

    // Fallback to anon client (mostly for read-only or offline if allowed)
    if (!supabase) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabase;
};

// Export raw client for legacy calls, though using getSupabase is preferred now
export { supabase };