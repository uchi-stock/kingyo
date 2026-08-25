## [1.38.1](https://github.com/uchi-stock/kingyo/compare/v1.38.0...v1.38.1) (2026-08-25)


### Bug Fixes

* 全ての金魚を捕獲したら、クリア判定してタイマーを止める ([#143](https://github.com/uchi-stock/kingyo/issues/143)) ([4213e3c](https://github.com/uchi-stock/kingyo/commit/4213e3c4d4e8dc61a40a528cd1bd05e8a4ff385a))

# [1.38.0](https://github.com/uchi-stock/kingyo/compare/v1.37.0...v1.38.0) (2026-08-24)


### Features

* 起動時、画面全体をフェードインで表示する ([#139](https://github.com/uchi-stock/kingyo/issues/139)) ([7e60fc4](https://github.com/uchi-stock/kingyo/commit/7e60fc4cf146a5a8bd007dc43151c2db130612a2))

# [1.37.0](https://github.com/uchi-stock/kingyo/compare/v1.36.0...v1.37.0) (2026-08-24)


### Features

* PWAのService Workerを導入し、フロントのキャッシュ高速化と更新通知に対応する ([#136](https://github.com/uchi-stock/kingyo/issues/136)) ([382c451](https://github.com/uchi-stock/kingyo/commit/382c4512e029867ab9e767cfb6220ef575a52bbc))

# [1.36.0](https://github.com/uchi-stock/kingyo/compare/v1.35.2...v1.36.0) (2026-08-23)


### Features

* 加速度センサーが使えない場合、掬う動作をタップで代替する ([#134](https://github.com/uchi-stock/kingyo/issues/134)) ([3e0c07b](https://github.com/uchi-stock/kingyo/commit/3e0c07b3cc5750f4f3e6cc98d656f62897c45dde))

## [1.35.2](https://github.com/uchi-stock/kingyo/compare/v1.35.1...v1.35.2) (2026-08-23)


### Bug Fixes

* 金魚の捕獲に成功した場合、ポイが破れないようにする ([#133](https://github.com/uchi-stock/kingyo/issues/133)) ([3d589b2](https://github.com/uchi-stock/kingyo/commit/3d589b2bd4f9a362ba055e0c8708489b8b9d9d03)), closes [#82](https://github.com/uchi-stock/kingyo/issues/82)

## [1.35.1](https://github.com/uchi-stock/kingyo/compare/v1.35.0...v1.35.1) (2026-08-23)


### Bug Fixes

* 金魚の衝突回避時の方向転換に旋回速度の上限を設ける（issue [#122](https://github.com/uchi-stock/kingyo/issues/122)） ([#131](https://github.com/uchi-stock/kingyo/issues/131)) ([9056cfb](https://github.com/uchi-stock/kingyo/commit/9056cfb028d7aa81c7bd4c8c5924c0e6bc6b316b))

# [1.35.0](https://github.com/uchi-stock/kingyo/compare/v1.34.5...v1.35.0) (2026-08-23)


### Features

* 金魚同士が重ならないよう、接近時に互いを避けて方向転換する ([#130](https://github.com/uchi-stock/kingyo/issues/130)) ([2aa94d0](https://github.com/uchi-stock/kingyo/commit/2aa94d05664e264780e29939a7da4c893430bed9))

## [1.34.5](https://github.com/uchi-stock/kingyo/compare/v1.34.4...v1.34.5) (2026-08-23)


### Bug Fixes

* デプロイジョブがリリースコミット後の最新mainをチェックアウトするようにする（issue [#127](https://github.com/uchi-stock/kingyo/issues/127)） ([#129](https://github.com/uchi-stock/kingyo/issues/129)) ([f363852](https://github.com/uchi-stock/kingyo/commit/f363852a89a7ebddc351c3c610f944ee3eb61af9))

## [1.34.4](https://github.com/uchi-stock/kingyo/compare/v1.34.3...v1.34.4) (2026-08-23)


### Bug Fixes

* 診断表示を目立たない黒字に変更し、許可トリガーの回帰テストを追加する ([#128](https://github.com/uchi-stock/kingyo/issues/128)) ([4c84090](https://github.com/uchi-stock/kingyo/commit/4c840908e1f8062641a312d8fa960457e70a3f87))

## [1.34.3](https://github.com/uchi-stock/kingyo/compare/v1.34.2...v1.34.3) (2026-08-23)


### Bug Fixes

* 許可リクエストのトリガーをpointerdownからclickへ変更する（issue [#109](https://github.com/uchi-stock/kingyo/issues/109)） ([#125](https://github.com/uchi-stock/kingyo/issues/125)) ([26b20f0](https://github.com/uchi-stock/kingyo/commit/26b20f03d001274815dcd86250b90f63cbcfe66c))

## [1.34.2](https://github.com/uchi-stock/kingyo/compare/v1.34.1...v1.34.2) (2026-08-23)


### Bug Fixes

* センサー許可ボタンを撤去し診断用デバッグ表示を追加する ([#123](https://github.com/uchi-stock/kingyo/issues/123)) ([09ea7ca](https://github.com/uchi-stock/kingyo/commit/09ea7ca92f183adeee5125c28e94036c1f56286e))

## [1.34.1](https://github.com/uchi-stock/kingyo/compare/v1.34.0...v1.34.1) (2026-08-23)


### Bug Fixes

* 加速度センサーの許可を明示的に要求できるボタンを復活させる ([#121](https://github.com/uchi-stock/kingyo/issues/121)) ([36ca606](https://github.com/uchi-stock/kingyo/commit/36ca6062ea75048efcab5b6823b4940284412396))

# [1.34.0](https://github.com/uchi-stock/kingyo/compare/v1.33.0...v1.34.0) (2026-08-23)


### Features

* CI/CDでランキングAPIをデプロイし、フロントエンドへエンドポイントを注入する ([#119](https://github.com/uchi-stock/kingyo/issues/119)) ([a6bae36](https://github.com/uchi-stock/kingyo/commit/a6bae36ce8fa3de455fc30d5dfbd021bd6bd86ee))

# [1.33.0](https://github.com/uchi-stock/kingyo/compare/v1.32.0...v1.33.0) (2026-08-23)


### Features

* ranking.tsをlocalStorageからバックエンドAPI呼び出しへ切り替え ([#118](https://github.com/uchi-stock/kingyo/issues/118)) ([d0b3e81](https://github.com/uchi-stock/kingyo/commit/d0b3e81f6f68f18fbcfd5fc78f558d51b0594dac)), closes [#89](https://github.com/uchi-stock/kingyo/issues/89) [#93](https://github.com/uchi-stock/kingyo/issues/93) [#114](https://github.com/uchi-stock/kingyo/issues/114)

# [1.32.0](https://github.com/uchi-stock/kingyo/compare/v1.31.0...v1.32.0) (2026-08-23)


### Features

* ランキングAPI（GET/POST）をLambda + API Gateway + DynamoDB（OSLS）で実装 ([#117](https://github.com/uchi-stock/kingyo/issues/117)) ([51eb4c5](https://github.com/uchi-stock/kingyo/commit/51eb4c571b633285b86b05088841ee704a449ba7)), closes [#89](https://github.com/uchi-stock/kingyo/issues/89)

# [1.31.0](https://github.com/uchi-stock/kingyo/compare/v1.30.0...v1.31.0) (2026-08-23)


### Features

* npm workspacesモノレポ化（frontend/backend構成への移行） ([#116](https://github.com/uchi-stock/kingyo/issues/116)) ([6aea5c9](https://github.com/uchi-stock/kingyo/commit/6aea5c99f9658479750d068a487b67bb0e76779a))

# [1.30.0](https://github.com/uchi-stock/kingyo/compare/v1.29.1...v1.30.0) (2026-08-23)


### Features

* 金魚の捕獲成功時にもバイブレーションでフィードバックする ([#108](https://github.com/uchi-stock/kingyo/issues/108)) ([9413f49](https://github.com/uchi-stock/kingyo/commit/9413f490b5cadbc1e0b96be58de463dadfe8f916))

## [1.29.1](https://github.com/uchi-stock/kingyo/compare/v1.29.0...v1.29.1) (2026-08-23)


### Bug Fixes

* ゲーム画面のタイトル・タイム・ランキングボタンが背景の下に隠れる不具合を修正 ([#107](https://github.com/uchi-stock/kingyo/issues/107)) ([25747c3](https://github.com/uchi-stock/kingyo/commit/25747c3cd9d9fef9afb149f9e37b3550626a9f02))

# [1.29.0](https://github.com/uchi-stock/kingyo/compare/v1.28.0...v1.29.0) (2026-08-23)


### Features

* ゲームオーバー時にバイブレーションでフィードバックする ([#104](https://github.com/uchi-stock/kingyo/issues/104)) ([bd983a6](https://github.com/uchi-stock/kingyo/commit/bd983a6b61f1b3db6aff73f00dbd01713b679d32))

# [1.28.0](https://github.com/uchi-stock/kingyo/compare/v1.27.0...v1.28.0) (2026-08-23)


### Features

* ゲーム画面を1画面に収め、ランキングを別画面に分離する ([#102](https://github.com/uchi-stock/kingyo/issues/102)) ([186c212](https://github.com/uchi-stock/kingyo/commit/186c212dbafdda37e60d84441a349b33c81ff997)), closes [#89](https://github.com/uchi-stock/kingyo/issues/89) [#99](https://github.com/uchi-stock/kingyo/issues/99)

# [1.27.0](https://github.com/uchi-stock/kingyo/compare/v1.26.0...v1.27.0) (2026-08-23)


### Features

* ランキングに獲った金魚の数も記録・表示する ([#100](https://github.com/uchi-stock/kingyo/issues/100)) ([7b23bb2](https://github.com/uchi-stock/kingyo/commit/7b23bb2c710b5425a738719263e30a4f3861a49c)), closes [#99](https://github.com/uchi-stock/kingyo/issues/99)

# [1.26.0](https://github.com/uchi-stock/kingyo/compare/v1.25.0...v1.26.0) (2026-08-23)


### Features

* PWA向けアイコン・faviconに金魚画像を使う ([#98](https://github.com/uchi-stock/kingyo/issues/98)) ([cbc04ea](https://github.com/uchi-stock/kingyo/commit/cbc04eadf76d0712a59838459f61753eb7aed82f)), closes [#97](https://github.com/uchi-stock/kingyo/issues/97)

# [1.25.0](https://github.com/uchi-stock/kingyo/compare/v1.24.0...v1.25.0) (2026-08-22)


### Features

* バージョン表記をアプリ名の脇にコンパクトに表示する ([#96](https://github.com/uchi-stock/kingyo/issues/96)) ([ccbb5f4](https://github.com/uchi-stock/kingyo/commit/ccbb5f421db42e6b7d577cbc8324e8b89929a98b)), closes [#95](https://github.com/uchi-stock/kingyo/issues/95)

# [1.24.0](https://github.com/uchi-stock/kingyo/compare/v1.23.0...v1.24.0) (2026-08-22)


### Features

* ゲームオーバー後にリトライできるボタンを追加する ([#94](https://github.com/uchi-stock/kingyo/issues/94)) ([e169b05](https://github.com/uchi-stock/kingyo/commit/e169b05df76d0da47e89368a2347d331e3c2ca41)), closes [#93](https://github.com/uchi-stock/kingyo/issues/93)

# [1.23.0](https://github.com/uchi-stock/kingyo/compare/v1.22.0...v1.23.0) (2026-08-22)


### Features

* ポイが破れてゲームオーバーになったことを画面上に表示する ([#92](https://github.com/uchi-stock/kingyo/issues/92)) ([c9946c5](https://github.com/uchi-stock/kingyo/commit/c9946c5442b6ad06e6822f19c8e254333a0dbf6f)), closes [#91](https://github.com/uchi-stock/kingyo/issues/91)

# [1.22.0](https://github.com/uchi-stock/kingyo/compare/v1.21.0...v1.22.0) (2026-08-22)


### Features

* タイム計測（最初のひと掬いから）とランキング機能を追加する ([#90](https://github.com/uchi-stock/kingyo/issues/90)) ([10213d6](https://github.com/uchi-stock/kingyo/commit/10213d6d9072c77a0349a8a5f9eb3896a0b8d3ac)), closes [#89](https://github.com/uchi-stock/kingyo/issues/89)

# [1.21.0](https://github.com/uchi-stock/kingyo/compare/v1.20.1...v1.21.0) (2026-08-22)


### Features

* ポイのサイズを一回り大きくし、中心判定の半径も広げる ([#88](https://github.com/uchi-stock/kingyo/issues/88)) ([59ff9c2](https://github.com/uchi-stock/kingyo/commit/59ff9c2f36b1270fb2c8a538dc3e0673a872b0e7)), closes [#87](https://github.com/uchi-stock/kingyo/issues/87)

## [1.20.1](https://github.com/uchi-stock/kingyo/compare/v1.20.0...v1.20.1) (2026-08-22)


### Bug Fixes

* 勢いよく掬うとポイが破れる仕様にし、判定閾値を厳しくする ([#86](https://github.com/uchi-stock/kingyo/issues/86)) ([45cbddc](https://github.com/uchi-stock/kingyo/commit/45cbddc27c50842f80d8e5ac2e0d5e7f5f1e0f75)), closes [#85](https://github.com/uchi-stock/kingyo/issues/85)

# [1.20.0](https://github.com/uchi-stock/kingyo/compare/v1.19.2...v1.20.0) (2026-08-22)


### Features

* 掬う操作の勢いで成否を判定する（優しく掬うと成功、勢いよく掬うと失敗） ([#84](https://github.com/uchi-stock/kingyo/issues/84)) ([9d1821f](https://github.com/uchi-stock/kingyo/commit/9d1821f5281406354ace0e7b86c5a49b8d0f9d8d)), closes [#82](https://github.com/uchi-stock/kingyo/issues/82)

## [1.19.2](https://github.com/uchi-stock/kingyo/compare/v1.19.1...v1.19.2) (2026-08-22)


### Bug Fixes

* 最初に設定した掬うジェスチャー音（scoop.wav）を削除する ([#83](https://github.com/uchi-stock/kingyo/issues/83)) ([f31579e](https://github.com/uchi-stock/kingyo/commit/f31579e5b2798993e03873c05b7581a498d675a6)), closes [#66](https://github.com/uchi-stock/kingyo/issues/66) [#68](https://github.com/uchi-stock/kingyo/issues/68) [#81](https://github.com/uchi-stock/kingyo/issues/81)

## [1.19.1](https://github.com/uchi-stock/kingyo/compare/v1.19.0...v1.19.1) (2026-08-22)


### Bug Fixes

* dev-standards共通フォント・共通テーマCSSを適用する ([#76](https://github.com/uchi-stock/kingyo/issues/76)) ([e474b7f](https://github.com/uchi-stock/kingyo/commit/e474b7f790777e63aa72dbb268d21f4050d3bb20)), closes [#75](https://github.com/uchi-stock/kingyo/issues/75) [#75](https://github.com/uchi-stock/kingyo/issues/75)

# [1.19.0](https://github.com/uchi-stock/kingyo/compare/v1.18.0...v1.19.0) (2026-08-22)


### Features

* ポイが破れたらゲームオーバー表現として操作不能にする ([#80](https://github.com/uchi-stock/kingyo/issues/80)) ([d85f1ac](https://github.com/uchi-stock/kingyo/commit/d85f1ac738e13bcf2772742c12e210382aa6e8be)), closes [#79](https://github.com/uchi-stock/kingyo/issues/79)

# [1.18.0](https://github.com/uchi-stock/kingyo/compare/v1.17.1...v1.18.0) (2026-08-22)


### Features

* AR対応するまで「カメラを有効にする」ボタンを非表示にする ([#78](https://github.com/uchi-stock/kingyo/issues/78)) ([430717b](https://github.com/uchi-stock/kingyo/commit/430717b5c9cd6b9b5eec95e5d77cccc5cd08d2ad)), closes [#77](https://github.com/uchi-stock/kingyo/issues/77)

## [1.17.1](https://github.com/uchi-stock/kingyo/compare/v1.17.0...v1.17.1) (2026-08-22)


### Bug Fixes

* 効果音がiOS Safari等の自動再生ポリシーでブロックされ鳴らない問題を修正 ([#74](https://github.com/uchi-stock/kingyo/issues/74)) ([9d34552](https://github.com/uchi-stock/kingyo/commit/9d34552f37bc6bcf57c5e8e3994a84bbfaed35e5)), closes [#73](https://github.com/uchi-stock/kingyo/issues/73)

# [1.17.0](https://github.com/uchi-stock/kingyo/compare/v1.16.0...v1.17.0) (2026-08-22)


### Features

* ポイが破れた時専用の効果音を再生する ([#71](https://github.com/uchi-stock/kingyo/issues/71)) ([612221c](https://github.com/uchi-stock/kingyo/commit/612221c7981d969b6b867fbf9b497a87cf8bc13b)), closes [#66](https://github.com/uchi-stock/kingyo/issues/66) [#69](https://github.com/uchi-stock/kingyo/issues/69)

# [1.16.0](https://github.com/uchi-stock/kingyo/compare/v1.15.0...v1.16.0) (2026-08-22)


### Features

* 掬いに失敗した時専用の効果音を再生する ([#70](https://github.com/uchi-stock/kingyo/issues/70)) ([5028c61](https://github.com/uchi-stock/kingyo/commit/5028c61bf9a44e19649d408381db5cea34d51539)), closes [#68](https://github.com/uchi-stock/kingyo/issues/68)

# [1.15.0](https://github.com/uchi-stock/kingyo/compare/v1.14.0...v1.15.0) (2026-08-22)


### Features

* 金魚の捕獲に成功した時専用の効果音を再生する ([#67](https://github.com/uchi-stock/kingyo/issues/67)) ([0fbe342](https://github.com/uchi-stock/kingyo/commit/0fbe342d4123dbe3a5ac9c2a727ab9eec83b8000)), closes [#48](https://github.com/uchi-stock/kingyo/issues/48) [#66](https://github.com/uchi-stock/kingyo/issues/66)

# [1.14.0](https://github.com/uchi-stock/kingyo/compare/v1.13.1...v1.14.0) (2026-08-22)


### Features

* センサー許可を「有効にする」ボタンなしで取得する ([#65](https://github.com/uchi-stock/kingyo/issues/65)) ([5e2fbe4](https://github.com/uchi-stock/kingyo/commit/5e2fbe485f122c17884ff96dbe2da3b0d93c1fa5))

## [1.13.1](https://github.com/uchi-stock/kingyo/compare/v1.13.0...v1.13.1) (2026-08-22)


### Bug Fixes

* 破れる前後でポイの色が異なる問題を修正し、黄色に統一する ([#64](https://github.com/uchi-stock/kingyo/issues/64)) ([ac40e97](https://github.com/uchi-stock/kingyo/commit/ac40e97506107872865a17eb2d00f59105fab322))

# [1.13.0](https://github.com/uchi-stock/kingyo/compare/v1.12.0...v1.13.0) (2026-08-22)


### Features

* 掬うのに失敗した時、近くの金魚がスピードを上げて逃げるようにする ([#61](https://github.com/uchi-stock/kingyo/issues/61)) ([5e7c938](https://github.com/uchi-stock/kingyo/commit/5e7c9383c99f9f4508295c6b132a79374e96292c))

# [1.12.0](https://github.com/uchi-stock/kingyo/compare/v1.11.1...v1.12.0) (2026-08-22)


### Features

* 金魚の数を2倍（4匹→8匹）にする ([#60](https://github.com/uchi-stock/kingyo/issues/60)) ([931935c](https://github.com/uchi-stock/kingyo/commit/931935cf5a77caa9a7099ff96818d1ef41327106))

## [1.11.1](https://github.com/uchi-stock/kingyo/compare/v1.11.0...v1.11.1) (2026-08-22)


### Bug Fixes

* ポイの中心復元力を適度な強さへ調整する ([#58](https://github.com/uchi-stock/kingyo/issues/58)) ([2a245f6](https://github.com/uchi-stock/kingyo/commit/2a245f6078db3ad94122c7c5904042e3c26feba0))

# [1.11.0](https://github.com/uchi-stock/kingyo/compare/v1.10.0...v1.11.0) (2026-08-22)


### Features

* 金魚を捕獲した際、拡大しながらフェードアウトする演出を追加する ([#54](https://github.com/uchi-stock/kingyo/issues/54)) ([0545918](https://github.com/uchi-stock/kingyo/commit/0545918a0e005a8467b64e3b08f78a575756aacd))

# [1.10.0](https://github.com/uchi-stock/kingyo/compare/v1.9.0...v1.10.0) (2026-08-22)


### Features

* 掬うジェスチャー時に効果音を再生する ([#49](https://github.com/uchi-stock/kingyo/issues/49)) ([e29c381](https://github.com/uchi-stock/kingyo/commit/e29c38123e9a461c164eba01257b4978cd870592))

# [1.9.0](https://github.com/uchi-stock/kingyo/compare/v1.8.0...v1.9.0) (2026-08-22)


### Features

* ポイの中心で金魚をすくうと破れる演出を追加する ([#47](https://github.com/uchi-stock/kingyo/issues/47)) ([d675968](https://github.com/uchi-stock/kingyo/commit/d675968d5794a37b886ddd5981506d53ae35b809))

# [1.8.0](https://github.com/uchi-stock/kingyo/compare/v1.7.1...v1.8.0) (2026-08-22)


### Features

* 掬うジェスチャーと金魚の位置判定を組み合わせ、捕獲した金魚を消す ([#46](https://github.com/uchi-stock/kingyo/issues/46)) ([8f9c35d](https://github.com/uchi-stock/kingyo/commit/8f9c35dfb499e6e20efaec6b444a5808de017b6b))

## [1.7.1](https://github.com/uchi-stock/kingyo/compare/v1.7.0...v1.7.1) (2026-08-22)


### Bug Fixes

* 掬うフリック操作時にポイの水平位置が一緒に動いてしまう問題を修正する ([#43](https://github.com/uchi-stock/kingyo/issues/43)) ([69af828](https://github.com/uchi-stock/kingyo/commit/69af828c14ed7544b338805b09a3cbfed7f6f1e1))

# [1.7.0](https://github.com/uchi-stock/kingyo/compare/v1.6.4...v1.7.0) (2026-08-22)


### Features

* 傾きの素早い動き（フリック）を「掬う」ジェスチャーとして検出する ([#41](https://github.com/uchi-stock/kingyo/issues/41)) ([252495c](https://github.com/uchi-stock/kingyo/commit/252495cf87ffc8ed3d872935df6cca8def955951))

## [1.6.4](https://github.com/uchi-stock/kingyo/compare/v1.6.3...v1.6.4) (2026-08-22)


### Bug Fixes

* ポイの中心復元力を大幅に弱め、操作をやめた位置に留まるようにする ([#40](https://github.com/uchi-stock/kingyo/issues/40)) ([1c5c55d](https://github.com/uchi-stock/kingyo/commit/1c5c55dddb608b64f2493895611972a831d37fed))

## [1.6.3](https://github.com/uchi-stock/kingyo/compare/v1.6.2...v1.6.3) (2026-08-22)


### Bug Fixes

* ポイの感度・滑らかさ・マーカーサイズを実機フィードバックに基づき調整する ([#37](https://github.com/uchi-stock/kingyo/issues/37)) ([25a8998](https://github.com/uchi-stock/kingyo/commit/25a899863d479d86f6c4889af2dc00049f5be8de))

## [1.6.2](https://github.com/uchi-stock/kingyo/compare/v1.6.1...v1.6.2) (2026-08-22)


### Bug Fixes

* ポイの位置操作を速度を持たない直接レート制御に変更しドリフトを抑える ([#35](https://github.com/uchi-stock/kingyo/issues/35)) ([5bd73ea](https://github.com/uchi-stock/kingyo/commit/5bd73eae1cbc8590ec8193edb8b21616e620be3d))

## [1.6.1](https://github.com/uchi-stock/kingyo/compare/v1.6.0...v1.6.1) (2026-08-22)


### Bug Fixes

* ポイの位置操作の感度を上げ、静止時ノイズのデッドゾーンを追加する ([#33](https://github.com/uchi-stock/kingyo/issues/33)) ([d9da2f5](https://github.com/uchi-stock/kingyo/commit/d9da2f5ed7b256a93a61630bf4abf976f312916b))

# [1.6.0](https://github.com/uchi-stock/kingyo/compare/v1.5.1...v1.6.0) (2026-08-22)


### Features

* 金魚の転回を滑らかにし、ランダムな方向転換を追加する ([#31](https://github.com/uchi-stock/kingyo/issues/31)) ([388efc3](https://github.com/uchi-stock/kingyo/commit/388efc3ea9ae2e3a022b1f25320a3babe08b8b96))

## [1.5.1](https://github.com/uchi-stock/kingyo/compare/v1.5.0...v1.5.1) (2026-08-22)


### Bug Fixes

* 金魚の画像を頭上向きに統一し、進行方向へ正しく向くようにする ([#28](https://github.com/uchi-stock/kingyo/issues/28)) ([427adb1](https://github.com/uchi-stock/kingyo/commit/427adb1271711c34f391fd2718ef6fc26ab7a2a1))

# [1.5.0](https://github.com/uchi-stock/kingyo/compare/v1.4.0...v1.5.0) (2026-08-22)


### Features

* トップページにバージョン・更新日時を表示する ([#27](https://github.com/uchi-stock/kingyo/issues/27)) ([134658f](https://github.com/uchi-stock/kingyo/commit/134658f45a0570f1f527ec772f449e06c3ff1ce6))

# [1.4.0](https://github.com/uchi-stock/kingyo/compare/v1.3.4...v1.4.0) (2026-08-22)


### Features

* 金魚の遊泳モデルを前方基準の小さな振れ＋端で転回に変更する ([#24](https://github.com/uchi-stock/kingyo/issues/24)) ([edf16f6](https://github.com/uchi-stock/kingyo/commit/edf16f6bcabba06d5626989bb6cd6cb61a2ac9f4))

## [1.3.4](https://github.com/uchi-stock/kingyo/compare/v1.3.3...v1.3.4) (2026-08-22)


### Bug Fixes

* ポイ・金魚の位置更新をleft/topからtransformベースへ変更する ([#20](https://github.com/uchi-stock/kingyo/issues/20)) ([d481e01](https://github.com/uchi-stock/kingyo/commit/d481e0132df8b113272c220d5798887963239d1a))

## [1.3.3](https://github.com/uchi-stock/kingyo/compare/v1.3.2...v1.3.3) (2026-08-21)


### Bug Fixes

* センサー許可リクエストのタイミング修正とデバッグ表示を追加 ([#18](https://github.com/uchi-stock/kingyo/issues/18)) ([0fef7a9](https://github.com/uchi-stock/kingyo/commit/0fef7a9604bee5ff004e2578f084e90b1389b6e5))

## [1.3.2](https://github.com/uchi-stock/kingyo/compare/v1.3.1...v1.3.2) (2026-08-21)


### Bug Fixes

* 金魚がより活発に泳ぎ回るよう速度を調整する ([#17](https://github.com/uchi-stock/kingyo/issues/17)) ([e0a2d6c](https://github.com/uchi-stock/kingyo/commit/e0a2d6c66c0c760be3de3b2f8145fa8486fb0644))

## [1.3.1](https://github.com/uchi-stock/kingyo/compare/v1.3.0...v1.3.1) (2026-08-21)


### Bug Fixes

* ポイの加速度センサー入力から重力成分を除去する ([#16](https://github.com/uchi-stock/kingyo/issues/16)) ([8a56eb3](https://github.com/uchi-stock/kingyo/commit/8a56eb3ea55fea06265159267b1c92ac94e45378))

# [1.3.0](https://github.com/uchi-stock/kingyo/compare/v1.2.1...v1.3.0) (2026-08-21)


### Features

* カメラ映像を用いて空間上に金魚を表示する ([#13](https://github.com/uchi-stock/kingyo/issues/13)) ([32b173b](https://github.com/uchi-stock/kingyo/commit/32b173b4ee03c6edc71281d61aa6c91fc58a0bc6))

## [1.2.1](https://github.com/uchi-stock/kingyo/compare/v1.2.0...v1.2.1) (2026-08-21)


### Bug Fixes

* ポイの操作モデルを修正（傾き→角度、スライド移動→位置） ([#12](https://github.com/uchi-stock/kingyo/issues/12)) ([aa0917d](https://github.com/uchi-stock/kingyo/commit/aa0917d2e72eef3b16d52c04b666fd02091fd18d))

# [1.2.0](https://github.com/uchi-stock/kingyo/compare/v1.1.0...v1.2.0) (2026-08-21)


### Features

* S3+CloudFrontへの実際のAWSデプロイをCDワークフローに組み込む ([#9](https://github.com/uchi-stock/kingyo/issues/9)) ([63e922a](https://github.com/uchi-stock/kingyo/commit/63e922a6af23c26baca16fb0df615f0661303e37))

# [1.1.0](https://github.com/uchi-stock/kingyo/compare/v1.0.0...v1.1.0) (2026-08-21)


### Features

* 加速度センサーでポイを操作する機能を追加 ([#7](https://github.com/uchi-stock/kingyo/issues/7)) ([e49604d](https://github.com/uchi-stock/kingyo/commit/e49604d928dab3b5952209b5be494f4eb262d76a))

# 1.0.0 (2026-08-21)


### Bug Fixes

* ルートpackage-lock.jsonの依存関係不整合を修正 ([#5](https://github.com/uchi-stock/kingyo/issues/5)) ([168d5cc](https://github.com/uchi-stock/kingyo/commit/168d5ccb89824c06bdc56300635b84b5cf2550cb))


### Features

* プロジェクト初期セットアップ（dev-standards取り込み・フロントエンド雛形・CI/CD） ([#3](https://github.com/uchi-stock/kingyo/issues/3)) ([d4ee26d](https://github.com/uchi-stock/kingyo/commit/d4ee26d3b04a5fc14f52286b81c6baa90fc082bd))
