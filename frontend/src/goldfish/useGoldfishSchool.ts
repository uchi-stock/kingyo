import { useEffect, useRef, useState } from 'react'
import { createInitialGoldfishState, stepGoldfish, type GoldfishState } from './goldfishSwim'

function createSeeds(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) / (count + 1))
}

// requestAnimationFrameでstepGoldfish（純粋関数）を毎フレーム評価し、金魚の群れの位置を更新する。
// 位置・進行方向は前フレームの状態に依存するステートフルなシミュレーションのため、
// statesRefで現在の状態を保持し、フレームごとに直接更新する。
export function useGoldfishSchool(count: number): GoldfishState[] {
  const [seeds] = useState(() => createSeeds(count))
  const [initialStates] = useState(() => seeds.map((seed) => createInitialGoldfishState(seed)))
  const statesRef = useRef<GoldfishState[]>(initialStates)
  const [states, setStates] = useState<GoldfishState[]>(initialStates)

  useEffect(() => {
    const startTime = performance.now()
    let lastTime = startTime
    let frameId: number

    const tick = () => {
      const now = performance.now()
      const dtSeconds = (now - lastTime) / 1000
      const elapsedMs = now - startTime
      lastTime = now

      const nextStates = statesRef.current.map((state, index) => stepGoldfish(state, dtSeconds, elapsedMs, seeds[index]))
      statesRef.current = nextStates
      setStates(nextStates)
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [seeds])

  return states
}
