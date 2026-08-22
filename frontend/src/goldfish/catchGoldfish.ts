const CATCH_RADIUS_VW = 10 // ポイと金魚の中心間距離がこれ以内なら捕獲判定とする
const TEAR_RADIUS_VW = 4 // ポイと金魚の中心間距離がこれ以内なら「中心で捉えた」＝ポイが破れる判定とする

export interface ViewportPosition {
  xVw: number
  yVh: number
}

export interface CatchableGoldfish {
  id: number
  xPercent: number
  yPercent: number
}

export interface CatchResult {
  id: number
  // ポイの中心に十分近い位置で捕獲したかどうか。実際の金魚すくいでポイ紙の中心で
  // 金魚を強くとらえると紙が破れる挙動を表現するために使う（issue #45）
  isCenterHit: boolean
}

// ポイの位置（ビューポート相対のvw/vh）と金魚の一覧（xPercent/yPercentはvw/vh基準。
// GoldfishSchoolの表示座標系と揃える）から、捕獲対象となる最も近い金魚を返す。
// 半径内に金魚が複数いる場合は最も近い1匹のみを捕獲する。該当が無ければnullを返す。
export function findCatchableGoldfish(
  poiPosition: ViewportPosition,
  goldfish: readonly CatchableGoldfish[],
): CatchResult | null {
  let nearestId: number | null = null
  let nearestDistance = Infinity

  for (const fish of goldfish) {
    const dx = fish.xPercent - poiPosition.xVw
    const dy = fish.yPercent - poiPosition.yVh
    const distance = Math.hypot(dx, dy)
    if (distance <= CATCH_RADIUS_VW && distance < nearestDistance) {
      nearestDistance = distance
      nearestId = fish.id
    }
  }

  if (nearestId === null) {
    return null
  }
  return { id: nearestId, isCenterHit: nearestDistance <= TEAR_RADIUS_VW }
}
