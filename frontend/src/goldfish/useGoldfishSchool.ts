import { useCallback, useEffect, useRef, useState } from 'react'
import { findCatchableGoldfish, type CatchResult, type ViewportPosition } from './catchGoldfish'
import { findNearestGoldfishToFlee } from './fleeGoldfish'
import {
  computeSpeedMultiplier,
  createInitialGoldfishState,
  startFleeing,
  stepGoldfish,
  type GoldfishState,
} from './goldfishSwim'

const CATCH_ANIMATION_DURATION_MS = 450 // 捕獲後、拡大しながらフェードアウトする演出の表示時間

export interface GoldfishPose extends GoldfishState {
  id: number
  // 捕獲されアニメーション中かどうか。GoldfishSchool側でこれを見て
  // 拡大・フェードアウトのスタイルを適用する（issue #52）
  isCaught: boolean
}

interface GoldfishEntity {
  id: number
  seed: number
  state: GoldfishState
  // 捕獲された時刻（performance.now()基準）。捕獲されていなければnull
  caughtAt: number | null
}

function createEntities(count: number): GoldfishEntity[] {
  return Array.from({ length: count }, (_, id) => {
    const seed = (id + 1) / (count + 1)
    return { id, seed, state: createInitialGoldfishState(seed), caughtAt: null }
  })
}

function toPoses(entities: GoldfishEntity[]): GoldfishPose[] {
  return entities.map((entity) => ({ id: entity.id, isCaught: entity.caughtAt !== null, ...entity.state }))
}

export interface UseGoldfishSchoolResult {
  goldfish: GoldfishPose[]
  catchNearestGoldfish: (poiPosition: ViewportPosition) => CatchResult | null
  startFleeingNearestGoldfish: (poiPosition: ViewportPosition) => void
  // 金魚の状態を初期配置へ戻す。リトライ時に呼ぶ想定（issue #93）
  resetGoldfish: () => void
}

// requestAnimationFrameでstepGoldfish（純粋関数）を毎フレーム評価し、金魚の群れの位置を更新する。
// 位置・進行方向は前フレームの状態に依存するステートフルなシミュレーションのため、
// entitiesRefで現在の状態を保持し、フレームごとに直接更新する。
//
// 各金魚には安定したidを持たせ、捕獲による除去後もReactのkeyや画像割り当てが
// 配列内の位置（index）ではなくidに紐づくようにする（issue #44）。
//
// 捕獲した金魚は即座に配列から除去せず、拡大・フェードアウトの演出時間（CATCH_ANIMATION_DURATION_MS）
// が経過するまで配列に残す（遊泳は停止する）。演出時間が経過したフレームで実際に除去する（issue #52）。
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

      // 衝突回避（issue #122）の判定には、更新前（このフレーム開始時点）の全個体の位置を
      // 使う。更新後の位置を使うと、配列内の並び順によって「先に更新された金魚」の新しい
      // 位置と「まだ更新されていない金魚」の古い位置が混在し、判定が個体の並び順に依存して
      // しまうため
      const previousEntities = entitiesRef.current
      // 残り匹数（捕獲アニメーション中も含め、まだ捕獲されていない匹数）が減るほど、
      // 残っている金魚の遊泳速度を上げる（issue #146）。捕獲直後（アニメーション完了を
      // 待たず）から速くなるよう、caughtAtの有無だけで数える
      const remainingCount = previousEntities.filter((entity) => entity.caughtAt === null).length
      const speedMultiplier = computeSpeedMultiplier(remainingCount, count)
      const nextEntities = previousEntities
        .filter((entity) => entity.caughtAt === null || now - entity.caughtAt < CATCH_ANIMATION_DURATION_MS)
        .map((entity) =>
          entity.caughtAt === null
            ? {
                ...entity,
                state: stepGoldfish(
                  entity.state,
                  dtSeconds,
                  elapsedMs,
                  entity.seed,
                  undefined,
                  previousEntities
                    .filter((other) => other.id !== entity.id && other.caughtAt === null)
                    .map((other) => ({ xPercent: other.state.xPercent, yPercent: other.state.yPercent })),
                  speedMultiplier,
                ),
              }
            : entity,
        )
      entitiesRef.current = nextEntities
      setGoldfish(toPoses(nextEntities))
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [count])

  // 捕獲判定・状態更新ロジックはこのフック内に閉じ、常に最新のentitiesRefを参照するため
  // 依存配列を空にできる。呼び出し側（Poiの掬うジェスチャーコールバック）に安定した
  // 関数参照を渡すことで、金魚の毎フレーム更新がPoiの不要な再描画を招かないようにする（issue #44）
  const catchNearestGoldfish = useCallback((poiPosition: ViewportPosition): CatchResult | null => {
    const result = findCatchableGoldfish(
      poiPosition,
      // 捕獲アニメーション中の金魚は、既に捕まっているため再捕獲の対象にしない
      entitiesRef.current
        .filter((entity) => entity.caughtAt === null)
        .map((entity) => ({ id: entity.id, ...entity.state })),
    )
    if (result === null) {
      return null
    }
    const caughtAt = performance.now()
    const nextEntities = entitiesRef.current.map((entity) =>
      entity.id === result.id ? { ...entity, caughtAt } : entity,
    )
    entitiesRef.current = nextEntities
    setGoldfish(toPoses(nextEntities))
    return result
  }, [])

  // 掬い損ねた際、ポイの位置から一定範囲内にいる最も近い金魚を、ポイから遠ざかる方向へ
  // 高速で逃走させる（issue #53）。catchNearestGoldfishと同様、常に最新のentitiesRefを
  // 参照する安定した関数参照として公開する
  const startFleeingNearestGoldfish = useCallback((poiPosition: ViewportPosition) => {
    const targetId = findNearestGoldfishToFlee(
      poiPosition,
      // 捕獲アニメーション中の金魚は既にいなくなっているため対象にしない
      entitiesRef.current
        .filter((entity) => entity.caughtAt === null)
        .map((entity) => ({ id: entity.id, ...entity.state })),
    )
    if (targetId === null) {
      return
    }
    const nextEntities = entitiesRef.current.map((entity) =>
      entity.id === targetId
        ? { ...entity, state: startFleeing(entity.state, { xPercent: poiPosition.xVw, yPercent: poiPosition.yVh }) }
        : entity,
    )
    entitiesRef.current = nextEntities
    setGoldfish(toPoses(nextEntities))
  }, [])

  // リトライ時に金魚を初期配置へ戻す（issue #93）。catchNearestGoldfish等と同様、
  // 常に最新のentitiesRefを参照する安定した関数参照として公開する
  const resetGoldfish = useCallback(() => {
    const nextEntities = createEntities(count)
    entitiesRef.current = nextEntities
    setGoldfish(toPoses(nextEntities))
  }, [count])

  return { goldfish, catchNearestGoldfish, startFleeingNearestGoldfish, resetGoldfish }
}
