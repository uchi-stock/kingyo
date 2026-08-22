import { describe, expect, it } from 'vitest'
import { computeAngularVelocityDegPerSec, detectScoopGesture, updateRotationSuppression } from './scoopGesture'

describe('computeAngularVelocityDegPerSec', () => {
  it('角度の変化量と経過時間から角速度を計算する', () => {
    // 40度の変化が0.05秒で起きた場合、800度/秒
    expect(computeAngularVelocityDegPerSec(40, 0, 0.05)).toBeCloseTo(800, 5)
  })

  it('イベント間隔が大きく空いた場合、角度の変化が大きくても角速度としては小さく評価される', () => {
    // タブのバックグラウンド復帰等で5秒以上イベントが届かなかった場合を想定。
    // 角度が10度変化していても、5秒かけての変化であれば角速度は2度/秒に過ぎない
    expect(computeAngularVelocityDegPerSec(10, 0, 5)).toBeCloseTo(2, 5)
  })

  it('極端に短いdt（0除算に近い状況）でも、下限でクランプされ角速度がInfinityやNaNにならない', () => {
    const result = computeAngularVelocityDegPerSec(1, 0, 0.0000001)
    expect(Number.isFinite(result)).toBe(true)
  })
})

describe('detectScoopGesture', () => {
  it('角速度が閾値を超えると、掬うジェスチャーとして検出される', () => {
    const result = detectScoopGesture(800, 0.05, 0)
    expect(result.triggered).toBe(true)
    expect(result.cooldownMs).toBeGreaterThan(0)
  })

  it('角速度が閾値未満のゆっくりとした傾きの変化では検出されない', () => {
    const result = detectScoopGesture(10, 0.5, 0)
    expect(result.triggered).toBe(false)
  })

  it('逆方向（角速度が負の急激な変化）では検出されない', () => {
    const result = detectScoopGesture(-800, 0.05, 0)
    expect(result.triggered).toBe(false)
  })

  it('クールダウン中は、角速度が閾値を超えていても検出されない（連続検出の防止）', () => {
    const result = detectScoopGesture(800, 0.05, 300)
    expect(result.triggered).toBe(false)
    expect(result.cooldownMs).toBeCloseTo(250, 5)
  })

  it('クールダウンが経過した後は、再び検出できるようになる', () => {
    const first = detectScoopGesture(800, 0.05, 0)
    expect(first.triggered).toBe(true)
    expect(first.cooldownMs).toBe(500)

    // クールダウン中は検出されない
    const duringCooldown = detectScoopGesture(800, 0.05, first.cooldownMs)
    expect(duringCooldown.triggered).toBe(false)

    // クールダウンが十分に経過した後は、再度検出される
    const afterCooldown = detectScoopGesture(800, 0.05, 0)
    expect(afterCooldown.triggered).toBe(true)
  })

  it('dtが0の場合は検出されず、0除算も起きない', () => {
    const result = detectScoopGesture(800, 0, 0)
    expect(result.triggered).toBe(false)
    expect(Number.isFinite(result.cooldownMs)).toBe(true)
  })
})

describe('updateRotationSuppression', () => {
  it('角速度が閾値を超えると、抑制状態になり保持時間がセットされる', () => {
    const result = updateRotationSuppression(200, 0.05, 0)
    expect(result.suppressed).toBe(true)
    expect(result.holdMs).toBeGreaterThan(0)
  })

  it('負の方向の急激な回転（傾きを戻す動き等）でも、絶対値で判定され抑制される', () => {
    const result = updateRotationSuppression(-200, 0.05, 0)
    expect(result.suppressed).toBe(true)
  })

  it('角速度が閾値未満で保持時間も残っていない場合は、抑制されない', () => {
    const result = updateRotationSuppression(10, 0.05, 0)
    expect(result.suppressed).toBe(false)
    expect(result.holdMs).toBe(0)
  })

  it('回転が収まった直後は、保持時間が残っている間は抑制状態が継続する', () => {
    const rotating = updateRotationSuppression(200, 0.05, 0)
    expect(rotating.suppressed).toBe(true)

    // 回転が収まった（角速度が閾値未満になった）直後
    const justStopped = updateRotationSuppression(0, 0.05, rotating.holdMs)
    expect(justStopped.suppressed).toBe(true)
    expect(justStopped.holdMs).toBeLessThan(rotating.holdMs)
  })

  it('保持時間が経過すると、抑制が解除される', () => {
    let state = updateRotationSuppression(200, 0.05, 0)
    // 保持時間（300ms）が経過するまで、回転の無い状態を繰り返す
    for (let i = 0; i < 100; i += 1) {
      state = updateRotationSuppression(0, 0.05, state.holdMs)
    }
    expect(state.suppressed).toBe(false)
  })
})
