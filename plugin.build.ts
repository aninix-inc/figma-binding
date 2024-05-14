import esbuild from 'esbuild'

esbuild.buildSync({
  entryPoints: ['./src/plugin/code.ts'],
  bundle: true,
  minify: false,
  sourcemap: 'inline',
  format: 'esm',
  outfile: './src/plugin/code.js',
  target: 'ES6',
})
