# タスクリスト: issue #72 AT対応（ポイ中央固定＋金魚側パン方式）

計画の全文は`tasks/plan.md`参照。

## Phase 1: 基盤（見た目の変化なし）

### Task 1: usePoiMotionにワールドオフセット共有用のrefパラメータを追加する

**説明:** `usePoiMotion(isTorn)`に第2引数として、外部から渡されたref（`{ xPercent, yPercent }`）を受け取れるようにし、毎フレーム（devicemotionのrAFループ内）そのrefへ現在のワールドオフセット相当の値を書き込む。センサーモード時は実際のmotionState、フォールバックモード時（`permission !== 'granted'`）は常に中立値（`{xPercent:50, yPercent:50}`）を書き込む。既存の戻り値（`pose`等）は変更しない。

**受け入れ基準:**
- [x] refを渡さない場合、既存の動作・戻り値に一切変化がない
- [x] refを渡した場合、センサーモード時はmotionStateと同じ値がrefに反映される
- [x] フォールバックモード時は常に中立値（50, 50）がrefに反映される

**検証:**
- [x] テスト成功: `npx vitest run src/motion/usePoiMotion.test.ts`（新規作成、または既存の統合テストで代替）
- [x] ビルド成功: `npm run build`

**依存:** なし

**触るファイル:**
- `frontend/src/motion/usePoiMotion.ts`
- `frontend/src/motion/usePoiMotion.test.ts`（新規、無ければ作成を検討。既存はPoi.test.tsx経由の間接テストのみの可能性があるため要確認）

**規模:** Small

---

### Task 2: App.tsxでオフセットrefを生成し、Poi・GoldfishSchoolへ配線する

**説明:** `App.tsx`で`useRef({xPercent: 50, yPercent: 50})`によりワールドオフセット用のrefを1つ生成し、`<Poi worldOffsetRef={ref} .../>`・`<GoldfishSchool worldOffsetRef={ref} .../>`として渡す。`Poi`はこのrefをTask 1の`usePoiMotion`へ渡す。`GoldfishSchool`はpropsとして受け取るが、この時点ではまだ描画に使わない（Phase 2で使用）。

**受け入れ基準:**
- [x] 既存の見た目・挙動に変化がない
- [x] refが単一のオブジェクトとしてPoi・GoldfishSchool双方に共有されている

**検証:**
- [x] テスト成功: `npm test -- --run`（既存App.test.tsx・Poi.test.tsx・GoldfishSchool.test.tsxが無変更で成功）
- [x] ビルド成功: `npm run build`
- [x] 目視確認: 差分がplumbingのみであることをコードレビューで確認

**依存:** Task 1

**触るファイル:**
- `frontend/src/App.tsx`
- `frontend/src/components/Poi.tsx`
- `frontend/src/components/GoldfishSchool.tsx`

**規模:** Small

---

## Checkpoint: Phase 1
- [x] 既存テストが無変更のまま全て成功する
- [x] lint/build成功

## Phase 2: 金魚側のパン適用

### Task 3: GoldfishSchoolが受け取ったオフセットrefを描画transformへ適用する

**説明:** `GoldfishSchool`のtransform計算に、`worldOffsetRef.current`から算出したvw/vhオフセット（`offsetVw = 50 - xPercent`、符号は「スマホを動かした方向に近づいた金魚が中央へ寄ってくる」体感になるよう調整）を各金魚の位置へ加算する。

**受け入れ基準:**
- [x] オフセットが中立値（50,50）の場合、既存と全く同じ描画結果になる
- [x] オフセットが中立値でない場合、全ての金魚が同じ量だけシフトして描画される
- [x] パンの方向（符号）がissue本文の意図通り

**検証:**
- [x] テスト成功（Task 4で追加）
- [x] ビルド成功: `npm run build`

**依存:** Task 2

**触るファイル:**
- `frontend/src/components/GoldfishSchool.tsx`

**規模:** Small

---

### Task 4: GoldfishSchool.test.tsxにオフセット適用のテストを追加する

**説明:** モックしたrefの値を変えて`GoldfishSchool`をレンダーし、transformのvw/vh値が期待通りシフトすることを確認するテストを追加する。

**受け入れ基準:**
- [x] 中立オフセット時に既存の描画結果と一致するテストがある
- [x] 非中立オフセット時にシフト量・方向が正しいことを確認するテストがある

**検証:**
- [x] テスト成功: `npx vitest run src/components/GoldfishSchool.test.tsx`

**依存:** Task 3

**触るファイル:**
- `frontend/src/components/GoldfishSchool.test.tsx`

**規模:** Small

---

## Checkpoint: Phase 2
- [x] 金魚のパンが単体テストで確認できる
- [x] lint/test/build成功

## Phase 3: ポイの中央固定化

### Task 5: Poi.tsxをセンサーモード時のみ中央固定＋角度のみの描画へ変更する

**説明:** `showManualControl`が`false`（センサーモード）の場合、ポイマーカーのtransformから位置オフセット（`offsetXPx`/`offsetYPx`）を外し、`rotate(angleDeg)`のみにする。`showManualControl`が`true`（フォールバック）の場合は既存の位置＋角度の描画を維持する。

**受け入れ基準:**
- [x] センサーモード時、ポイマーカーは常に中央（`top-50 start-50` + `translate(-50%,-50%)`のみ）に描画される
- [x] フォールバックモード時の描画は既存と完全に同じ

**検証:**
- [x] テスト成功（Task 7で更新）
- [x] ビルド成功: `npm run build`

**依存:** Task 2

**触るファイル:**
- `frontend/src/components/Poi.tsx`

**規模:** Medium

---

### Task 6: handleScoop/handleManualScoopの捕獲・逃走位置計算を更新する

**説明:** センサーモード時、`onScoop`へ渡すポイのビューポート位置を「pond要素の中心（getBoundingClientRectから算出、フレーム毎の再計算は不要）＋ワールドオフセット（vw/vh換算）」で計算するよう変更する。フォールバックモード時は既存の計算（pond中心＋自分の位置オフセット）を維持する（オフセットが常に中立のため実質的に既存と同じ計算結果になる想定だが、明示的に分岐するか、共通化できるか実装時に判断する）。

**受け入れ基準:**
- [x] センサーモード時、ポイの実効位置がワールドオフセットに応じて正しく変化し、捕獲・逃走判定に反映される
- [x] フォールバックモード時の捕獲・逃走判定は既存と同じ結果になる

**検証:**
- [x] テスト成功（Task 7で更新）
- [x] ビルド成功: `npm run build`

**依存:** Task 5

**触るファイル:**
- `frontend/src/components/Poi.tsx`

**規模:** Medium

---

### Task 7: Poi.test.tsxをセンサーモード時の新しい描画・位置計算に合わせて更新する

**説明:** センサーモードでのポイ中央固定描画・オフセット反映後の捕獲位置計算をテストするケースを追加・更新する。フォールバックモードの既存テストは変更しない（回帰確認の意味も持たせる）。

**受け入れ基準:**
- [x] センサーモード時、ポイマーカーのtransformが常に中央固定であることを確認するテストがある
- [x] センサーモード時、ワールドオフセットに応じてonScoopへ渡る位置が正しくずれることを確認するテストがある
- [x] フォールバックモードの既存テストが全て無変更で成功する

**検証:**
- [x] テスト成功: `npx vitest run src/components/Poi.test.tsx`
- [x] テスト成功: `npm test -- --run`（App.test.tsx含む全体回帰）

**依存:** Task 6

**触るファイル:**
- `frontend/src/components/Poi.test.tsx`

**規模:** Medium

---

## Checkpoint: Phase 3
- [x] センサーモードのシナリオで、ポイが中央固定・金魚がパンし、捕獲判定が正しく動作することをテストで確認
- [x] フォールバックモードの既存テストが無変更で成功する（回帰なし）
- [x] lint/test/build成功

## Phase 4: 仕上げ

### Task 8: 不要になったコード・コメントの整理

**説明:** センサーモード用に不要になった計算（あれば）を整理し、新しいアーキテクチャの意図をコードコメントへ反映する（issue #72参照）。フォールバックモード分のロジック・コメントは残す。

**受け入れ基準:**
- [x] デッドコードが残っていない
- [x] 主要な設計判断（オフセットの意味、モード分岐の理由）がコメントとして残っている

**検証:**
- [x] lint成功: `npm run lint`
- [x] テスト成功: `npm test -- --run`

**依存:** Task 7

**触るファイル:**
- `frontend/src/components/Poi.tsx`
- `frontend/src/components/GoldfishSchool.tsx`
- `frontend/src/motion/usePoiMotion.ts`

**規模:** Small

---

### Task 9: PR作成・完了報告

**説明:** 差分をセルフレビューし、commit（設計/影響/テスト形式）・push・PR作成する。実機確認手順（スマホオンリー制約に沿った内容）をTest planに明記する。

**検証:**
- [x] lint/test/build全て成功
- [x] セルフレビュー（code-reviewの観点）で指摘0件

**依存:** Task 8

**規模:** Small

---

## Checkpoint: 完了
- [x] 全完了条件（issue #72）を満たしている
- [x] lint/test/build成功、実機確認手順をPRのTest planに明記
