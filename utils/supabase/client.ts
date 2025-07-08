import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// These environment variables are expected to be available in the execution context.
// For a production build, these would typically be injected by a build tool.
// In this SPA setup, they are injected into window.process.env via index.html.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be provided in environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
