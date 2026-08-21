import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CameraBackground } from './CameraBackground'

function mockGetUserMedia(impl: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn(impl) },
    configurable: true,
  })
}

describe('CameraBackground', () => {
  afterEach(() => {
    // @ts-expect-error テストで追加したモックを削除する
    delete navigator.mediaDevices
  })

  it('getUserMediaが存在しない環境では、フォールバックの案内を表示する', () => {
    render(<CameraBackground />)
    expect(screen.getByText('カメラを利用できないため、背景なしで金魚を表示しています')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'カメラを有効にする' })).not.toBeInTheDocument()
  })

  it('許可ボタン押下でカメラ映像の取得を要求し、成功するとvideo要素が表示される', async () => {
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream
    mockGetUserMedia(() => Promise.resolve(fakeStream))

    render(<CameraBackground />)
    fireEvent.click(screen.getByRole('button', { name: 'カメラを有効にする' }))

    await waitFor(() => {
      expect(screen.getByTestId('camera-video')).toBeInTheDocument()
    })
  })

  it('許可が拒否された場合、フォールバックの案内が表示される', async () => {
    mockGetUserMedia(() => Promise.reject(new Error('denied')))

    render(<CameraBackground />)
    fireEvent.click(screen.getByRole('button', { name: 'カメラを有効にする' }))

    await waitFor(() => {
      expect(screen.getByText('カメラを利用できないため、背景なしで金魚を表示しています')).toBeInTheDocument()
    })
  })
})
