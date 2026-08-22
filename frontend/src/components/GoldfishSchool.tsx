import goldfish1 from '../assets/goldfish/goldfish-1.png'
import goldfish2 from '../assets/goldfish/goldfish-2.png'
import goldfish3 from '../assets/goldfish/goldfish-3.png'
import goldfish4 from '../assets/goldfish/goldfish-4.png'
import type { GoldfishPose } from '../goldfish/useGoldfishSchool'

const GOLDFISH_IMAGES = [goldfish1, goldfish2, goldfish3, goldfish4]

export const GOLDFISH_COUNT = GOLDFISH_IMAGES.length

export interface GoldfishSchoolProps {
  goldfish: GoldfishPose[]
}

// 金魚の状態（位置・更新）はApp側でuseGoldfishSchoolにより保持し、本コンポーネントは
// 受け取ったposeを描画するだけの表示専用コンポーネントとする。掬うジェスチャーによる
// 捕獲判定にはポイ側（App）も金魚の位置情報が必要なため、Appに状態を集約した（issue #44）
export function GoldfishSchool({ goldfish }: GoldfishSchoolProps) {
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ pointerEvents: 'none' }}
      data-testid="goldfish-school"
    >
      {goldfish.map((pose) => (
        <img
          key={pose.id}
          // 捕獲による除去後も配列内の位置（index）がずれるため、配列の並び順ではなく
          // 安定したidを基準に画像を割り当てる
          src={GOLDFISH_IMAGES[pose.id % GOLDFISH_IMAGES.length]}
          alt=""
          className="position-absolute top-0 start-0"
          data-testid="goldfish"
          style={{
            width: '3.5rem',
            // left/topではなくtransformで動かす。この要素はposition-fixedの
            // ビューポート全体に対する子要素のため、vw/vhをtranslateへ直接使うことで
            // レイアウト再計算（reflow）を伴わないGPU合成のみの更新にできる（issue #14）。
            // 画像素材は頭が真上を向くよう補正済みのため、見た目の回転角度（displayHeadingDeg、
            // 0度=右向き）に合わせて回転させる（真上=270度が基準のため+90度のオフセットが必要）。
            // 転回時の唐突な向き反転を避けるため、物理的な進行方向（headingDeg）ではなく
            // 滑らかに追従するdisplayHeadingDegを使う（issue #26, #29）
            transform: `translate(${pose.xPercent}vw, ${pose.yPercent}vh) translate(-50%, -50%) rotate(${pose.displayHeadingDeg + 90}deg)`,
          }}
        />
      ))}
    </div>
  )
}
