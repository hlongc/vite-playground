import { defineConfig } from 'dumi';
import path from 'node:path';

export default defineConfig({
  outputPath: 'docs-dist',
  apiParser: {},
  resolve: {
    docDirs: ['docs'],
    atomDirs: [{ type: 'component', dir: 'src/components' }],
    entryFile: 'src/components/index.ts',
  },
  themeConfig: {
    name: 'Vite Playground Docs',
    footer: 'Built with dumi for component docs',
  },
  alias: {
    '@components': path.resolve(__dirname, 'src/components'),
    '@demos': path.resolve(__dirname, 'demos'),
  },
});
