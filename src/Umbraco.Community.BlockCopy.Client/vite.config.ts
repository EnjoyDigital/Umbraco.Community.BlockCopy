import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      entry: {
        index: 'src/index.ts',
        manifests: 'src/manifests.ts',
        'umbraco-package': 'src/umbraco-package.ts',
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    outDir: '../Umbraco.Community.BlockCopy/wwwroot/App_Plugins/BlockCopy',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [/^@umbraco-cms/],
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
