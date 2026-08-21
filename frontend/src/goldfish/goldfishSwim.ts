export interface GoldfishPose {
  xPercent: number
  yPercent: number
  facingLeft: boolean
}

export interface GoldfishConfig {
  // 個体ごとに軌道の位相・速さをずらすための値（0〜1）
  seed: number
}

const CENTER_PERCENT = 50
const MARGIN_PERCENT = 15
const RANGE_PERCENT = CENTER_PERCENT - MARGIN_PERCENT

// 個体ごとにseedで位相・速さをずらしたLissajous曲線で、画面内を自然に泳ぐ軌跡を表現する。
// 実空間のトラッキングは行わず、画面内アニメーションによる疑似的な表現に留める（issue #10）。
export function goldfishPoseAt(elapsedMs: number, { seed }: GoldfishConfig): GoldfishPose {
  const t = elapsedMs / 1000
  const phase = seed * Math.PI * 2
  const speedX = 0.25 + seed * 0.15
  const speedY = 0.4 + seed * 0.2

  const xPercent = CENTER_PERCENT + RANGE_PERCENT * Math.sin(t * speedX + phase)
  const yPercent = CENTER_PERCENT + RANGE_PERCENT * 0.6 * Math.sin(t * speedY + phase * 1.7)
  const dx = Math.cos(t * speedX + phase) * speedX

  return { xPercent, yPercent, facingLeft: dx < 0 }
}
