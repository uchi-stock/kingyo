@dev-standards/CLAUDE.md

# プロジェクト固有ルール

金魚掬いを体験できるWebアプリ。スマートフォンの加速度センサーでポイの動きを、カメラ映像を用いて空間上に金魚を表現する。

- フロントエンド: React 19 + Vite + TypeScript + Bootstrap 5.3（`frontend/`、`docs/client-only-vite-spa-pattern.md`）
- ログイン: 不要
- バックエンドAPI: ランキング永続化のため採用（`backend/`、OSLS + Lambda + API Gateway + DynamoDB、`docs/standard-tech-stack.md`「3. バックエンドAPI」標準構成）。ログイン機構は無く、端末ごとではなく全員共通の1つのランキングを扱う（issue #110）。リポジトリはnpm workspaces構成（`frontend/` + `backend/`、issue #111）
- ホスティング: フロントエンドはS3 + CloudFront（`docs/static-hosting-pattern.md`）、バックエンドAPIはLambda + API Gateway（別スタック）
