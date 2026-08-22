import type { CatchableGoldfish, ViewportPosition } from './catchGoldfish'

const FLEE_TRIGGER_RADIUS_VW = 20 // この範囲内に金魚がいれば、掬い損ねた際に驚いて逃げる対象とする

// ポイの位置（ビューポート相対のvw/vh）と金魚の一覧から、掬い損ねた際に驚いて逃げる対象と
// なる最も近い金魚のidを返す。捕獲半径（catchGoldfish.ts）より広い範囲で判定する。
// 半径内に金魚が複数いる場合は最も近い1匹のみを対象とする。該当が無ければnullを返す（issue #53）
export function findNearestGoldfishToFlee(
  poiPosition: ViewportPosition,
  goldfish: readonly CatchableGoldfish[],
): number | null {
  let nearestId: number | null = null
  let nearestDistance = Infinity

  for (const fish of goldfish) {
    const dx = fish.xPercent - poiPosition.xVw
    const dy = fish.yPercent - poiPosition.yVh
    const distance = Math.hypot(dx, dy)
    if (distance <= FLEE_TRIGGER_RADIUS_VW && distance < nearestDistance) {
      nearestDistance = distance
      nearestId = fish.id
    }
  }

  return nearestId
}
