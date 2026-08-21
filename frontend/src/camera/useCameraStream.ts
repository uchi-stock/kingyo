import { useCallback, useEffect, useState } from 'react'

export type CameraPermissionState = 'unknown' | 'unsupported' | 'granted' | 'denied'

export interface UseCameraStreamResult {
  permission: CameraPermissionState
  stream: MediaStream | null
  requestPermission: () => Promise<void>
}

function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

// 背面カメラ（getUserMedia）の映像を取得するhook。カメラAPIは常にユーザー操作起点の
// 許可リクエストが必要なため、初期状態はunknownとし、requestPermission呼び出しで
// 明示的に許可を求める。非対応環境・拒否時はstreamをnullのまま返し、呼び出し側で
// フォールバック表示に切り替えられるようにする。
export function useCameraStream(): UseCameraStreamResult {
  const [permission, setPermission] = useState<CameraPermissionState>(() =>
    isCameraSupported() ? 'unknown' : 'unsupported',
  )
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  const requestPermission = useCallback(async () => {
    if (!isCameraSupported()) {
      setPermission('unsupported')
      return
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setStream(mediaStream)
      setPermission('granted')
    } catch {
      setPermission('denied')
    }
  }, [])

  return { permission, stream, requestPermission }
}
