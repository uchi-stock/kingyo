export interface Orientation {
  beta: number | null
  gamma: number | null
}

export interface PoiPosition {
  xPercent: number
  yPercent: number
  angleDeg: number
}

const TILT_RANGE_DEG = 45

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export const CENTER_POI_POSITION: PoiPosition = { xPercent: 50, yPercent: 50, angleDeg: 0 }

// beta（前後の傾き）・gamma（左右の傾き）を、画面上のポイ位置（0〜100%）と回転角度に変換する。
// 実機を大きく傾けなくても操作できるよう、可動域を±45度に制限してマッピングする。
export function orientationToPoiPosition({ beta, gamma }: Orientation): PoiPosition {
  const clampedGamma = clamp(gamma ?? 0, -TILT_RANGE_DEG, TILT_RANGE_DEG)
  const clampedBeta = clamp(beta ?? 0, -TILT_RANGE_DEG, TILT_RANGE_DEG)

  return {
    xPercent: ((clampedGamma + TILT_RANGE_DEG) / (TILT_RANGE_DEG * 2)) * 100,
    yPercent: ((clampedBeta + TILT_RANGE_DEG) / (TILT_RANGE_DEG * 2)) * 100,
    angleDeg: clampedGamma,
  }
}
