export interface GoldfishState {
  xPercent: number
  yPercent: number
  // 進行方向の基準となる角度（度）。0度=右向き、90度=下向き（画面座標系、時計回りが正）。
  // 端で転回する時以外は変化しない
  headingDeg: number
}

const MARGIN_PERCENT = 10
const SPEED_PERCENT_PER_SEC = 5 // 前進速度
const WOBBLE_DEG = 15 // 前方を中心とした左右の振れ幅
const WOBBLE_SPEED_RAD_PER_SEC = 2.5 // 振れの速さ

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value, MARGIN_PERCENT), 100 - MARGIN_PERCENT)
}

export function createInitialGoldfishState(seed: number): GoldfishState {
  return {
    xPercent: MARGIN_PERCENT + seed * (100 - MARGIN_PERCENT * 2),
    yPercent: MARGIN_PERCENT + ((seed * 2.3) % 1) * (100 - MARGIN_PERCENT * 2),
    headingDeg: seed * 360,
  }
}

// 「前方（headingDeg）を基準に左右WOBBLE_DEG度の範囲で小さく振れながら直進し、
// 画面端（pond/ビューポートの境界）にぶつかった場合のみ転回する」という遊泳モデル（issue #23）。
// headingDegは転回時以外は変化せず、振れ（wobble）は毎フレーム計算のみで状態には持たない。
export function stepGoldfish(
  state: GoldfishState,
  dtSeconds: number,
  elapsedMs: number,
  seed: number,
): GoldfishState {
  const wobbleDeg = WOBBLE_DEG * Math.sin((elapsedMs / 1000) * WOBBLE_SPEED_RAD_PER_SEC + seed * Math.PI * 2)
  const travelRad = ((state.headingDeg + wobbleDeg) * Math.PI) / 180

  let nextX = state.xPercent + Math.cos(travelRad) * SPEED_PERCENT_PER_SEC * dtSeconds
  let nextY = state.yPercent + Math.sin(travelRad) * SPEED_PERCENT_PER_SEC * dtSeconds
  let nextHeading = state.headingDeg

  if (nextX < MARGIN_PERCENT || nextX > 100 - MARGIN_PERCENT) {
    // 垂直な壁に当たった: 進行方向の水平成分を反転する
    nextHeading = normalizeDeg(180 - nextHeading)
    nextX = clampPercent(nextX)
  }
  if (nextY < MARGIN_PERCENT || nextY > 100 - MARGIN_PERCENT) {
    // 水平な壁に当たった: 進行方向の垂直成分を反転する
    nextHeading = normalizeDeg(-nextHeading)
    nextY = clampPercent(nextY)
  }

  return {
    xPercent: nextX,
    yPercent: nextY,
    headingDeg: nextHeading,
  }
}
