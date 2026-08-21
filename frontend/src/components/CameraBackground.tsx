import { useEffect, useRef } from 'react'
import { useCameraStream } from '../camera/useCameraStream'

export function CameraBackground() {
  const { permission, stream, requestPermission } = useCameraStream()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 bg-dark"
      style={{ pointerEvents: 'none' }}
      data-testid="camera-background"
    >
      {permission === 'granted' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-100 h-100"
          style={{ objectFit: 'cover' }}
          data-testid="camera-video"
        />
      )}

      {permission === 'unknown' && (
        <div className="d-flex h-100 align-items-center justify-content-center">
          <button
            type="button"
            className="btn btn-light"
            style={{ pointerEvents: 'auto' }}
            onClick={() => {
              void requestPermission()
            }}
          >
            カメラを有効にする
          </button>
        </div>
      )}

      {(permission === 'denied' || permission === 'unsupported') && (
        <p className="text-white text-center pt-5 px-3">
          カメラを利用できないため、背景なしで金魚を表示しています
        </p>
      )}
    </div>
  )
}
