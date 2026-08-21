import { useCallback, useEffect, useRef, useState } from 'react'
import { CENTER_POI_MOTION_STATE, orientationToAngleDeg, stepPoiMotion, type PoiMotionState } from './poiMotion'

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

export interface UsePoiMotionResult {
  permission: MotionPermissionState
  pose: PoiPose
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
      const acceleration = event.acceleration ?? event.accelerationIncludingGravity
      if (!acceleration) {
        return
      }
      // 画面座標はyが下方向を正とするが、デバイスのy軸は上方向が正のため反転する
      latestAccelerationRef.current = { x: acceleration.x ?? 0, y: -(acceleration.y ?? 0) }
    }

    let frameId: number
    let lastTime = performance.now()
    const tick = () => {
      const now = performance.now()
      const dtSeconds = (now - lastTime) / 1000
      lastTime = now
      setMotionState((state) => stepPoiMotion(state, latestAccelerationRef.current, dtSeconds))
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
    // 角度表現用のセンサー許可も同じユーザー操作の流れでリクエストする（iOS Safari対応）。
    // 角度は補助的な機能のため、失敗しても位置操作（モーション）側の許可フローは継続する
    const orientationRequester = getPermissionRequester(
      typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined,
    )
    if (orientationRequester) {
      try {
        await orientationRequester()
      } catch {
        // 角度表現は補助機能のため、失敗しても致命的ではない
      }
    }

    const motionRequester = getPermissionRequester(
      typeof window !== 'undefined' ? window.DeviceMotionEvent : undefined,
    )
    if (!motionRequester) {
      setPermission('granted')
      return
    }
    try {
      const result = await motionRequester()
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
    requestPermission,
    setPositionFromPointer,
  }
}
