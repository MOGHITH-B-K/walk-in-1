import { createClient } from '@supabase/supabase-js';

// Access environment variables with safe fallbacks
const getEnv = (key: string, defaultValue: string) => {
  try {
    // Rely on window.process polyfill from index.html if available
    const env = (window as any).process?.env || {};
    return env[key] || defaultValue;
  } catch {
    return defaultValue;
  }
};

const supabaseUrl = getEnv('SUPABASE_URL', 'https://peugomttfkbawdnwdhis.supabase.co');
const supabaseKey = getEnv('SUPABASE_KEY', 'sb_publishable_NBY5lR6y__SoqsUHtlA1gQ_JcbmG299');

const isPlaceholder = supabaseUrl.includes('placeholder.supabase.co');

if (isPlaceholder) {
  console.warn("Supabase keys are currently set to placeholders. Application will run in Local-Only mode.");
}

// Initialize the client.
export const supabase = createClient(supabaseUrl, supabaseKey);