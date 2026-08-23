import type { PointerEvent as ReactPointerEvent } from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import poiTorn from '../assets/poi/poi-torn.png'
import type { ViewportPosition } from '../goldfish/catchGoldfish'
import { usePoiMotion } from '../motion/usePoiMotion'
import type { ScoopIntensity } from '../motion/scoopGesture'

export interface PoiProps {
  // intensityは掬う動作の勢い（issue #82）。優しく('gentle')掬えたか、
  // 勢いよく('forceful')掬ったかを呼び出し側（App.tsx）の成否判定に使う
  onScoop?: (position: ViewportPosition, intensity: ScoopIntensity) => void
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
    if (!pond || !onScoop || !debug.lastScoopIntensity) {
      return
    }
    const rect = pond.getBoundingClientRect()
    const poiViewportX = rect.left + rect.width / 2 + offsetXPx
    const poiViewportY = rect.top + rect.height / 2 + offsetYPx
    onScoop(
      {
        xVw: (poiViewportX / window.innerWidth) * 100,
        yVh: (poiViewportY / window.innerHeight) * 100,
      },
      debug.lastScoopIntensity,
    )
  }, [debug.scoopCount, debug.lastScoopIntensity, offsetXPx, offsetYPx, onScoop])

  return (
    <div
      ref={pondRef}
      className="position-relative rounded-3 overflow-hidden border border-2 border-white h-100"
      style={{ touchAction: 'none' }}
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
            // 実機フィードバックを踏まえ、一回り大きくした（issue #87。従来4rem）
            width: '5rem',
            transform: `translate(-50%, -50%) translate(${offsetXPx}px, ${offsetYPx}px) rotate(${pose.angleDeg}deg)`,
          }}
        />
      ) : (
        <div
          data-testid="poi-marker"
          className="position-absolute top-50 start-50 rounded-circle border border-4"
          style={{
            // 実機フィードバックを踏まえ、一回り大きくした（issue #87。従来4rem）
            width: '5rem',
            height: '5rem',
            // 破れた状態のマーカー（poiTorn画像）の輪の色（#F4D32C）と揃える（issue #62）
            borderColor: '#F4D32C',
            transform: `translate(-50%, -50%) translate(${offsetXPx}px, ${offsetYPx}px) rotate(${pose.angleDeg}deg)`,
          }}
          aria-hidden="true"
        />
      )}

      {showManualControl && (
        // 池の背景（カメラ映像等）に対して文字色が暗く視認しにくいという実機報告があったため、
        // デバッグ表示（下記）と同様に白字＋半透明の暗色背景にして視認性を確保する（issue #109）
        <p className="position-absolute bottom-0 start-0 m-2 text-white bg-dark bg-opacity-50 rounded px-2 py-1 small">
          加速度センサーが利用できないため、画面をなぞってポイを操作してください
        </p>
      )}

      {/* センサーが実機で反応しないという報告（issue #109）の原因切り分け用の一時的な
          デバッグ表示。「センサーを有効にする」ボタン（issue #109で一度追加）は実機で
          押しても許可ダイアログ自体が出ないことが判明したため撤去し、代わりに
          許可状態・イベント受信数を可視化して原因調査を進める */}
      <p
        className="position-absolute top-0 start-0 m-2 text-white bg-dark bg-opacity-50 rounded px-2 py-1 small"
        style={{ fontFamily: 'monospace' }}
        data-testid="poi-debug"
      >
        許可: {permission} / 向き受信: {debug.orientationEventCount} / 加速度受信: {debug.motionEventCount} / 加速度: (
        {debug.lastAcceleration.x.toFixed(2)}, {debug.lastAcceleration.y.toFixed(2)}) / 許可結果:{' '}
        {debug.lastPermissionResult ?? '-'}
      </p>
    </div>
  )
}

// 金魚の群れは60fpsで更新され続けるため、そのステートをApp側に引き上げた際（issue #44）に
// Poiまで不要に再描画されないようメモ化する。onScoop（catchNearestGoldfish）は
// useGoldfishSchool側でuseCallbackにより安定した参照として提供される前提
export const Poi = memo(PoiComponent)
