import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BuildInfo } from './BuildInfo'

describe('BuildInfo', () => {
  it('バージョンと更新日時を表示する', () => {
    render(<BuildInfo />)
    const text = screen.getByTestId('build-info').textContent ?? ''
    expect(text).toMatch(/^v\d+\.\d+\.\d+ \/ 更新日時: /)
  })
})
