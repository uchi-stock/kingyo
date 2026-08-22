import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CameraBackground } from './CameraBackground'

describe('CameraBackground', () => {
  afterEach(() => {
    // @ts-expect-error テストで追加したモックを削除する
    delete navigator.mediaDevices
  })

  it('getUserMediaが存在しない環境では、フォールバックの案内を表示する', () => {
    render(<CameraBackground />)
    expect(screen.getByText('カメラを利用できないため、背景なしで金魚を表示しています')).toBeInTheDocument()
  })

  it('AR対応するまで「カメラを有効にする」ボタンは表示しない（issue #77）', () => {
    // getUserMedia自体は存在する（unsupportedではなくunknown）環境でも、
    // 許可リクエストボタンは表示されない
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.resolve() },
      configurable: true,
    })

    render(<CameraBackground />)
    expect(screen.queryByRole('button', { name: 'カメラを有効にする' })).not.toBeInTheDocument()
    expect(
      screen.queryByText('カメラを利用できないため、背景なしで金魚を表示しています'),
    ).not.toBeInTheDocument()
    expect(screen.queryByTestId('camera-video')).not.toBeInTheDocument()
  })
})
