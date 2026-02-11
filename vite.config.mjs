/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import packageJson from './package.json'

const getPackageName = () => {
  return packageJson.name
}

const getPackageNameCamelCase = () => {
  try {
    return getPackageName().replace(/-./g, char => char[1].toUpperCase())
  }
  catch (err) {
    throw new Error('Name property in package.json is missing.')
  }
}

const fileName = {
  es: `${getPackageName()}.esm.js`,
  cjs: `${getPackageName()}.cjs`,
  iife: `${getPackageName()}.iife.js`,
}

const formats = Object.keys(fileName)

export default defineConfig({
  base: './',
  build: {
    outDir: './dist',
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/main.ts'),
      name: getPackageNameCamelCase(),
      formats,
      fileName: format => fileName[format],
    },
    rollupOptions: {
      external: ['zgapdfsigner', 'node-forge', 'pdf-lib', 'pako', 'pdf-fontkit'],
      output: {
        globals: {
          'zgapdfsigner': 'Zga',
          'node-forge': 'forge',
          'pdf-lib': 'PDFLib',
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
      { find: '@@', replacement: path.resolve(import.meta.dirname) },
    ],
  },
})
