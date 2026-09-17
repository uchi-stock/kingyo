import js from '@eslint/js'
import globals from 'globals'
import sonarjs from 'eslint-plugin-sonarjs'
import n from 'eslint-plugin-n'

// karutaのbackend構成（dev-standards docs/code-quality-conventions.md「参考実装」）に準拠する。
// kingyo backendは"type": "module"のESMのため、CommonJS（require）ではなくESM（import）で書く
// （issue #163: oxlintからの移行）
export default [
  {
    ignores: ['coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: { sonarjs, n },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none' }],
      complexity: ['error', 15],
      ...sonarjs.configs.recommended.rules,
      ...n.configs['flat/recommended'].rules,
      // n/no-unpublished-*はnpmへpublishするパッケージ向けのルールで、Lambdaへ直接
      // デプロイする非publishパッケージであるbackendには当てはまらない。
      // devDependencies（vitest・eslint関連等）をテスト・設定ファイルからimportするだけで
      // 誤検知するため無効化する
      'n/no-unpublished-import': 'off',
    },
  },
]
