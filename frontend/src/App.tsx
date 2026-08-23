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
  const { goldfish, catchNearestGoldfish, startFleeingNearestGoldfish, resetGoldfish } =
    useGoldfishSchool(GOLDFISH_COUNT);
  // ポイの中心で金魚を捕獲すると紙が破れ、以降は捕獲できなくなる（issue #45）
  const [isTorn, setIsTorn] = useState(false);
  // 掬うジェスチャーそのものの効果音（issue #48）はPoi.tsx側で鳴らすため、
  // 捕獲の成否・ポイが破れた瞬間専用の効果音はここ（それらを知っているApp側）で鳴らす（issue #66, #68, #69）
  const playCatchSuccessSound = usePlaySound(catchSuccessSoundUrl);
  const playScoopFailSound = usePlaySound(scoopFailSoundUrl);
  const playPoiTearSound = usePlaySound(poiTearSoundUrl);
  // タイムは最初の掬うジェスチャーから計測を開始し、ポイが破れた時点で停止して
  // ランキングへ記録する（issue #89）
  const { elapsedMs, start: startTimer, stop: stopTimer, reset: resetTimer } = useElapsedTimer();
  const [ranking, setRanking] = useState<RankingEntry[]>(() => loadRanking());
  // 記録達成までに捕獲できた金魚の数。タイムと合わせてランキングへ記録する（issue #99）
  const [catchCount, setCatchCount] = useState(0);
  // ゲーム画面はスクロールなしで1画面に収め、ランキングは別画面へ遷移して表示する（issue #101）。
  // URLルーティングは追加せず、単純なstateで画面を切り替える
  const [view, setView] = useState<'game' | 'ranking'>('game');

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
        setRanking(addRankingEntry(stopTimer(), catchCount));
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
      // 捕獲数はランキング記録用に、成否に関わらず捕獲成功のたびに数える（issue #99）
      const nextCatchCount = catchCount + 1;
      setCatchCount(nextCatchCount);
      if (result.isCenterHit) {
        // 中心での捕獲時は、捕獲成功音に加えて破れる音も重ねて鳴らす（issue #69）
        playPoiTearSound();
        setIsTorn(true);
        setRanking(addRankingEntry(stopTimer(), nextCatchCount));
      }
    },
    [
      isTorn,
      catchCount,
      catchNearestGoldfish,
      startFleeingNearestGoldfish,
      playCatchSuccessSound,
      playScoopFailSound,
      playPoiTearSound,
      startTimer,
      stopTimer,
    ],
  );

  // ゲームオーバー後にページ再読み込みなしで再プレイできるようにする（issue #93）。
  // ランキング（issue #89、過去の記録）はリセットしない
  const handleRetry = useCallback(() => {
    resetGoldfish();
    resetTimer();
    setIsTorn(false);
    setCatchCount(0);
  }, [resetGoldfish, resetTimer]);

  // ランキング画面表示中は、カメラ映像・金魚・ポイ（センサー購読）を停止するため、
  // ゲーム画面用のコンポーネントごとアンマウントする（issue #101）
  if (view === 'ranking') {
    return (
      <main className="d-flex flex-column p-3" style={{ height: '100dvh', overflow: 'hidden' }}>
        <div className="d-flex align-items-center gap-2 mb-3 flex-shrink-0">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setView('game')}
            data-testid="back-to-game-button"
          >
            ← ゲームに戻る
          </button>
          <h1 className="fs-4 fw-bold mb-0">ランキング</h1>
        </div>
        <div className="bg-white bg-opacity-75 rounded-3 p-3 overflow-auto">
          <RankingList entries={ranking} />
        </div>
      </main>
    );
  }

  return (
    <>
      <CameraBackground />
      <GoldfishSchool goldfish={goldfish} />
      <main className="d-flex flex-column p-3" style={{ height: '100dvh', overflow: 'hidden' }}>
        <div className="bg-white bg-opacity-75 rounded-3 p-3 mb-3 flex-shrink-0">
          <div className="d-flex align-items-baseline justify-content-between flex-wrap gap-2 mb-2">
            <div className="d-flex align-items-baseline flex-wrap gap-2">
              <h1 className="fs-2 fw-bold mb-0">金魚掬い</h1>
              <BuildInfo />
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setView('ranking')}
              data-testid="show-ranking-button"
            >
              ランキング
            </button>
          </div>
          {isTorn && (
            // ポイが破れて操作不能になった（issue #79）ことが見た目（マーカー画像の
            // 切り替え）だけでは分かりにくいという指摘を受け、明示的な表示を追加した（issue #91）
            <div className="alert alert-danger text-center py-2 mb-2" role="alert" data-testid="game-over-message">
              <p className="fw-bold mb-2">ゲームオーバー</p>
              <button type="button" className="btn btn-primary" onClick={handleRetry} data-testid="retry-button">
                リトライ
              </button>
            </div>
          )}
          <p className="mb-0 fs-5" data-testid="elapsed-timer">
            タイム: {formatElapsedTime(elapsedMs)}
          </p>
        </div>
        {/* ポイ操作エリアの高さは残り領域いっぱいに可変とし、画面全体を100dvh内に収めて
            縦スクロールを発生させない（issue #101） */}
        <div className="flex-grow-1" style={{ minHeight: 0 }}>
          <Poi onScoop={handleScoop} isTorn={isTorn} />
        </div>
      </main>
    </>
  );
}

export default App;
