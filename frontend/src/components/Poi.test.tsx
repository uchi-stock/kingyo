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

  it('iOSのようにrequestPermissionが必要な場合、画面への最初のタップが許可リクエストのトリガーになる（issue #63）', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent = function DeviceMotionEvent() {}
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent.requestPermission = requestPermission

    render(<Poi />)

    fireEvent.pointerDown(window)

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1)
    })
  })

  it('iOSのようにrequestPermissionが必要な場合、明示的な「センサーを有効にする」ボタンも表示され、押すと許可リクエストが呼ばれる（issue #109）', async () => {
    // 画面への最初のタップ（issue #63）が何らかの理由で許可リクエストのトリガーとして
    // 機能しなかった場合に備え、確実に許可ダイアログを呼び出せる手段を残す（issue #109:
    // 実機で「タップしても許可ダイアログが一度も出ず、案内文も出ないためセンサーが
    // 反応しないまま気づけない」という報告があった）
    const requestPermission = vi.fn().mockResolvedValue('granted')
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent = function DeviceMotionEvent() {}
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent.requestPermission = requestPermission

    render(<Poi />)
    const button = screen.getByRole('button', { name: 'センサーを有効にする' })

    fireEvent.click(button)

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1)
    })
  })

  it('許可が拒否された場合、フォールバック操作の案内が表示される', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied')
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent = function DeviceMotionEvent() {}
    // @ts-expect-error テスト用にDeviceMotionEventをモックする
    window.DeviceMotionEvent.requestPermission = requestPermission

    render(<Poi />)
    fireEvent.pointerDown(window)

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
    fireEvent.pointerDown(window)

    // どちらのPromiseもまだ解決していない時点で、両方のrequestPermissionが呼ばれている
    // （片方をawaitしてから次を呼ぶと、iOS Safari等でuser activationが失われうるため。issue #14）
    await waitFor(() => {
      expect(motionRequestPermission).toHaveBeenCalledTimes(1)
    })
    expect(orientationRequestPermission).toHaveBeenCalledTimes(1)

    // Promiseの解決後も例外なく状態更新が完了することを確認する
    resolveOrientation('granted')
    resolveMotion('granted')
    await waitFor(() => {
      expect(screen.getByTestId('pond')).toBeInTheDocument()
    })
  })

  it('傾き（beta）を素早く変化させると（掬うフリック相当）、onScoopが呼び出される', async () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const onScoop = vi.fn()

    render(<Poi onScoop={onScoop} />)

    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }))

    // 50ms経過でbetaが60度変化 = 1200度/秒の角速度（閾値180度/秒を超える）
    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }))

    await waitFor(() => {
      expect(onScoop).toHaveBeenCalledTimes(1)
    })

    vi.restoreAllMocks()
  })

  it('優しい速度（勢いの閾値以下）で掬うと、onScoopへgentleとして渡される（issue #82）', async () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const onScoop = vi.fn()

    render(<Poi onScoop={onScoop} />)

    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }))
    // 50ms経過でbetaが20度変化 = 400度/秒（検出閾値180は超えるが勢いの閾値600は超えない）
    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 20 }))

    await waitFor(() => {
      expect(onScoop).toHaveBeenCalledTimes(1)
    })
    expect(onScoop.mock.calls[0][1]).toBe('gentle')

    vi.restoreAllMocks()
  })

  it('勢いのよい速度（勢いの閾値超）で掬うと、onScoopへforcefulとして渡される（issue #82）', async () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const onScoop = vi.fn()

    render(<Poi onScoop={onScoop} />)

    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }))
    // 50ms経過でbetaが300度変化 = 6000度/秒（勢いの閾値600度/秒を超える）
    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 300 }))

    await waitFor(() => {
      expect(onScoop).toHaveBeenCalledTimes(1)
    })
    expect(onScoop.mock.calls[0][1]).toBe('forceful')

    vi.restoreAllMocks()
  })

  it('通常のゆっくりとした傾き操作では、掬うジェスチャーとして誤検出されずonScoopが呼び出されない', async () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const onScoop = vi.fn()

    render(<Poi onScoop={onScoop} />)

    now += 500
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }))
    // 500ms経過でbetaが5度変化 = 10度/秒の角速度（通常の傾き操作相当）
    now += 500
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 5 }))

    // 何も起きないことの確認のため、他の非同期処理が一巡するのを待ってから検証する
    await waitFor(() => {
      expect(screen.getByTestId('pond')).toBeInTheDocument()
    })
    expect(onScoop).not.toHaveBeenCalled()

    vi.restoreAllMocks()
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

  it('ポイが破れている場合、devicemotionによる位置更新を受け付けない（issue #79）', async () => {
    mockPondSize(200, 100)
    render(<Poi isTorn />)

    fireEvent(
      window,
      new DeviceMotionEvent('devicemotion', { acceleration: { x: 1, y: 0, z: 0 } }),
    )

    // 破れた表示（IMG）のまま、位置は中央から動かない
    const marker = screen.getByTestId('poi-marker')
    expect(marker.tagName).toBe('IMG')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(marker.style.transform).toContain('translate(0px, 0px)')
  })

  it('ポイが破れている場合、deviceorientationによる角度更新を受け付けない（issue #79）', () => {
    mockPondSize(200, 100)
    render(<Poi isTorn />)
    const marker = screen.getByTestId('poi-marker')

    fireEvent(
      window,
      new DeviceOrientationEvent('deviceorientation', { beta: 45, gamma: 30 }),
    )

    expect(marker.style.transform).toContain('rotate(0deg)')
  })

  it('ポイが破れている場合、掬うジェスチャーを検出せずonScoopも呼び出されない（issue #79）', async () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const onScoop = vi.fn()

    render(<Poi onScoop={onScoop} isTorn />)

    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 0 }))
    now += 50
    fireEvent(window, new DeviceOrientationEvent('deviceorientation', { beta: 60 }))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onScoop).not.toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('ポイが破れている場合、フォールバック操作（ポインタ）による位置更新も受け付けない（issue #79）', () => {
    // @ts-expect-error センサーAPIが存在しない環境を再現し、フォールバック操作を有効にする
    delete window.DeviceMotionEvent
    mockPointerBounds()
    mockPondSize(200, 100)

    render(<Poi isTorn />)
    const pond = screen.getByTestId('pond')
    const marker = screen.getByTestId('poi-marker')

    fireEvent.pointerDown(pond, { clientX: 100, clientY: 25 })

    expect(marker.style.transform).toContain('translate(0px, 0px)')
  })
})
