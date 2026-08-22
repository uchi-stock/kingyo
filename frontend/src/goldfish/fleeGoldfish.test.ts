import { describe, expect, it } from 'vitest'
import { findNearestGoldfishToFlee } from './fleeGoldfish'

describe('findNearestGoldfishToFlee', () => {
  it('逃走対象半径内に金魚がいれば、そのidを返す', () => {
    const goldfish = [{ id: 1, xPercent: 55, yPercent: 50 }]
    const result = findNearestGoldfishToFlee({ xVw: 50, yVh: 50 }, goldfish)
    expect(result).toBe(1)
  })

  it('逃走対象半径外の金魚は対象にならない', () => {
    const goldfish = [{ id: 1, xPercent: 90, yPercent: 90 }]
    const result = findNearestGoldfishToFlee({ xVw: 50, yVh: 50 }, goldfish)
    expect(result).toBeNull()
  })

  it('金魚が1匹もいない場合はnullを返す', () => {
    const result = findNearestGoldfishToFlee({ xVw: 50, yVh: 50 }, [])
    expect(result).toBeNull()
  })

  it('複数の金魚が半径内にいる場合、最も近い1匹のみを返す', () => {
    const goldfish = [
      { id: 1, xPercent: 65, yPercent: 50 }, // ポイから15離れている
      { id: 2, xPercent: 55, yPercent: 50 }, // ポイから5離れている（最も近い）
      { id: 3, xPercent: 60, yPercent: 50 }, // ポイから10離れている
    ]
    const result = findNearestGoldfishToFlee({ xVw: 50, yVh: 50 }, goldfish)
    expect(result).toBe(2)
  })

  it('捕獲半径（10vw）より広い範囲の金魚も対象になる', () => {
    const goldfish = [{ id: 1, xPercent: 68, yPercent: 50 }] // ポイから18離れている（捕獲半径10より外側）
    const result = findNearestGoldfishToFlee({ xVw: 50, yVh: 50 }, goldfish)
    expect(result).toBe(1)
  })
})
