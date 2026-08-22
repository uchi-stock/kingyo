import { describe, expect, it } from 'vitest'
import { createInitialGoldfishState, stepGoldfish } from './goldfishSwim'

describe('createInitialGoldfishState', () => {
  it('seedに応じて可動域（10%〜90%）内に散らばった初期位置を返す', () => {
    for (let seed = 0; seed <= 1; seed += 0.25) {
      const state = createInitialGoldfishState(seed)
      expect(state.xPercent).toBeGreaterThanOrEqual(10)
      expect(state.xPercent).toBeLessThanOrEqual(90)
      expect(state.yPercent).toBeGreaterThanOrEqual(10)
      expect(state.yPercent).toBeLessThanOrEqual(90)
    }
  })
})

describe('stepGoldfish', () => {
  it('右向き（heading=0）でwobbleが0になる時刻・seedでは、右方向へ直進する', () => {
    // elapsedMs=0, seed=0 の場合、wobbleDeg = 15*sin(0+0) = 0
    const state = { xPercent: 50, yPercent: 50, headingDeg: 0 }
    const next = stepGoldfish(state, 1, 0, 0)

    expect(next.xPercent).toBeCloseTo(55, 5)
    expect(next.yPercent).toBeCloseTo(50, 5)
    expect(next.headingDeg).toBe(0)
    expect(next.facingLeft).toBe(false)
  })

  it('振れ（wobble）は前方を中心に±15度の範囲に収まる', () => {
    const state = { xPercent: 50, yPercent: 50, headingDeg: 0 }
    for (let elapsedMs = 0; elapsedMs <= 10000; elapsedMs += 100) {
      const next = stepGoldfish(state, 0.016, elapsedMs, 0.3)
      // headingDeg自体（保持している進行方向の基準）は転回しない限り変化しない
      expect(next.headingDeg).toBe(0)
    }
  })

  it('右端に近づいて壁を超える移動をすると、水平方向の進行方向が反転し位置は境界内にクランプされる', () => {
    const state = { xPercent: 89, yPercent: 50, headingDeg: 0 }
    // wobbleDeg=0となるelapsedMs=0, seed=0を使い、純粋に直進のみで壁に当たる状況を作る
    const next = stepGoldfish(state, 1, 0, 0)

    expect(next.xPercent).toBeLessThanOrEqual(90)
    expect(next.headingDeg).toBe(180)
    expect(next.facingLeft).toBe(true)
  })

  it('下端に近づいて壁を超える移動をすると、垂直方向の進行方向が反転し位置は境界内にクランプされる', () => {
    const state = { xPercent: 50, yPercent: 89, headingDeg: 90 }
    const next = stepGoldfish(state, 1, 0, 0)

    expect(next.yPercent).toBeLessThanOrEqual(90)
    expect(next.headingDeg).toBe(270)
  })

  it('進行方向の水平成分が負の場合はfacingLeftがtrueになる', () => {
    const state = { xPercent: 50, yPercent: 50, headingDeg: 180 }
    const next = stepGoldfish(state, 0.016, 0, 0)
    expect(next.facingLeft).toBe(true)
  })

  it('進行方向の水平成分が正の場合はfacingLeftがfalseになる', () => {
    const state = { xPercent: 50, yPercent: 50, headingDeg: 0 }
    const next = stepGoldfish(state, 0.016, 0, 0)
    expect(next.facingLeft).toBe(false)
  })
})
