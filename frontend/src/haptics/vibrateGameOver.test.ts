import { afterEach, describe, expect, it, vi } from 'vitest'
import { vibrateGameOver } from './vibrateGameOver'

describe('vibrateGameOver', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    // @ts-expect-error テストで追加したvibrateプロパティを元に戻す
    delete navigator.vibrate
  })

  it('Vibration APIが利用できる環境では、navigator.vibrateを呼び出す', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })

    vibrateGameOver()

    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledWith(200)
  })

  it('Vibration APIが利用できない環境（iOS Safari等）でも例外を投げない', () => {
    // @ts-expect-error テスト用にVibration API非対応環境を再現する
    delete navigator.vibrate

    expect(() => vibrateGameOver()).not.toThrow()
  })
})
