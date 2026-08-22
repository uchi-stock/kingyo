import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Poi } from './Poi'

function mockPointerBounds() {
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
  })
}

// pondのtransform計算（offsetXPx/offsetYPx）を検証するため、pondの実測サイズをモックする。
// Poi内のuseEffectがrender()時点で同期的に実行されるよう、render()より前に呼び出すこと
function mockPondSize(width: number, height: number) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: width })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: height })
}

// jsdom既定のDeviceMotionEventスタブを退避しておき、各テスト後に復元する。
// delete window.DeviceMotionEventのみだと、そのテストファイル内の以降のテストで
// 既定スタブ（requestPermissionなし＝granted扱い）に依存するケースが「unsupported」に
// なってしまう
const originalDeviceMotionEvent = window.DeviceMotionEvent

describe('Poi', () => {
  afterEach(() => {
    window.DeviceMotionEvent = originalDeviceMotionEvent
    // @ts-expect-error テストで追加したモックを削除する
    delete window.DeviceOrientationEvent.requestPermission
  })

  it('requestPermissionを持たない環境（Android等）では、許可ボタンなしでモーションセンサーの値をポイの位置に反映する', async () => {
    // jsdomはDeviceMotionEventをrequestPermissionなしのスタブとして持つため、デフォルトでgranted扱いになる
    mockPondSize(200, 100)
    render(<Poi />)
    expect(screen.queryByRole('button', { name: 'センサーを有効にする' })).not.toBeInTheDocument()
    expect(
      screen.queryByText('加速度センサーが利用できないため、画面をなぞってポイを操作してください'),
    ).not.toBeInTheDocument()

    fireEvent(
      window,
      new DeviceMotionEvent('devicemotion', { acceleration: { x: 1, y: 0, z: 0 } }),
    )

    const marker = screen.getByTestId('poi-marker')
    await waitFor(() => {
      expect(marker.style.transform).not.toContain('translate(0px, 0px)')
    })
  })

  it('端末の傾き（deviceorientation）はポイの位置ではなく角度にのみ反映される', () => {
    mockPondSize(200, 100)
    render(<Poi />)
    const marker = screen.getByTestId('poi-marker')

    fireEvent(
      window,
      new DeviceOrientationEvent('deviceorientation', { beta: 45, gamma: 30 }),
    )

    // 位置（pond中央からのpxオフセット）は変化しない
    expect(marker.style.transform).toContain('translate(0px, 0px)')
    expect(marker.style.transform).toContain('rotate(30deg)')
  })

  it('DeviceMotionEvent自体が存在しない場合、フォールバック操作の案内を表示する', () => {
    // @ts-expect-error テスト用にセンサーAPI自体が存在しない環境を再現する
    delete window.DeviceMotionEvent

    render(<Poi />)
    expect(screen.queryByRole('button', { name: 'センサーを有効にする' })).not.toBeInTheDocument()
    expect(
      screen.getByText('加速度センサーが利用できないため、画面をなぞってポイを操作してください'),
    ).toBeInTheDocument()
  })

  it('iOSのようにrequestPermissionが必要な場合、ボタン押下で許可をリクエストし、許可後はボタンが消える', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent = function DeviceMotionEvent() {}
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent.requestPermission = requestPermission

    render(<Poi />)
    const button = screen.getByRole('button', { name: 'センサーを有効にする' })
    fireEvent.click(button)

    expect(requestPermission).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'センサーを有効にする' })).not.toBeInTheDocument()
    })
  })

  it('許可が拒否された場合、フォールバック操作の案内が表示される', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied')
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent = function DeviceMotionEvent() {}
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent.requestPermission = requestPermission

    render(<Poi />)
    fireEvent.click(screen.getByRole('button', { name: 'センサーを有効にする' }))

    await waitFor(() => {
      expect(
        screen.getByText('加速度センサーが利用できないため、画面をなぞってポイを操作してください'),
      ).toBeInTheDocument()
    })
  })

  it('許可リクエストは角度用・位置用の両方を、一方のawait解決前に同期的に呼び出す', async () => {
    let resolveMotion: (value: 'granted' | 'denied') => void = () => {}
    let resolveOrientation: (value: 'granted' | 'denied') => void = () => {}
    const motionRequestPermission = vi.fn(
      () =>
        new Promise<'granted' | 'denied'>((resolve) => {
          resolveMotion = resolve
        }),
    )
    const orientationRequestPermission = vi.fn(
      () =>
        new Promise<'granted' | 'denied'>((resolve) => {
          resolveOrientation = resolve
        }),
    )
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent = function DeviceMotionEvent() {}
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent.requestPermission = motionRequestPermission
    // @ts-expect-error テスト用にDeviceOrientationEventへ許可リクエストを追加する
    window.DeviceOrientationEvent.requestPermission = orientationRequestPermission

    render(<Poi />)
    fireEvent.click(screen.getByRole('button', { name: 'センサーを有効にする' }))

    // どちらのPromiseもまだ解決していない時点で、両方のrequestPermissionが呼ばれている
    // （片方をawaitしてから次を呼ぶと、iOS Safari等でuser activationが失われうるため。issue #14）
    expect(motionRequestPermission).toHaveBeenCalledTimes(1)
    expect(orientationRequestPermission).toHaveBeenCalledTimes(1)

    resolveOrientation('granted')
    resolveMotion('granted')
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'センサーを有効にする' })).not.toBeInTheDocument()
    })
  })

  it('デバッグ表示に許可状態・受信したdevicemotionイベント数・最新の加速度が反映される', async () => {
    render(<Poi />)
    expect(screen.getByTestId('poi-debug').textContent).toContain('permission: granted')
    expect(screen.getByTestId('poi-debug').textContent).toContain('events: 0')

    fireEvent(window, new DeviceMotionEvent('devicemotion', { acceleration: { x: 1, y: 2, z: 0 } }))

    await waitFor(() => {
      expect(screen.getByTestId('poi-debug').textContent).toContain('events: 1')
    })
  })

  it('フォールバック操作時、ポインタ操作でポイの位置が更新される', () => {
    // @ts-expect-error センサーAPIが存在しない環境を再現し、フォールバック操作を有効にする
    delete window.DeviceMotionEvent
    mockPointerBounds()
    mockPondSize(200, 100)

    render(<Poi />)
    const pond = screen.getByTestId('pond')
    const marker = screen.getByTestId('poi-marker')

    // clientX:100, clientY:25 は pond（200x100）上で xPercent:50, yPercent:25 に相当する
    fireEvent.pointerDown(pond, { clientX: 100, clientY: 25 })

    // xPercent:50 → pond中央からのオフセット0px、yPercent:25 → 中央から-25%分（-25px）上
    expect(marker.style.transform).toContain('translate(0px, -25px)')
  })
})
