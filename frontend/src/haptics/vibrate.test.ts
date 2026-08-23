import { afterEach, describe, expect, it, vi } from 'vitest'
import { vibrateCatchSuccess, vibrateGameOver } from './vibrate'

describe('vibrateGameOver / vibrateCatchSuccess', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    // @ts-expect-error テストで追加したvibrateプロパティを元に戻す
    delete navigator.vibrate
  })

  it('vibrateGameOverは、Vibration APIが利用できる環境ではnavigator.vibrateを呼び出す', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })

    vibrateGameOver()

    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledWith(200)
  })

  it('vibrateCatchSuccessは、Vibration APIが利用できる環境ではnavigator.vibrateを呼び出す', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })

    vibrateCatchSuccess()

    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledWith(50)
  })

  it('ゲームオーバー時と捕獲成功時とで、振動の長さが異なる', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })

    vibrateGameOver()
    vibrateCatchSuccess()

    const [gameOverDuration] = vibrate.mock.calls[0]
    const [catchSuccessDuration] = vibrate.mock.calls[1]
    expect(catchSuccessDuration).toBeLessThan(gameOverDuration)
  })

  it('Vibration APIが利用できない環境（iOS Safari等）でも、どちらも例外を投げない', () => {
    // @ts-expect-error テスト用にVibration API非対応環境を再現する
    delete navigator.vibrate

    expect(() => vibrateGameOver()).not.toThrow()
    expect(() => vibrateCatchSuccess()).not.toThrow()
  })
})
