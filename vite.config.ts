
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || 'https://peugomttfkbawdnwdhis.supabase.co'),
      'process.env.SUPABASE_KEY': JSON.stringify(env.SUPABASE_KEY || 'sb_publishable_NBY5lR6y__SoqsUHtlA1gQ_JcbmG299'),
      // Global fallback for process.env to prevent runtime errors in certain environments
      'process.env': {
        API_KEY: env.API_KEY || '',
        SUPABASE_URL: env.SUPABASE_URL || 'https://peugomttfkbawdnwdhis.supabase.co',
        SUPABASE_KEY: env.SUPABASE_KEY || 'sb_publishable_NBY5lR6y__SoqsUHtlA1gQ_JcbmG299'
      }
    },
    build: {
      chunkSizeWarningLimit: 5000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-utils': ['lucide-react', 'html2canvas'],
            'vendor-excel': ['xlsx', 'jszip']
          }
        }
      }
    }
  };
});
