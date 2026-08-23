import { describe, expect, it } from 'vitest'
import { createInitialGoldfishState, startFleeing, stepGoldfish } from './goldfishSwim'

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

  it('初期状態では逃走中ではない（fleeCountdownMsが0）', () => {
    const state = createInitialGoldfishState(0.3, midRandom)
    expect(state.fleeCountdownMs).toBe(0)
  })
})

describe('stepGoldfish', () => {
  it('右向き（heading=0）でwobbleが0になる時刻・seedでは、右方向へ直進する', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    // elapsedMs=0, seed=0 の場合、wobbleDeg = 15*sin(0+0) = 0
    const next = stepGoldfish(state, 1, 0, 0, midRandom)

    expect(next.xPercent).toBeCloseTo(55, 5)
    expect(next.yPercent).toBeCloseTo(50, 5)
    expect(next.headingDeg).toBe(0)
  })

  it('ランダム方向転換のタイマーが尽きていない間は、進行方向の基準（headingDeg）は転回時以外変化しない', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    for (let elapsedMs = 0; elapsedMs <= 5000; elapsedMs += 100) {
      const next = stepGoldfish(state, 0.016, elapsedMs, 0.3, midRandom)
      expect(next.headingDeg).toBe(0)
    }
  })

  it('ランダム方向転換のタイマーが尽きると、headingDegが変化し、タイマーがリセットされる', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 0,
      fleeCountdownMs: 0,
    }
    // random()が常に1を返す場合、オフセットは(1*2-1)*90 = 90度
    const next = stepGoldfish(state, 0.016, 0, 0, () => 1)

    expect(next.headingDeg).toBeCloseTo(90, 0)
    expect(next.turnCountdownMs).toBeGreaterThan(0)
  })

  it('右端に近づいて壁を超える移動をすると、水平方向の進行方向が反転し位置は境界内にクランプされる', () => {
    const state = {
      xPercent: 89,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    // wobbleDeg=0となるelapsedMs=0, seed=0を使い、純粋に直進のみで壁に当たる状況を作る
    const next = stepGoldfish(state, 1, 0, 0, midRandom)

    expect(next.xPercent).toBeLessThanOrEqual(90)
    expect(next.headingDeg).toBe(180)
  })

  it('下端に近づいて壁を超える移動をすると、垂直方向の進行方向が反転し位置は境界内にクランプされる', () => {
    const state = {
      xPercent: 50,
      yPercent: 89,
      headingDeg: 90,
      displayHeadingDeg: 90,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    const next = stepGoldfish(state, 1, 0, 0, midRandom)

    expect(next.yPercent).toBeLessThanOrEqual(90)
    expect(next.headingDeg).toBe(270)
  })

  it('見た目の回転角度（displayHeadingDeg）は、目標角度（headingDeg）へ時間をかけて滑らかに追従する', () => {
    // 壁に当たって進行方向（headingDeg）が瞬時に180度反転する状況を作る
    const state = {
      xPercent: 89,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
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

  it('逃走中（fleeCountdownMs > 0）は、通常の何倍かの速さで進む（issue #53）', () => {
    const normalState = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    const fleeingState = { ...normalState, fleeCountdownMs: 1500 }

    const normalNext = stepGoldfish(normalState, 1, 0, 0, midRandom)
    const fleeingNext = stepGoldfish(fleeingState, 1, 0, 0, midRandom)

    const normalDistance = normalNext.xPercent - normalState.xPercent
    const fleeingDistance = fleeingNext.xPercent - fleeingState.xPercent
    expect(fleeingDistance).toBeGreaterThan(normalDistance)
  })

  it('逃走中はランダムな方向転換のタイマーが尽きていても、方向転換は行われない（issue #53）', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 0,
      fleeCountdownMs: 1500,
    }
    // random()が常に1を返す（本来なら90度のオフセットが発生する）状況でも、逃走中は無視される
    const next = stepGoldfish(state, 0.016, 0, 0, () => 1)
    expect(next.headingDeg).toBe(0)
  })

  it('近くに他の金魚がいる場合、その金魚から遠ざかる方向へ、旋回速度の上限を超えない範囲で少しずつ進行方向を変える（issue #122）', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    // 右側（xPercent+5）に他の金魚がいる場合、左方向（180度）へ遠ざかろうとするが、
    // 旋回速度の上限（90度/秒）により、1フレーム（dt=0.1秒）での変化は9度分に留まり、
    // 瞬時に180度へ反転するような大袈裟な動きにはならない（正確に真後ろ＝180度の
    // 場合、回頭方向の符号は実装上一意に決まり、この場合は-9度＝351度になる）
    const next = stepGoldfish(state, 0.1, 0, 0, midRandom, [{ xPercent: 55, yPercent: 50 }])

    expect(next.headingDeg).toBeCloseTo(351, 0)
  })

  it('近くに他の金魚がいる状態が続くと、遠ざかる方向へ時間をかけて収束する（issue #122）', () => {
    let state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    for (let i = 0; i < 50; i += 1) {
      // 毎フレーム、常に右側5%の位置に他の金魚がいる状況を再現する
      const others = [{ xPercent: state.xPercent + 5, yPercent: state.yPercent }]
      state = stepGoldfish(state, 0.1, i * 100, 0, midRandom, others)
    }
    expect(state.headingDeg).toBeCloseTo(180, 0)
  })

  it('他の金魚が回避半径の外にいる場合は、進行方向を変えない（issue #122）', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    // 回避半径（10%）より十分離れた位置
    const next = stepGoldfish(state, 0.016, 0, 0, midRandom, [{ xPercent: 80, yPercent: 50 }])

    expect(next.headingDeg).toBe(0)
  })

  it('複数の金魚が近くにいる場合、それぞれから遠ざかる方向を合成した向きへ進行方向を変える（issue #122）', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    // 上下（yPercent±5）に他の金魚がいる場合、上下の反発は打ち消し合い、真横（180度）への
    // 反発は無いため、この場合は反発が生じずheadingDegは変化しない
    const next = stepGoldfish(state, 0.016, 0, 0, midRandom, [
      { xPercent: 50, yPercent: 45 },
      { xPercent: 50, yPercent: 55 },
    ])

    expect(next.headingDeg).toBe(0)
  })

  it('逃走中は、近くに他の金魚がいても回避せず脅威から逃げる方向を優先する（issue #122）', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 90,
      displayHeadingDeg: 90,
      turnCountdownMs: 10000,
      fleeCountdownMs: 1500,
    }
    const next = stepGoldfish(state, 0.016, 0, 0, midRandom, [{ xPercent: 55, yPercent: 50 }])

    expect(next.headingDeg).toBe(90)
  })

  it('逃走中の残り時間は経過とともに減少し、0になると通常状態に戻る', () => {
    let state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 1500,
    }
    for (let i = 0; i < 100; i += 1) {
      state = stepGoldfish(state, 0.02, i * 20, 0, midRandom)
    }
    expect(state.fleeCountdownMs).toBe(0)
  })
})

describe('startFleeing', () => {
  it('脅威の位置から見て金魚が右側にいる場合、右方向（0度）へ逃げる進行方向を設定する', () => {
    const state = {
      xPercent: 60,
      yPercent: 50,
      headingDeg: 180,
      displayHeadingDeg: 180,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    const next = startFleeing(state, { xPercent: 50, yPercent: 50 })
    expect(next.headingDeg).toBeCloseTo(0, 5)
  })

  it('脅威の位置から見て金魚が左側にいる場合、左方向（180度）へ逃げる進行方向を設定する', () => {
    const state = {
      xPercent: 40,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    const next = startFleeing(state, { xPercent: 50, yPercent: 50 })
    expect(next.headingDeg).toBeCloseTo(180, 5)
  })

  it('逃走時間（fleeCountdownMs）を設定する', () => {
    const state = {
      xPercent: 60,
      yPercent: 50,
      headingDeg: 0,
      displayHeadingDeg: 0,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    const next = startFleeing(state, { xPercent: 50, yPercent: 50 })
    expect(next.fleeCountdownMs).toBeGreaterThan(0)
  })

  it('脅威と金魚の位置が完全に一致する場合、方向を決められないため現在の進行方向を維持する', () => {
    const state = {
      xPercent: 50,
      yPercent: 50,
      headingDeg: 123,
      displayHeadingDeg: 123,
      turnCountdownMs: 10000,
      fleeCountdownMs: 0,
    }
    const next = startFleeing(state, { xPercent: 50, yPercent: 50 })
    expect(next.headingDeg).toBe(123)
  })
})
