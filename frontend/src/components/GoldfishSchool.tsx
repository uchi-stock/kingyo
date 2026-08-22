import goldfish1 from '../assets/goldfish/goldfish-1.png'
import goldfish2 from '../assets/goldfish/goldfish-2.png'
import goldfish3 from '../assets/goldfish/goldfish-3.png'
import goldfish4 from '../assets/goldfish/goldfish-4.png'
import type { GoldfishPose } from '../goldfish/useGoldfishSchool'

const GOLDFISH_IMAGES = [goldfish1, goldfish2, goldfish3, goldfish4]

// 画像素材は4種類だが、金魚の匹数はそれとは独立に決める（issue #57）。
// 画像割り当てはpose.id % GOLDFISH_IMAGES.lengthで循環させているため、
// 匹数が画像の種類数を超えても同じ画像が複数の金魚に使われるだけで問題なく動作する
export const GOLDFISH_COUNT = 8

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
        <div
          key={pose.id}
          className="position-absolute top-0 start-0"
          data-testid="goldfish"
          style={{
            // left/topではなくtransformで動かす。この要素はposition-fixedの
            // ビューポート全体に対する子要素のため、vw/vhをtranslateへ直接使うことで
            // レイアウト再計算（reflow）を伴わないGPU合成のみの更新にできる（issue #14）。
            // 転回時の唐突な向き反転を避けるため、物理的な進行方向（headingDeg）ではなく
            // 滑らかに追従するdisplayHeadingDegを使う（issue #26, #29）。
            // 位置・回転は毎フレームJSで直接更新するため、この要素自体にはCSSトランジションを
            // かけない（かけると不要な補間が入り視覚的な遅延が生じる。issue #14と同種の問題）
            transform: `translate(${pose.xPercent}vw, ${pose.yPercent}vh) translate(-50%, -50%) rotate(${pose.displayHeadingDeg + 90}deg)`,
          }}
        >
          <img
            // 捕獲による除去後も配列内の位置（index）がずれるため、配列の並び順ではなく
            // 安定したidを基準に画像を割り当てる
            src={GOLDFISH_IMAGES[pose.id % GOLDFISH_IMAGES.length]}
            alt=""
            style={{
              width: '3.5rem',
              display: 'block',
              // 拡大率・不透明度のみをCSSトランジションでアニメーションする。位置・回転を
              // 担う親要素とは別のこの要素に分離することで、遊泳中の毎フレーム更新には
              // トランジションが影響しない（issue #52）
              transition: 'transform 450ms ease-out, opacity 450ms ease-out',
              opacity: pose.isCaught ? 0 : 1,
              transform: pose.isCaught ? 'scale(1.6)' : 'scale(1)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
