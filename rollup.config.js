import typescript from 'rollup-plugin-typescript2'
import pkg from './package.json'

export default {
  input: 'src/index.ts', // our source file
  output: [
    {
      file: pkg.main,
      format: 'cjs'
    },
    {
      file: pkg.module,
      format: 'es' // the preferred format
    }
  ],
  external: [...Object.keys(pkg.dependencies || {})],
  plugins: [
    typescript({
      typescript: require('typescript')
    })
  ]
}
