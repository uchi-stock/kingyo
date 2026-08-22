const SCOOP_ANGULAR_VELOCITY_THRESHOLD_DEG_PER_SEC = 180 // この角速度を超える素早い傾きの変化を「掬う」フリックとして検出する
const SCOOP_COOLDOWN_MS = 500 // 連続検出を防ぐための最小間隔
const MIN_DT_SECONDS = 0.001 // 0除算や極小dtによる角速度の異常な増幅（ノイズの誤検出）を防ぐ下限

export interface ScoopGestureResult {
  triggered: boolean
  cooldownMs: number
}

// 端末の前後方向の傾き（beta）の角速度を計算し、素早く煽るような動き（「掬う」フリック）を
// 検出する。スマホを物理的に上下へ動かす（並進移動）と、既存のスライド操作と同じ加速度の
// 二重積分・ドリフト問題を垂直方向でも再現してしまうため、ドリフトしない絶対角度である
// betaの変化速度で代用する（issue #38）。
//
// betaが急激に増加する動き（端末上端を素早く自分側へ傾ける動き）を「掬う」フリックとみなす。
// この向きの想定は実機での検証待ちであり、逆向きだった場合は符号を反転して調整する。
export function detectScoopGesture(
  betaDeg: number,
  previousBetaDeg: number,
  dtSecondsRaw: number,
  cooldownMsRemaining: number,
): ScoopGestureResult {
  const nextCooldownMs = Math.max(0, cooldownMsRemaining - dtSecondsRaw * 1000)

  if (dtSecondsRaw <= 0 || nextCooldownMs > 0) {
    return { triggered: false, cooldownMs: nextCooldownMs }
  }

  const dtSeconds = Math.max(dtSecondsRaw, MIN_DT_SECONDS)
  const angularVelocityDegPerSec = (betaDeg - previousBetaDeg) / dtSeconds
  if (angularVelocityDegPerSec > SCOOP_ANGULAR_VELOCITY_THRESHOLD_DEG_PER_SEC) {
    return { triggered: true, cooldownMs: SCOOP_COOLDOWN_MS }
  }
  return { triggered: false, cooldownMs: nextCooldownMs }
}
