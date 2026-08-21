import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CENTER_POI_MOTION_STATE,
  orientationToAngleDeg,
  removeGravity,
  stepPoiMotion,
  type Acceleration2D,
  type PoiMotionState,
} from './poiMotion'

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
  const gravityEstimateRef = useRef<Acceleration2D>({ x: 0, y: 0 })
  const motionEventCountRef = useRef(0)
  const [debug, setDebug] = useState<PoiDebugInfo>({ motionEventCount: 0, lastAcceleration: { x: 0, y: 0 } })

  // 角度表現は位置操作の許可状態に関わらず、購読できる範囲で常時反映する
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      setAngleDeg(orientationToAngleDeg(event.gamma))
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
      setMotionState((state) => stepPoiMotion(state, latestAccelerationRef.current, dtSeconds))
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

  const setPositionFromPointer = useCallback((xPercent: number, yPercent: number) => {
    const clamp01 = (value: number) => Math.min(Math.max(value, 0), 100)
    setMotionState((state) => ({
      ...state,
      xPercent: clamp01(xPercent),
      yPercent: clamp01(yPercent),
      velocityXPercentPerSec: 0,
      velocityYPercentPerSec: 0,
    }))
  }, [])

  return {
    permission,
    pose: { xPercent: motionState.xPercent, yPercent: motionState.yPercent, angleDeg },
    debug,
    requestPermission,
    setPositionFromPointer,
  }
}
