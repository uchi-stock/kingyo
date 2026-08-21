import { describe, expect, it } from 'vitest'
import { goldfishPoseAt } from './goldfishSwim'

describe('goldfishPoseAt', () => {
  it('t=0では中央かつ右向きになる', () => {
    expect(goldfishPoseAt(0, { seed: 0 })).toEqual({ xPercent: 50, yPercent: 50, facingLeft: false })
  })

  it('半周期後は左向きに切り替わる', () => {
    const speedX = 0.7 // seed=0のときのspeedX
    const elapsedMs = (Math.PI / speedX) * 1000
    const pose = goldfishPoseAt(elapsedMs, { seed: 0 })
    expect(pose.facingLeft).toBe(true)
  })

  it('位置が可動域（マージンを除いた中央±35%）を超えない', () => {
    for (let seed = 0; seed <= 1; seed += 0.2) {
      for (let elapsedMs = 0; elapsedMs <= 20000; elapsedMs += 1000) {
        const pose = goldfishPoseAt(elapsedMs, { seed })
        expect(pose.xPercent).toBeGreaterThanOrEqual(15)
        expect(pose.xPercent).toBeLessThanOrEqual(85)
        expect(pose.yPercent).toBeGreaterThanOrEqual(15)
        expect(pose.yPercent).toBeLessThanOrEqual(85)
      }
    }
  })

  it('seedが異なる個体は同じ時刻でも異なる軌道になる', () => {
    const poseA = goldfishPoseAt(3000, { seed: 0.2 })
    const poseB = goldfishPoseAt(3000, { seed: 0.8 })
    expect(poseA).not.toEqual(poseB)
  })
})
