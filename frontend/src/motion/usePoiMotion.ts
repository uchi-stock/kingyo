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
import { computeAngularVelocityDegPerSec, detectScoopGesture, updateRotationSuppression } from './scoopGesture'

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
  lastAcceleration: Acceleration2D
  scoopCount: number
  rotationSuppressed: boolean
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
export function usePoiMotion(): UsePoiMotionResult {
  const [permission, setPermission] = useState<MotionPermissionState>(computeInitialPermission)
  const [motionState, setMotionState] = useState<PoiMotionState>(CENTER_POI_MOTION_STATE)
  const [angleDeg, setAngleDeg] = useState(0)
  const latestAccelerationRef = useRef({ x: 0, y: 0 })
  const smoothedAccelerationRef = useRef<Acceleration2D>({ x: 0, y: 0 })
  const gravityEstimateRef = useRef<Acceleration2D>({ x: 0, y: 0 })
  const motionEventCountRef = useRef(0)
  const [debug, setDebug] = useState<Omit<PoiDebugInfo, 'scoopCount' | 'rotationSuppressed'>>({
    motionEventCount: 0,
    lastAcceleration: { x: 0, y: 0 },
  })
  const [scoopCount, setScoopCount] = useState(0)
  const rotationSuppressionHoldMsRef = useRef(0)
  const rotationSuppressedRef = useRef(false)
  const [rotationSuppressed, setRotationSuppressed] = useState(false)

  // 角度表現・掬うジェスチャーの検出は位置操作の許可状態に関わらず、購読できる範囲で常時反映する
  useEffect(() => {
    let previousBetaDeg: number | null = null
    let previousTime = performance.now()
    let cooldownMs = 0
    let scoopCountSoFar = 0

    const handleOrientation = (event: DeviceOrientationEvent) => {
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
          scoopCountSoFar += 1
          setScoopCount(scoopCountSoFar)
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
  }, [])

  useEffect(() => {
    if (permission !== 'granted') {
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
  }, [permission])

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
      setPermission('granted')
      return
    }
    try {
      const result = await motionPermissionPromise
      setPermission(result === 'granted' ? 'granted' : 'denied')
    } catch {
      setPermission('denied')
    }
  }, [])

  // センサー許可が必要な環境（iOS Safari等）でも、専用の「有効にする」ボタン操作を
  // ユーザーに求めず、画面への最初のタップ（既に発生する自然な操作）をそのまま許可
  // リクエストのトリガーとする。requestPermission()はユーザー操作起点でなければ
  // 許可ダイアログを出さないブラウザがあるため、ボタンではなく最初のpointerdown
  // イベント自体がその役割を果たす（issue #14と同様の制約への対応。issue #63）
  useEffect(() => {
    if (permission !== 'unknown') {
      return
    }
    const handleFirstPointerDown = () => {
      void requestPermission()
    }
    window.addEventListener('pointerdown', handleFirstPointerDown, { once: true })
    return () => window.removeEventListener('pointerdown', handleFirstPointerDown)
  }, [permission, requestPermission])

  const setPositionFromPointer = useCallback((xPercent: number, yPercent: number) => {
    const clamp01 = (value: number) => Math.min(Math.max(value, 0), 100)
    setMotionState({ xPercent: clamp01(xPercent), yPercent: clamp01(yPercent) })
  }, [])

  return {
    permission,
    pose: { xPercent: motionState.xPercent, yPercent: motionState.yPercent, angleDeg },
    debug: { ...debug, scoopCount, rotationSuppressed },
    requestPermission,
    setPositionFromPointer,
  }
}
