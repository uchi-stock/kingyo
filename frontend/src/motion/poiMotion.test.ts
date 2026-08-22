import { describe, expect, it } from 'vitest'
import {
  CENTER_POI_MOTION_STATE,
  orientationToAngleDeg,
  removeGravity,
  smoothAcceleration,
  stepPoiMotion,
} from './poiMotion'

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

  it('加速度が0かつ中心にいる場合は位置が変化しない', () => {
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 0, y: 0 }, 1)
    expect(next).toEqual(CENTER_POI_MOTION_STATE)
  })

  it('正の加速度を与えると、その方向へ位置が進む（yに入力が無ければyは変化しない）', () => {
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 1, y: 0 }, 0.05)
    expect(next.xPercent).toBeGreaterThan(50)
    expect(next.yPercent).toBe(50)
  })

  it('速度状態を持たないため、加速度が無くなると次のフレームでは位置が変化しない（急停止）', () => {
    const moved = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 5, y: 0 }, 0.05)
    expect(moved.xPercent).toBeGreaterThan(50)

    const stopped = stepPoiMotion(moved, { x: 0, y: 0 }, 0.05)
    // 中心への復元力はごく緩やかなため、1フレームでの変化は無視できるほど小さい
    expect(stopped.xPercent).toBeCloseTo(moved.xPercent, 0)
  })

  it('位置は0〜100%の範囲にクランプされる', () => {
    // dtはMAX_DT_SECONDS（0.1秒）以内に収め、位置側のクランプのみを検証する
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 10000, y: 0 }, 0.1)
    expect(next.xPercent).toBe(100)
  })

  it('dtが上限（MAX_DT_SECONDS）を超えても位置が飛ばない', () => {
    const shortDt = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 1, y: 0 }, 0.1)
    const longDt = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 1, y: 0 }, 100)
    expect(longDt).toEqual(shortDt)
  })

  it('デッドゾーン未満の微小な加速度（静止時の残留ノイズ相当）は無視され、位置が変化しない', () => {
    // 実機で観測された静止時の残留値（0.23, -0.01）相当を入力する
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 0.23, y: -0.01 }, 0.05)
    expect(next).toEqual(CENTER_POI_MOTION_STATE)
  })

  it('デッドゾーンを超える加速度（意図的なスライド操作相当）は、そのまま位置に反映される', () => {
    const next = stepPoiMotion(CENTER_POI_MOTION_STATE, { x: 2, y: 0 }, 0.05)
    expect(next.xPercent).toBeGreaterThan(50)
  })

  it('操作をやめた直後（1秒程度）では、中心からのズレの大部分がまだ残っている（強すぎる復元の再発防止。issue #39）', () => {
    let state = { xPercent: 80, yPercent: 50 }
    for (let i = 0; i < 60; i += 1) {
      // 60フレーム(1/60秒刻み) = 1秒間、操作をやめて保持した状況を想定
      state = stepPoiMotion(state, { x: 0, y: 0 }, 1 / 60)
    }
    // 中心からのズレ(30)の80%以上（24以上）が残っている
    expect(state.xPercent).toBeGreaterThan(74)
  })

  it('中心から離れた状態で加速度が無い状態が数秒続くと、明確に中心へ寄り始める（端に張り付いたままにならない。issue #55）', () => {
    let state = { xPercent: 80, yPercent: 50 }
    for (let i = 0; i < 300; i += 1) {
      // 300フレーム(1/60秒刻み) = 5秒間の放置を想定
      state = stepPoiMotion(state, { x: 0, y: 0 }, 1 / 60)
    }
    expect(state.xPercent).toBeLessThan(74)
    expect(state.xPercent).toBeGreaterThan(50)
  })

  it('中心から離れた状態で加速度が無い状態が長時間続くと、中心付近まで戻る', () => {
    let state = { xPercent: 80, yPercent: 50 }
    for (let i = 0; i < 1200; i += 1) {
      // 1200フレーム(1/60秒刻み) = 20秒間の放置を想定
      state = stepPoiMotion(state, { x: 0, y: 0 }, 1 / 60)
    }
    expect(state.xPercent).toBeLessThan(55)
    expect(state.xPercent).toBeGreaterThanOrEqual(50)
  })
})

describe('smoothAcceleration', () => {
  it('入力が一定値であり続けると、平滑化後の値も時間とともにその値へ収束していく', () => {
    let smoothed = { x: 0, y: 0 }
    const raw = { x: 2, y: -1 }
    for (let i = 0; i < 100; i += 1) {
      smoothed = smoothAcceleration(raw, smoothed)
    }
    expect(smoothed.x).toBeCloseTo(2, 1)
    expect(smoothed.y).toBeCloseTo(-1, 1)
  })

  it('1サンプルだけでは入力値全体には追従せず、直前の平滑値寄りの値になる（ノイズの平滑化）', () => {
    const previousSmoothed = { x: 0, y: 0 }
    const noisySpike = { x: 5, y: 0 }
    const next = smoothAcceleration(noisySpike, previousSmoothed)
    expect(next.x).toBeGreaterThan(0)
    expect(next.x).toBeLessThan(noisySpike.x)
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
