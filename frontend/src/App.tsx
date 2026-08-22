import { useCallback, useState } from 'react';
import catchSuccessSoundUrl from './assets/sounds/catch-success.mp3';
import poiTearSoundUrl from './assets/sounds/poi-tear.mp3';
import scoopFailSoundUrl from './assets/sounds/scoop-fail.mp3';
import { usePlaySound } from './audio/usePlaySound';
import { BuildInfo } from './components/BuildInfo';
import { CameraBackground } from './components/CameraBackground';
import { GOLDFISH_COUNT, GoldfishSchool } from './components/GoldfishSchool';
import { Poi } from './components/Poi';
import type { ViewportPosition } from './goldfish/catchGoldfish';
import { useGoldfishSchool } from './goldfish/useGoldfishSchool';
import type { ScoopIntensity } from './motion/scoopGesture';

function App() {
  // 掬うジェスチャー（Poi）と金魚の位置判定を組み合わせて捕獲するため、
  // 金魚の状態をAppで保持し、両コンポーネントへ配線する（issue #44）
  const { goldfish, catchNearestGoldfish, startFleeingNearestGoldfish } = useGoldfishSchool(GOLDFISH_COUNT);
  // ポイの中心で金魚を捕獲すると紙が破れ、以降は捕獲できなくなる（issue #45）
  const [isTorn, setIsTorn] = useState(false);
  // 掬うジェスチャーそのものの効果音（issue #48）はPoi.tsx側で鳴らすため、
  // 捕獲の成否・ポイが破れた瞬間専用の効果音はここ（それらを知っているApp側）で鳴らす（issue #66, #68, #69）
  const playCatchSuccessSound = usePlaySound(catchSuccessSoundUrl);
  const playScoopFailSound = usePlaySound(scoopFailSoundUrl);
  const playPoiTearSound = usePlaySound(poiTearSoundUrl);

  const handleScoop = useCallback(
    (poiPosition: ViewportPosition, intensity: ScoopIntensity) => {
      // ポイが既に破れている場合、または勢いよく掬った場合は、位置に関わらず
      // 捕獲を試みず常に「失敗」として扱う（issue #82）
      const result = isTorn || intensity === 'forceful' ? null : catchNearestGoldfish(poiPosition);
      if (result === null) {
        // 捕獲できなかった場合、専用の効果音を鳴らし、驚いた近くの金魚が逃げる（issue #53, #68）
        playScoopFailSound();
        startFleeingNearestGoldfish(poiPosition);
        return;
      }
      playCatchSuccessSound();
      if (result.isCenterHit) {
        // 中心での捕獲時は、捕獲成功音に加えて破れる音も重ねて鳴らす（issue #69）
        playPoiTearSound();
        setIsTorn(true);
      }
    },
    [
      isTorn,
      catchNearestGoldfish,
      startFleeingNearestGoldfish,
      playCatchSuccessSound,
      playScoopFailSound,
      playPoiTearSound,
    ],
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
