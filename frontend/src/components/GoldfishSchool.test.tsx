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
})
