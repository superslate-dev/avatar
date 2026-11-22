import {defineConfig} from 'tsup'

export default defineConfig([
  {
    entry: {index: 'src/index.ts', react: 'src/react.tsx'},
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: true,
  },
  {
    entry: {cli: 'src/cli.ts'},
    format: ['esm'],
    clean: false,
  },
])
