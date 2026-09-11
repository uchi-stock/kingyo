import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGoldfishSchool } from './useGoldfishSchool'

describe('useGoldfishSchool', () => {
  describe('ベストタイミングボーナス（issue #153）', () => {
    it('中心（金魚の位置ちょうど）で捕獲すると、金魚が1匹追加される', () => {
      const { result } = renderHook(() => useGoldfishSchool(4))
      const targetX = result.current.goldfish[0].xPercent
      const targetY = result.current.goldfish[0].yPercent
      const beforeCount = result.current.goldfish.length

      act(() => {
        result.current.catchNearestGoldfish({ xVw: targetX, yVh: targetY })
      })

      // 捕獲された金魚はアニメーション中のためまだ配列に残り、そこへ1匹追加されるので+1
      expect(result.current.goldfish.length).toBe(beforeCount + 1)
    })

    it('ベストタイミング範囲外（中心から5離れた位置）で捕獲しても、金魚は追加されない', () => {
      const { result } = renderHook(() => useGoldfishSchool(4))
      const targetX = result.current.goldfish[0].xPercent + 5
      const targetY = result.current.goldfish[0].yPercent
      const beforeCount = result.current.goldfish.length

      act(() => {
        result.current.catchNearestGoldfish({ xVw: targetX, yVh: targetY })
      })

      expect(result.current.goldfish.length).toBe(beforeCount)
    })
  })
})
