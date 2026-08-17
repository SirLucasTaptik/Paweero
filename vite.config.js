import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build damgası. Vercel bu değişkenleri build sırasında verir; yerelde tanımsız
// oldukları için "dev" damgası çıkar. Amaç: siteye bakıp hangi commit'in yayında
// olduğunu panele girmeden görebilmek — tarayıcı cache'i mi, yeni sürüm mü?
const sha = process.env.VERCEL_GIT_COMMIT_SHA || ''
const BUILD_INFO = {
  commit: sha ? sha.slice(0, 7) : 'dev',
  branch: process.env.VERCEL_GIT_COMMIT_REF || 'local',
  env: process.env.VERCEL_ENV || 'local',
  at: new Date().toISOString(),
}

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
})
