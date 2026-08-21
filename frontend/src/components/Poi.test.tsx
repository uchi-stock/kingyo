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

describe('Poi', () => {
  afterEach(() => {
    // @ts-expect-error テストで追加したモックを削除する
    delete window.DeviceOrientationEvent
  })

  it('requestPermissionを持たない環境（Android等）では、許可ボタンなしでセンサー値をポイに反映する', () => {
    // jsdomはDeviceOrientationEventをrequestPermissionなしのスタブとして持つため、デフォルトでgranted扱いになる
    render(<Poi />)
    expect(screen.queryByRole('button', { name: 'センサーを有効にする' })).not.toBeInTheDocument()
    expect(
      screen.queryByText('加速度センサーが利用できないため、画面をなぞってポイを操作してください'),
    ).not.toBeInTheDocument()

    fireEvent(
      window,
      new DeviceOrientationEvent('deviceorientation', { beta: 45, gamma: -45 }),
    )

    const marker = screen.getByTestId('poi-marker')
    expect(marker).toHaveStyle({ left: '0%', top: '100%' })
  })

  it('DeviceOrientationEvent自体が存在しない場合、フォールバック操作の案内を表示する', () => {
    // @ts-expect-error テスト用にセンサーAPI自体が存在しない環境を再現する
    delete window.DeviceOrientationEvent

    render(<Poi />)
    expect(screen.queryByRole('button', { name: 'センサーを有効にする' })).not.toBeInTheDocument()
    expect(
      screen.getByText('加速度センサーが利用できないため、画面をなぞってポイを操作してください'),
    ).toBeInTheDocument()
  })

  it('iOSのようにrequestPermissionが必要な場合、ボタン押下で許可をリクエストし、許可後はボタンが消える', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    // @ts-expect-error テスト用にDeviceOrientationEventをモックする
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {}
    // @ts-expect-error テスト用にDeviceOrientationEventをモックする
    window.DeviceOrientationEvent.requestPermission = requestPermission

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
    // @ts-expect-error テスト用にDeviceOrientationEventをモックする
    window.DeviceOrientationEvent = function DeviceOrientationEvent() {}
    // @ts-expect-error テスト用にDeviceOrientationEventをモックする
    window.DeviceOrientationEvent.requestPermission = requestPermission

    render(<Poi />)
    fireEvent.click(screen.getByRole('button', { name: 'センサーを有効にする' }))

    await waitFor(() => {
      expect(
        screen.getByText('加速度センサーが利用できないため、画面をなぞってポイを操作してください'),
      ).toBeInTheDocument()
    })
  })

  it('フォールバック操作時、ポインタ操作でポイの位置が更新される', () => {
    // @ts-expect-error センサーAPIが存在しない環境を再現し、フォールバック操作を有効にする
    delete window.DeviceOrientationEvent
    mockPointerBounds()

    render(<Poi />)
    const pond = screen.getByTestId('pond')
    const marker = screen.getByTestId('poi-marker')

    fireEvent.pointerDown(pond, { clientX: 100, clientY: 25 })

    expect(marker).toHaveStyle({ left: '50%', top: '25%' })
  })
})
