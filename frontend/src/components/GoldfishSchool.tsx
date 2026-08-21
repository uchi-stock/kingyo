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
          className="position-absolute"
          data-testid="goldfish"
          style={{
            left: `${pose.xPercent}%`,
            top: `${pose.yPercent}%`,
            width: '3.5rem',
            transform: `translate(-50%, -50%) scaleX(${pose.facingLeft ? -1 : 1})`,
            transition: 'left 0.1s linear, top 0.1s linear',
          }}
        />
      ))}
    </div>
  )
}
