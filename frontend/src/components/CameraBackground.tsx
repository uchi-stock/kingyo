import { useEffect, useRef } from 'react'
import { useCameraStream } from '../camera/useCameraStream'

export function CameraBackground() {
  const { permission, stream } = useCameraStream()
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

      {/* カメラ映像に金魚を重ねるAR表現が未実装のため、AR対応するまで許可リクエストボタンを
          非表示にする（カメラを有効にする意味が薄いため。issue #77）。useCameraStream・
          permission === 'granted'時の<video>表示自体は、AR対応時に再度ボタンを表示する
          だけで有効化できるよう残す */}

      {(permission === 'denied' || permission === 'unsupported') && (
        <p className="text-white text-center pt-5 px-3">
          カメラを利用できないため、背景なしで金魚を表示しています
        </p>
      )}
    </div>
  )
}
