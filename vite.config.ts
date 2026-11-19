import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos: o build em dist/ funciona aberto de qualquer subpasta/host estático.
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
