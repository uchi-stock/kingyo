# kingyo（金魚掬い）

金魚掬いを体験できるWebアプリ。

## 概要

スマートフォン1台で、実際の金魚掬いに近い体験ができるWebアプリを目指す。

- **ポイの操作**: スマートフォンの加速度センサーを活用し、端末の動きをそのままポイの動きとして反映する
- **金魚の表現**: カメラ画像を用いて現実の空間に金魚を重ねて表示し、実際に目の前に金魚がいるかのような体験を提供する

## 設計方針

本プロジェクトの開発ルール・CI/CD構成・技術スタックの選定は、開発共通プロジェクト [bamiyanapp/dev-standards](https://github.com/bamiyanapp/dev-standards) を引き継ぐ。ログイン・独自バックエンドAPIは不要なため、以下の標準構成（`dev-standards/docs/standard-tech-stack.md`）を採用する。

- フロントエンド: React 19 + Vite + TypeScript + Bootstrap 5.3（単一パッケージ、`frontend/`）
- ホスティング: S3 + CloudFront（`infra/`、OSLSデプロイ）

## 開発

```sh
cd frontend
npm install
npm run dev
```

## ステータス

加速度センサーによるポイ操作を実装済み（`frontend/src/components/Poi.tsx`）。カメラ映像を用いた金魚の表示は未実装。
