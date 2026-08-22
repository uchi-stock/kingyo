import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useElapsedTimer } from './useElapsedTimer'

describe('useElapsedTimer', () => {
  let now = 0

  beforeEach(() => {
    now = 1000
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function advance(ms: number) {
    now += ms
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('start()を呼ぶまではelapsedMsが0のまま', () => {
    const { result } = renderHook(() => useElapsedTimer())
    expect(result.current.elapsedMs).toBe(0)
    expect(result.current.isRunning).toBe(false)
  })

  it('start()を呼ぶと計測が始まり、時間経過とともにelapsedMsが増える', () => {
    const { result } = renderHook(() => useElapsedTimer())

    act(() => {
      result.current.start()
    })
    expect(result.current.isRunning).toBe(true)

    advance(300)
    expect(result.current.elapsedMs).toBeCloseTo(300, 0)
  })

  it('start()を複数回呼んでも、最初の開始時刻がリセットされない', () => {
    const { result } = renderHook(() => useElapsedTimer())

    act(() => {
      result.current.start()
    })
    advance(200)
    act(() => {
      result.current.start()
    })
    advance(100)

    expect(result.current.elapsedMs).toBeCloseTo(300, 0)
  })

  it('stop()は停止時点の経過時間を返し、以降elapsedMsが増えなくなる', () => {
    const { result } = renderHook(() => useElapsedTimer())

    act(() => {
      result.current.start()
    })
    advance(500)

    let stoppedAt = 0
    act(() => {
      stoppedAt = result.current.stop()
    })
    expect(stoppedAt).toBeCloseTo(500, 0)
    expect(result.current.isRunning).toBe(false)

    advance(1000)
    expect(result.current.elapsedMs).toBeCloseTo(500, 0)
  })

  it('start()を一度も呼ばずにstop()を呼んでも、例外を投げず0を返す', () => {
    const { result } = renderHook(() => useElapsedTimer())

    let stoppedAt = -1
    act(() => {
      stoppedAt = result.current.stop()
    })
    expect(stoppedAt).toBe(0)
  })
})
