// ゲームオーバー（ポイが破れた瞬間）に触覚フィードバックを与える（issue #103）。
// Vibration APIはAndroid/Chrome系のみの対応で、iOS Safariには実装自体が無いため、
// フィーチャー検出し非対応環境では何もしない（例外も投げない）
export function vibrateGameOver(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return
  }
  navigator.vibrate(200)
}
