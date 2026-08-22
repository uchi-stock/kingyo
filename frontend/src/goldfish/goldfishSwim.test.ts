import { describe, expect, it } from 'vitest'
import { createInitialGoldfishState, stepGoldfish } from './goldfishSwim'

// 常に中間値を返すrandom関数。テスト対象の状態はturnCountdownMsを十分大きく
// 設定しておくことで、ランダム方向転換が発生しない状況を作る
const midRandom = () => 0.5

describe('createInitialGoldfishState', () => {
  it('seedに応じて可動域（10%〜90%）内に散らばった初期位置を返す', () => {
    for (let seed = 0; seed <= 1; seed += 0.25) {
      const state = createInitialGoldfishState(seed, midRandom)
      expect(state.xPercent).toBeGreaterThanOrEqual(10)
      expect(state.xPercent).toBeLessThanOrEqual(90)
      expect(state.yPercent).toBeGreaterThanOrEqual(10)
      expect(state.yPercent).toBeLessThanOrEqual(90)
    }
  })

  it('見た目の回転角度（displayHeadingDeg）は初期状態でheadingDegと一致する', () => {
    const state = createInitialGoldfishState(0.3, midRandom)
    expect(state.displayHeadingDeg).toBe(state.headingDeg)
  })

  it('次のランダム方向転換までの残り時間は3000〜8000msの範囲になる', () => {
    const state = createInitialGoldfishState(0.3, midRandom)
    expect(state.turnCountdownMs).toBeGreaterThanOrEqual(3000)
    expect(state.turnCountdownMs).toBeLessThanOrEqual(8000)
  })
})

describe('stepGoldfish', () => {
  it('右向き（heading=0）でwobbleが0になる時刻・seedでは、右方向へ直進する', () => {
    const state = { xPercent: 50, yPercent: 50, headingDeg: 0, displayHeadingDeg: 0, turnCountdownMs: 10000 }
    // elapsedMs=0, seed=0 の場合、wobbleDeg = 15*sin(0+0) = 0
    const next = stepGoldfish(state, 1, 0, 0, midRandom)

    expect(next.xPercent).toBeCloseTo(55, 5)
    expect(next.yPercent).toBeCloseTo(50, 5)
    expect(next.headingDeg).toBe(0)
  })

  it('ランダム方向転換のタイマーが尽きていない間は、進行方向の基準（headingDeg）は転回時以外変化しない', () => {
    const state = { xPercent: 50, yPercent: 50, headingDeg: 0, displayHeadingDeg: 0, turnCountdownMs: 10000 }
    for (let elapsedMs = 0; elapsedMs <= 5000; elapsedMs += 100) {
      const next = stepGoldfish(state, 0.016, elapsedMs, 0.3, midRandom)
      expect(next.headingDeg).toBe(0)
    }
  })

  it('ランダム方向転換のタイマーが尽きると、headingDegが変化し、タイマーがリセットされる', () => {
    const state = { xPercent: 50, yPercent: 50, headingDeg: 0, displayHeadingDeg: 0, turnCountdownMs: 0 }
    // random()が常に1を返す場合、オフセットは(1*2-1)*90 = 90度
    const next = stepGoldfish(state, 0.016, 0, 0, () => 1)

    expect(next.headingDeg).toBeCloseTo(90, 0)
    expect(next.turnCountdownMs).toBeGreaterThan(0)
  })

  it('右端に近づいて壁を超える移動をすると、水平方向の進行方向が反転し位置は境界内にクランプされる', () => {
    const state = { xPercent: 89, yPercent: 50, headingDeg: 0, displayHeadingDeg: 0, turnCountdownMs: 10000 }
    // wobbleDeg=0となるelapsedMs=0, seed=0を使い、純粋に直進のみで壁に当たる状況を作る
    const next = stepGoldfish(state, 1, 0, 0, midRandom)

    expect(next.xPercent).toBeLessThanOrEqual(90)
    expect(next.headingDeg).toBe(180)
  })

  it('下端に近づいて壁を超える移動をすると、垂直方向の進行方向が反転し位置は境界内にクランプされる', () => {
    const state = { xPercent: 50, yPercent: 89, headingDeg: 90, displayHeadingDeg: 90, turnCountdownMs: 10000 }
    const next = stepGoldfish(state, 1, 0, 0, midRandom)

    expect(next.yPercent).toBeLessThanOrEqual(90)
    expect(next.headingDeg).toBe(270)
  })

  it('見た目の回転角度（displayHeadingDeg）は、目標角度（headingDeg）へ時間をかけて滑らかに追従する', () => {
    // 壁に当たって進行方向（headingDeg）が瞬時に180度反転する状況を作る
    const state = { xPercent: 89, yPercent: 50, headingDeg: 0, displayHeadingDeg: 0, turnCountdownMs: 10000 }
    const afterBounce = stepGoldfish(state, 1, 0, 0, midRandom)
    expect(afterBounce.headingDeg).toBe(180)
    // headingDegは瞬時に反転するが、displayHeadingDegはまだ目標（180度）に到達していない
    expect(afterBounce.displayHeadingDeg).not.toBe(180)
    expect(afterBounce.displayHeadingDeg).not.toBe(0)

    // 以降、displayHeadingDegはheadingDegへ徐々に近づいていく
    let current = afterBounce
    for (let i = 0; i < 200; i += 1) {
      current = stepGoldfish(current, 0.05, i * 50, 0, midRandom)
    }
    expect(current.displayHeadingDeg).toBeCloseTo(180, 0)
  })
})
