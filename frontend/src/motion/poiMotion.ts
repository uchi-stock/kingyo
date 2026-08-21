export interface PoiMotionState {
  xPercent: number
  yPercent: number
  velocityXPercentPerSec: number
  velocityYPercentPerSec: number
}

export const CENTER_POI_MOTION_STATE: PoiMotionState = {
  xPercent: 50,
  yPercent: 50,
  velocityXPercentPerSec: 0,
  velocityYPercentPerSec: 0,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

const TILT_RANGE_DEG = 45

// 端末の左右の傾き（gamma）をポイの回転角度に変換する。位置には使わない
// （位置は端末のスライド操作＝加速度で操作する。issue #11）。
export function orientationToAngleDeg(gamma: number | null): number {
  return clamp(gamma ?? 0, -TILT_RANGE_DEG, TILT_RANGE_DEG)
}

export interface Acceleration2D {
  x: number
  y: number
}

const ACCELERATION_SENSITIVITY = 6 // m/s^2 を %/s^2 相当の速度変化量へ変換する係数
const DAMPING_PER_SEC = 0.1 // 1秒あたりに速度がこの割合まで減衰する（摩擦・センサーノイズ対策）
const MAX_DT_SECONDS = 0.1 // タブのバックグラウンド復帰等での大きなdtによる位置の飛びを防ぐ

// 端末のスライド操作（加速度）を積分し、ポイの位置を更新する。速度は毎秒DAMPING_PER_SECの
// 割合まで指数的に減衰させ、センサーノイズによる際限のないドリフトを抑える。
export function stepPoiMotion(
  state: PoiMotionState,
  acceleration: Acceleration2D,
  dtSecondsRaw: number,
): PoiMotionState {
  const dtSeconds = clamp(dtSecondsRaw, 0, MAX_DT_SECONDS)
  if (dtSeconds === 0) {
    return state
  }

  const damping = Math.pow(DAMPING_PER_SEC, dtSeconds)
  const nextVelocityX =
    (state.velocityXPercentPerSec + acceleration.x * ACCELERATION_SENSITIVITY * dtSeconds) * damping
  const nextVelocityY =
    (state.velocityYPercentPerSec + acceleration.y * ACCELERATION_SENSITIVITY * dtSeconds) * damping

  const nextXPercent = clamp(state.xPercent + nextVelocityX * dtSeconds, 0, 100)
  const nextYPercent = clamp(state.yPercent + nextVelocityY * dtSeconds, 0, 100)

  // 端に到達した場合は速度を打ち消し、境界に張り付いたまま速度だけ蓄積するのを防ぐ
  const clampedVelocityX = nextXPercent === 0 || nextXPercent === 100 ? 0 : nextVelocityX
  const clampedVelocityY = nextYPercent === 0 || nextYPercent === 100 ? 0 : nextVelocityY

  return {
    xPercent: nextXPercent,
    yPercent: nextYPercent,
    velocityXPercentPerSec: clampedVelocityX,
    velocityYPercentPerSec: clampedVelocityY,
  }
}
