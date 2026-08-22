import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GoldfishPose } from '../goldfish/useGoldfishSchool'
import { GoldfishSchool } from './GoldfishSchool'

function createPoses(count: number): GoldfishPose[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    xPercent: 10 * (id + 1),
    yPercent: 20 * (id + 1),
    headingDeg: 0,
    displayHeadingDeg: 0,
    turnCountdownMs: 5000,
  }))
}

describe('GoldfishSchool', () => {
  it('渡された金魚の数だけ描画する', () => {
    render(<GoldfishSchool goldfish={createPoses(4)} />)
    expect(screen.getAllByTestId('goldfish')).toHaveLength(4)
  })

  it('金魚が捕獲等で減った場合、その数だけ描画する', () => {
    render(<GoldfishSchool goldfish={createPoses(2)} />)
    expect(screen.getAllByTestId('goldfish')).toHaveLength(2)
  })

  it('ポイ操作等の他要素を邪魔しないようpointerEventsを無効化している', () => {
    render(<GoldfishSchool goldfish={createPoses(4)} />)
    expect(screen.getByTestId('goldfish-school')).toHaveStyle({ pointerEvents: 'none' })
  })

  it('位置はleft/topではなくtransform（vw/vh）で表現される（レイアウト再計算を避けるため）', () => {
    render(<GoldfishSchool goldfish={createPoses(4)} />)
    const fish = screen.getAllByTestId('goldfish')
    for (const el of fish) {
      expect(el.style.left).toBe('')
      expect(el.style.top).toBe('')
      expect(el.style.transform).toMatch(/translate\(-?\d+(\.\d+)?vw, -?\d+(\.\d+)?vh\)/)
    }
  })

  it('画像は頭上向き基準のため、進行方向（headingDeg）に合わせてrotateで回転させる（scaleXでの反転はしない）', () => {
    render(<GoldfishSchool goldfish={createPoses(4)} />)
    const fish = screen.getAllByTestId('goldfish')
    for (const el of fish) {
      expect(el.style.transform).toMatch(/rotate\(-?\d+(\.\d+)?deg\)/)
      expect(el.style.transform).not.toContain('scaleX')
    }
  })
})
