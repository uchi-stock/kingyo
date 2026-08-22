import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { usePoiMotion } from '../motion/usePoiMotion'

export function Poi() {
  const { permission, pose, debug, requestPermission, setPositionFromPointer } = usePoiMotion()
  const pondRef = useRef<HTMLDivElement>(null)
  const [pondSize, setPondSize] = useState({ width: 0, height: 0 })
  const showManualControl = permission === 'denied' || permission === 'unsupported'

  // ポイの位置をtransformのpx移動量へ変換するため、pondの実サイズを測定する。
  // left/topではなくtransformで動かすことで、毎フレームの更新がレイアウト再計算（reflow）を
  // 伴わずGPU合成のみで完結するようにする（issue #14: 実機でセンサー値・状態更新は
  // 正常なのにポイが視覚的に動かなかった原因）
  useEffect(() => {
    const pond = pondRef.current
    if (!pond) {
      return
    }
    const updateSize = () => setPondSize({ width: pond.clientWidth, height: pond.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(pond)
    return () => observer.disconnect()
  }, [])

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

  const offsetXPx = ((pose.xPercent - 50) / 100) * pondSize.width
  const offsetYPx = ((pose.yPercent - 50) / 100) * pondSize.height

  return (
    <div
      ref={pondRef}
      className="position-relative rounded-3 overflow-hidden border border-2 border-white"
      style={{ height: '60vh', touchAction: 'none' }}
      onPointerDown={showManualControl ? handlePointerInput : undefined}
      onPointerMove={showManualControl ? handlePointerInput : undefined}
      data-testid="pond"
    >
      <div
        data-testid="poi-marker"
        className="position-absolute top-50 start-50 rounded-circle border border-4 border-white"
        style={{
          width: '4rem',
          height: '4rem',
          transform: `translate(-50%, -50%) translate(${offsetXPx}px, ${offsetYPx}px) rotate(${pose.angleDeg}deg)`,
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

      {/* センサー入力が実際に届いているかを確認するための一時的なデバッグ表示（issue #14） */}
      <p
        className="position-absolute top-0 start-0 m-2 text-white bg-dark bg-opacity-50 rounded px-2 py-1 small"
        style={{ fontFamily: 'monospace' }}
        data-testid="poi-debug"
      >
        permission: {permission} / events: {debug.motionEventCount} / accel: (
        {debug.lastAcceleration.x.toFixed(2)}, {debug.lastAcceleration.y.toFixed(2)}) / scoop: {debug.scoopCount}
      </p>
    </div>
  )
}
