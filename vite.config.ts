import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // progress_service 不回 CORS 头。开发时页面请求同源 /api/progress，由 Vite 转到局域网服务。
      proxy: {
        '/api/progress': {
          target: 'http://192.168.0.100:8766',
          changeOrigin: true,
        },
        '/weather_index': {
          target: 'http://d1.weather.com.cn',
          changeOrigin: true,
          headers: {
            Referer: 'http://www.weather.com.cn/',
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
      },
    },
  };
});
