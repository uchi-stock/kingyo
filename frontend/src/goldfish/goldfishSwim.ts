export interface GoldfishState {
  xPercent: number
  yPercent: number
  // 進行方向の基準となる角度（度）。0度=右向き、90度=下向き（画面座標系、時計回りが正）。
  // 端での転回・ランダムな方向転換の時以外は変化しない
  headingDeg: number
  // 見た目の回転角度（度）。headingDegへ滑らかに追従し、転回時の唐突な向き反転を防ぐ（issue #29）
  displayHeadingDeg: number
  // 次のランダムな方向転換までの残り時間（ミリ秒）
  turnCountdownMs: number
}

const MARGIN_PERCENT = 10
const SPEED_PERCENT_PER_SEC = 5 // 前進速度
const WOBBLE_DEG = 15 // 前方を中心とした左右の振れ幅
const WOBBLE_SPEED_RAD_PER_SEC = 2.5 // 振れの速さ
const TURN_SMOOTHING_PER_SEC = 0.05 // 1秒あたり、見た目の角度の残差がこの割合まで小さくなるよう追従する
const RANDOM_TURN_RANGE_DEG = 90 // ランダムな方向転換の振れ幅（現在の進行方向を基準に±この範囲）
const RANDOM_TURN_MIN_INTERVAL_MS = 3000
const RANDOM_TURN_MAX_INTERVAL_MS = 8000

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

// targetDegからcurrentDegへの符号付き最短差分（-180〜180度）。角度の周期性（0度と360度が同じ）を考慮する
function angleDiffDeg(targetDeg: number, currentDeg: number): number {
  return (((targetDeg - currentDeg + 180) % 360) + 360) % 360 - 180
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value, MARGIN_PERCENT), 100 - MARGIN_PERCENT)
}

function randomTurnIntervalMs(random: () => number): number {
  return RANDOM_TURN_MIN_INTERVAL_MS + random() * (RANDOM_TURN_MAX_INTERVAL_MS - RANDOM_TURN_MIN_INTERVAL_MS)
}

export function createInitialGoldfishState(seed: number, random: () => number = Math.random): GoldfishState {
  const headingDeg = seed * 360
  return {
    xPercent: MARGIN_PERCENT + seed * (100 - MARGIN_PERCENT * 2),
    yPercent: MARGIN_PERCENT + ((seed * 2.3) % 1) * (100 - MARGIN_PERCENT * 2),
    headingDeg,
    displayHeadingDeg: headingDeg,
    turnCountdownMs: randomTurnIntervalMs(random),
  }
}

// 「前方（headingDeg）を基準に左右WOBBLE_DEG度の範囲で小さく振れながら直進し、画面端に
// ぶつかった場合、およびランダムな間隔でランダムな範囲の方向転換をする」という遊泳モデル
// （issue #23, #30）。見た目の回転（displayHeadingDeg）はheadingDegへ滑らかに追従させ、
// 転回時に唐突な向き反転に見えないようにする（issue #29）。
export function stepGoldfish(
  state: GoldfishState,
  dtSeconds: number,
  elapsedMs: number,
  seed: number,
  random: () => number = Math.random,
): GoldfishState {
  let baseHeading = state.headingDeg
  let turnCountdownMs = state.turnCountdownMs - dtSeconds * 1000

  if (turnCountdownMs <= 0) {
    const offset = (random() * 2 - 1) * RANDOM_TURN_RANGE_DEG
    baseHeading = normalizeDeg(baseHeading + offset)
    turnCountdownMs = randomTurnIntervalMs(random)
  }

  const wobbleDeg = WOBBLE_DEG * Math.sin((elapsedMs / 1000) * WOBBLE_SPEED_RAD_PER_SEC + seed * Math.PI * 2)
  const travelRad = ((baseHeading + wobbleDeg) * Math.PI) / 180

  let nextX = state.xPercent + Math.cos(travelRad) * SPEED_PERCENT_PER_SEC * dtSeconds
  let nextY = state.yPercent + Math.sin(travelRad) * SPEED_PERCENT_PER_SEC * dtSeconds
  let nextHeading = baseHeading

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

  const diff = angleDiffDeg(nextHeading, state.displayHeadingDeg)
  const smoothing = Math.pow(TURN_SMOOTHING_PER_SEC, dtSeconds)
  const nextDisplayHeadingDeg = normalizeDeg(state.displayHeadingDeg + diff * (1 - smoothing))

  return {
    xPercent: nextX,
    yPercent: nextY,
    headingDeg: nextHeading,
    displayHeadingDeg: nextDisplayHeadingDeg,
    turnCountdownMs,
  }
}
