import { describe, expect, it } from 'vitest'
import { health } from './health.js'

describe('health', () => {
  it('status: okを返す', () => {
    expect(health()).toEqual({ status: 'ok' })
  })
})
