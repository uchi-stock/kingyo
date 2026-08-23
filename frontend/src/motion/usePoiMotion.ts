import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CENTER_POI_MOTION_STATE,
  orientationToAngleDeg,
  removeGravity,
  smoothAcceleration,
  stepPoiMotion,
  type Acceleration2D,
  type PoiMotionState,
} from './poiMotion'
import {
  computeAngularVelocityDegPerSec,
  detectScoopGesture,
  updateRotationSuppression,
  type ScoopIntensity,
} from './scoopGesture'

export type MotionPermissionState = 'unknown' | 'unsupported' | 'granted' | 'denied'

interface PermissionRequestingEventConstructor {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function getPermissionRequester(ctor: unknown): (() => Promise<'granted' | 'denied'>) | undefined {
  const candidate = ctor as PermissionRequestingEventConstructor | undefined
  return typeof candidate?.requestPermission === 'function' ? candidate.requestPermission.bind(candidate) : undefined
}

function isMotionSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window
}

function computeInitialPermission(): MotionPermissionState {
  if (!isMotionSupported()) {
    return 'unsupported'
  }
  return getPermissionRequester(window.DeviceMotionEvent) ? 'unknown' : 'granted'
}

export interface PoiPose {
  xPercent: number
  yPercent: number
  angleDeg: number
}

export interface PoiDebugInfo {
  motionEventCount: number
  // deviceorientationイベントの受信数。motionEventCountと分けて数えることで、
  // 「向きは届くが加速度は届かない」等の切り分けができる（issue #109）
  orientationEventCount: number
  lastAcceleration: Acceleration2D
  scoopCount: number
  // 直近に検出された掬うジェスチャーの勢い。scoopCountとあわせて更新される（issue #82）
  lastScoopIntensity: ScoopIntensity | null
  rotationSuppressed: boolean
  // requestPermission()が実際に解決した値（'granted'/'denied'）、または例外メッセージ。
  // 許可ダイアログ自体が一切表示されないという実機報告（issue #109）の原因切り分け用に、
  // requestPermission()の呼び出し結果をそのまま可視化する
  lastPermissionResult: string | null
}

export interface UsePoiMotionResult {
  permission: MotionPermissionState
  pose: PoiPose
  debug: PoiDebugInfo
  requestPermission: () => Promise<void>
  setPositionFromPointer: (xPercent: number, yPercent: number) => void
}

// ポイの位置は端末のスライド操作（DeviceMotionEventの加速度を積分）で、
// 角度は端末の傾き（DeviceOrientationEventのgamma）でそれぞれ独立に操作する（issue #11）。
// isTorn（issue #45: ポイの中心での捕獲）が真になった以降は、ゲームオーバー表現として
// 位置・角度操作、および掬うジェスチャー検出を一切受け付けなくなる（issue #79）。
// 金魚側のアニメーションはこのフックと独立しているため、この凍結の影響を受けない
export function usePoiMotion(isTorn = false): UsePoiMotionResult {
  const [permission, setPermission] = useState<MotionPermissionState>(computeInitialPermission)
  const [motionState, setMotionState] = useState<PoiMotionState>(CENTER_POI_MOTION_STATE)
  const [angleDeg, setAngleDeg] = useState(0)
  const latestAccelerationRef = useRef({ x: 0, y: 0 })
  const smoothedAccelerationRef = useRef<Acceleration2D>({ x: 0, y: 0 })
  const gravityEstimateRef = useRef<Acceleration2D>({ x: 0, y: 0 })
  const motionEventCountRef = useRef(0)
  const orientationEventCountRef = useRef(0)
  const [orientationEventCount, setOrientationEventCount] = useState(0)
  const [debug, setDebug] = useState<
    Omit<PoiDebugInfo, 'scoopCount' | 'lastScoopIntensity' | 'rotationSuppressed' | 'orientationEventCount' | 'lastPermissionResult'>
  >({
    motionEventCount: 0,
    lastAcceleration: { x: 0, y: 0 },
  })
  const [scoopCount, setScoopCount] = useState(0)
  const [lastScoopIntensity, setLastScoopIntensity] = useState<ScoopIntensity | null>(null)
  const rotationSuppressionHoldMsRef = useRef(0)
  const rotationSuppressedRef = useRef(false)
  const [rotationSuppressed, setRotationSuppressed] = useState(false)
  const [lastPermissionResult, setLastPermissionResult] = useState<string | null>(null)

  // 角度表現・掬うジェスチャーの検出は位置操作の許可状態に関わらず、購読できる範囲で常時反映する
  useEffect(() => {
    let previousBetaDeg: number | null = null
    let previousTime = performance.now()
    let cooldownMs = 0

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // ポイが破れているかどうかに関わらず、イベント自体が届いているかは常に数える
      // （issue #109: 実機でセンサーが一切反応しないという報告の原因切り分け用）
      orientationEventCountRef.current += 1
      setOrientationEventCount(orientationEventCountRef.current)

      // ポイが破れた後は、角度更新・掬うジェスチャー検出のいずれも行わず、
      // 破れた瞬間の角度のまま固定する（issue #79）
      if (isTorn) {
        return
      }
      setAngleDeg(orientationToAngleDeg(event.gamma))

      const now = performance.now()
      const dtSeconds = (now - previousTime) / 1000
      previousTime = now
      const betaDeg = event.beta ?? 0

      // 初回イベントはprevious値が無いため角速度を計算できず、スキップする
      if (previousBetaDeg !== null) {
        const angularVelocityDegPerSec = computeAngularVelocityDegPerSec(betaDeg, previousBetaDeg, dtSeconds)

        const scoopResult = detectScoopGesture(angularVelocityDegPerSec, dtSeconds, cooldownMs)
        cooldownMs = scoopResult.cooldownMs
        if (scoopResult.triggered) {
          // 関数形の更新式を使う。isTorn変化に伴いこのeffectが再購読されても
          // （issue #93: リトライ後の再購読）、直前のReact state（前回の破れまでの
          // scoopCount）を正しく引き継いで増分できる。ローカル変数でカウントし直すと、
          // 再購読直後の値が直前のstateと偶然一致した際にReactが更新を素通りし
          // （Object.is比較で同値のためスキップ）、以降ずっとPoi側が変化を検知できなく
          // なる不具合があった
          setScoopCount((previous) => previous + 1)
          setLastScoopIntensity(scoopResult.intensity)
        }

        // 掬うフリック等の素早い回転は、加速度センサーの値に一時的な変化を生み、
        // ポイの水平位置操作に混入してしまうため、回転中は位置操作用の加速度入力を
        // 抑制する（issue #42）。抑制状態はrAFループ側から参照するためrefで持つ
        const suppressionResult = updateRotationSuppression(
          angularVelocityDegPerSec,
          dtSeconds,
          rotationSuppressionHoldMsRef.current,
        )
        rotationSuppressionHoldMsRef.current = suppressionResult.holdMs
        if (rotationSuppressedRef.current !== suppressionResult.suppressed) {
          rotationSuppressedRef.current = suppressionResult.suppressed
          setRotationSuppressed(suppressionResult.suppressed)
        }
      }
      previousBetaDeg = betaDeg
    }
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [isTorn])

  useEffect(() => {
    // ポイが破れた後は、破れた瞬間の位置のまま固定する（issue #79）
    if (permission !== 'granted' || isTorn) {
      return
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      // event.accelerationは重力成分を除いた線形加速度で、取得できる端末ではこちらを優先する。
      // 取得できない端末では、accelerationIncludingGravityから重力成分を除去して使う
      // （そのまま使うと重力バイアスでポイが画面端に張り付いて動かなくなる。issue #14）
      let x: number
      let y: number
      if (event.acceleration && (event.acceleration.x !== null || event.acceleration.y !== null)) {
        x = event.acceleration.x ?? 0
        y = event.acceleration.y ?? 0
      } else if (event.accelerationIncludingGravity) {
        const raw = { x: event.accelerationIncludingGravity.x ?? 0, y: event.accelerationIncludingGravity.y ?? 0 }
        const result = removeGravity(raw, gravityEstimateRef.current)
        gravityEstimateRef.current = result.gravityEstimate
        x = result.linear.x
        y = result.linear.y
      } else {
        return
      }
      // 画面座標はyが下方向を正とするが、デバイスのy軸は上方向が正のため反転する
      latestAccelerationRef.current = { x, y: -y }
      motionEventCountRef.current += 1
    }

    let frameId: number
    let lastTime = performance.now()
    const tick = () => {
      const now = performance.now()
      const dtSeconds = (now - lastTime) / 1000
      lastTime = now
      // 加速度センサーの生値をそのまま位置制御に使うと、センサーノイズが毎フレーム
      // そのまま反映されてポイの動きがガクガクして見えるため、EMAで平滑化してから使う
      // （issue #36）。デバッグ表示（debug.lastAcceleration）はセンサーの生値の受信状況を
      // 確認する目的のため、平滑化前の値のまま残す。
      smoothedAccelerationRef.current = smoothAcceleration(latestAccelerationRef.current, smoothedAccelerationRef.current)
      // 掬うフリック等の素早い回転中は、加速度センサーの値にスライド操作と区別できない
      // 一時的な変化が混入するため、位置操作への反映のみをゼロ扱いにして抑制する。
      // 平滑化自体は継続するため、抑制解除後は最新のセンサー値へ即座に復帰する（issue #42）
      const accelerationForPosition = rotationSuppressedRef.current ? { x: 0, y: 0 } : smoothedAccelerationRef.current
      setMotionState((state) => stepPoiMotion(state, accelerationForPosition, dtSeconds))
      // devicemotionイベントが実際に届いているかを画面上で確認できるようにする
      // デバッグ用の状態（issue #14: 実機で位置が中央から全く動かない事象の原因切り分け）
      setDebug({ motionEventCount: motionEventCountRef.current, lastAcceleration: latestAccelerationRef.current })
      frameId = requestAnimationFrame(tick)
    }

    window.addEventListener('devicemotion', handleMotion)
    frameId = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
      cancelAnimationFrame(frameId)
    }
  }, [permission, isTorn])

  const requestPermission = useCallback(async () => {
    const motionRequester = getPermissionRequester(
      typeof window !== 'undefined' ? window.DeviceMotionEvent : undefined,
    )
    const orientationRequester = getPermissionRequester(
      typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined,
    )

    // 両方のrequestPermission()を、どちらもawaitする前に同期的に呼び出す。
    // 片方をawaitしてから次を呼ぶと、2回目の呼び出し時点でクリック操作に紐づく
    // user activationが失われ、許可ダイアログが出ないまま黙って拒否扱いになる
    // ブラウザがあるため（issue #14）
    const motionPermissionPromise = motionRequester?.()
    const orientationPermissionPromise = orientationRequester?.()

    if (orientationPermissionPromise) {
      try {
        await orientationPermissionPromise
      } catch {
        // 角度表現は補助機能のため、失敗しても位置操作（モーション）側の許可フローには影響させない
      }
    }

    if (!motionPermissionPromise) {
      setLastPermissionResult('requestPermission未定義のため即granted扱い')
      setPermission('granted')
      return
    }
    try {
      const result = await motionPermissionPromise
      setLastPermissionResult(result)
      setPermission(result === 'granted' ? 'granted' : 'denied')
    } catch (error) {
      setLastPermissionResult(`例外: ${error instanceof Error ? error.message : String(error)}`)
      setPermission('denied')
    }
  }, [])

  // センサー許可が必要な環境（iOS Safari等）でも、専用の「有効にする」ボタン操作を
  // ユーザーに求めず、画面への最初のタップ（既に発生する自然な操作）をそのまま許可
  // リクエストのトリガーとする（issue #63）。トリガーには『click』イベントを使う。
  // 実機診断（issue #109）で、pointerdownをトリガーにすると
  // 「Requesting device motion access requires a user gesture to prompt」という
  // 例外が発生することが判明した。WHATWGのUser Activation仕様上、pointerdown/touchstartは
  // 「activation triggering input event」に含まれておらず（click/touchend/pointerup等は
  // 含まれる）、iOS SafariのrequestPermission()はpointerdown起点の呼び出しを
  // 正規のユーザー操作と認識しないため、clickに変更する
  useEffect(() => {
    if (permission !== 'unknown') {
      return
    }
    const handleFirstClick = () => {
      void requestPermission()
    }
    window.addEventListener('click', handleFirstClick, { once: true })
    return () => window.removeEventListener('click', handleFirstClick)
  }, [permission, requestPermission])

  const setPositionFromPointer = useCallback(
    (xPercent: number, yPercent: number) => {
      // ポイが破れた後は、フォールバック操作（ポインタ）による位置変更も受け付けない（issue #79）
      if (isTorn) {
        return
      }
      const clamp01 = (value: number) => Math.min(Math.max(value, 0), 100)
      setMotionState({ xPercent: clamp01(xPercent), yPercent: clamp01(yPercent) })
    },
    [isTorn],
  )

  return {
    permission,
    pose: { xPercent: motionState.xPercent, yPercent: motionState.yPercent, angleDeg },
    debug: { ...debug, orientationEventCount, scoopCount, lastScoopIntensity, rotationSuppressed, lastPermissionResult },
    requestPermission,
    setPositionFromPointer,
  }
}
