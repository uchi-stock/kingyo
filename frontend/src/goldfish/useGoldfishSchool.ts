import { useCallback, useEffect, useRef, useState } from 'react'
import { findCatchableGoldfish, type CatchResult, type ViewportPosition } from './catchGoldfish'
import { createInitialGoldfishState, stepGoldfish, type GoldfishState } from './goldfishSwim'

export interface GoldfishPose extends GoldfishState {
  id: number
}

interface GoldfishEntity {
  id: number
  seed: number
  state: GoldfishState
}

function createEntities(count: number): GoldfishEntity[] {
  return Array.from({ length: count }, (_, id) => {
    const seed = (id + 1) / (count + 1)
    return { id, seed, state: createInitialGoldfishState(seed) }
  })
}

function toPoses(entities: GoldfishEntity[]): GoldfishPose[] {
  return entities.map((entity) => ({ id: entity.id, ...entity.state }))
}

export interface UseGoldfishSchoolResult {
  goldfish: GoldfishPose[]
  catchNearestGoldfish: (poiPosition: ViewportPosition) => CatchResult | null
}

// requestAnimationFrameでstepGoldfish（純粋関数）を毎フレーム評価し、金魚の群れの位置を更新する。
// 位置・進行方向は前フレームの状態に依存するステートフルなシミュレーションのため、
// entitiesRefで現在の状態を保持し、フレームごとに直接更新する。
//
// 各金魚には安定したidを持たせ、捕獲による除去後もReactのkeyや画像割り当てが
// 配列内の位置（index）ではなくidに紐づくようにする（issue #44）。
export function useGoldfishSchool(count: number): UseGoldfishSchoolResult {
  const [initialEntities] = useState(() => createEntities(count))
  const entitiesRef = useRef<GoldfishEntity[]>(initialEntities)
  const [goldfish, setGoldfish] = useState<GoldfishPose[]>(() => toPoses(initialEntities))

  useEffect(() => {
    const startTime = performance.now()
    let lastTime = startTime
    let frameId: number

    const tick = () => {
      const now = performance.now()
      const dtSeconds = (now - lastTime) / 1000
      const elapsedMs = now - startTime
      lastTime = now

      const nextEntities = entitiesRef.current.map((entity) => ({
        ...entity,
        state: stepGoldfish(entity.state, dtSeconds, elapsedMs, entity.seed),
      }))
      entitiesRef.current = nextEntities
      setGoldfish(toPoses(nextEntities))
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [])

  // 捕獲判定・除去ロジックはこのフック内に閉じ、常に最新のentitiesRefを参照するため
  // 依存配列を空にできる。呼び出し側（Poiの掬うジェスチャーコールバック）に安定した
  // 関数参照を渡すことで、金魚の毎フレーム更新がPoiの不要な再描画を招かないようにする（issue #44）
  const catchNearestGoldfish = useCallback((poiPosition: ViewportPosition): CatchResult | null => {
    const result = findCatchableGoldfish(
      poiPosition,
      entitiesRef.current.map((entity) => ({ id: entity.id, ...entity.state })),
    )
    if (result === null) {
      return null
    }
    const nextEntities = entitiesRef.current.filter((entity) => entity.id !== result.id)
    entitiesRef.current = nextEntities
    setGoldfish(toPoses(nextEntities))
    return result
  }, [])

  return { goldfish, catchNearestGoldfish }
}
