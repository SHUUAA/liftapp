import { createClient } from '@supabase/supabase-js';

// These environment variables are expected to be available in the execution context.
// For a production build, these would typically be injected by a build tool.
// In this SPA setup, they are injected into window.process.env via index.html.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);