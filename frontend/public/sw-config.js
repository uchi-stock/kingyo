// sw.js（dev-standards shared/pwa/sw.jsをsymlink、sync-manifest.local.json参照）が
// importScriptsで読み込むプロダクト固有設定。詳細はdev-standards
// docs/service-worker-update-pattern.mdを参照（issue #135）。
self.SW_CONFIG = {
  // キャッシュ戦略・precacheUrls等を変更した際は必ず値を変更し、activate時に
  // 旧キャッシュを確実に破棄させること
  cacheVersion: 'v1',
  // ゲーム画面はURLルーティングを持たない単一ページのため、"/"のみを先読みする（issue #101）
  precacheUrls: ['/'],
  // 別オリジンのバックエンドAPI（ランキングAPI、issue #110）はデプロイごとに
  // エンドポイントが変わり得るため、このファイルには含めない。フロント側の
  // 静的コンテンツ（同一オリジンのHTML/JS/CSS）のみをキャッシュ対象とする
  apiHostnames: [],
}
