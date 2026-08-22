import { useCallback, useState } from 'react';
import catchSuccessSoundUrl from './assets/sounds/catch-success.mp3';
import poiTearSoundUrl from './assets/sounds/poi-tear.mp3';
import scoopFailSoundUrl from './assets/sounds/scoop-fail.mp3';
import { usePlaySound } from './audio/usePlaySound';
import { BuildInfo } from './components/BuildInfo';
import { CameraBackground } from './components/CameraBackground';
import { GOLDFISH_COUNT, GoldfishSchool } from './components/GoldfishSchool';
import { Poi } from './components/Poi';
import { RankingList } from './components/RankingList';
import type { ViewportPosition } from './goldfish/catchGoldfish';
import { useGoldfishSchool } from './goldfish/useGoldfishSchool';
import type { ScoopIntensity } from './motion/scoopGesture';
import { addRankingEntry, formatElapsedTime, loadRanking, type RankingEntry } from './ranking/ranking';
import { useElapsedTimer } from './ranking/useElapsedTimer';

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
  // タイムは最初の掬うジェスチャーから計測を開始し、ポイが破れた時点で停止して
  // ランキングへ記録する（issue #89）
  const { elapsedMs, start: startTimer, stop: stopTimer } = useElapsedTimer();
  const [ranking, setRanking] = useState<RankingEntry[]>(() => loadRanking());

  const handleScoop = useCallback(
    (poiPosition: ViewportPosition, intensity: ScoopIntensity) => {
      // ポイが既に破れている場合は捕獲を試みない（usePoiMotion側で既にこの状態では
      // 掬うジェスチャー自体を検出しないが、念のため保持する。issue #79）
      if (isTorn) {
        return;
      }
      // 最初の掬うジェスチャーでタイマーを開始する。2回目以降はstartTimer内でno-op（issue #89）
      startTimer();

      if (intensity === 'forceful') {
        // 勢いよく掬うと、捕獲対象の有無・位置に関わらずポイが破れて失敗する
        // （issue #82, #85: 実際の金魚すくいで紙を強く扱うと破れる感覚に合わせる）
        playScoopFailSound();
        playPoiTearSound();
        startFleeingNearestGoldfish(poiPosition);
        setIsTorn(true);
        setRanking(addRankingEntry(stopTimer()));
        return;
      }
      const result = catchNearestGoldfish(poiPosition);
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
        setRanking(addRankingEntry(stopTimer()));
      }
    },
    [
      isTorn,
      catchNearestGoldfish,
      startFleeingNearestGoldfish,
      playCatchSuccessSound,
      playScoopFailSound,
      playPoiTearSound,
      startTimer,
      stopTimer,
    ],
  );

  return (
    <>
      <CameraBackground />
      <GoldfishSchool goldfish={goldfish} />
      <main className="container py-5 position-relative">
        <div className="bg-white bg-opacity-75 rounded-3 p-3 mb-3">
          <h1 className="fs-2 fw-bold">金魚掬い</h1>
          <p className="mb-2 fs-5" data-testid="elapsed-timer">
            タイム: {formatElapsedTime(elapsedMs)}
          </p>
          <BuildInfo />
        </div>
        <Poi onScoop={handleScoop} isTorn={isTorn} />
        <div className="bg-white bg-opacity-75 rounded-3 p-3 mt-3">
          <h2 className="fs-6 fw-bold mb-2">ランキング</h2>
          <RankingList entries={ranking} />
        </div>
      </main>
    </>
  );
}

export default App;
