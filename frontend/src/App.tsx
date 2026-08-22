import { BuildInfo } from './components/BuildInfo';
import { CameraBackground } from './components/CameraBackground';
import { GOLDFISH_COUNT, GoldfishSchool } from './components/GoldfishSchool';
import { Poi } from './components/Poi';
import { useGoldfishSchool } from './goldfish/useGoldfishSchool';

function App() {
  // 掬うジェスチャー（Poi）と金魚の位置判定を組み合わせて捕獲するため、
  // 金魚の状態をAppで保持し、両コンポーネントへ配線する（issue #44）
  const { goldfish, catchNearestGoldfish } = useGoldfishSchool(GOLDFISH_COUNT);

  return (
    <>
      <CameraBackground />
      <GoldfishSchool goldfish={goldfish} />
      <main className="container py-5 position-relative">
        <div className="bg-white bg-opacity-75 rounded-3 p-3 mb-3">
          <h1 className="fs-2 fw-bold">金魚掬い</h1>
          <p className="text-body-secondary">
            スマートフォンの加速度センサーでポイを操作し、カメラ映像に重ねて表示される金魚をすくう体験アプリです。
          </p>
          <BuildInfo />
        </div>
        <Poi onScoop={catchNearestGoldfish} />
      </main>
    </>
  );
}

export default App;
