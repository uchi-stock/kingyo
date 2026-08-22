import { useCallback, useState } from 'react';
import { BuildInfo } from './components/BuildInfo';
import { CameraBackground } from './components/CameraBackground';
import { GOLDFISH_COUNT, GoldfishSchool } from './components/GoldfishSchool';
import { Poi } from './components/Poi';
import type { ViewportPosition } from './goldfish/catchGoldfish';
import { useGoldfishSchool } from './goldfish/useGoldfishSchool';

function App() {
  // 掬うジェスチャー（Poi）と金魚の位置判定を組み合わせて捕獲するため、
  // 金魚の状態をAppで保持し、両コンポーネントへ配線する（issue #44）
  const { goldfish, catchNearestGoldfish } = useGoldfishSchool(GOLDFISH_COUNT);
  // ポイの中心で金魚を捕獲すると紙が破れ、以降は捕獲できなくなる（issue #45）
  const [isTorn, setIsTorn] = useState(false);

  const handleScoop = useCallback(
    (poiPosition: ViewportPosition) => {
      if (isTorn) {
        return;
      }
      const result = catchNearestGoldfish(poiPosition);
      if (result?.isCenterHit) {
        setIsTorn(true);
      }
    },
    [isTorn, catchNearestGoldfish],
  );

  return (
    <>
      <CameraBackground />
      <GoldfishSchool goldfish={goldfish} />
      <main className="container py-5 position-relative">
        <div className="bg-white bg-opacity-75 rounded-3 p-3 mb-3">
          <h1 className="fs-2 fw-bold">金魚掬い</h1>
          <BuildInfo />
        </div>
        <Poi onScoop={handleScoop} isTorn={isTorn} />
      </main>
    </>
  );
}

export default App;
