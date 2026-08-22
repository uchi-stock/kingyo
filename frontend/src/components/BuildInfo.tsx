// dev-standards docs/frontend-ui-conventions.md「トップページの必須構成」対応。
// バージョン・更新日時（ビルド時刻）を表示し、実際にデプロイされているビルドを確認できるようにする
export function BuildInfo() {
  const buildTimeLabel = new Date(__APP_BUILD_TIME__).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

  return (
    <p className="text-body-secondary small mb-0" data-testid="build-info">
      v{__APP_VERSION__} / 更新日時: {buildTimeLabel}
    </p>
  )
}
