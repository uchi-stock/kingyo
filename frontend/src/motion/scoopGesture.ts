const SCOOP_ANGULAR_VELOCITY_THRESHOLD_DEG_PER_SEC = 180 // この角速度を超える素早い傾きの変化を「掬う」フリックとして検出する
// この角速度を超える「勢いのよい」フリックは、位置に関わらず失敗として扱う（issue #82）。
// 実機での検証待ちの暫定値であり、実際の操作感に応じて調整する
const SCOOP_FORCEFUL_ANGULAR_VELOCITY_THRESHOLD_DEG_PER_SEC = 2400
const SCOOP_COOLDOWN_MS = 500 // 連続検出を防ぐための最小間隔
const MIN_DT_SECONDS = 0.001 // 0除算や極小dtによる角速度の異常な増幅（ノイズの誤検出）を防ぐ下限
const ROTATION_SUPPRESSION_THRESHOLD_DEG_PER_SEC = 90 // この角速度を超える回転中は、加速度による位置操作を抑制する
const ROTATION_SUPPRESSION_HOLD_MS = 300 // 回転が収まった後も、センサー値が落ち着くまで抑制を継続する時間

// 傾き（beta等）の角速度を計算する。極小dtで角速度が異常に増幅されるのを防ぐため、
// dtには下限を設ける。
export function computeAngularVelocityDegPerSec(currentDeg: number, previousDeg: number, dtSecondsRaw: number): number {
  const dtSeconds = Math.max(dtSecondsRaw, MIN_DT_SECONDS)
  return (currentDeg - previousDeg) / dtSeconds
}

// 掬う動作の勢い。優しく掬えば'gentle'（位置に応じて成否判定）、勢いよく掬えば
// 'forceful'（位置に関わらず常に失敗）として扱う（issue #82）
export type ScoopIntensity = 'gentle' | 'forceful'

export interface ScoopGestureResult {
  triggered: boolean
  cooldownMs: number
  // triggeredがtrueの場合のみ値を持つ
  intensity: ScoopIntensity | null
}

// 端末の前後方向の傾き（beta）の角速度から、素早く煽るような動き（「掬う」フリック）を
// 検出する。スマホを物理的に上下へ動かす（並進移動）と、既存のスライド操作と同じ加速度の
// 二重積分・ドリフト問題を垂直方向でも再現してしまうため、ドリフトしない絶対角度である
// betaの変化速度で代用する（issue #38）。
//
// betaが急激に増加する動き（端末上端を素早く自分側へ傾ける動き）を「掬う」フリックとみなす。
// この向きの想定は実機での検証待ちであり、逆向きだった場合は符号を反転して調整する。
export function detectScoopGesture(
  angularVelocityDegPerSec: number,
  dtSecondsRaw: number,
  cooldownMsRemaining: number,
): ScoopGestureResult {
  const nextCooldownMs = Math.max(0, cooldownMsRemaining - dtSecondsRaw * 1000)

  if (dtSecondsRaw <= 0 || nextCooldownMs > 0) {
    return { triggered: false, cooldownMs: nextCooldownMs, intensity: null }
  }

  if (angularVelocityDegPerSec > SCOOP_ANGULAR_VELOCITY_THRESHOLD_DEG_PER_SEC) {
    const intensity: ScoopIntensity =
      angularVelocityDegPerSec > SCOOP_FORCEFUL_ANGULAR_VELOCITY_THRESHOLD_DEG_PER_SEC ? 'forceful' : 'gentle'
    return { triggered: true, cooldownMs: SCOOP_COOLDOWN_MS, intensity }
  }
  return { triggered: false, cooldownMs: nextCooldownMs, intensity: null }
}

export interface RotationSuppressionResult {
  suppressed: boolean
  holdMs: number
}

// 端末を素早く回転させる動作（掬うフリック等）は、加速度センサーの値に一時的な変化
// （線形加速度として見える成分）を生み、ポイの水平位置操作に混入してしまう
// （回転運動の支点は手首であり完全に固定されないことや、重力成分の投影方向が急激に
// 変わることに伴う`removeGravity`のハイパスフィルタの追従遅れが原因と考えられる）。
// betaの角速度が閾値を超えている間、およびその直後の短い期間（センサー値が落ち着くまでの
// 猶予）は「抑制中」とし、位置操作用の加速度入力をゼロ扱いにすることで、「掬う」動作と
// 「スライド」動作をセンサー入力の時点で分離する（issue #42）。
export function updateRotationSuppression(
  angularVelocityDegPerSec: number,
  dtSecondsRaw: number,
  holdMsRemaining: number,
): RotationSuppressionResult {
  const decayedHoldMs = Math.max(0, holdMsRemaining - dtSecondsRaw * 1000)
  if (Math.abs(angularVelocityDegPerSec) > ROTATION_SUPPRESSION_THRESHOLD_DEG_PER_SEC) {
    return { suppressed: true, holdMs: ROTATION_SUPPRESSION_HOLD_MS }
  }
  return { suppressed: decayedHoldMs > 0, holdMs: decayedHoldMs }
}
