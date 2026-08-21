import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'
import { usePoiMotion } from '../motion/usePoiMotion'

export function Poi() {
  const { permission, position, requestPermission, setPositionFromPointer } = usePoiMotion()
  const pondRef = useRef<HTMLDivElement>(null)
  const showManualControl = permission === 'denied' || permission === 'unsupported'

  const handlePointerInput = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pond = pondRef.current
    if (!pond) {
      return
    }
    const rect = pond.getBoundingClientRect()
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100
    setPositionFromPointer(xPercent, yPercent)
  }

  return (
    <div
      ref={pondRef}
      className="position-relative bg-info-subtle rounded-3 overflow-hidden"
      style={{ height: '60vh', touchAction: 'none' }}
      onPointerDown={showManualControl ? handlePointerInput : undefined}
      onPointerMove={showManualControl ? handlePointerInput : undefined}
      data-testid="pond"
    >
      <div
        data-testid="poi-marker"
        className="position-absolute rounded-circle border border-4 border-white"
        style={{
          left: `${position.xPercent}%`,
          top: `${position.yPercent}%`,
          width: '3rem',
          height: '3rem',
          transform: `translate(-50%, -50%) rotate(${position.angleDeg}deg)`,
        }}
        aria-hidden="true"
      />

      {permission === 'unknown' && (
        <button
          type="button"
          className="btn btn-primary position-absolute top-50 start-50 translate-middle"
          onClick={() => {
            void requestPermission()
          }}
        >
          センサーを有効にする
        </button>
      )}

      {showManualControl && (
        <p className="position-absolute bottom-0 start-0 m-2 text-body-secondary small">
          加速度センサーが利用できないため、画面をなぞってポイを操作してください
        </p>
      )}
    </div>
  )
}
