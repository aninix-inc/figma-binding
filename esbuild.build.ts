import esbuild from 'esbuild'

const build = (payload: { format: 'cjs' | 'esm'; outfile: string }) =>
  esbuild.buildSync({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    format: payload.format,
    outfile: payload.outfile,
    external: [
      '@aninix-inc/model',
      'paper',
      'paperjs-offset',
      'ramda',
      'react',
      'react-dom',
      'mathjs',
    ],
  })

// browser
build({ format: 'esm', outfile: './dist/index.esm.js' })

// node
build({ format: 'cjs', outfile: './dist/index.js' })
