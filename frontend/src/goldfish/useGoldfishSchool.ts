import { useEffect, useRef, useState } from 'react'
import { createInitialGoldfishState, stepGoldfish, type GoldfishPose, type GoldfishState } from './goldfishSwim'

function createSeeds(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) / (count + 1))
}

// requestAnimationFrameでstepGoldfish（純粋関数）を毎フレーム評価し、金魚の群れの位置を更新する。
// 位置・進行方向は前フレームの状態に依存するステートフルなシミュレーションのため、
// statesRefで現在の状態を保持し、フレームごとに直接更新する。
export function useGoldfishSchool(count: number): GoldfishPose[] {
  const [seeds] = useState(() => createSeeds(count))
  const [initialStates] = useState(() => seeds.map(createInitialGoldfishState))
  const statesRef = useRef<GoldfishState[]>(initialStates)
  const [poses, setPoses] = useState<GoldfishPose[]>(() =>
    initialStates.map((state, index) => stepGoldfish(state, 0, 0, seeds[index])),
  )

  useEffect(() => {
    const startTime = performance.now()
    let lastTime = startTime
    let frameId: number

    const tick = () => {
      const now = performance.now()
      const dtSeconds = (now - lastTime) / 1000
      const elapsedMs = now - startTime
      lastTime = now

      const nextPoses = statesRef.current.map((state, index) => {
        const pose = stepGoldfish(state, dtSeconds, elapsedMs, seeds[index])
        statesRef.current[index] = { xPercent: pose.xPercent, yPercent: pose.yPercent, headingDeg: pose.headingDeg }
        return pose
      })
      setPoses(nextPoses)
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [seeds])

  return poses
}
