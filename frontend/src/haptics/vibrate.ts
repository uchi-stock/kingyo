// Vibration APIはAndroid/Chrome系のみの対応で、iOS Safariには実装自体が無いため、
// フィーチャー検出し非対応環境では何もしない（例外も投げない）
function vibrate(durationMs: number): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return
  }
  navigator.vibrate(durationMs)
}

// ゲームオーバー（ポイが破れた瞬間）に触覚フィードバックを与える（issue #103）
export function vibrateGameOver(): void {
  vibrate(200)
}

// 金魚の捕獲成功時に触覚フィードバックを与える。ゲームオーバー時（200ms）と
// 区別できるよう、短めのパターンにする（issue #106）
export function vibrateCatchSuccess(): void {
  vibrate(50)
}
