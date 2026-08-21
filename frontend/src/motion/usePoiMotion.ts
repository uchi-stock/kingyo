import { useCallback, useEffect, useState } from 'react'
import { CENTER_POI_POSITION, orientationToPoiPosition, type PoiPosition } from './poiPosition'

export type MotionPermissionState = 'unknown' | 'unsupported' | 'granted' | 'denied'

interface DeviceOrientationEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function getPermissionRequester(): (() => Promise<'granted' | 'denied'>) | undefined {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return undefined
  }
  const ctor = window.DeviceOrientationEvent as unknown as DeviceOrientationEventConstructorWithPermission
  return typeof ctor.requestPermission === 'function' ? ctor.requestPermission.bind(ctor) : undefined
}

function computeInitialPermission(): MotionPermissionState {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return 'unsupported'
  }
  return getPermissionRequester() ? 'unknown' : 'granted'
}

export interface UsePoiMotionResult {
  permission: MotionPermissionState
  position: PoiPosition
  requestPermission: () => Promise<void>
  setPositionFromPointer: (xPercent: number, yPercent: number) => void
}

// 加速度センサー（DeviceOrientationEvent）の値をポイの位置に反映するhook。
// iOS Safariでは requestPermission() によるユーザー操作起点の許可が必須なため、
// 許可状態をpermissionとして公開し、UI側でボタン等を出し分けられるようにする。
export function usePoiMotion(): UsePoiMotionResult {
  const [permission, setPermission] = useState<MotionPermissionState>(computeInitialPermission)
  const [position, setPosition] = useState<PoiPosition>(CENTER_POI_POSITION)

  useEffect(() => {
    if (permission !== 'granted') {
      return
    }
    const handleOrientation = (event: DeviceOrientationEvent) => {
      setPosition(orientationToPoiPosition({ beta: event.beta, gamma: event.gamma }))
    }
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [permission])

  const requestPermission = useCallback(async () => {
    const requester = getPermissionRequester()
    if (!requester) {
      setPermission('granted')
      return
    }
    try {
      const result = await requester()
      setPermission(result === 'granted' ? 'granted' : 'denied')
    } catch {
      setPermission('denied')
    }
  }, [])

  const setPositionFromPointer = useCallback((xPercent: number, yPercent: number) => {
    const clamp01 = (value: number) => Math.min(Math.max(value, 0), 100)
    setPosition({ xPercent: clamp01(xPercent), yPercent: clamp01(yPercent), angleDeg: 0 })
  }, [])

  return { permission, position, requestPermission, setPositionFromPointer }
}
