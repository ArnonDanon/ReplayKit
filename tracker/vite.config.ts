import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], rollupTypes: true }),
  ],
  build: {
    lib: {
      entry:   'src/index.ts',
      name:    'ReplayKitTracker',
      formats: ['es', 'cjs'],
      fileName: (format) => `replaykit-tracker.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react:           'React',
          'react-dom':     'ReactDOM',
          'react/jsx-runtime': 'ReactJsxRuntime',
        },
        banner: "'use client';",
      },
    },
    sourcemap: true,
  },
});
