@dev-standards/CLAUDE.md

# プロジェクト固有ルール

金魚掬いを体験できるWebアプリ。スマートフォンの加速度センサーでポイの動きを、カメラ映像を用いて空間上に金魚を表現する。

- フロントエンド: React 19 + Vite + TypeScript + Bootstrap 5.3（単一パッケージ、`docs/client-only-vite-spa-pattern.md`）
- ログイン・独自バックエンドAPI: 不要
- ホスティング: S3 + CloudFront（`docs/static-hosting-pattern.md`）
