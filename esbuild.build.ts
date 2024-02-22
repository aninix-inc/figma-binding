import esbuild from 'esbuild'

const build = (payload: { format: 'cjs' | 'esm'; outfile: string }) =>
  esbuild.buildSync({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    minify: true,
    sourcemap: 'external',
    format: payload.format,
    outfile: payload.outfile,
  })

// browser
build({ format: 'esm', outfile: './dist/index.esm.js' })

// node
build({ format: 'cjs', outfile: './dist/index.js' })
