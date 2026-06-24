import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { i18nEditorPlugin } from './scripts/vite-plugin-i18n-editor.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    i18nEditorPlugin({
      resourcesDir: path.resolve(__dirname, 'src/i18n/resources'),
      baseLanguage: 'en',
    }),
  ],
})
