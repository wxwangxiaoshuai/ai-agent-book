import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 项目站点部署在 https://<user>.github.io/<repo>/
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.VITE_BASE_PATH ?? (repoName ? `/${repoName}/` : '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
