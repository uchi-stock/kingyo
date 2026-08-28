import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PoiMotionState } from '../motion/poiMotion'
import { useGoldfishSchool } from './useGoldfishSchool'

describe('useGoldfishSchool', () => {
  describe('worldOffsetRef（issue #72）', () => {
    it('worldOffsetRefを渡さない場合、既存と同じ位置で公開される', () => {
      const withoutRef = renderHook(() => useGoldfishSchool(4))
      const withNeutralRef = renderHook(() =>
        useGoldfishSchool(4, { current: { xPercent: 50, yPercent: 50 } as PoiMotionState }),
      )
      expect(withoutRef.result.current.goldfish[0].xPercent).toBeCloseTo(
        withNeutralRef.result.current.goldfish[0].xPercent,
        5,
      )
      expect(withoutRef.result.current.goldfish[0].yPercent).toBeCloseTo(
        withNeutralRef.result.current.goldfish[0].yPercent,
        5,
      )
    })

    it('resetGoldfish呼び出し時、非中立なオフセットが公開されるposeへ反映される', () => {
      const worldOffsetRef = { current: { xPercent: 50, yPercent: 50 } as PoiMotionState }
      const { result } = renderHook(() => useGoldfishSchool(4, worldOffsetRef))
      const rawXPercent = result.current.goldfish[0].xPercent
      const rawYPercent = result.current.goldfish[0].yPercent

      // スマホを右・下へ動かした（xPercent/yPercentが50より大きい）状況を模す
      worldOffsetRef.current = { xPercent: 70, yPercent: 60 }
      act(() => {
        result.current.resetGoldfish()
      })

      // スマホを動かした方向に近づいた金魚が中央（ポイ）へ寄ってくる体感にするため、
      // 公開される位置はポイモーション出力の符号を反転して適用される（issue #72本文の合意事項）
      expect(result.current.goldfish[0].xPercent).toBeCloseTo(rawXPercent - 20, 5)
      expect(result.current.goldfish[0].yPercent).toBeCloseTo(rawYPercent - 10, 5)
    })

    it('捕獲・逃走判定（catchNearestGoldfish等）には、公開用の織り込みではなく内部の生座標が使われる', () => {
      const worldOffsetRef = { current: { xPercent: 50, yPercent: 50 } as PoiMotionState }
      const { result } = renderHook(() => useGoldfishSchool(4, worldOffsetRef))
      const rawXPercent = result.current.goldfish[0].xPercent
      const rawYPercent = result.current.goldfish[0].yPercent

      worldOffsetRef.current = { xPercent: 80, yPercent: 50 }
      let caughtId: number | null = null
      act(() => {
        // 生座標（オフセット非適用）ちょうどの位置を狙えば捕獲できるはず。表示座標
        // （オフセット適用後）を使ってしまっていた場合はズレて捕獲できなくなる
        caughtId = result.current.catchNearestGoldfish({ xVw: rawXPercent, yVh: rawYPercent })?.id ?? null
      })
      expect(caughtId).toBe(0)
    })
  })
})
