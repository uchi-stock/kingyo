import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('App', () => {
  afterEach(() => {
    window.DeviceMotionEvent = originalDeviceMotionEvent;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
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
    // 50ms経過でbetaが60度変化 = 1200度/秒（掬うジェスチャーの閾値180度/秒を超える）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

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
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    // 掬うジェスチャー自体は検出されるが、近くに金魚がいないため捕獲は起きない。
    // 非同期処理が一巡するのを待ってから、金魚の数が変化していないことを確認する
    await waitFor(() => {
      expect(screen.getByTestId('pond')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT);
  });

  it('ポイの中心（半径4以内）で金魚を捕獲すると、ポイが破れて以降金魚を捕獲できなくなる（issue #45）', async () => {
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
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    await waitFor(() => {
      expect(screen.getByTestId('poi-marker').tagName).toBe('IMG');
    });
    expect(screen.getByTestId('poi-marker').getAttribute('src')).toContain('poi-torn');

    // 捕獲アニメーション（450ms）と、2匹目への掬うジェスチャーのクールダウン（500ms）を
    // まとめて経過させる
    now += 600;

    // 2匹目の金魚（id=1）の真上にポイを合わせ、
    // 再度掬うフリックを行っても捕獲できないことを確認する
    const fish1 = goldfishInitialPosition(1);
    fireEvent.pointerDown(pond, pointerAt(fish1.xPercent, fish1.yPercent));

    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 120 }));

    // ポイが既に破れているため、2匹目の金魚に重ねても捕獲されない
    await waitFor(() => {
      expect(screen.getAllByTestId('goldfish')).toHaveLength(GOLDFISH_COUNT - 1);
    });
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
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

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

  it('金魚の捕獲に成功すると、専用の効果音（catch-success.mp3）が再生される（issue #66）', async () => {
    setUpMatchingPondAndViewport();

    const play = vi.fn().mockResolvedValue(undefined);
    const AudioMock = vi.fn().mockImplementation(function AudioMock(src?: string) {
      return { play, currentTime: 0, src };
    });
    vi.stubGlobal('Audio', AudioMock);

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);

    const { xPercent, yPercent } = goldfishInitialPosition(0);
    const pond = screen.getByTestId('pond');
    fireEvent.pointerDown(pond, pointerAt(xPercent, yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    await waitFor(() => {
      expect(AudioMock.mock.calls.some(([src]) => typeof src === 'string' && src.includes('catch-success'))).toBe(
        true,
      );
    });
  });

  it('掬いに失敗すると、捕獲成功専用の効果音（catch-success.mp3）は再生されない（issue #66）', async () => {
    setUpMatchingPondAndViewport();

    const play = vi.fn().mockResolvedValue(undefined);
    const AudioMock = vi.fn().mockImplementation(function AudioMock(src?: string) {
      return { play, currentTime: 0, src };
    });
    vi.stubGlobal('Audio', AudioMock);

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');
    // どの金魚の初期位置からも十分離れた中央付近にポイを置く
    fireEvent.pointerDown(pond, { clientX: 100, clientY: 50 });

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    await waitFor(() => {
      expect(screen.getByTestId('pond')).toBeInTheDocument();
    });
    expect(AudioMock.mock.calls.some(([src]) => typeof src === 'string' && src.includes('catch-success'))).toBe(
      false,
    );
  });

  it('捕獲半径内だが中心（半径4）の外側で捕獲した場合は、ポイは破れない（issue #45）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // 1匹目の金魚（id=0）から水平に7離れた位置（捕獲半径10以内・中心判定半径4の外側）にポイを合わせる
    const fish0 = goldfishInitialPosition(0);
    fireEvent.pointerDown(pond, pointerAt(fish0.xPercent + 7, fish0.yPercent));

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    await waitFor(() => {
      const img = screen.getAllByTestId('goldfish')[0].querySelector('img');
      expect(img).toHaveStyle({ opacity: '0' });
    });
    expect(screen.getByTestId('poi-marker').tagName).toBe('DIV');
  });
});
