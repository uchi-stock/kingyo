import { describe, expect, it } from 'vitest'
import { CENTER_POI_MOTION_STATE, orientationToAngleDeg, stepPoiMotion } from './poiMotion'

describe('orientationToAngleDeg', () => {
  it('傾きがない場合は0度になる', () => {
    expect(orientationToAngleDeg(0)).toBe(0)
  })

  it('値がnullの場合は0度として扱う', () => {
    expect(orientationToAngleDeg(null)).toBe(0)
  })

  it('可動域の上限を超える傾きは45度にクランプされる', () => {
    expect(orientationToAngleDeg(90)).toBe(45)
  })

  it('可動域の下限を超える傾きは-45度にクランプされる', () => {
    expect(orientationToAngleDeg(-90)).toBe(-45)
  })
})

describe('stepPoiMotion', () => {
  it('dtが0の場合は状態を変化させない', () => {
    expect(stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 1, y: 1 }, 0)).toEqual(CENTER_POI_MOTION_STATE)
  })

  it('加速度が0かつ静止状態の場合は位置・速度が変化しない', () => {
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 0, y: 0 }, 1)
    expect(next).toEqual(CENTER_POI_MOTION_STATE)
  })

  it('正の加速度を与えると、その方向へ位置が進む（yに入力が無ければyは変化しない）', () => {
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 1, y: 0 }, 0.05)
    expect(next.xPercent).toBeGreaterThan(50)
    expect(next.yPercent).toBe(50)
    expect(next.velocityXPercentPerSec).toBeGreaterThan(0)
  })

  it('速度は時間経過とともに減衰する（加速度なしの2フレーム目）', () => {
    const withVelocity = { xPercent: 50, yPercent: 50, velocityXPercentPerSec: 10, velocityYPercentPerSec: 0 }
    const next = stepPoiMotion(withVelocity, { x: 0, y: 0 }, 0.05)
    expect(next.velocityXPercentPerSec).toBeLessThan(withVelocity.velocityXPercentPerSec)
    expect(next.velocityXPercentPerSec).toBeGreaterThan(0)
  })

  it('位置は0〜100%の範囲にクランプされ、端では速度がリセットされる', () => {
    // dtはMAX_DT_SECONDS（0.1秒）以内に収め、位置側のクランプのみを検証する
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 10000, y: 0 }, 0.1)
    expect(next.xPercent).toBe(100)
    expect(next.velocityXPercentPerSec).toBe(0)
  })

  it('dtが上限（MAX_DT_SECONDS）を超えても位置が飛ばない', () => {
    const shortDt = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 1, y: 0 }, 0.1)
    const longDt = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 1, y: 0 }, 100)
    expect(longDt).toEqual(shortDt)
  })
})
