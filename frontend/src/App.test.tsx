import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App.tsx';

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

  it('掬うフリック操作をした瞬間、ポイの近くに金魚がいればその金魚が消える（issue #44）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    expect(screen.getAllByTestId('goldfish')).toHaveLength(4);

    // 1匹目の金魚（count=4, id=0）の初期位置は xPercent=26, yPercent=46.8 になる
    // （createSeeds相当のseed = (0+1)/(4+1) = 0.2 から算出。goldfishSwim.tsのcreateInitialGoldfishState参照）。
    // pondがビューポートと一致しているため、同じ数値のpond内%へポインタでポイを合わせれば、
    // ポイのビューポート相対vw/vhも同じ値になり、捕獲半径内に収まる
    const pond = screen.getByTestId('pond');
    fireEvent.pointerDown(pond, { clientX: 200 * 0.26, clientY: 100 * 0.468 });

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    // 50ms経過でbetaが60度変化 = 1200度/秒（掬うジェスチャーの閾値180度/秒を超える）
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    await waitFor(() => {
      expect(screen.getAllByTestId('goldfish')).toHaveLength(3);
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

    await waitFor(() => {
      expect(screen.getByTestId('poi-debug').textContent).toContain('scoop: 1');
    });
    expect(screen.getAllByTestId('goldfish')).toHaveLength(4);
  });

  it('ポイの中心（半径4以内）で金魚を捕獲すると、ポイが破れて以降金魚を捕獲できなくなる（issue #45）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');
    const marker = screen.getByTestId('poi-marker');
    expect(marker.tagName).toBe('DIV');

    // 1匹目の金魚（id=0, xPercent=26, yPercent=46.8）の真上（距離0）にポイを合わせ、中心での捕獲を再現する
    fireEvent.pointerDown(pond, { clientX: 200 * 0.26, clientY: 100 * 0.468 });

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    await waitFor(() => {
      expect(screen.getAllByTestId('goldfish')).toHaveLength(3);
    });
    await waitFor(() => {
      expect(screen.getByTestId('poi-marker').tagName).toBe('IMG');
    });
    expect(screen.getByTestId('poi-marker').getAttribute('src')).toContain('poi-torn');

    // 2匹目の金魚（id=1, xPercent=42, yPercent=83.6）の真上にポイを合わせ、
    // クールダウン（500ms）経過後に再度掬うフリックを行っても捕獲できないことを確認する
    fireEvent.pointerDown(pond, { clientX: 200 * 0.42, clientY: 100 * 0.836 });

    now += 600;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 120 }));

    await waitFor(() => {
      expect(screen.getByTestId('poi-debug').textContent).toContain('scoop: 2');
    });
    expect(screen.getAllByTestId('goldfish')).toHaveLength(3);
  });

  it('捕獲半径内だが中心（半径4）の外側で捕獲した場合は、ポイは破れない（issue #45）', async () => {
    setUpMatchingPondAndViewport();

    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<App />);
    const pond = screen.getByTestId('pond');

    // 1匹目の金魚（id=0, xPercent=26, yPercent=46.8）から水平に7離れた位置
    // （捕獲半径10以内・中心判定半径4の外側）にポイを合わせる
    fireEvent.pointerDown(pond, { clientX: 200 * 0.33, clientY: 100 * 0.468 });

    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }));
    now += 50;
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }));

    await waitFor(() => {
      expect(screen.getAllByTestId('goldfish')).toHaveLength(3);
    });
    expect(screen.getByTestId('poi-marker').tagName).toBe('DIV');
  });
});
