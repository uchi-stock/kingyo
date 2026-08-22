export interface PoiMotionState {
  xPercent: number
  yPercent: number
}

export const CENTER_POI_MOTION_STATE: PoiMotionState = {
  xPercent: 50,
  yPercent: 50,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

const TILT_RANGE_DEG = 45

// 端末の左右の傾き（gamma）をポイの回転角度に変換する。位置には使わない
// （位置は端末のスライド操作＝加速度で操作する。issue #11）。
export function orientationToAngleDeg(gamma: number | null): number {
  return clamp(gamma ?? 0, -TILT_RANGE_DEG, TILT_RANGE_DEG)
}

export interface Acceleration2D {
  x: number
  y: number
}

const GRAVITY_TRACKING_ALPHA = 0.8 // 重力推定の追従係数（大きいほど低周波成分＝重力のみを緩やかに追従する）

// event.accelerationIncludingGravityしか取得できない端末向けのフォールバック。
// 重力成分（低周波・持続的な約9.8m/s²のバイアス）をハイパスフィルタで推定・除去し、
// スライド操作由来の線形加速度のみを取り出す。重力成分を除去せずそのまま積分に使うと、
// 端末の傾き方向へ速度が持続的に加算され続け、ポイが画面端に張り付いたまま
// 動かなくなる不具合が起きる（issue #14）。
export function removeGravity(
  raw: Acceleration2D,
  gravityEstimate: Acceleration2D,
): { linear: Acceleration2D; gravityEstimate: Acceleration2D } {
  const nextGravityEstimate: Acceleration2D = {
    x: GRAVITY_TRACKING_ALPHA * gravityEstimate.x + (1 - GRAVITY_TRACKING_ALPHA) * raw.x,
    y: GRAVITY_TRACKING_ALPHA * gravityEstimate.y + (1 - GRAVITY_TRACKING_ALPHA) * raw.y,
  }
  return {
    linear: { x: raw.x - nextGravityEstimate.x, y: raw.y - nextGravityEstimate.y },
    gravityEstimate: nextGravityEstimate,
  }
}

const RATE_SENSITIVITY = 45 // m/s^2 を %/s の移動速度へ変換する係数（速度状態を持たない直接レート制御）
// 1秒あたりに中心からのズレがこの割合まで減衰する（残留バイアスによる一方向ドリフトの抑制）。
// 数秒程度の通常のプレイ（動かして止めて位置を保持する）ではほぼ復元を感じない程度まで弱め、
// 数十秒〜分オーダーの放置でのみ緩やかに効くようにしている。操作をやめた直後に目に見えて
// 中央へ戻ってしまう不具合があったため（issue #39）
const RECENTER_DECAY_PER_SEC = 0.995
const MAX_DT_SECONDS = 0.1 // タブのバックグラウンド復帰等での大きなdtによる位置の飛びを防ぐ
const ACCEL_DEADZONE = 0.3 // m/s^2。静止時の残留ノイズ・微小バイアスを無視する閾値
const ACCEL_SMOOTHING_ALPHA = 0.6 // 加速度ノイズの平滑化に使うEMAの追従係数（大きいほど滑らかだが追従が遅れる）

// 加速度センサーの生値に含まれる高周波ノイズをEMA（指数移動平均）で平滑化する。
// issue #34で位置側の速度・運動量を廃したことで、それまで速度の減衰が担っていた
// ノイズの平滑化効果も失われ、生の加速度が毎フレームそのまま位置に反映されて
// ポイの動きがガクガクして見える問題が起きた。位置側に運動量を戻すとドリフトが
// 再発するため、代わりに入力（加速度）側をここで滑らかにする（issue #36）。
export function smoothAcceleration(raw: Acceleration2D, previousSmoothed: Acceleration2D): Acceleration2D {
  return {
    x: ACCEL_SMOOTHING_ALPHA * previousSmoothed.x + (1 - ACCEL_SMOOTHING_ALPHA) * raw.x,
    y: ACCEL_SMOOTHING_ALPHA * previousSmoothed.y + (1 - ACCEL_SMOOTHING_ALPHA) * raw.y,
  }
}

// 閾値未満の加速度成分は0として扱う。実機のデバッグ表示で静止時にも0.2〜0.3m/s^2程度の
// 残留値が観測されており、これをそのまま移動に反映すると微小なドリフトが蓄積してしまうため（issue #32）
function applyDeadzone(value: number): number {
  return Math.abs(value) < ACCEL_DEADZONE ? 0 : value
}

// 端末のスライド操作（加速度）を、速度・運動量を保持しない直接レート制御でポイの位置に反映する。
// 「今の加速度」だけに比例した移動量を毎フレーム位置へ加算する単一積分のみで、速度状態は
// 一切持たない。従来は加速度→速度→位置と二重に積分しており、速度側にセンサーの残留バイアスが
// 蓄積し続けるため、実際のスマホ位置とポイの表示位置が時間とともに乖離していく問題があった
// （慣性航法におけるドリフトと同種の現象。issue #34）。
//
// ただし位置側に何の減衰も無いと、デッドゾーンをわずかに超える程度の残留バイアス
// （例: 端末を傾けて構えた際の重力除去の誤差）だけでも一方向へ加算され続け、実際には
// スライド操作をしていなくても表示位置が際限なく片側（上方向等）へドリフトしてしまう。
// これを防ぐため、中心(50%)からのズレを毎フレーム緩やかに減衰させる復元力を加える。
// この復元力は、意図的に操作をやめてその場に位置を保持したい場合には数秒程度では
// ほとんど感じられないほど弱く、数十秒〜分オーダーの放置でのみ緩やかに効く強さに
// 調整している（issue #39）。そのため残留バイアスへの耐性は限定的で、実機で
// 同種のドリフトが再発した場合は、位置側で後から補正するのではなく removeGravity と
// 同様に加速度側で残留バイアスを推定・除去する方式を検討する。
export function stepPoiMotion(
  state: PoiMotionState,
  acceleration: Acceleration2D,
  dtSecondsRaw: number,
): PoiMotionState {
  const dtSeconds = clamp(dtSecondsRaw, 0, MAX_DT_SECONDS)
  if (dtSeconds === 0) {
    return state
  }

  const accelerationX = applyDeadzone(acceleration.x)
  const accelerationY = applyDeadzone(acceleration.y)

  const recenterDecay = Math.pow(RECENTER_DECAY_PER_SEC, dtSeconds)
  const recenteredXPercent = 50 + (state.xPercent - 50) * recenterDecay
  const recenteredYPercent = 50 + (state.yPercent - 50) * recenterDecay

  const nextXPercent = clamp(recenteredXPercent + accelerationX * RATE_SENSITIVITY * dtSeconds, 0, 100)
  const nextYPercent = clamp(recenteredYPercent + accelerationY * RATE_SENSITIVITY * dtSeconds, 0, 100)

  return {
    xPercent: nextXPercent,
    yPercent: nextYPercent,
  }
}
