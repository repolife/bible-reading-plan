/// <reference types="vite/client"

interface ImportMetaEnv {
  readonly VITE_SUPABASE_API_KEY: string;
  readonly VITE_CONTENT_ID: string;
  readonly VITE_CONTENT_PREVIEW: string;
  readonly VITE_ACCESS_TOKEN: string;
  readonly VITE_API_ESV: string;
  readonly VITE_SUPABASE: string;
  readonly VITE_SUPABASE_PROJECT: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
