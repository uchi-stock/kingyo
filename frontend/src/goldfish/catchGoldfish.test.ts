import { describe, expect, it } from 'vitest'
import { findCatchableGoldfish } from './catchGoldfish'

describe('findCatchableGoldfish', () => {
  it('捕獲半径内に金魚がいれば、そのidを返す', () => {
    const goldfish = [{ id: 1, xPercent: 50, yPercent: 50 }]
    const result = findCatchableGoldfish({ xVw: 52, yVh: 51 }, goldfish)
    expect(result?.id).toBe(1)
  })

  it('捕獲半径外の金魚は対象にならない', () => {
    const goldfish = [{ id: 1, xPercent: 50, yPercent: 50 }]
    const result = findCatchableGoldfish({ xVw: 90, yVh: 90 }, goldfish)
    expect(result).toBeNull()
  })

  it('金魚が1匹もいない場合はnullを返す', () => {
    const result = findCatchableGoldfish({ xVw: 50, yVh: 50 }, [])
    expect(result).toBeNull()
  })

  it('複数の金魚が半径内にいる場合、最も近い1匹のみを返す', () => {
    const goldfish = [
      { id: 1, xPercent: 55, yPercent: 50 }, // ポイから5離れている
      { id: 2, xPercent: 52, yPercent: 50 }, // ポイから2離れている（最も近い）
      { id: 3, xPercent: 58, yPercent: 50 }, // ポイから8離れている
    ]
    const result = findCatchableGoldfish({ xVw: 50, yVh: 50 }, goldfish)
    expect(result?.id).toBe(2)
  })

  it('捕獲半径ちょうどの距離の金魚も対象に含む', () => {
    const goldfish = [{ id: 1, xPercent: 60, yPercent: 50 }] // ポイから10離れている（半径と同じ）
    const result = findCatchableGoldfish({ xVw: 50, yVh: 50 }, goldfish)
    expect(result?.id).toBe(1)
  })

  it('ポイの中心（TEAR_RADIUS_VW=4以内）で捕獲すると、isCenterHitがtrueになる', () => {
    const goldfish = [{ id: 1, xPercent: 52, yPercent: 50 }] // ポイから2離れている
    const result = findCatchableGoldfish({ xVw: 50, yVh: 50 }, goldfish)
    expect(result?.isCenterHit).toBe(true)
  })

  it('ポイの中心から離れた（捕獲半径内だがTEAR_RADIUS_VWの外側）位置で捕獲すると、isCenterHitがfalseになる', () => {
    const goldfish = [{ id: 1, xPercent: 58, yPercent: 50 }] // ポイから8離れている
    const result = findCatchableGoldfish({ xVw: 50, yVh: 50 }, goldfish)
    expect(result?.id).toBe(1)
    expect(result?.isCenterHit).toBe(false)
  })
})
