const CATCH_RADIUS_VW = 10 // ポイと金魚の中心間距離がこれ以内なら捕獲判定とする

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
}

// ポイの位置（ビューポート相対のvw/vh）と金魚の一覧（xPercent/yPercentはvw/vh基準。
// GoldfishSchoolの表示座標系と揃える）から、捕獲対象となる最も近い金魚を返す。
// 半径内に金魚が複数いる場合は最も近い1匹のみを捕獲する。該当が無ければnullを返す。
// 捕獲に成功した場合、ポイの中心・端どちらで捕獲してもポイは破れない（issue #132。
// 従来はポイの中心付近で捕獲するとポイが破れる仕様だったが、捕獲成功なのに同時に
// ゲームオーバーになるのは分かりにくいという指摘を受け撤廃した）
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
  return { id: nearestId }
}
