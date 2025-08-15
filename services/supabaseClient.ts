import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// CORRECT SYNTAX for Vite projects
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or Anon Key are not defined in environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);