import { describe, expect, it } from 'vitest'
import { CENTER_POI_MOTION_STATE, orientationToAngleDeg, removeGravity, stepPoiMotion } from './poiMotion'

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

describe('removeGravity', () => {
  it('静止状態が続くと、重力成分がすべてgravityEstimateに吸収され、linearはほぼ0に収束する', () => {
    let gravityEstimate = { x: 0, y: 0 }
    const raw = { x: 0, y: 9.8 } // 端末が水平に静止しており、重力がy軸に一定でかかっている状態を想定
    let linear = { x: 0, y: 0 }

    for (let i = 0; i < 100; i += 1) {
      const result = removeGravity(raw, gravityEstimate)
      gravityEstimate = result.gravityEstimate
      linear = result.linear
    }

    expect(gravityEstimate.y).toBeCloseTo(9.8, 1)
    expect(Math.abs(linear.y)).toBeLessThan(0.1)
  })

  it('重力が収束した状態から急な加速度変化（スライド操作相当）があると、linearに反映される', () => {
    let gravityEstimate = { x: 0, y: 0 }
    const restingRaw = { x: 0, y: 9.8 }
    for (let i = 0; i < 100; i += 1) {
      gravityEstimate = removeGravity(restingRaw, gravityEstimate).gravityEstimate
    }

    // 重力9.8に加え、スライド操作による加速度2.0が瞬間的に加わった状態を想定。
    // ハイパスフィルタは1サンプルで完全には追従しないため、(1 - alpha)分だけgravityEstimate側にも
    // 吸収され、残りのalpha分がlinearに現れる
    const slideRaw = { x: 0, y: 11.8 }
    const { linear } = removeGravity(slideRaw, gravityEstimate)

    expect(linear.y).toBeCloseTo(2.0 * 0.8, 5)
  })

  it('端末が傾いたまま静止し続けると、linearの絶対値は時間とともに0へ収束していく（境界張り付きの再発防止）', () => {
    let gravityEstimate = { x: 0, y: 0 }
    const raw = { x: 3, y: 4 } // 端末が一定角度傾いたまま静止している状態を想定

    const first = removeGravity(raw, gravityEstimate)
    const firstAbsLinear = Math.hypot(first.linear.x, first.linear.y)
    gravityEstimate = first.gravityEstimate

    for (let i = 0; i < 200; i += 1) {
      gravityEstimate = removeGravity(raw, gravityEstimate).gravityEstimate
    }
    const final = removeGravity(raw, gravityEstimate)
    const finalAbsLinear = Math.hypot(final.linear.x, final.linear.y)

    expect(finalAbsLinear).toBeLessThan(firstAbsLinear)
    expect(finalAbsLinear).toBeLessThan(0.1)
  })
})
