import goldfish1 from '../assets/goldfish/goldfish-1.png'
import goldfish2 from '../assets/goldfish/goldfish-2.png'
import goldfish3 from '../assets/goldfish/goldfish-3.png'
import goldfish4 from '../assets/goldfish/goldfish-4.png'
import { useGoldfishSchool } from '../goldfish/useGoldfishSchool'

const GOLDFISH_IMAGES = [goldfish1, goldfish2, goldfish3, goldfish4]

export function GoldfishSchool() {
  const poses = useGoldfishSchool(GOLDFISH_IMAGES.length)

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ pointerEvents: 'none' }}
      data-testid="goldfish-school"
    >
      {poses.map((pose, index) => (
        <img
          key={index}
          src={GOLDFISH_IMAGES[index]}
          alt=""
          className="position-absolute top-0 start-0"
          data-testid="goldfish"
          style={{
            width: '3.5rem',
            // left/topではなくtransformで動かす。この要素はposition-fixedの
            // ビューポート全体に対する子要素のため、vw/vhをtranslateへ直接使うことで
            // レイアウト再計算（reflow）を伴わないGPU合成のみの更新にできる（issue #14）。
            // 画像素材は頭が真上を向くよう補正済みのため、headingDeg（0度=右向き）に
            // 合わせて回転させる（真上=270度が基準のため+90度のオフセットが必要）。issue #26
            transform: `translate(${pose.xPercent}vw, ${pose.yPercent}vh) translate(-50%, -50%) rotate(${pose.headingDeg + 90}deg)`,
          }}
        />
      ))}
    </div>
  )
}
