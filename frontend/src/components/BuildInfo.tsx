// dev-standards docs/frontend-ui-conventions.md「トップページの必須構成」対応。
// バージョン・更新日時（ビルド時刻）を表示し、実際にデプロイされているビルドを確認できるようにする。
// アプリ名の脇にコンパクトに収まるよう、インライン要素（span）で表示する（issue #95）
export function BuildInfo() {
  const buildTimeLabel = new Date(__APP_BUILD_TIME__).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

  return (
    <span className="text-body-secondary small" data-testid="build-info">
      v{__APP_VERSION__} / 更新日時: {buildTimeLabel}
    </span>
  )
}
