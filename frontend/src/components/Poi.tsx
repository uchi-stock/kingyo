import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import poiTorn from '../assets/poi/poi-torn.png'
import type { ViewportPosition } from '../goldfish/catchGoldfish'
import type { PoiMotionState } from '../motion/poiMotion'
import { usePoiMotion } from '../motion/usePoiMotion'
import type { ScoopIntensity } from '../motion/scoopGesture'

export interface PoiProps {
  // intensityは掬う動作の勢い（issue #82）。優しく('gentle')掬えたか、
  // 勢いよく('forceful')掬ったかを呼び出し側（App.tsx）の成否判定に使う
  onScoop?: (position: ViewportPosition, intensity: ScoopIntensity) => void
  // ポイの中心で金魚を捕獲し紙が破れた状態かどうか（issue #45）。
  // 破れた状態ではマーカー表示を破れ画像に切り替える
  isTorn?: boolean
  // ワールドパンオフセット共有用のref（issue #72）。App.tsxで生成され、
  // GoldfishSchoolとも共有する。usePoiMotionへそのまま渡す
  worldOffsetRef?: RefObject<PoiMotionState>
}

function PoiComponent({ onScoop, isTorn = false, worldOffsetRef }: PoiProps) {
  const { permission, pose, debug, setPositionFromPointer } = usePoiMotion(isTorn, worldOffsetRef)
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

  // 加速度センサーが使えない環境（showManualControl）では、傾きのフリック操作による
  // 掬うジェスチャー検出（usePoiMotion側）が機能しないため、画面（pond領域）への
  // タップ（指を離した瞬間）を「掬う」ジェスチャーとして扱う（issue #124）。
  // pointerdownではなくpointerupをトリガーにするのは、ドラッグでポイを位置合わせ
  // する操作（onPointerDown/onPointerMoveでhandlePointerInputを呼ぶ既存の操作）と
  // 「その位置で掬う」操作を、タップ開始ではなく完了時点で区別するため。
  // 勢い（ScoopIntensity）の区別は行わず、常に'gentle'として扱う。ポイが破れている
  // 場合は、センサー操作時の掬うジェスチャー検出と同様に無効にする（issue #79と同様の扱い）
  const handleManualScoop = (event: ReactPointerEvent<HTMLDivElement>) => {
    handlePointerInput(event)
    if (isTorn || !onScoop) {
      return
    }
    onScoop(
      {
        xVw: (event.clientX / window.innerWidth) * 100,
        yVh: (event.clientY / window.innerHeight) * 100,
      },
      'gentle',
    )
  }

  // フォールバック操作時（showManualControl、issue #124）のみ使う、ポイ自身の
  // pond相対オンスクリーン位置。ポインタでポイを直接動かす既存の意味のまま
  const manualOffsetXPx = ((pose.xPercent - 50) / 100) * pondSize.width
  const manualOffsetYPx = ((pose.yPercent - 50) / 100) * pondSize.height

  // センサー操作時（issue #72）は、ポイ自体は画面中央に固定表示し、代わりに金魚側が
  // このワールドパンオフセット（中心50を基準としたvw/vh単位、GoldfishSchoolと同じ解釈）
  // の分だけ逆方向へパンする。捕獲・逃走判定の実効位置計算にのみ使い、マーカー描画には
  // 使わない（マーカーは常に中央固定のため）
  const worldOffsetXVw = pose.xPercent - 50
  const worldOffsetYVh = pose.yPercent - 50

  // 掬うジェスチャーが検出された瞬間のポイの実効ビューポート位置を、金魚の捕獲判定へ
  // 渡す（issue #44）。フォールバック操作時はポイ自身のpond内位置（従来通り）、
  // センサー操作時はポイの表示位置（pond中心固定）にワールドパンオフセットを加えた
  // 「金魚のワールド座標系での実効位置」を使う（issue #72）。GoldfishSchool側の
  // 表示シフト（ポイモーション出力の符号を反転）と対になる符号（反転しない）で
  // 適用することで、金魚の生座標と正しく比較できる
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
    const pondCenterXVw = ((rect.left + rect.width / 2) / window.innerWidth) * 100
    const pondCenterYVh = ((rect.top + rect.height / 2) / window.innerHeight) * 100
    const effectiveXVw = showManualControl
      ? pondCenterXVw + ((manualOffsetXPx / window.innerWidth) * 100)
      : pondCenterXVw + worldOffsetXVw
    const effectiveYVh = showManualControl
      ? pondCenterYVh + ((manualOffsetYPx / window.innerHeight) * 100)
      : pondCenterYVh + worldOffsetYVh
    onScoop({ xVw: effectiveXVw, yVh: effectiveYVh }, debug.lastScoopIntensity)
  }, [
    debug.scoopCount,
    debug.lastScoopIntensity,
    manualOffsetXPx,
    manualOffsetYPx,
    worldOffsetXVw,
    worldOffsetYVh,
    showManualControl,
    onScoop,
  ])

  return (
    <div
      ref={pondRef}
      className="position-relative rounded-3 overflow-hidden border border-2 border-white h-100"
      style={{ touchAction: 'none' }}
      onPointerDown={showManualControl ? handlePointerInput : undefined}
      onPointerMove={showManualControl ? handlePointerInput : undefined}
      onPointerUp={showManualControl ? handleManualScoop : undefined}
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
            // センサー操作時（issue #72）はポイ自体を画面中央に固定表示し、金魚側を
            // パンさせる（GoldfishSchool参照）。フォールバック操作時（showManualControl、
            // issue #124）は従来通りポイ自身をpond内で動かす
            transform: showManualControl
              ? `translate(-50%, -50%) translate(${manualOffsetXPx}px, ${manualOffsetYPx}px) rotate(${pose.angleDeg}deg)`
              : `translate(-50%, -50%) rotate(${pose.angleDeg}deg)`,
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
            transform: showManualControl
              ? `translate(-50%, -50%) translate(${manualOffsetXPx}px, ${manualOffsetYPx}px) rotate(${pose.angleDeg}deg)`
              : `translate(-50%, -50%) rotate(${pose.angleDeg}deg)`,
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

      {/* センサーが実機で反応しないという報告（issue #109）の原因切り分け用のデバッグ表示。
          issue #109の根本原因（許可リクエストのトリガーにpointerdownを使っていたため
          iOS Safariでユーザー操作起点と認識されなかったこと）は特定・修正済みだが、
          再発時の切り分けに使えるよう表示自体は残す。修正済みのため、白字＋暗色背景の
          目立つ表示から、黒字のみの目立たない表示に変更する */}
      <p
        className="position-absolute top-0 start-0 m-2 text-dark opacity-75 small"
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
