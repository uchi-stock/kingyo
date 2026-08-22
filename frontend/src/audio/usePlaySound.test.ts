import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePlaySound } from './usePlaySound'

describe('usePlaySound', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('呼び出すと、指定した音源で再生される', () => {
    const play = vi.fn().mockResolvedValue(undefined)
    // アロー関数はnewでインスタンス化できないため、コンストラクタとして使える通常の関数式でモックする
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(function AudioMock() {
        return { play, currentTime: 0 }
      }),
    )

    const { result } = renderHook(() => usePlaySound('/sounds/scoop.wav'))
    result.current()

    expect(play).toHaveBeenCalledTimes(1)
  })

  it('複数回呼び出しても、Audioインスタンスは使い回される（毎回生成しない）', () => {
    const play = vi.fn().mockResolvedValue(undefined)
    const AudioMock = vi.fn().mockImplementation(function AudioMock() {
      return { play, currentTime: 0 }
    })
    vi.stubGlobal('Audio', AudioMock)

    const { result } = renderHook(() => usePlaySound('/sounds/scoop.wav'))
    result.current()
    result.current()
    result.current()

    expect(AudioMock).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledTimes(3)
  })

  it('再生のたびにcurrentTimeを0へリセットする（短い間隔での連続再生に対応するため）', () => {
    const play = vi.fn().mockResolvedValue(undefined)
    const audioInstance = { play, currentTime: 5 }
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(function AudioMock() {
        return audioInstance
      }),
    )

    const { result } = renderHook(() => usePlaySound('/sounds/scoop.wav'))
    result.current()

    expect(audioInstance.currentTime).toBe(0)
  })

  it('play()が自動再生ポリシー等でreject（拒否）されても、例外を投げない', async () => {
    const play = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(function AudioMock() {
        return { play, currentTime: 0 }
      }),
    )

    const { result } = renderHook(() => usePlaySound('/sounds/scoop.wav'))
    expect(() => result.current()).not.toThrow()

    // rejectされたPromiseが未処理のまま残っていないことを確認する
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('play()がPromiseを返さない実装（jsdom等）でも、例外を投げない', () => {
    const play = vi.fn().mockReturnValue(undefined)
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(function AudioMock() {
        return { play, currentTime: 0 }
      }),
    )

    const { result } = renderHook(() => usePlaySound('/sounds/scoop.wav'))
    expect(() => result.current()).not.toThrow()
  })

  it('Audioが利用できない環境（テスト環境等）でも例外を投げない', () => {
    vi.stubGlobal('Audio', undefined)

    const { result } = renderHook(() => usePlaySound('/sounds/scoop.wav'))
    expect(() => result.current()).not.toThrow()
  })
})
