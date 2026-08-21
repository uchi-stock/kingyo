import { useEffect, useState } from 'react'
import { goldfishPoseAt, type GoldfishPose } from './goldfishSwim'

function createSeeds(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) / (count + 1))
}

// requestAnimationFrameでgoldfishPoseAt（純粋関数）を毎フレーム評価し、金魚の群れの位置を更新する。
export function useGoldfishSchool(count: number): GoldfishPose[] {
  const [seeds] = useState(() => createSeeds(count))
  const [poses, setPoses] = useState<GoldfishPose[]>(() => seeds.map((seed) => goldfishPoseAt(0, { seed })))

  useEffect(() => {
    const startTime = performance.now()
    let frameId: number

    const tick = () => {
      const elapsedMs = performance.now() - startTime
      setPoses(seeds.map((seed) => goldfishPoseAt(elapsedMs, { seed })))
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [seeds])

  return poses
}
