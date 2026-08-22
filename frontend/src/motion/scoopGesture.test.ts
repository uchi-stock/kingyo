import { describe, expect, it } from 'vitest'
import { detectScoopGesture } from './scoopGesture'

describe('detectScoopGesture', () => {
  it('betaが急激に増加する（角速度が閾値を超える）と、掬うジェスチャーとして検出される', () => {
    // betaが0.05秒で40度増加 = 800度/秒の角速度（閾値180度/秒を超える）
    const result = detectScoopGesture(40, 0, 0.05, 0)
    expect(result.triggered).toBe(true)
    expect(result.cooldownMs).toBeGreaterThan(0)
  })

  it('角速度が閾値未満のゆっくりとした傾きの変化では検出されない', () => {
    // betaが0.5秒で5度増加 = 10度/秒の角速度（通常の傾き操作相当）
    const result = detectScoopGesture(5, 0, 0.5, 0)
    expect(result.triggered).toBe(false)
  })

  it('逆方向（betaが急激に減少する）の変化では検出されない', () => {
    const result = detectScoopGesture(-40, 0, 0.05, 0)
    expect(result.triggered).toBe(false)
  })

  it('クールダウン中は、角速度が閾値を超えていても検出されない（連続検出の防止）', () => {
    const result = detectScoopGesture(40, 0, 0.05, 300)
    expect(result.triggered).toBe(false)
    expect(result.cooldownMs).toBeCloseTo(250, 5)
  })

  it('クールダウンが経過した後は、再び検出できるようになる', () => {
    const first = detectScoopGesture(40, 0, 0.05, 0)
    expect(first.triggered).toBe(true)
    expect(first.cooldownMs).toBe(500)

    // クールダウン中は検出されない
    const duringCooldown = detectScoopGesture(80, 40, 0.05, first.cooldownMs)
    expect(duringCooldown.triggered).toBe(false)

    // クールダウンが十分に経過した後は、再度検出される
    const afterCooldown = detectScoopGesture(160, 120, 0.05, 0)
    expect(afterCooldown.triggered).toBe(true)
  })

  it('dtが0の場合は検出されず、0除算も起きない', () => {
    const result = detectScoopGesture(40, 0, 0, 0)
    expect(result.triggered).toBe(false)
    expect(Number.isFinite(result.cooldownMs)).toBe(true)
  })

  it('イベント間隔が大きく空いた場合、その間のbetaの変化が大きくても角速度としては小さく評価され誤検出しない', () => {
    // タブのバックグラウンド復帰等で5秒以上イベントが届かなかった場合を想定。
    // betaが10度変化していても、5秒かけての変化であれば角速度は2度/秒に過ぎない
    const result = detectScoopGesture(10, 0, 5, 0)
    expect(result.triggered).toBe(false)
  })

  it('極端に短いdt（0除算に近い状況）でも角速度がInfinityやNaNにならず、安全な結果を返す', () => {
    const result = detectScoopGesture(1, 0, 0.0000001, 0)
    expect(Number.isFinite(result.cooldownMs)).toBe(true)
    expect(typeof result.triggered).toBe('boolean')
  })
})
