/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// アプリ全体のバージョンはリポジトリルートのpackage.json（semantic-releaseが更新する）を参照する。
// frontend/package.json自体のversionは常に0.0.0固定のため使わない
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // dev-standards docs/frontend-ui-conventions.md「トップページの必須構成」対応。
    // ビルド時刻はデプロイパイプライン（cd.yml）がAPP_BUILD_TIMEを設定していればそれを使い、
    // 未設定（ローカルビルド等）の場合はビルド実行時刻にフォールバックする
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_TIME__: JSON.stringify(process.env.APP_BUILD_TIME ?? new Date().toISOString()),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
