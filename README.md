# kingyo（金魚掬い）

金魚掬いを体験できるWebアプリ。

## 概要

スマートフォン1台で、実際の金魚掬いに近い体験ができるWebアプリを目指す。

- **ポイの操作**: スマートフォンの加速度センサーを活用し、端末の動きを操作に反映する。ポイ自体は常に画面中央に固定表示し、代わりに金魚側（周囲）が端末を動かした方向と逆へパンする（アクセシビリティ対応、issue #72）
- **金魚の表現**: カメラ画像を用いて現実の空間に金魚を重ねて表示し、実際に目の前に金魚がいるかのような体験を提供する

## 設計方針

本プロジェクトの開発ルール・CI/CD構成・技術スタックの選定は、開発共通プロジェクト [bamiyanapp/dev-standards](https://github.com/bamiyanapp/dev-standards) を引き継ぐ。ログインは不要だが、ランキングの永続化のためバックエンドAPIを採用している。以下の標準構成（`dev-standards/docs/standard-tech-stack.md`）を採用する。

- フロントエンド: React 19 + Vite + TypeScript + Bootstrap 5.3（`frontend/`）
- バックエンドAPI: ランキング永続化のため採用。OSLS + Lambda + API Gateway + DynamoDB（`backend/`）。ログイン機構は無く、全員共通の1つのランキングを扱う
- リポジトリ構成: npm workspaces（`frontend/` + `backend/`、ルート直下に単一の`package-lock.json`）
- ホスティング: フロントエンドはS3 + CloudFront（`infra/`、OSLSデプロイ）、バックエンドAPIはLambda + API Gateway（別スタック）

## 開発

```sh
npm install
npm run dev --workspace frontend
```

## ステータス

ポイ操作（`frontend/src/components/Poi.tsx`）・カメラ映像を用いた金魚の表示（`frontend/src/components/CameraBackground.tsx`, `GoldfishSchool.tsx`）を実装済み。金魚とポイの当たり判定（掬えた/掬えなかった判定）は未実装。
