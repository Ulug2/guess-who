import { createClient } from "@supabase/supabase-js";

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!projectId || !anonKey) {
  throw new Error(
    "Missing Supabase env: set VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY in .env"
  );
}

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  anonKey
);
