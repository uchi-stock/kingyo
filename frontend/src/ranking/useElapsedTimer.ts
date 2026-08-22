import { useCallback, useEffect, useRef, useState } from 'react'

const TICK_INTERVAL_MS = 100 // 表示更新の間隔。formatElapsedTimeの表示精度（0.1秒）に合わせる

export interface UseElapsedTimerResult {
  elapsedMs: number
  isRunning: boolean
  // 最初の掬うジェスチャーで呼ぶ想定（issue #89）。既に計測中の場合は何もしない
  start: () => void
  // ポイが破れた瞬間に呼ぶ想定。停止時点の経過時間（ミリ秒）を返す
  stop: () => number
}

// 最初の掬うジェスチャーからポイが破れるまでの経過時間を計測するタイマー。
// 開始時刻はrefで保持し、stop()呼び出し時にperformance.now()との差分から
// 直接算出することで、setIntervalの更新間隔（TICK_INTERVAL_MS）に依存しない
// 正確な最終値を返す
export function useElapsedTimer(): UseElapsedTimerResult {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // stop()の参照を安定させる（useCallbackの依存にelapsedMs stateを含めない）ため、
  // 直近の経過時間をrefでも並行して保持する。onScoop経由でstart/stopがPoiまで渡る
  // 構成上、これらの参照が毎tick変わるとPoiのmemo化（issue #44）が無効になってしまう
  const elapsedMsRef = useRef(0)

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const start = useCallback(() => {
    if (startTimeRef.current !== null) {
      return
    }
    startTimeRef.current = performance.now()
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        const next = performance.now() - startTimeRef.current
        elapsedMsRef.current = next
        setElapsedMs(next)
      }
    }, TICK_INTERVAL_MS)
  }, [])

  const stop = useCallback((): number => {
    if (startTimeRef.current === null) {
      return elapsedMsRef.current
    }
    const finalElapsedMs = performance.now() - startTimeRef.current
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    startTimeRef.current = null
    elapsedMsRef.current = finalElapsedMs
    setIsRunning(false)
    setElapsedMs(finalElapsedMs)
    return finalElapsedMs
  }, [])

  return { elapsedMs, isRunning, start, stop }
}
