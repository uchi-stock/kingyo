import type { PointerEvent as ReactPointerEvent } from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import poiTorn from '../assets/poi/poi-torn.png'
import type { ViewportPosition } from '../goldfish/catchGoldfish'
import { usePoiMotion } from '../motion/usePoiMotion'

export interface PoiProps {
  onScoop?: (position: ViewportPosition) => void
  // ポイの中心で金魚を捕獲し紙が破れた状態かどうか（issue #45）。
  // 破れた状態ではマーカー表示を破れ画像に切り替える
  isTorn?: boolean
}

function PoiComponent({ onScoop, isTorn = false }: PoiProps) {
  const { permission, pose, debug, setPositionFromPointer } = usePoiMotion(isTorn)
  const pondRef = useRef<HTMLDivElement>(null)
  const [pondSize, setPondSize] = useState({ width: 0, height: 0 })
  const showManualControl = permission === 'denied' || permission === 'unsupported'
  const previousScoopCountRef = useRef(debug.scoopCount)

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

  // 掬うジェスチャーが検出された瞬間のポイの位置を、金魚の捕獲判定へ渡す（issue #44）。
  // 金魚の位置はビューポート全体に対するvw/vhで管理されているのに対し、ポイの位置は
  // pond要素（ページ内の一部領域）に対する百分率のため、pondの実際の画面上の矩形を
  // 使って座標系を揃える。
  useEffect(() => {
    if (debug.scoopCount === previousScoopCountRef.current) {
      return
    }
    previousScoopCountRef.current = debug.scoopCount

    const pond = pondRef.current
    if (!pond || !onScoop) {
      return
    }
    const rect = pond.getBoundingClientRect()
    const poiViewportX = rect.left + rect.width / 2 + offsetXPx
    const poiViewportY = rect.top + rect.height / 2 + offsetYPx
    onScoop({
      xVw: (poiViewportX / window.innerWidth) * 100,
      yVh: (poiViewportY / window.innerHeight) * 100,
    })
  }, [debug.scoopCount, offsetXPx, offsetYPx, onScoop])

  return (
    <div
      ref={pondRef}
      className="position-relative rounded-3 overflow-hidden border border-2 border-white"
      style={{ height: '60vh', touchAction: 'none' }}
      onPointerDown={showManualControl ? handlePointerInput : undefined}
      onPointerMove={showManualControl ? handlePointerInput : undefined}
      data-testid="pond"
    >
      {isTorn ? (
        // ポイの中心で金魚を捕獲し紙が破れた状態の表示（issue #45）。
        // 通常時のマーカーと同じtransformロジックで位置・角度を反映する
        <img
          src={poiTorn}
          alt=""
          data-testid="poi-marker"
          className="position-absolute top-50 start-50"
          style={{
            width: '4rem',
            transform: `translate(-50%, -50%) translate(${offsetXPx}px, ${offsetYPx}px) rotate(${pose.angleDeg}deg)`,
          }}
        />
      ) : (
        <div
          data-testid="poi-marker"
          className="position-absolute top-50 start-50 rounded-circle border border-4"
          style={{
            width: '4rem',
            height: '4rem',
            // 破れた状態のマーカー（poiTorn画像）の輪の色（#F4D32C）と揃える（issue #62）
            borderColor: '#F4D32C',
            transform: `translate(-50%, -50%) translate(${offsetXPx}px, ${offsetYPx}px) rotate(${pose.angleDeg}deg)`,
          }}
          aria-hidden="true"
        />
      )}

      {showManualControl && (
        <p className="position-absolute bottom-0 start-0 m-2 text-body-secondary small">
          加速度センサーが利用できないため、画面をなぞってポイを操作してください
        </p>
      )}
    </div>
  )
}

// 金魚の群れは60fpsで更新され続けるため、そのステートをApp側に引き上げた際（issue #44）に
// Poiまで不要に再描画されないようメモ化する。onScoop（catchNearestGoldfish）は
// useGoldfishSchool側でuseCallbackにより安定した参照として提供される前提
export const Poi = memo(PoiComponent)
