import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GoldfishSchool } from './GoldfishSchool'

describe('GoldfishSchool', () => {
  it('4匹の金魚を描画する', () => {
    render(<GoldfishSchool />)
    expect(screen.getAllByTestId('goldfish')).toHaveLength(4)
  })

  it('ポイ操作等の他要素を邪魔しないようpointerEventsを無効化している', () => {
    render(<GoldfishSchool />)
    expect(screen.getByTestId('goldfish-school')).toHaveStyle({ pointerEvents: 'none' })
  })

  it('位置はleft/topではなくtransform（vw/vh）で表現される（レイアウト再計算を避けるため）', () => {
    render(<GoldfishSchool />)
    const fish = screen.getAllByTestId('goldfish')
    for (const el of fish) {
      expect(el.style.left).toBe('')
      expect(el.style.top).toBe('')
      expect(el.style.transform).toMatch(/translate\(-?\d+(\.\d+)?vw, -?\d+(\.\d+)?vh\)/)
    }
  })
})
