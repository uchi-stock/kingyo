import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App.tsx';
import { GOLDFISH_COUNT } from './components/GoldfishSchool.tsx';
import { createInitialGoldfishState } from './goldfish/goldfishSwim.ts';

// jsdom既定のDeviceMotionEventスタブを退避しておき、各テスト後に復元する（Poi.test.tsxと同様の理由）
const originalDeviceMotionEvent = window.DeviceMotionEvent;
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

// pondがビューポート全体（200x100）と一致するようにし、ポイのpond相対%と
// 金魚のvw/vhが数値として一致するようにする（座標変換の検証を単純化する）。
// ポインタ操作でポイの位置を正確に制御できるよう、フォールバック操作も有効にする
function setUpMatchingPondAndViewport() {
  // @ts-expect-error テスト用にセンサーAPIが存在しない環境を再現する
  delete window.DeviceMotionEvent;

  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 200 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100 });
  Element.prototype.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 200,
    bottom: 100,
    width: 200,
    height: 100,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 200 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 100 });
}

// useGoldfishSchoolのcreateEntitiesと同じ式（(id+1)/(count+1)）でseedを算出し、
// createInitialGoldfishStateで金魚idの初期位置を求める。GOLDFISH_COUNTの変更（issue #57）
// に追従できるよう、初期位置の数値をテストに直接ハードコードしない
function goldfishInitialPosition(id: number): { xPercent: number; yPercent: number } {
  const seed = (id + 1) / (GOLDFISH_COUNT + 1);
  return createInitialGoldfishState(seed);
}

// pondがビューポートと一致しているため、pond内%とビューポート相対vw/vhの数値が一致する。
// xPercent/yPercentのpond内%を、pond（200x100）上のclientX/clientYへ変換する
function pointerAt(xPercent: number, yPercent: number): { clientX: number; clientY: number } {
  return { clientX: 200 * (xPercent / 100), clientY: 100 * (yPercent / 100) };
}

// GoldfishSchoolの`translate(XXvw, YYvh) ...`から数値部分を取り出す（issue #53の移動量検証用）
function parseTranslateVwVh(transform: string): { xVw: number; yVh: number } {
  const match = transform.match(/translate\(([-\d.]+)vw, ([-\d.]+)vh\)/);
  if (!match) {
    throw new Error(`unexpected transform: ${transform}`);
  }
  return { xVw: Number.parseFloat(match[1]), yVh: Number.parseFloat(match[2]) };
}

// Audioコンストラクタをモックし、srcごとのplay()呼び出し回数を記録する。
// usePlaySoundは画面への最初のpointerdownで無音アンロック用のplay()を1回呼ぶため
// （issue #73）、実際のゲームロジックによる再生かどうかはコンストラクタ呼び出しの有無ではなく、
// アンロック分の1回を超えてplay()が呼ばれたかどうかで判定する
function mockAudioPlayCounts(): Map<string, number> {
  const playCountsBySrc = new Map<string, number>();
  const AudioMock = vi.fn().mockImplementation(function AudioMock(src?: string) {
    const resolvedSrc = src ?? '';
    return {
      play: vi.fn().mockImplementation(() => {
        playCountsBySrc.set(resolvedSrc, (playCountsBySrc.get(resolvedSrc) ?? 0) + 1);
        return Promise.resolve(undefined);
      }),
      pause: vi.fn(),
      currentTime: 0,
      muted: false,
      src: resolvedSrc,
    };
  });
  vi.stubGlobal('Audio', AudioMock);
  return playCountsBySrc;
}

function playCountFor(playCountsBySrc: Map<string, number>, srcFragment: string): number {
  let total = 0;
  for (const [src, count] of playCountsBySrc) {
    if (src.includes(srcFragment)) {
      total += count;
    }
  }
  return total;
}

interface RankingApiEntry {
  timeMs: number;
  catchCount: number;
  recordedAt: string;
}

// ランキングAPI（issue #110, #113）をfetchモックで再現する。GET/POST /rankingに対し、
// 実際のバックエンド（backend/src/services/rankingService.js）と同じ並び替え
// （記録時間の降順）・上位10件への切り詰めをin-memoryで行う
function mockRankingApi() {
  const entries: RankingApiEntry[] = [];
  function sortedTop10(): RankingApiEntry[] {
    return [...entries].sort((a, b) => b.timeMs - a.timeMs).slice(0, 10);
  }
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/ranking' && init?.method === 'POST') {
      const body = JSON.parse(init.body as string) as { timeMs: number; catchCount: number };
      entries.push({ ...body, recordedAt: new Date().toISOString() });
      return { ok: true, json: async () => sortedTop10() } as Response;
    }
    return { ok: true, json: async () => sortedTop10() } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return { getEntries: () => sortedTop10() };
}

describe('App', () => {
  beforeEach(() => {
    // ランキングAPI（issue #110）を呼ばないテストでも、App起動時のGET /ranking
    // 呼び出し自体は必ず発生するため、既定では常に空のランキングを返すスタブを
    // 用意しておく（実ネットワークへ通信しない）。実際の記録を検証したいテストは
    // mockRankingApi()で上書きする
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] }) as Response));
  });

  afterEach(() => {
    window.DeviceMotionEvent = originalDeviceMotionEvent;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('起動時（オープニング）、画面全体のラッパーがフェードイン用のクラスを持つ（issue #138）', () => {
    render(<App />);
    expect(screen.getByTestId('app-opening')).toHaveClass('app-opening-fade-in');
  });

  it('ランキング画面へ遷移して戻っても、オープニング用ラッパー自体は同じ要素のまま維持される（issue #138）', () => {
    // フェードインのCSSアニメーションは要素の初回マウント時にのみ再生される。
    // view切り替えでラッパー自体が作り直される（アンマウント→再マウント）と、
    // 画面遷移のたびに再生されてしまうため、同一要素が維持されることを保証する
    render(<App />);
    const openingWrapper = screen.getByTestId('app-opening');

    fireEvent.click(screen.getByTestId('show-ranking-button'));
    fireEvent.click(screen.getByTestId('back-to-game-button'));

    expect(screen.getByTestId('app-opening')).toBe(openingWrapper);
  });

  it('ゲーム画面の<main>はposition-relativeを持つ（issue #105）', () => {
    // position: fixedのCameraBackground・GoldfishSchoolより後にDOM上へ現れる<main>が
    // position指定を持たないと、CSSの描画順序上タイトル等のテキストがそれらの背後に
    // 隠れてしまう（issue #101で発生した回帰）。position-relativeが外れないことを保証する
    const { container } = render(<App />);
    expect(container.querySelector('main')).toHaveClass('position-relative');
  });

  it(`金魚が${GOLDFISH_COUNT}匹表示される（issue #57）`, () => {
    render(<App />);
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);
  });

  it('掬うフリック操作をした瞬間、ポイの近くに金魚がいればその金魚が拡大しながらフェードアウトして消える（issue #44, #52）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);

    // 1匹目の金魚（id=0）の初期位置にポイを合わせれば、捕獲半径内に収まる
    const { xPercent, yPercent } = goldfishInitialPosition(0);
    const pond = screen.getByTestId('pond');
    fireEvent.pointerDown(pond, pointerAt(xPercent, yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが20度変化 = 400度/秒（検出閾値180は超えるが勢いの閾値600は超えない「優しい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    // 捕獲直後はフェードアウト演出中のため、まだDOMに残っている（不透明度0・拡大表示）
    await waitFor(() => {
      const img = screen.getAllByTestId('goldfish')[0].querySelector('img');
      expect(img).toHaveStyle({ opacity: '0' });
    });
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);

    // 演出時間（450ms）が経過すると、実際にDOMから除去される
    now += 500;
    await waitFor(() => {
      expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT - 1);
    });
  });

  it('掬うフリック操作をしても、ポイの近くに金魚がいなければ何も起きない', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');
    // どの金魚の初期位置からも十分離れた中央付近にポイを置く
    fireEvent.pointerDown(pond, { clientX: 100, clientY: 50 });

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが20度変化 = 400度/秒（勢いの閾値600は超えない「優しい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    // 掬うジェスチャー自体は検出されるが、近くに金魚がいないため捕獲は起きない。
    // 非同期処理が一巡するのを待ってから、金魚の数が変化していないことを確認する
    await waitFor(() => {
      expect(screen.getByTestId('pond')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);
  });

  it('ポイの中心（従来は破れる判定だった半径6以内）で金魚を捕獲しても、ポイは破れず捕獲を続けられる（issue #132）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');
    const marker = screen.getByTestId('poi-marker');
    expect(marker.tagName).toBe('DIV');

    // 1匹目の金魚（id=0）の真上（距離0）にポイを合わせ、中心での捕獲を再現する
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent, fish0.yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが20度変化 = 400度/秒（勢いの閾値600は超えない「優しい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    // 捕獲アニメーション中は一時的にopacity 0で表示される
    await waitFor(() => {
      const img = screen.getAllByTestId('goldfish')[0].querySelector('img');
      expect(img).toHaveStyle({ opacity: '0' });
    });
    // 中心で捕獲してもポイは破れない（マーカーは通常表示のDIVのまま）
    expect(screen.getByTestId('poi-marker').tagName).toBe('DIV');

    // 捕獲アニメーション（450ms）と、2匹目への掬うジェスチャーのクールダウン（500ms）を
    // まとめて経過させる
    now += 600;

    // 2匹目の金魚（id=1）の真上にポイを合わせ、
    // ポイが破れていないため続けて捕獲できることを確認する
    const fish1 = goldfishInitialPosition(1);
    fireEvent.pointerDown(pond, pointerAt(fish1.xPercent, fish1.yPercent));

    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 80 }));

    await waitFor(() => {
      const img = screen.getAllByTestId('goldfish')[1].querySelector('img');
      expect(img).toHaveStyle({ opacity: '0' });
    });
    expect(screen.getByTestId('poi-marker').tagName).toBe('DIV');
  });

  it('金魚の捕獲に成功すると、短いバイブレーションが発生する（issue #106）', async () => {
    setUpMatchingPondAndViewport();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // ポイの中心（距離0）で捕獲しても、捕獲成功時はポイが破れない（issue #132）ため、
    // ゲームオーバー用の長いバイブレーションとは混ざらないはず
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent, fish0.yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    await waitFor(() => {
      const img = screen.getAllByTestId('goldfish')[0].querySelector('img');
      expect(img).toHaveStyle({ opacity: '0' });
    });
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(50);

    // @ts-expect-error テストで追加したvibrateプロパティを元に戻す
    delete navigator.vibrate;
  });

  it('勢いよく掬ってポイが破れた場合も、バイブレーションが発生する（issue #103）', async () => {
    setUpMatchingPondAndViewport();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // 1匹目の金魚（id=0）の真上（距離0）にポイを合わせる
    const { xPercent, yPercent } = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(xPercent, yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが300度変化 = 6000度/秒（勢いの閾値600度/秒を超える「勢いのよい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 300 }));

    await waitFor(() => {
      expect(screen.getByTestId('poi-marker').getAttribute('src')).toContain('poi-torn');
    });
    expect(vibrate).toHaveBeenCalledTimes(1);

    // @ts-expect-error テストで追加したvibrateプロパティを元に戻す
    delete navigator.vibrate;
  });

  it('掬いに失敗すると、範囲内の最も近い金魚がポイから離れる方向へ加速して逃げる（issue #53）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // 1匹目の金魚（id=0）から水平に15離れた位置
    // （捕獲半径10の外側・逃走対象半径20の内側で、他のどの金魚からも逃走対象半径より
    // 遠いため、id=0だけが逃走対象になる）にポイを合わせる
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent - 15, fish0.yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが20度変化 = 400度/秒（勢いの閾値600は超えない「優しい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    // 捕獲は起きない（距離15は捕獲半径10の外側）
    await waitFor(() => {
      expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);
    });
    const beforeTransform = screen.getAllByTestId('goldfish')[0].style.transform;
    const before = parseTranslateVwVh(beforeTransform);

    // 逃走中は通常速度の3倍（15%/秒）で泳ぐため、0.2秒でも通常（最大1%）を大きく上回る
    // 距離（最大3%）を移動する
    now += 200;
    await waitFor(() => {
      expect(screen.getAllByTestId('goldfish')[0].style.transform).not.toBe(beforeTransform);
    });
    const after = parseTranslateVwVh(screen.getAllByTestId('goldfish')[0].style.transform);
    const distance = Math.hypot(after.xVw - before.xVw, after.yVh - before.yVh);
    expect(distance).toBeGreaterThan(1.5);
  });

  it('金魚の真上でも、勢いよく掬うと位置に関わらずポイが破れて捕獲に失敗する（issue #82, #85）', async () => {
    setUpMatchingPondAndViewport();
    const playCountsBySrc = mockAudioPlayCounts();
    const rankingApi = mockRankingApi();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');
    const marker = screen.getByTestId('poi-marker');
    expect(marker.tagName).toBe('DIV');

    // 1匹目の金魚（id=0）の真上（距離0）にポイを合わせる（優しく掬えば必ず捕獲できる位置）
    const { xPercent, yPercent } = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(xPercent, yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが300度変化 = 6000度/秒（勢いの閾値600度/秒を超える「勢いのよい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 300 }));

    // 位置的には捕獲できるはずだが、勢いがよすぎるためポイが破れて失敗として扱われる
    await waitFor(() => {
      expect(playCountFor(playCountsBySrc, 'scoop-fail')).toBeGreaterThan(1);
    });
    expect(playCountFor(playCountsBySrc, 'catch-success')).toBe(1);
    expect(playCountFor(playCountsBySrc, 'poi-tear')).toBeGreaterThan(1);
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);
    expect(screen.getByTestId('poi-marker').tagName).toBe('IMG');
    expect(screen.getByTestId('poi-marker').getAttribute('src')).toContain('poi-torn');

    // 一度も捕獲できていないため、ランキングの捕獲数は0で記録される（issue #99）
    await waitFor(() => {
      expect(rankingApi.getEntries()).toHaveLength(1);
    });
    expect(rankingApi.getEntries()[0].catchCount).toBe(0);
    // ランキングは別画面（issue #101）のため、遷移してから確認する
    fireEvent.click(screen.getByTestId('show-ranking-button'));
    await waitFor(() => {
      expect(screen.getByTestId('ranking-list')).toHaveTextContent('（0匹）');
    });
  });

  it('金魚の捕獲に成功すると、専用の効果音（catch-success.mp3）が再生される（issue #66）', async () => {
    setUpMatchingPondAndViewport();
    const playCountsBySrc = mockAudioPlayCounts();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);

    const { xPercent, yPercent } = goldfishInitialPosition(0);
    const pond = screen.getByTestId('pond');
    fireEvent.pointerDown(pond, pointerAt(xPercent, yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが20度変化 = 400度/秒（勢いの閾値600は超えない「優しい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    // 最初のpointerdownによるアンロック分（issue #73）の1回を超えて再生されたことを確認する
    await waitFor(() => {
      expect(playCountFor(playCountsBySrc, 'catch-success')).toBeGreaterThan(1);
    });
    // 失敗専用の効果音（scoop-fail.mp3）はアンロック分の1回のみで、成功時には鳴らない（issue #68）
    expect(playCountFor(playCountsBySrc, 'scoop-fail')).toBe(1);
  });

  it('掬いに失敗すると、失敗専用の効果音（scoop-fail.mp3）が再生され、捕獲成功専用の効果音（catch-success.mp3）は再生されない（issue #66, #68）', async () => {
    setUpMatchingPondAndViewport();
    const playCountsBySrc = mockAudioPlayCounts();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');
    // どの金魚の初期位置からも十分離れた中央付近にポイを置く
    fireEvent.pointerDown(pond, { clientX: 100, clientY: 50 });

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが20度変化 = 400度/秒（勢いの閾値600は超えない「優しい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    await waitFor(() => {
      expect(playCountFor(playCountsBySrc, 'scoop-fail')).toBeGreaterThan(1);
    });
    expect(playCountFor(playCountsBySrc, 'catch-success')).toBe(1);
  });

  it('ポイの中心で金魚を捕獲しても、破れ専用の効果音（poi-tear.mp3）は再生されない（issue #69, #132）', async () => {
    setUpMatchingPondAndViewport();
    const playCountsBySrc = mockAudioPlayCounts();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // 1匹目の金魚（id=0）の真上（距離0、従来は「中心での捕獲」として破れ音が
    // 鳴っていた位置）にポイを合わせる
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent, fish0.yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが20度変化 = 400度/秒（勢いの閾値600は超えない「優しい」掬い）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));

    await waitFor(() => {
      expect(playCountFor(playCountsBySrc, 'catch-success')).toBeGreaterThan(1);
    });
    expect(playCountFor(playCountsBySrc, 'poi-tear')).toBe(1);
  });

  it('初期状態ではタイム表示が00:00.0で、ランキングは空である（issue #89）', () => {
    render(<App />);
    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00.0');
    // ランキングは別画面（issue #101）のため、遷移してから確認する
    fireEvent.click(screen.getByTestId('show-ranking-button'));
    expect(screen.getByTestId('ranking-empty')).toBeInTheDocument();
  });

  it('ランキング画面へ遷移するとゲーム画面（カメラ・金魚・ポイ）が非表示になり、戻るとまた表示される（issue #101）', () => {
    render(<App />);
    expect(screen.getByTestId('pond')).toBeInTheDocument();
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);

    fireEvent.click(screen.getByTestId('show-ranking-button'));
    expect(screen.queryByTestId('pond')).not.toBeInTheDocument();
    expect(screen.queryByTestId('goldfish-school')).not.toBeInTheDocument();
    expect(screen.queryByTestId('camera-background')).not.toBeInTheDocument();
    expect(screen.getByTestId('ranking-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('back-to-game-button'));
    expect(screen.getByTestId('pond')).toBeInTheDocument();
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);
  });

  it('ポイが破れると、その時点までの経過時間と捕獲数がランキングへ記録される（issue #89, #99）', async () => {
    setUpMatchingPondAndViewport();
    const rankingApi = mockRankingApi();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // まず1匹目（id=0）を優しく掬って捕獲する
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent, fish0.yPercent));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }));
    await waitFor(() => {
      const img = screen.getAllByTestId('goldfish')[0].querySelector('img');
      expect(img).toHaveStyle({ opacity: '0' });
    });

    // 捕獲アニメーション（450ms）とクールダウン（500ms）を経過させてから、勢いよく掬って
    // 失敗させポイを破る（issue #132: 捕獲成功時はポイが破れなくなったため、破る＝
    // ゲームオーバーにするにはこの操作が必要）
    now += 600;
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent, fish0.yPercent));
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 300 }));

    await waitFor(() => {
      expect(screen.getByTestId('poi-marker').tagName).toBe('IMG');
    });

    await waitFor(() => {
      expect(rankingApi.getEntries()).toHaveLength(1);
    });
    const [saved] = rankingApi.getEntries();
    expect(typeof saved.timeMs).toBe('number');
    expect(saved.timeMs).toBeGreaterThanOrEqual(0);
    // 1匹目は捕獲済みのため、捕獲数は1のまま記録される
    expect(saved.catchCount).toBe(1);

    // タイマー停止に伴い記録が追加され、別画面（issue #101）のランキングにも反映される
    fireEvent.click(screen.getByTestId('show-ranking-button'));
    await waitFor(() => {
      expect(screen.getByTestId('ranking-list')).toHaveTextContent('（1匹）');
    });
    expect(screen.queryByTestId('ranking-empty')).not.toBeInTheDocument();
  });

  it('ポイが破れる前は「ゲームオーバー」表示が出ない（issue #91）', () => {
    render(<App />);
    expect(screen.queryByTestId('game-over-message')).not.toBeInTheDocument();
  });

  it('ポイが破れると「ゲームオーバー」表示が出る（issue #91）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // 勢いよく掬って失敗させ、ポイを破る（issue #132: 捕獲成功時はポイが破れなくなった
    // ため、破る＝ゲームオーバーにするにはこの操作が必要）
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent, fish0.yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 300 }));

    await waitFor(() => {
      expect(screen.getByTestId('game-over-message')).toBeInTheDocument();
    });
    expect(screen.getByTestId('game-over-message')).toHaveTextContent('ゲームオーバー');
  });

  it('ゲームオーバー前はリトライボタンが表示されない（issue #93）', () => {
    render(<App />);
    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
  });

  it('リトライボタンを押すと、ポイ・タイム・金魚が初期状態に戻り再度プレイでき、ランキングは保持される（issue #93）', async () => {
    setUpMatchingPondAndViewport();
    const rankingApi = mockRankingApi();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // 勢いよく掬って失敗させ、ポイを破る（issue #132: 捕獲成功時はポイが破れなくなった
    // ため、破る＝ゲームオーバーにするにはこの操作が必要）
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent, fish0.yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 300 }));

    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('retry-button'));

    // ポイ・タイム・ゲームオーバー表示が初期状態に戻る
    expect(screen.queryByTestId('game-over-message')).not.toBeInTheDocument();
    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('00:00.0');
    expect(screen.getByTestId('poi-marker').tagName).toBe('DIV');
    // 金魚も初期匹数に戻る
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);
    // ランキング（過去の記録）はリトライしても消えない（別画面・issue #101なので遷移して確認する）
    fireEvent.click(screen.getByTestId('show-ranking-button'));
    await waitFor(() => {
      expect(screen.getByTestId('ranking-list')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('back-to-game-button'));
    // ランキング画面への遷移でPoiが一度アンマウントされる（issue #101）ため、
    // pond要素を取り直す（元の参照は既にDOMから外れている）
    const pondAfterReturn = screen.getByTestId('pond');

    // リトライ後、再度勢いよく掬って失敗させポイを破れる（＝ゲームオーバーになる）ことを
    // 確認する。isTornのリセットに伴いusePoiMotion側の掬うジェスチャー検出も内部状態ごと
    // 再購読される（クールダウンもリセットされる）ため、待機なしですぐに再度フリックできる
    fireEvent.pointerDown(pondAfterReturn, pointerAt(fish0.xPercent, fish0.yPercent));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 300 }));

    await waitFor(() => {
      expect(screen.getByTestId('game-over-message')).toBeInTheDocument();
    });

    // 2回とも勢いよく掬って失敗しているため、捕獲数は0のまま2件記録される（issue #99）
    await waitFor(() => {
      expect(rankingApi.getEntries()).toHaveLength(2);
    });
    expect(rankingApi.getEntries().every((entry) => entry.catchCount === 0)).toBe(true);
  });
});
