import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    base: './',
    root: path.join(__dirname, 'src/renderer'),
    build: {
        outDir: path.join(__dirname, 'dist/renderer'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.join(__dirname, 'src/renderer/index.html')
            }
        }
    },
    server: {
        port: 3001,
        strictPort: true,
        host: true
    },
    resolve: {
        alias: {
            '@': path.join(__dirname, 'src/renderer')
        }
    },
    css: {
        postcss: './postcss.config.js'
    }
}); 